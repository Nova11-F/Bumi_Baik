import { NextResponse, type NextRequest } from "next/server";
import {
  applyPaymentEvent,
  createSupabasePaymentEventStore,
} from "@/lib/server/payments/apply-event";
import {
  getPaymentProvider,
  getPaymentProviderName,
} from "@/lib/server/payments";
import { PaymenkuApiError } from "@/lib/server/payments/paymenku";
import type {
  PaymentProvider,
  PaymentProviderName,
} from "@/lib/server/payments/types";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_ORDERS = 50;
const CONCURRENCY = 5;

type CronOrder = { id: string };

async function expireOrder(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .eq("status", "pending")
    .select("id");

  if (error) throw error;
  if (!Array.isArray(data) || data.length === 0) return false;

  const { error: paymentError } = await admin
    .from("payments")
    .update({ status: "expired" })
    .eq("order_id", orderId)
    .eq("status", "initiated");

  if (paymentError) {
    console.error("Could not expire payment rows", { orderId, paymentError });
  }

  const { error: stockError } = await admin.rpc("release_stock", {
    p_order_id: orderId,
  });
  if (stockError) {
    throw stockError;
  }
  return true;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          code: "CRON_NOT_CONFIGURED",
          message: "Cron belum dikonfigurasi.",
        },
      },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Akses tidak diizinkan." } },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("id")
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .limit(MAX_ORDERS);

  if (error) {
    console.error("Order expiration cron could not load orders", error);
    return NextResponse.json(
      {
        error: {
          code: "ORDER_EXPIRATION_FAILED",
          message: "Pesanan belum berhasil diperbarui.",
        },
      },
      { status: 500 },
    );
  }

  const orders = (data ?? []) as CronOrder[];
  let providerName: PaymentProviderName;
  let provider: PaymentProvider | null;
  try {
    providerName = getPaymentProviderName();
    provider = providerName === "paymenku" ? getPaymentProvider() : null;
  } catch (configError) {
    console.error("Payment provider configuration is invalid", configError);
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message: "Penyedia pembayaran belum dikonfigurasi.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const store = createSupabasePaymentEventStore(admin);

  let expired = 0;
  let checked = 0;
  let skipped = 0;
  let rateLimited = false;
  let retryAfterSeconds: number | undefined;
  let failed = false;

  async function processOrder(order: CronOrder) {
    if (provider && providerName === "paymenku") {
      const { data: payment, error: paymentError } = await admin
        .from("payments")
        .select("provider_ref")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (paymentError) {
        console.error("Cron could not load payment", {
          orderId: order.id,
          paymentError,
        });
        skipped += 1;
        return;
      }

      if (payment?.provider_ref) {
        try {
          const event = await provider.getStatus(payment.provider_ref);
          await applyPaymentEvent(store, providerName, event);
          checked += 1;
        } catch (syncError) {
          if (syncError instanceof PaymenkuApiError) {
            if (syncError.httpStatus === 429) {
              rateLimited = true;
              retryAfterSeconds = syncError.retryAfterSeconds;
              return;
            }
          }
          console.error("Cron payment reconciliation failed", {
            orderId: order.id,
            providerRef: payment.provider_ref,
            syncError,
          });
          skipped += 1;
          return;
        }
      }
    }

    try {
      if (await expireOrder(admin, order.id)) {
        expired += 1;
      }
    } catch (expireError) {
      failed = true;
      console.error("Cron could not expire order", {
        orderId: order.id,
        expireError,
      });
    }
  }

  for (let index = 0; index < orders.length; index += CONCURRENCY) {
    if (rateLimited) break;
    const chunk = orders.slice(index, index + CONCURRENCY);
    await Promise.all(chunk.map((order) => processOrder(order)));
  }

  if (failed) {
    return NextResponse.json(
      {
        error: {
          code: "ORDER_EXPIRATION_PARTIAL",
          message: "Sebagian pesanan belum berhasil diperbarui.",
        },
        expired,
        checked,
        skipped,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      expired,
      checked,
      skipped,
      ...(rateLimited ? { rateLimited: true, retryAfterSeconds } : {}),
    },
    {
      status: rateLimited ? 429 : 200,
      headers: {
        "Cache-Control": "no-store",
        ...(rateLimited && retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : {}),
      },
    },
  );
}
