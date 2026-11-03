import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PaymenkuApiError, PaymenkuProvider } from "./paymenku";
import { WebhookVerificationError } from "./types";

const BASE = "https://paymenku.test/api/v1";
const SECRET = "whsec_test";

function providerWith(
  response: Response,
  fetchImpl = vi.fn<typeof fetch>(async () => response),
) {
  return {
    provider: new PaymenkuProvider({
      baseUrl: BASE,
      apiKey: "sk_test_123",
      webhookSecret: SECRET,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }),
    fetchImpl,
  };
}

function signedWebhook(
  payload: unknown,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return {
    rawBody,
    headers: new Headers({
      "x-paymenku-timestamp": String(timestamp),
      "x-paymenku-signature": signature,
    }),
  };
}

describe("PaymenkuProvider.listChannels", () => {
  it("maps channels, keeps max_amount null, and derives group from type", async () => {
    const { provider } = providerWith(
      new Response(
        JSON.stringify({
          status: "success",
          data: [
            {
              code: "qris",
              name: "QRIS",
              type: "qris",
              group: null,
              flow_type: "direct",
              fee_mode: "merchant",
              fee_flat: 0,
              fee_percent: 0,
              min_amount: 1000,
              max_amount: null,
              icon: "https://example.com/qris.png",
            },
            {
              code: "bnc_va",
              name: "BNC VA",
              type: "va",
              group: null,
              flow_type: "direct",
              fee_mode: "customer",
              fee_flat: "2500",
              fee_percent: "0.7",
              min_amount: "10000",
              max_amount: "2500000",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const channels = await provider.listChannels();

    expect(channels[0]).toMatchObject({
      code: "qris",
      group: "QRIS",
      maxAmount: null,
      feeMode: "merchant",
      minAmount: 1000,
    });
    expect(channels[1]).toMatchObject({
      code: "bnc_va",
      group: "Virtual Account",
      feeMode: "customer",
      feeFlat: 2500,
      feePercent: 0.7,
      maxAmount: 2_500_000,
    });
  });

  it("throws when the envelope reports an error even with HTTP 200", async () => {
    const { provider } = providerWith(
      new Response(JSON.stringify({ status: "error", message: "Nope" }), {
        status: 200,
      }),
    );

    await expect(provider.listChannels()).rejects.toBeInstanceOf(
      PaymenkuApiError,
    );
  });

  it("uses a 10-second fetch timeout and returns a clear API error", async () => {
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    const fetchImpl = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(init.signal?.reason),
            { once: true },
          );
        }),
    );
    const { provider } = providerWith(new Response(), fetchImpl);

    const request = provider.listChannels();
    controller.abort(new DOMException("Timed out", "TimeoutError"));

    await expect(request).rejects.toMatchObject({
      httpStatus: 504,
      message: "PAYMENKU_REQUEST_TIMEOUT",
    });
    expect(timeout).toHaveBeenCalledWith(10_000);
    timeout.mockRestore();
  });
});

describe("PaymenkuProvider.createPayment", () => {
  it("uses Bearer auth, an idempotency key, and parses the decimal amount", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            status: "success",
            data: {
              trx_id: "trx_1",
              reference_id: "BB-20261103-ABC123",
              amount: "15305.00",
              status: "pending",
              pay_url: "https://pay.example/trx_1",
              sandbox_mode: true,
              simulator_url: "https://sim.example/trx_1",
              payment_info: {
                qr_url: "https://qr.example/1",
                qr_string: "000201",
                expiration_date: "2026-11-03T10:00:00.000Z",
              },
            },
          }),
          { status: 200 },
        ),
    );
    const { provider } = providerWith(new Response(), fetchImpl);

    const result = await provider.createPayment({
      orderId: "order-1",
      referenceId: "BB-20261103-ABC123",
      channelCode: "qris",
      amountIdr: 15_000,
      customer: { name: "Ayu", email: "ayu@example.com" },
      items: [{ name: "Sabun", quantity: 2 }],
      returnUrl: "https://bumi.example/pesanan/order-1",
    });

    expect(result).toMatchObject({
      providerRef: "trx_1",
      payUrl: "https://pay.example/trx_1",
      payableAmountIdr: 15_305,
      sandbox: true,
      simulatorUrl: "https://sim.example/trx_1",
    });
    expect(result.expiresAt?.toISOString()).toBe("2026-11-03T10:00:00.000Z");
    expect(result.paymentInfo.qrString).toBe("000201");

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}/transaction/create`);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer sk_test_123",
    );
    expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe(
      "BB-20261103-ABC123",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      channel_code: "qris",
      amount: 15_000,
      reference_id: "BB-20261103-ABC123",
    });
  });

  it("exposes Retry-After for 429 responses", async () => {
    const { provider } = providerWith(
      new Response(JSON.stringify({ status: "error", message: "Slow down" }), {
        status: 429,
        headers: { "Retry-After": "12" },
      }),
    );

    await expect(
      provider.createPayment({
        orderId: "order-1",
        referenceId: "BB-1",
        channelCode: "qris",
        amountIdr: 15_000,
        customer: { name: "Ayu", email: "ayu@example.com" },
        items: [],
        returnUrl: "https://bumi.example/pesanan/order-1",
      }),
    ).rejects.toMatchObject({
      httpStatus: 429,
      retryAfterSeconds: 12,
    });
  });
});

describe("PaymenkuProvider.getStatus", () => {
  it("maps the provider status to a payment event", async () => {
    const { provider } = providerWith(
      new Response(
        JSON.stringify({
          status: "success",
          data: {
            trx_id: "trx_1",
            reference_id: "BB-1",
            status: "paid",
            amount: "15305.00",
            paid_at: "2026-11-03T09:00:00.000Z",
          },
        }),
        { status: 200 },
      ),
    );

    const event = await provider.getStatus("trx_1");

    expect(event).toMatchObject({
      eventId: "trx_1:paid",
      providerRef: "trx_1",
      referenceId: "BB-1",
      status: "paid",
      amountIdr: 15_305,
    });
    expect(event.paidAt?.toISOString()).toBe("2026-11-03T09:00:00.000Z");
  });
});

describe("PaymenkuProvider.verifyAndParseWebhook", () => {
  const provider = new PaymenkuProvider({
    baseUrl: BASE,
    apiKey: "sk_test_123",
    webhookSecret: SECRET,
    webhookToleranceSeconds: 300,
  });

  it("verifies the raw body signature and parses wrapped data", () => {
    const { rawBody, headers } = signedWebhook({
      data: {
        trx_id: "trx_1",
        reference_id: "BB-1",
        status: "paid",
        amount: "15305.00",
        paid_at: "2026-11-03T09:00:00.000Z",
      },
    });

    const event = provider.verifyAndParseWebhook(rawBody, headers);

    expect(event).toMatchObject({
      eventId: "trx_1:paid",
      providerRef: "trx_1",
      referenceId: "BB-1",
      status: "paid",
      amountIdr: 15_305,
    });
  });

  it("rejects a wrong signature", () => {
    const { rawBody, headers } = signedWebhook({
      trx_id: "trx_1",
      status: "paid",
    });
    headers.set("x-paymenku-signature", "deadbeef");

    expect(() => provider.verifyAndParseWebhook(rawBody, headers)).toThrow(
      WebhookVerificationError,
    );
  });

  it("rejects a stale timestamp", () => {
    const { rawBody, headers } = signedWebhook(
      { trx_id: "trx_1", status: "paid" },
      Math.floor(Date.now() / 1000) - 3_600,
    );

    expect(() => provider.verifyAndParseWebhook(rawBody, headers)).toThrow(
      /STALE_TIMESTAMP/,
    );
  });

  it("rejects an unknown status", () => {
    const { rawBody, headers } = signedWebhook({
      trx_id: "trx_1",
      status: "unknown",
    });

    expect(() => provider.verifyAndParseWebhook(rawBody, headers)).toThrow(
      /MALFORMED_PAYLOAD/,
    );
  });
});
