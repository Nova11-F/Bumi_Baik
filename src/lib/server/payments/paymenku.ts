import "server-only";

import crypto from "node:crypto";
import { z } from "zod";
import {
  WebhookVerificationError,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type PaymentChannel,
  type PaymentEvent,
  type PaymentInfo,
  type PaymentProvider,
  type PaymentStatus,
} from "./types";

const DEFAULT_BASE_URL = "https://paymenku.com/api/v1";
const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "failed",
  "expired",
  "cancelled",
  "refunded",
];

const GROUP_BY_TYPE: Record<string, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
  cstore: "Gerai Ritel",
};

const channelSchema = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    type: z.string().optional(),
    group: z.string().nullable().optional(),
    flow_type: z.string().optional(),
    icon: z.string().optional(),
    fee_mode: z.string().optional(),
    fee_flat: z.union([z.number(), z.string()]).nullable().optional(),
    fee_percent: z.union([z.number(), z.string()]).nullable().optional(),
    min_amount: z.union([z.number(), z.string()]).nullable().optional(),
    max_amount: z.union([z.number(), z.string()]).nullable().optional(),
  })
  .passthrough();

const paymentInfoSchema = z
  .object({
    qr_url: z.string().optional(),
    qr_string: z.string().optional(),
    bank: z.string().optional(),
    va_number: z.string().optional(),
    checkout_url: z.string().optional(),
    store: z.string().optional(),
    payment_code: z.string().optional(),
    expiration_date: z.string().optional(),
  })
  .passthrough();

const transactionSchema = z
  .object({
    trx_id: z.string().min(1),
    reference_id: z.string().optional(),
    amount: z.union([z.string(), z.number()]),
    status: z.string().optional(),
    pay_url: z.string().min(1),
    payment_info: paymentInfoSchema.optional(),
    sandbox_mode: z.boolean().optional(),
    simulator_url: z.string().optional(),
  })
  .passthrough();

const statusSchema = z
  .object({
    trx_id: z.string().min(1),
    reference_id: z.string().optional(),
    status: z.string().min(1),
    amount: z.union([z.string(), z.number()]).optional(),
    paid_at: z.string().optional(),
  })
  .passthrough();

const webhookDataSchema = z
  .object({
    trx_id: z.string().min(1),
    reference_id: z.string().optional(),
    status: z.string().min(1),
    amount: z.union([z.string(), z.number()]).optional(),
    paid_at: z.string().optional(),
  })
  .passthrough();

type PaymenkuOptions = {
  baseUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
  fetchImpl?: typeof fetch;
  webhookToleranceSeconds?: number;
};

export class PaymenkuApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    message: string,
    public readonly errors?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "PaymenkuApiError";
  }
}

function toNumber(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFeeMode(value: unknown): "merchant" | "customer" | "split" {
  return value === "customer" || value === "split" ? value : "merchant";
}

function toPaymentStatus(value: string): PaymentStatus {
  if ((PAYMENT_STATUSES as string[]).includes(value)) {
    return value as PaymentStatus;
  }
  throw new PaymenkuApiError(200, `PAYMENKU_UNKNOWN_STATUS:${value}`);
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function mapPaymentInfo(
  info: z.infer<typeof paymentInfoSchema> | undefined,
): PaymentInfo {
  if (!info) return {};
  return {
    qrUrl: info.qr_url,
    qrString: info.qr_string,
    bank: info.bank,
    vaNumber: info.va_number,
    checkoutUrl: info.checkout_url,
    store: info.store,
    paymentCode: info.payment_code,
  };
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

// Nominal respons berupa string desimal ("15305.00"). Rupiah utuh, jadi bulatkan.
export function parseIdr(value: string | number): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed)) throw new Error("INVALID_AMOUNT");
  return parsed;
}

