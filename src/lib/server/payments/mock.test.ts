import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock";

describe("MockProvider webhook signatures", () => {
  const provider = new MockProvider("test-secret");
  const payload = JSON.stringify({
    event_id: "event-1",
    transaction_id: "b7997d5e-1ffc-4726-9aa4-a1ec4f1b9be0",
    status: "paid",
    amount: 149_000,
    paid_at: "2026-11-02T08:00:00.000Z",
  });

  it("verifies and parses a signed webhook", () => {
    const event = provider.verifyAndParseWebhook(
      payload,
      new Headers({ "x-mock-signature": provider.signWebhook(payload) }),
    );

    expect(event).toMatchObject({
      eventId: "event-1",
      providerRef: "b7997d5e-1ffc-4726-9aa4-a1ec4f1b9be0",
      status: "paid",
      amountIdr: 149_000,
    });
    expect(event.paidAt?.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("rejects a signature that does not match the raw body", () => {
    expect(() =>
      provider.verifyAndParseWebhook(
        payload,
        new Headers({ "x-mock-signature": "invalid" }),
      ),
    ).toThrow("INVALID_SIGNATURE");
  });
});
