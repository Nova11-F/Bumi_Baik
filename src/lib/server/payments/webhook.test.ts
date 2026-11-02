import { describe, expect, it, vi } from "vitest";
import { MockProvider } from "./mock";
import {
  handlePaymentWebhook,
  type PaymentWebhookDependencies,
} from "./webhook";

const provider = new MockProvider("test-secret");
const paymentRef = "b7997d5e-1ffc-4726-9aa4-a1ec4f1b9be0";

function requestForEvent(amount: number, eventId = "event-1") {
  const rawBody = JSON.stringify({
    event_id: eventId,
    transaction_id: paymentRef,
    status: "paid",
    amount,
  });

  return new Request("http://localhost/api/payments/paymentku/webhook", {
    method: "POST",
    headers: { "x-mock-signature": provider.signWebhook(rawBody) },
    body: rawBody,
  });
}

function dependencies(
  overrides: Partial<PaymentWebhookDependencies> = {},
): PaymentWebhookDependencies {
  return {
    providerName: "mock",
    verifyAndParseWebhook: (rawBody, headers) =>
      provider.verifyAndParseWebhook(rawBody, headers),
    findExpectedAmount: vi.fn(async () => 149_000),
    processEvent: vi.fn(async () => "processed" as const),
    ...overrides,
  };
}

describe("handlePaymentWebhook", () => {
  it("rejects an invalid signature before looking up or changing a payment", async () => {
    const deps = dependencies();
    const request = new Request(
      "http://localhost/api/payments/paymentku/webhook",
      {
        method: "POST",
        headers: { "x-mock-signature": "wrong" },
        body: JSON.stringify({
          event_id: "event-1",
          transaction_id: paymentRef,
          status: "paid",
          amount: 149_000,
        }),
      },
    );

    const response = await handlePaymentWebhook(request, deps);

    expect(response.status).toBe(401);
    expect(deps.findExpectedAmount).not.toHaveBeenCalled();
    expect(deps.processEvent).not.toHaveBeenCalled();
  });

  it("rejects a mismatched amount without recording the event", async () => {
    const deps = dependencies({
      findExpectedAmount: vi.fn(async () => 150_000),
    });

    const response = await handlePaymentWebhook(requestForEvent(149_000), deps);

    expect(response.status).toBe(400);
    expect(deps.processEvent).not.toHaveBeenCalled();
  });

  it("does not apply the same event twice", async () => {
    const eventIds = new Set<string>();
    let effects = 0;
    const deps = dependencies({
      processEvent: vi.fn(async (event) => {
        if (eventIds.has(event.eventId)) return "duplicate";
        eventIds.add(event.eventId);
        effects += 1;
        return "processed";
      }),
    });

    const first = await handlePaymentWebhook(requestForEvent(149_000), deps);
    const second = await handlePaymentWebhook(requestForEvent(149_000), deps);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(effects).toBe(1);
  });
});
