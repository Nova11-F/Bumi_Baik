import { describe, expect, it, vi } from "vitest";
import { MockProvider } from "./mock";
import {
  handlePaymentWebhook,
  type PaymentWebhookDependencies,
} from "./webhook";

const provider = new MockProvider("test-secret");
const paymentRef = "b7997d5e-1ffc-4726-9aa4-a1ec4f1b9be0";

function requestForEvent(
  amount: number,
  eventId = "event-1",
  status = "paid",
) {
  const rawBody = JSON.stringify({
    event_id: eventId,
    transaction_id: paymentRef,
    status,
    amount,
  });

  return new Request("http://localhost/api/payments/paymenku/webhook", {
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
    applyEvent: vi.fn(async () => "processed" as const),
    ...overrides,
  };
}

describe("handlePaymentWebhook", () => {
  it("rejects an invalid signature before applying an event", async () => {
    const deps = dependencies();
    const request = new Request(
      "http://localhost/api/payments/paymenku/webhook",
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
    expect(deps.applyEvent).not.toHaveBeenCalled();
  });

  it("returns 500 when event processing fails", async () => {
    const deps = dependencies({
      applyEvent: vi.fn(async () => {
        throw new Error("PAYMENT_STATUS_UPDATE_FAILED");
      }),
    });

    const response = await handlePaymentWebhook(requestForEvent(149_000), deps);

    expect(response.status).toBe(500);
  });

  it("returns 500 when the payment amount does not match", async () => {
    const deps = dependencies({
      applyEvent: vi.fn(async () => {
        throw new Error("PAYMENT_AMOUNT_MISMATCH");
      }),
    });

    const response = await handlePaymentWebhook(requestForEvent(149_000), deps);

    expect(response.status).toBe(500);
  });

  it("returns duplicate for an event that was already processed", async () => {
    const deps = dependencies({
      applyEvent: vi.fn(async () => "duplicate" as const),
    });

    const response = await handlePaymentWebhook(requestForEvent(149_000), deps);
    const body = (await response.json()) as { result: string };

    expect(response.status).toBe(200);
    expect(body.result).toBe("duplicate");
  });

  it("rejects a malformed payload", async () => {
    const rawBody = JSON.stringify({ event_id: "event-1" });
    const request = new Request(
      "http://localhost/api/payments/paymenku/webhook",
      {
        method: "POST",
        headers: { "x-mock-signature": provider.signWebhook(rawBody) },
        body: rawBody,
      },
    );

    const response = await handlePaymentWebhook(request, dependencies());

    expect(response.status).toBe(400);
  });
});
