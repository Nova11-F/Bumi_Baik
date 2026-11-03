import { describe, expect, it, vi } from "vitest";
import {
  applyPaymentEvent,
  type OrderRecord,
  type PaymentEventStore,
  type PaymentRecord,
} from "./apply-event";
import type { Json, OrderStatus, PaymentStatus } from "@/types";
import type { PaymentEvent } from "./types";

class FakeStore implements PaymentEventStore {
  payments = new Map<string, PaymentRecord>();
  orders = new Map<string, OrderRecord>();
  events = new Map<
    string,
    {
      status: "processing" | "processed" | "failed";
      payload: Json;
      claimedAt: string;
    }
  >();
  releases: string[] = [];
  failNextStatusUpdate = false;
  statusUpdateCalls = 0;
  orderTransitionCalls = 0;
  stallFindPayment = false;

  addPayment(payment: PaymentRecord) {
    this.payments.set(payment.id, { ...payment });
    return this;
  }

  addOrder(order: OrderRecord) {
    this.orders.set(order.id, { ...order });
    return this;
  }

  async beginEvent(
    provider: string,
    eventId: string,
    _payload: Json,
  ): Promise<string | null> {
    const key = `${provider}:${eventId}`;
    const existing = this.events.get(key);
    if (existing?.status === "processed") return null;
    if (existing?.status === "processing") {
      const staleAt = Date.now() - 2 * 60 * 1000;
      if (Date.parse(existing.claimedAt) >= staleAt) {
        throw new Error("PAYMENT_EVENT_IN_PROGRESS");
      }
    }
    const claimedAt = new Date().toISOString();
    this.events.set(key, {
      status: "processing",
      payload: _payload,
      claimedAt,
    });
    return claimedAt;
  }

  async completeEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void> {
    const event = this.events.get(`${provider}:${eventId}`);
    if (event?.status === "processing" && event.claimedAt === claimedAt) {
      event.status = "processed";
      return;
    }
    throw new Error("PAYMENT_EVENT_CLAIM_LOST");
  }

  async failEvent(
    provider: string,
    eventId: string,
    claimedAt: string,
  ): Promise<void> {
    const event = this.events.get(`${provider}:${eventId}`);
    if (event?.status === "processing" && event.claimedAt === claimedAt) {
      event.status = "failed";
    }
  }

  async findPayment(
    _provider: string,
    providerRef: string,
    signal?: AbortSignal,
  ): Promise<PaymentRecord | null> {
    if (this.stallFindPayment) {
      await new Promise<never>((_, reject) => {
        signal?.addEventListener(
          "abort",
          () => reject(new Error("PAYMENT_EVENT_BODY_ABORTED")),
          { once: true },
        );
      });
    }
    return (
      [...this.payments.values()].find(
        (payment) => payment.provider_ref === providerRef,
      ) ?? null
    );
  }

  async findOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
    return (
      [...this.orders.values()].find(
        (order) => order.order_number === orderNumber,
      ) ?? null
    );
  }

  async findLatestPaymentForOrder(
    orderId: string,
  ): Promise<PaymentRecord | null> {
    return (
      [...this.payments.values()]
        .filter((payment) => payment.order_id === orderId)
        .at(-1) ?? null
    );
  }

  async attachProviderRef(paymentId: string, providerRef: string) {
    const payment = this.payments.get(paymentId);
    if (payment) payment.provider_ref = providerRef;
  }

  async createPaymentFromEvent(
    order: OrderRecord,
    _provider: string,
    event: PaymentEvent,
  ): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: `created-${this.payments.size + 1}`,
      order_id: order.id,
      provider_ref: event.providerRef,
      status: event.status === "paid" ? "paid" : "initiated",
      amount_idr: order.total_idr,
      payable_idr: event.amountIdr ?? order.total_idr,
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    _paidAt: Date | undefined,
    _raw: unknown,
    allowedFrom: PaymentStatus[],
  ): Promise<boolean> {
    this.statusUpdateCalls += 1;
    if (this.failNextStatusUpdate) {
      this.failNextStatusUpdate = false;
      throw new Error("PAYMENT_STATUS_UPDATE_FAILED");
    }
    const payment = this.payments.get(paymentId);
    if (!payment || !allowedFrom.includes(payment.status)) return false;
    payment.status = status;
    return true;
  }

  async transitionOrder(
    orderId: string,
    from: OrderStatus[],
    to: OrderStatus,
  ): Promise<boolean> {
    this.orderTransitionCalls += 1;
    const order = this.orders.get(orderId);
    if (!order || !from.includes(order.status)) return false;
    order.status = to;
    return true;
  }

  async hasActivePayment(
    orderId: string,
    exceptPaymentId: string,
  ): Promise<boolean> {
    return [...this.payments.values()].some(
      (payment) =>
        payment.order_id === orderId &&
        payment.status === "initiated" &&
        payment.id !== exceptPaymentId,
    );
  }

  async releaseStock(orderId: string) {
    this.releases.push(orderId);
  }
}