export class PaymenkuProvider implements PaymentProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly webhookToleranceSeconds: number;

  constructor(options: PaymenkuOptions = {}) {
    this.baseUrl =
      options.baseUrl ?? process.env.PAYMENKU_BASE_URL ?? DEFAULT_BASE_URL;
    this.apiKey = options.apiKey ?? process.env.PAYMENKU_API_KEY ?? "";
    this.webhookSecret =
      options.webhookSecret ?? process.env.PAYMENKU_WEBHOOK_SECRET ?? "";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.webhookToleranceSeconds =
      options.webhookToleranceSeconds ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  }

  private async call(
    path: string,
    init: RequestInit & { idempotencyKey?: string } = {},
  ): Promise<unknown> {
    if (!this.apiKey) {
      throw new PaymenkuApiError(500, "PAYMENKU_API_KEY_MISSING");
    }

    const signal = AbortSignal.timeout(10_000);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(init.idempotencyKey
            ? { "Idempotency-Key": init.idempotencyKey }
            : {}),
        },
        signal,
        cache: "no-store",
      });
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        throw new PaymenkuApiError(504, "PAYMENKU_REQUEST_TIMEOUT");
      }
      throw error;
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch (error) {
      if (signal.aborted || isAbortError(error)) {
        throw new PaymenkuApiError(504, "PAYMENKU_REQUEST_TIMEOUT");
      }
      // Bukan JSON.
    }

    const envelope =
      body !== null && typeof body === "object"
        ? (body as {
            status?: unknown;
            success?: unknown;
            message?: unknown;
            errors?: unknown;
            data?: unknown;
          })
        : null;

    const failed =
      !response.ok ||
      envelope?.status === "error" ||
      envelope?.success === false ||
      envelope === null;

    if (failed) {
      const retryAfter = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfter ? Number(retryAfter) : undefined;
      throw new PaymenkuApiError(
        response.status,
        typeof envelope?.message === "string"
          ? envelope.message
          : "PAYMENKU_REQUEST_FAILED",
        envelope?.errors,
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      );
    }

    return envelope?.data;
  }

  async listChannels(): Promise<PaymentChannel[]> {
    const data = await this.call("/payment-channels");
    if (!Array.isArray(data)) {
      throw new PaymenkuApiError(200, "PAYMENKU_INVALID_CHANNELS");
    }

    return data.map((raw) => {
      const parsed = channelSchema.safeParse(raw);
      if (!parsed.success) {
        throw new PaymenkuApiError(
          200,
          "PAYMENKU_INVALID_CHANNEL",
          parsed.error,
        );
      }
      const channel = parsed.data;
      const type = channel.type ?? "";
      return {
        code: channel.code,
        name: channel.name,
        type,
        group: GROUP_BY_TYPE[type] ?? (channel.group || "Lainnya"),
        flowType: channel.flow_type ?? "direct",
        feeMode: toFeeMode(channel.fee_mode),
        feeFlat: toNumber(channel.fee_flat, 0),
        feePercent: toNumber(channel.fee_percent, 0),
        minAmount: toNumber(channel.min_amount, 0),
        maxAmount: toNullableNumber(channel.max_amount),
        iconUrl: channel.icon,
      };
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const data = await this.call("/transaction/create", {
      method: "POST",
      idempotencyKey: input.referenceId,
      body: JSON.stringify({
        channel_code: input.channelCode,
        amount: input.amountIdr,
        reference_id: input.referenceId,
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        ...(input.customer.phone
          ? { customer_phone: input.customer.phone }
          : {}),
        return_url: input.returnUrl,
        order_items: input.items,
      }),
    });

    const parsed = transactionSchema.safeParse(data);
    if (!parsed.success) {
      throw new PaymenkuApiError(
        200,
        "PAYMENKU_INVALID_TRANSACTION",
        parsed.error,
      );
    }
    const transaction = parsed.data;
    const info = transaction.payment_info;

    return {
      providerRef: transaction.trx_id,
      payUrl: transaction.pay_url,
      payableAmountIdr: parseIdr(transaction.amount),
      expiresAt: toDate(info?.expiration_date) ?? null,
      paymentInfo: mapPaymentInfo(info),
      sandbox: Boolean(transaction.sandbox_mode),
      simulatorUrl: transaction.simulator_url,
      raw: transaction,
    };
  }

  async getStatus(trxIdOrReference: string): Promise<PaymentEvent> {
    const data = await this.call(
      `/check-status/${encodeURIComponent(trxIdOrReference)}`,
    );
    const parsed = statusSchema.safeParse(data);
    if (!parsed.success) {
      throw new PaymenkuApiError(200, "PAYMENKU_INVALID_STATUS", parsed.error);
    }
    const status = parsed.data;

    return {
      eventId: `${status.trx_id}:${status.status}`,
      providerRef: status.trx_id,
      referenceId: status.reference_id,
      status: toPaymentStatus(status.status),
      amountIdr:
        status.amount !== undefined ? parseIdr(status.amount) : undefined,
      paidAt: toDate(status.paid_at),
      raw: status,
    };
  }

  verifyAndParseWebhook(
    rawBody: string,
    headers: Headers,
    now = new Date(),
  ): PaymentEvent {
    if (!this.webhookSecret) {
      throw new Error("PAYMENKU_WEBHOOK_SECRET_MISSING");
    }

    const timestamp = headers.get("x-paymenku-timestamp") ?? "";
    const signatureHeader = headers.get("x-paymenku-signature") ?? "";
    const signature = signatureHeader.replace(/^sha256=/, "");

    if (!timestamp || !signature) {
      throw new WebhookVerificationError("INVALID_SIGNATURE");
    }

    const expected = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const actualBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new WebhookVerificationError("INVALID_SIGNATURE");
    }

    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }
    if (
      Math.abs(now.getTime() / 1000 - timestampSeconds) >
      this.webhookToleranceSeconds
    ) {
      throw new WebhookVerificationError("STALE_TIMESTAMP");
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }

    // TODO(paymenku): konfirmasi bentuk field amount, paid_at, dan reference_id.
    const candidate =
      body !== null && typeof body === "object" && "data" in body
        ? (body as { data?: unknown }).data
        : body;
    const parsed = webhookDataSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }
    const data = parsed.data;

    let status: PaymentStatus;
    try {
      status = toPaymentStatus(data.status);
    } catch {
      throw new WebhookVerificationError("MALFORMED_PAYLOAD");
    }

    return {
      eventId: `${data.trx_id}:${data.status}`,
      providerRef: data.trx_id,
      referenceId: data.reference_id,
      status,
      amountIdr: data.amount !== undefined ? parseIdr(data.amount) : undefined,
      paidAt: toDate(data.paid_at),
      raw: body,
    };
  }
}
