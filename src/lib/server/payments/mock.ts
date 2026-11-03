import crypto from "node:crypto";
import { z } from "zod";
import {
  WebhookVerificationError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentChannel,
  type PaymentEvent,
  type PaymentProvider,
} from "./types";

const mockEventSchema = z.object({
  event_id: z.string().min(1).max(200),
  transaction_id: z.string().uuid(),
  status: z.enum(["paid", "failed", "expired", "cancelled", "refunded"]),
  amount: z.number().int().nonnegative(),
  paid_at: z.string().datetime().optional(),
});

const MOCK_CHANNELS: PaymentChannel[] = [
  {
    code: "qris",
    name: "QRIS",
    type: "qris",
    group: "QRIS",
    flowType: "direct",
    feeMode: "merchant",
    feeFlat: 0,
    feePercent: 0,
    minAmount: 1_000,
    maxAmount: null,
  },
  {
    code: "bca_va",
    name: "BCA Virtual Account",
    type: "va",
    group: "Virtual Account",
    flowType: "direct",
    feeMode: "merchant",
    feeFlat: 0,
    feePercent: 0,
    minAmount: 10_000,
    maxAmount: null,
  },
  {
    code: "ovo",
    name: "OVO",
    type: "ewallet",
    group: "E-Wallet",
    flowType: "redirect",
    feeMode: "merchant",
    feeFlat: 0,
    feePercent: 0,
    minAmount: 10_000,
    maxAmount: null,
  },
  {
    code: "indomaret",
    name: "Indomaret",
    type: "cstore",
    group: "Gerai Ritel",
    flowType: "direct",
    feeMode: "merchant",
    feeFlat: 0,
    feePercent: 0,
    minAmount: 15_000,
    maxAmount: 2_500_000,
  },
  {
    code: "bnc_va",
    name: "BNC Virtual Account",
    type: "va",
    group: "Lainnya",
    flowType: "direct",
    feeMode: "merchant",
    feeFlat: 0,
    feePercent: 0,
    minAmount: 10_000,
    maxAmount: null,
  },
];

export function isMockPaymentEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.PAYMENT_PROVIDER ?? "mock") === "mock"
  );
}

export class MockProvider implements PaymentProvider {
  private readonly secret: string;

  constructor(secret = process.env.SUPABASE_SECRET_KEY) {
    if (!secret) {
      throw new Error("SUPABASE_SECRET_KEY wajib diisi untuk webhook MOCK.");
    }

    this.secret = secret;
  }

  async listChannels(): Promise<PaymentChannel[]> {
    return MOCK_CHANNELS.map((channel) => ({ ...channel }));
  }

  async createPayment(
    input: CreatePaymentInput,
  ): Promise<CreatePaymentResult> {
    const providerRef = crypto.randomUUID();
    return {
      providerRef,
      payUrl: `/mock-pay/${providerRef}`,
      payableAmountIdr: input.amountIdr,
      expiresAt: null,
      paymentInfo: {},
      sandbox: true,
      raw: {
        provider: "mock",
        reference_id: input.referenceId,
        channel_code: input.channelCode,
        amount: input.amountIdr,
      },
    };
  }

  async getStatus(): Promise<PaymentEvent> {
    throw new Error("MockProvider tidak mendukung cek status.");
  }

  signWebhook(rawBody: string): string {
    return crypto
      .createHmac("sha256", this.secret)
      .update(rawBody)
      .digest("hex");
  }

  verifyAndParseWebhook(rawBody: string, headers: Headers): PaymentEvent {
    const signature = headers.get("x-mock-signature") ?? "";
    const expected = this.signWebhook(rawBody);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    const valid =
      signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!valid) throw new WebhookVerificationError("INVALID_SIGNATURE");

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }

    const parsed = mockEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }

    return {
      eventId: parsed.data.event_id,
      providerRef: parsed.data.transaction_id,
      status: parsed.data.status,
      amountIdr: parsed.data.amount,
      ...(parsed.data.paid_at ? { paidAt: new Date(parsed.data.paid_at) } : {}),
      raw: parsed.data,
    };
  }
}
