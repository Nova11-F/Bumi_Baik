import crypto from "node:crypto";
import { z } from "zod";
import type {
  CreatePaymentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

const mockEventSchema = z.object({
  event_id: z.string().min(1).max(200),
  transaction_id: z.string().uuid(),
  status: z.enum(["paid", "failed", "expired"]),
  amount: z.number().int().nonnegative(),
  paid_at: z.string().datetime().optional(),
});

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

  async createPayment(): Promise<CreatePaymentResult> {
    const providerRef = crypto.randomUUID();
    return {
      providerRef,
      paymentUrl: `/mock-pay/${providerRef}`,
    };
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

    if (!valid) throw new Error("INVALID_SIGNATURE");

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      throw new Error("INVALID_WEBHOOK_PAYLOAD", { cause: error });
    }

    const parsed = mockEventSchema.safeParse(payload);
    if (!parsed.success) {
      throw new Error("INVALID_WEBHOOK_PAYLOAD", { cause: parsed.error });
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