function paidEvent(overrides: Partial<PaymentEvent> = {}): PaymentEvent {
  return {
    eventId: "trx_1:paid",
    providerRef: "trx_1",
    referenceId: "BB-20261103-ABC123",
    status: "paid",
    amountIdr: 150_000,
    raw: { trx_id: "trx_1", status: "paid", amount: "150000.00" } as Json,
    ...overrides,
  };
}

function expiredEvent(
  status: "expired" | "cancelled" = "expired",
): PaymentEvent {
  return {
    eventId: `trx_1:${status}`,
    providerRef: "trx_1",
    referenceId: "BB-20261103-ABC123",
    status,
    amountIdr: 150_000,
    raw: { trx_id: "trx_1", status } as Json,
  };
}

function storeWithPendingOrder() {
  return new FakeStore()
    .addOrder({
      id: "order-1",
      order_number: "BB-20261103-ABC123",
      status: "pending",
      total_idr: 150_000,
    })
    .addPayment({
      id: "payment-1",
      order_id: "order-1",
      provider_ref: "trx_1",
      status: "initiated",
      amount_idr: 150_000,
      payable_idr: 150_000,
    });
}

describe("applyPaymentEvent", () => {
  it("takes over a processing event after its claim is older than two minutes", async () => {
    const store = storeWithPendingOrder();
    const staleClaimedAt = new Date(
      Date.now() - 2 * 60 * 1000 - 1,
    ).toISOString();
    store.events.set("paymenku:trx_1:paid", {
      status: "processing",
      payload: {},
      claimedAt: staleClaimedAt,
    });

    const result = await applyPaymentEvent(store, "paymenku", paidEvent());

    expect(result).toBe("processed");
    const event = store.events.get("paymenku:trx_1:paid");
    expect(event?.status).toBe("processed");
    expect(Date.parse(event?.claimedAt ?? "")).toBeGreaterThan(
      Date.parse(staleClaimedAt),
    );
  });

  it("does not take over a processing event with a fresh claim", async () => {
    const store = storeWithPendingOrder();
    store.events.set("paymenku:trx_1:paid", {
      status: "processing",
      payload: {},
      claimedAt: new Date().toISOString(),
    });

    await expect(
      applyPaymentEvent(store, "paymenku", paidEvent()),
    ).rejects.toThrow("PAYMENT_EVENT_IN_PROGRESS");
    expect(store.statusUpdateCalls).toBe(0);
    expect(store.events.get("paymenku:trx_1:paid")?.status).toBe("processing");
  });

  it("allows only one concurrent caller to apply the event", async () => {
    const store = storeWithPendingOrder();

    const results = await Promise.allSettled([
      applyPaymentEvent(store, "paymenku", paidEvent()),
      applyPaymentEvent(store, "paymenku", paidEvent()),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter(
        (result) =>
          result.status === "rejected" &&
          result.reason instanceof Error &&
          result.reason.message === "PAYMENT_EVENT_IN_PROGRESS",
      ),
    ).toHaveLength(1);
    expect(store.statusUpdateCalls).toBe(1);
  });

  it("marks the event failed when the total processing timeout is reached", async () => {
    vi.useFakeTimers();
    try {
      const store = storeWithPendingOrder();
      store.stallFindPayment = true;

      const processing = applyPaymentEvent(store, "paymenku", paidEvent());
      const timedOut = expect(processing).rejects.toThrow(
        "PAYMENT_EVENT_TIMEOUT",
      );
      await vi.advanceTimersByTimeAsync(25_000);

      await timedOut;
      expect(store.events.get("paymenku:trx_1:paid")?.status).toBe("failed");
      expect(store.statusUpdateCalls).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks the payment and order paid for a matching paid event", async () => {
    const store = storeWithPendingOrder();

    const result = await applyPaymentEvent(store, "paymenku", paidEvent());

    expect(result).toBe("processed");
    expect(store.payments.get("payment-1")?.status).toBe("paid");
    expect(store.orders.get("order-1")?.status).toBe("paid");
    expect(store.releases).toHaveLength(0);
  });

  it("treats a repeated event as duplicate", async () => {
    const store = storeWithPendingOrder();

    expect(await applyPaymentEvent(store, "paymenku", paidEvent())).toBe(
      "processed",
    );
    const statusUpdateCalls = store.statusUpdateCalls;
    const orderTransitionCalls = store.orderTransitionCalls;
    expect(await applyPaymentEvent(store, "paymenku", paidEvent())).toBe(
      "duplicate",
    );
    expect(store.statusUpdateCalls).toBe(statusUpdateCalls);
    expect(store.orderTransitionCalls).toBe(orderTransitionCalls);
    expect(store.payments.get("payment-1")?.status).toBe("paid");
    expect(store.orders.get("order-1")?.status).toBe("paid");
  });

  it("retries a failed event and applies it successfully", async () => {
    const store = storeWithPendingOrder();
    store.failNextStatusUpdate = true;

    await expect(
      applyPaymentEvent(store, "paymenku", paidEvent()),
    ).rejects.toThrow("PAYMENT_STATUS_UPDATE_FAILED");

    expect(store.events.get("paymenku:trx_1:paid")?.status).toBe("failed");
    expect(store.payments.get("payment-1")?.status).toBe("initiated");
    expect(store.orders.get("order-1")?.status).toBe("pending");

    const result = await applyPaymentEvent(store, "paymenku", paidEvent());

    expect(result).toBe("processed");
    expect(store.events.get("paymenku:trx_1:paid")?.status).toBe("processed");
    expect(store.payments.get("payment-1")?.status).toBe("paid");
    expect(store.orders.get("order-1")?.status).toBe("paid");
  });

  it("does not mark a failed event as successfully processed", async () => {
    const store = storeWithPendingOrder();
    store.failNextStatusUpdate = true;

    await expect(
      applyPaymentEvent(store, "paymenku", paidEvent()),
    ).rejects.toThrow("PAYMENT_STATUS_UPDATE_FAILED");

    expect(store.events.get("paymenku:trx_1:paid")?.status).not.toBe(
      "processed",
    );
    expect(store.events.get("paymenku:trx_1:paid")?.status).toBe("failed");
  });

  it("rejects a paid amount that does not match the payable amount", async () => {
    const store = storeWithPendingOrder();

    await expect(
      applyPaymentEvent(store, "paymenku", paidEvent({ amountIdr: 149_000 })),
    ).rejects.toThrow("PAYMENT_AMOUNT_MISMATCH");
    expect(store.payments.get("payment-1")?.status).toBe("initiated");
    expect(store.orders.get("order-1")?.status).toBe("pending");
  });

  it("releases stock only once when expired and cancelled race", async () => {
    const store = storeWithPendingOrder();

    const [first, second] = await Promise.all([
      applyPaymentEvent(store, "paymenku", expiredEvent("expired")),
      applyPaymentEvent(store, "paymenku", expiredEvent("cancelled")),
    ]);

    expect([first, second]).toContain("processed");
    expect(store.orders.get("order-1")?.status).toBe("expired");
    expect(store.releases).toEqual(["order-1"]);
  });

  it("ignores a backwards transition from paid to expired", async () => {
    const store = new FakeStore()
      .addOrder({
        id: "order-1",
        order_number: "BB-20261103-ABC123",
        status: "paid",
        total_idr: 150_000,
      })
      .addPayment({
        id: "payment-1",
        order_id: "order-1",
        provider_ref: "trx_1",
        status: "paid",
        amount_idr: 150_000,
        payable_idr: 150_000,
      });

    const result = await applyPaymentEvent(
      store,
      "paymenku",
      expiredEvent("expired"),
    );

    expect(result).toBe("ignored");
    expect(store.payments.get("payment-1")?.status).toBe("paid");
    expect(store.orders.get("order-1")?.status).toBe("paid");
    expect(store.releases).toHaveLength(0);
  });

  it("keeps the order expired but marks a late payment paid", async () => {
    const store = new FakeStore()
      .addOrder({
        id: "order-1",
        order_number: "BB-20261103-ABC123",
        status: "expired",
        total_idr: 150_000,
      })
      .addPayment({
        id: "payment-1",
        order_id: "order-1",
        provider_ref: "trx_1",
        status: "expired",
        amount_idr: 150_000,
        payable_idr: 150_000,
      });

    const result = await applyPaymentEvent(store, "paymenku", paidEvent());

    expect(result).toBe("processed");
    expect(store.payments.get("payment-1")?.status).toBe("paid");
    expect(store.orders.get("order-1")?.status).toBe("expired");
    expect(store.releases).toHaveLength(0);
  });

  it("does not expire an order while another payment is still active", async () => {
    const store = storeWithPendingOrder().addPayment({
      id: "payment-2",
      order_id: "order-1",
      provider_ref: "trx_2",
      status: "initiated",
      amount_idr: 150_000,
      payable_idr: 150_000,
    });

    await applyPaymentEvent(store, "paymenku", expiredEvent("expired"));

    expect(store.payments.get("payment-1")?.status).toBe("expired");
    expect(store.orders.get("order-1")?.status).toBe("pending");
    expect(store.releases).toHaveLength(0);
  });

  it("cancels a paid order on refund without releasing stock", async () => {
    const store = new FakeStore()
      .addOrder({
        id: "order-1",
        order_number: "BB-20261103-ABC123",
        status: "paid",
        total_idr: 150_000,
      })
      .addPayment({
        id: "payment-1",
        order_id: "order-1",
        provider_ref: "trx_1",
        status: "paid",
        amount_idr: 150_000,
        payable_idr: 150_000,
      });

    const result = await applyPaymentEvent(store, "paymenku", {
      eventId: "trx_1:refunded",
      providerRef: "trx_1",
      referenceId: "BB-20261103-ABC123",
      status: "refunded",
      raw: { trx_id: "trx_1", status: "refunded" } as Json,
    });

    expect(result).toBe("processed");
    expect(store.payments.get("payment-1")?.status).toBe("refunded");
    expect(store.orders.get("order-1")?.status).toBe("cancelled");
    expect(store.releases).toHaveLength(0);
  });

  it("recovers a missing payment record from referenceId", async () => {
    const store = new FakeStore().addOrder({
      id: "order-1",
      order_number: "BB-20261103-ABC123",
      status: "pending",
      total_idr: 150_000,
    });

    const result = await applyPaymentEvent(
      store,
      "paymenku",
      paidEvent({ referenceId: "BB-20261103-ABC123-R2" }),
    );

    expect(result).toBe("processed");
    expect(store.payments.size).toBe(1);
    expect(store.orders.get("order-1")?.status).toBe("paid");
  });

  it("ignores an event for an unknown transaction but records it", async () => {
    const store = new FakeStore();

    const result = await applyPaymentEvent(
      store,
      "paymenku",
      paidEvent({ referenceId: "UNKNOWN" }),
    );

    expect(result).toBe("ignored");
    expect(store.events.size).toBe(1);
  });
});
