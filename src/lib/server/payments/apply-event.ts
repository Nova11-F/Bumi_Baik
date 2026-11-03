import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import type {
  OrderStatus,
  Json,
  PaymentStatus as DbPaymentStatus,
} from "@/types";
import type { PaymentEvent, PaymentProviderName } from "./types";

export type ApplyPaymentEventResult = "processed" | "duplicate" | "ignored";

export type PaymentRecord = {
  id: string;
  order_id: string;
  provider_ref: string | null;
  status: DbPaymentStatus;
  amount_idr: number;
  payable_idr: number | null;
};

export type OrderRecord = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_idr: number;
};

export interface PaymentEventStore {
  beginEvent(
    provider: string,
    eventId: string,
    payload: Json,
  ): Promise<string | null>;
  completeEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void>;
  failEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void>;
  findPayment(
    provider: string,
    providerRef: string,
    signal?: AbortSignal,
  ): Promise<PaymentRecord | null>;
  findOrderByNumber(
    orderNumber: string,
    signal?: AbortSignal,
  ): Promise<OrderRecord | null>;
  findLatestPaymentForOrder(
    orderId: string,
    signal?: AbortSignal,
  ): Promise<PaymentRecord | null>;
  attachProviderRef(
    paymentId: string,
    providerRef: string,
    signal?: AbortSignal,
  ): Promise<void>;
  createPaymentFromEvent(
    order: OrderRecord,
    provider: string,
    event: PaymentEvent,
    signal?: AbortSignal,
  ): Promise<PaymentRecord>;
  updatePaymentStatus(
    paymentId: string,
    status: DbPaymentStatus,
    paidAt: Date | undefined,
    raw: unknown,
    allowedFrom: DbPaymentStatus[],
    signal?: AbortSignal,
  ): Promise<boolean>;
  transitionOrder(
    orderId: string,
    from: OrderStatus[],
    to: OrderStatus,
    signal?: AbortSignal,
  ): Promise<boolean>;
  hasActivePayment(
    orderId: string,
    exceptPaymentId: string,
    signal?: AbortSignal,
  ): Promise<boolean>;
  releaseStock(orderId: string, signal?: AbortSignal): Promise<void>;
}

const APPLY_PAYMENT_EVENT_TIMEOUT_MS = 25_000;

const DB_STATUS: Record<PaymentEvent["status"], DbPaymentStatus> = {
  pending: "initiated",
  paid: "paid",
  failed: "failed",
  expired: "expired",
  cancelled: "cancelled",
  refunded: "refunded",
};

const INACTIVE_PAYMENT_STATUSES: DbPaymentStatus[] = [
  "initiated",
  "failed",
  "expired",
  "cancelled",
];

export function stripAttemptSuffix(referenceId: string): string {
  return referenceId.replace(/-R\d+$/, "");
}

export function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function logEventStage(
  provider: string,
  event: PaymentEvent,
  stage: string,
  details: Record<string, string | number | boolean | null> = {},
): void {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[payment-event]", {
    provider,
    eventId: event.eventId,
    providerRef: event.providerRef,
    stage,
    ...details,
  });
}

function safeErrorCode(error: unknown): string {
  if (!(error instanceof Error)) return "UNKNOWN_ERROR";
  return /^[A-Z0-9_]+$/.test(error.message) ? error.message : error.name;
}

export async function applyPaymentEvent(
  store: PaymentEventStore,
  provider: PaymentProviderName,
  event: PaymentEvent,
): Promise<ApplyPaymentEventResult> {
  const claimedAt = await store.beginEvent(
    provider,
    event.eventId,
    toJson(event.raw),
  );
  if (claimedAt === null) {
    logEventStage(provider, event, "event-duplicate");
    return "duplicate";
  }
  logEventStage(provider, event, "event-claimed");

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error("PAYMENT_EVENT_TIMEOUT"));
      }, APPLY_PAYMENT_EVENT_TIMEOUT_MS);
    });
    const result = await Promise.race([
      applyPaymentEventBody(store, provider, event, controller.signal),
      timeout,
    ]);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    timeoutId = undefined;
    await store.completeEvent(provider, event.eventId, claimedAt);
    logEventStage(provider, event, "complete-event", { result });
    return result;
  } catch (error) {
    const timeout =
      error instanceof Error && error.message === "PAYMENT_EVENT_TIMEOUT";
    const errorCode = safeErrorCode(error);
    logEventStage(provider, event, timeout ? "timeout" : "processing-failed", {
      errorCode,
    });
    if (timeout) {
      console.error("Payment event processing timed out", {
        provider,
        eventId: event.eventId,
        providerRef: event.providerRef,
        errorCode,
      });
    }
    try {
      await store.failEvent(provider, event.eventId, claimedAt);
      logEventStage(provider, event, "event-failed", { timeout });
    } catch (markFailedError) {
      console.error("Could not mark payment event as failed", {
        provider,
        eventId: event.eventId,
        providerRef: event.providerRef,
        errorCode: safeErrorCode(markFailedError),
      });
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

async function applyPaymentEventBody(
  store: PaymentEventStore,
  provider: PaymentProviderName,
  event: PaymentEvent,
  signal: AbortSignal,
): Promise<ApplyPaymentEventResult> {
  let payment = await store.findPayment(provider, event.providerRef, signal);
  logEventStage(provider, event, "payment-lookup", {
    found: Boolean(payment),
  });
  let fallbackOrder: OrderRecord | null = null;

  if (!payment && event.referenceId) {
    const orderNumber = stripAttemptSuffix(event.referenceId);
    fallbackOrder = await store.findOrderByNumber(orderNumber, signal);
    logEventStage(provider, event, "payment-fallback", {
      orderFound: Boolean(fallbackOrder),
    });

    if (fallbackOrder) {
      const latest = await store.findLatestPaymentForOrder(
        fallbackOrder.id,
        signal,
      );
      if (latest && latest.provider_ref === null) {
        await store.attachProviderRef(latest.id, event.providerRef, signal);
        payment = { ...latest, provider_ref: event.providerRef };
        logEventStage(provider, event, "payment-fallback-attached");
      } else {
        logEventStage(provider, event, "payment-fallback-create");
        if (
          event.status === "paid" &&
          event.amountIdr !== undefined &&
          event.amountIdr < fallbackOrder.total_idr
        ) {
          throw new Error("PAYMENT_AMOUNT_MISMATCH");
        }
        payment = await store.createPaymentFromEvent(
          fallbackOrder,
          provider,
          event,
          signal,
        );
      }
    }
  }

  if (!payment) {
    logEventStage(provider, event, "decision", {
      branch: "unknown-payment-ignored",
    });
    return "ignored";
  }

  if (event.status === "pending") {
    logEventStage(provider, event, "decision", { branch: "pending-ignored" });
    return "ignored";
  }

  if (event.status === "paid") {
    if (payment.status === "refunded") {
      logEventStage(provider, event, "decision", {
        branch: "refunded-payment-ignored",
      });
      return "ignored";
    }
    if (event.amountIdr !== undefined) {
      const expected = payment.payable_idr ?? payment.amount_idr;
      if (event.amountIdr !== expected) {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }
    }

    const paymentChanged = await store.updatePaymentStatus(
      payment.id,
      "paid",
      event.paidAt ?? new Date(),
      event.raw,
      INACTIVE_PAYMENT_STATUSES,
      signal,
    );
    logEventStage(provider, event, "payment-update", {
      changed: paymentChanged,
      status: "paid",
    });
    const orderChanged = await store.transitionOrder(
      payment.order_id,
      ["pending"],
      "paid",
      signal,
    );
    logEventStage(provider, event, "order-update", {
      changed: orderChanged,
      status: "paid",
    });

    if (orderChanged) {
      logEventStage(provider, event, "decision", {
        branch: "paid-order-transition",
      });
      return "processed";
    }
    if (paymentChanged) {
      logEventStage(provider, event, "decision", {
        branch: "late-payment",
      });
      return "processed";
    }
    logEventStage(provider, event, "decision", {
      branch: "payment-unchanged",
    });
    return "ignored";
  }

  if (event.status === "refunded") {
    const paymentChanged = await store.updatePaymentStatus(
      payment.id,
      "refunded",
      undefined,
      event.raw,
      ["paid"],
      signal,
    );
    logEventStage(provider, event, "payment-update", {
      changed: paymentChanged,
      status: "refunded",
    });
    const orderChanged = await store.transitionOrder(
      payment.order_id,
      ["pending", "paid"],
      "cancelled",
      signal,
    );
    logEventStage(provider, event, "order-update", {
      changed: orderChanged,
      status: "cancelled",
    });
    const result = paymentChanged || orderChanged ? "processed" : "ignored";
    logEventStage(provider, event, "decision", {
      branch: "refund",
      result,
    });
    return result;
  }

  if (payment.status === "paid" || payment.status === "refunded") {
    logEventStage(provider, event, "decision", {
      branch: "backwards-status-ignored",
    });
    return "ignored";
  }

  const dbStatus = DB_STATUS[event.status];
  const paymentChanged = await store.updatePaymentStatus(
    payment.id,
    dbStatus,
    undefined,
    event.raw,
    INACTIVE_PAYMENT_STATUSES,
    signal,
  );
  logEventStage(provider, event, "payment-update", {
    changed: paymentChanged,
    status: dbStatus,
  });

  const otherActive = await store.hasActivePayment(
    payment.order_id,
    payment.id,
    signal,
  );
  if (otherActive) {
    logEventStage(provider, event, "decision", {
      branch: "another-payment-active",
    });
    return paymentChanged ? "processed" : "ignored";
  }

  const orderChanged = await store.transitionOrder(
    payment.order_id,
    ["pending"],
    "expired",
    signal,
  );
  logEventStage(provider, event, "order-update", {
    changed: orderChanged,
    status: "expired",
  });
  if (orderChanged) {
    await store.releaseStock(payment.order_id, signal);
    logEventStage(provider, event, "release-stock");
    logEventStage(provider, event, "decision", {
      branch: "order-expired",
    });
    return "processed";
  }

  const result = paymentChanged ? "processed" : "ignored";
  logEventStage(provider, event, "decision", {
    branch: "terminal-payment",
    result,
  });
  return result;
}

export function createSupabasePaymentEventStore(
  admin: ReturnType<typeof createAdminClient>,
): PaymentEventStore {
  return new SupabasePaymentEventStore(admin);
}

type AdminClient = ReturnType<typeof createAdminClient>;

class SupabasePaymentEventStore implements PaymentEventStore {
  constructor(private readonly admin: AdminClient) {}

  async beginEvent(
    provider: string,
    eventId: string,
    payload: Json,
  ): Promise<string | null> {
    const { data, error } = await this.admin
      .from("webhook_events")
      .insert({
        provider,
        event_id: eventId,
        payload,
        processing_status: "processing",
        claimed_at: new Date().toISOString(),
      })
      .select("claimed_at")
      .maybeSingle();

    if (error?.code === "23505") {
      const { data: existing, error: existingError } = await this.admin
        .from("webhook_events")
        .select("processing_status, claimed_at")
        .eq("provider", provider)
        .eq("event_id", eventId)
        .maybeSingle();

      if (existingError) {
        throw new Error("Gagal memeriksa status event pembayaran.", {
          cause: existingError,
        });
      }
      if (existing?.processing_status === "processed") return null;
      if (existing?.processing_status === "failed") {
        const { data: claimed, error: claimError } = await this.admin
          .from("webhook_events")
          .update({
            processing_status: "processing",
            payload,
            claimed_at: new Date().toISOString(),
          })
          .eq("provider", provider)
          .eq("event_id", eventId)
          .eq("processing_status", "failed")
          .select("claimed_at")
          .maybeSingle();

        if (claimError) {
          throw new Error("Gagal mengklaim ulang event pembayaran.", {
            cause: claimError,
          });
        }
        if (claimed) return claimed.claimed_at;
      }
      if (existing?.processing_status === "processing") {
        const { data: claimedAt, error: claimError } = await this.admin.rpc(
          "claim_stale_webhook_event",
          {
            p_provider: provider,
            p_event_id: eventId,
            p_payload: payload,
          },
        );
        if (claimError) {
          throw new Error("Gagal mengambil alih event pembayaran basi.", {
            cause: claimError,
          });
        }
        if (claimedAt) return claimedAt;
      }

      const { data: latest, error: latestError } = await this.admin
        .from("webhook_events")
        .select("processing_status")
        .eq("provider", provider)
        .eq("event_id", eventId)
        .maybeSingle();

      if (latestError) {
        throw new Error("Gagal memeriksa status event pembayaran.", {
          cause: latestError,
        });
      }
      if (latest?.processing_status === "processed") return null;
      throw new Error("PAYMENT_EVENT_IN_PROGRESS");
    }
    if (error) {
      throw new Error("Gagal menyimpan event pembayaran.", { cause: error });
    }
    if (!data?.claimed_at) {
      throw new Error("Gagal membaca waktu klaim event pembayaran.");
    }
    return data.claimed_at;
  }

  async completeEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void> {
    const { data, error } = await this.admin
      .from("webhook_events")
      .update({ processing_status: "processed" })
      .eq("provider", provider)
      .eq("event_id", eventId)
      .eq("processing_status", "processing")
      .eq("claimed_at", claimedAt)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error("Gagal menandai event pembayaran selesai.", {
        cause: error,
      });
    }
    if (!data) throw new Error("PAYMENT_EVENT_CLAIM_LOST");
  }

  async failEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void> {
    const { error } = await this.admin
      .from("webhook_events")
      .update({ processing_status: "failed" })
      .eq("provider", provider)
      .eq("event_id", eventId)
      .eq("processing_status", "processing")
      .eq("claimed_at", claimedAt);

    if (error) {
      throw new Error("Gagal menandai event pembayaran gagal.", {
        cause: error,
      });
    }
  }

  async findPayment(
    provider: string,
    providerRef: string,
    signal?: AbortSignal,
  ): Promise<PaymentRecord | null> {
    let query = this.admin
      .from("payments")
      .select("id, order_id, provider_ref, status, amount_idr, payable_idr")
      .eq("provider", provider)
      .eq("provider_ref", providerRef);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Gagal memuat pembayaran.", { cause: error });
    }
    return (data as PaymentRecord | null) ?? null;
  }

  async findOrderByNumber(
    orderNumber: string,
    signal?: AbortSignal,
  ): Promise<OrderRecord | null> {
    let query = this.admin
      .from("orders")
      .select("id, order_number, status, total_idr")
      .eq("order_number", orderNumber);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Gagal memuat pesanan.", { cause: error });
    }
    return (data as OrderRecord | null) ?? null;
  }

  async findLatestPaymentForOrder(
    orderId: string,
    signal?: AbortSignal,
  ): Promise<PaymentRecord | null> {
    let query = this.admin
      .from("payments")
      .select("id, order_id, provider_ref, status, amount_idr, payable_idr")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new Error("Gagal memuat pembayaran pesanan.", { cause: error });
    }
    return (data as PaymentRecord | null) ?? null;
  }

  async attachProviderRef(
    paymentId: string,
    providerRef: string,
    signal?: AbortSignal,
  ) {
    let query = this.admin
      .from("payments")
      .update({ provider_ref: providerRef })
      .eq("id", paymentId)
      .select("id");
    if (signal) query = query.abortSignal(signal);
    const { error } = await query.maybeSingle();

    if (error) {
      throw new Error("Gagal menautkan referensi pembayaran.", {
        cause: error,
      });
    }
  }

  async createPaymentFromEvent(
    order: OrderRecord,
    provider: string,
    event: PaymentEvent,
    signal?: AbortSignal,
  ): Promise<PaymentRecord> {
    let query = this.admin
      .from("payments")
      .insert({
        order_id: order.id,
        provider,
        provider_ref: event.providerRef,
        status: DB_STATUS[event.status],
        amount_idr: order.total_idr,
        payable_idr: event.amountIdr ?? order.total_idr,
        attempt: 1,
        paid_at:
          event.status === "paid"
            ? (event.paidAt ?? new Date()).toISOString()
            : null,
        raw_payload: toJson(event.raw),
      })
      .select("id, order_id, provider_ref, status, amount_idr, payable_idr");
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query.maybeSingle();

    if (error?.code === "23505") {
      const existing = await this.findPayment(
        provider,
        event.providerRef,
        signal,
      );
      if (existing) return existing;
    }
    if (error) {
      throw new Error("Gagal membuat catatan pembayaran dari event.", {
        cause: error,
      });
    }
    return data as PaymentRecord;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: DbPaymentStatus,
    paidAt: Date | undefined,
    raw: unknown,
    allowedFrom: DbPaymentStatus[],
    signal?: AbortSignal,
  ): Promise<boolean> {
    let query = this.admin
      .from("payments")
      .update({
        status,
        raw_payload: toJson(raw),
        ...(paidAt ? { paid_at: paidAt.toISOString() } : {}),
      })
      .eq("id", paymentId)
      .in("status", allowedFrom)
      .select("id");
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) {
      throw new Error("Gagal memperbarui status pembayaran.", { cause: error });
    }
    return Array.isArray(data) && data.length > 0;
  }

  async transitionOrder(
    orderId: string,
    from: OrderStatus[],
    to: OrderStatus,
    signal?: AbortSignal,
  ): Promise<boolean> {
    let query = this.admin
      .from("orders")
      .update({ status: to })
      .eq("id", orderId)
      .in("status", from)
      .select("id");
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) {
      throw new Error("Gagal memperbarui status pesanan.", { cause: error });
    }
    return Array.isArray(data) && data.length > 0;
  }

  async hasActivePayment(
    orderId: string,
    exceptPaymentId: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    let query = this.admin
      .from("payments")
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "initiated")
      .neq("id", exceptPaymentId)
      .limit(1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;

    if (error) {
      throw new Error("Gagal memeriksa pembayaran aktif.", { cause: error });
    }
    return Array.isArray(data) && data.length > 0;
  }

  async releaseStock(orderId: string, signal?: AbortSignal) {
    let query = this.admin.rpc("release_stock", {
      p_order_id: orderId,
    });
    if (signal) query = query.abortSignal(signal);
    const { error } = await query;
    if (error) {
      throw new Error("Gagal mengembalikan stok.", { cause: error });
    }
  }
}
