import type { ShippingZone } from "@/lib/constants";

export type PaymentProviderName = "mock" | "paymenku";

export type ShippingMethod = ShippingZone;

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

export type PaymentFeeMode = "merchant" | "customer" | "split";

export interface PaymentChannel {
  code: string;
  name: string;
  type: string;
  group: string;
  flowType: string;
  feeMode: PaymentFeeMode;
  feeFlat: number;
  feePercent: number;
  minAmount: number;
  maxAmount: number | null;
  iconUrl?: string;
}

export type PaymentInfo = {
  qrUrl?: string;
  qrString?: string;
  bank?: string;
  vaNumber?: string;
  checkoutUrl?: string;
  store?: string;
  paymentCode?: string;
};

export interface CreatePaymentInput {
  orderId: string;
  referenceId: string;
  channelCode: string;
  amountIdr: number;
  customer: { name: string; email: string; phone?: string };
  items: { name: string; quantity: number }[];
  returnUrl: string;
}

export interface CreatePaymentResult {
  providerRef: string;
  payUrl: string;
  payableAmountIdr: number;
  expiresAt: Date | null;
  paymentInfo: PaymentInfo;
  sandbox: boolean;
  simulatorUrl?: string;
  raw: unknown;
}

export interface PaymentEvent {
  eventId: string;
  providerRef: string;
  referenceId?: string;
  status: PaymentStatus;
  amountIdr?: number;
  paidAt?: Date;
  raw: unknown;
}

export type WebhookErrorCode =
  | "INVALID_SIGNATURE"
  | "STALE_TIMESTAMP"
  | "MALFORMED_PAYLOAD";

export class WebhookVerificationError extends Error {
  constructor(
    public readonly code: WebhookErrorCode,
    message = code,
  ) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentProvider {
  listChannels(): Promise<PaymentChannel[]>;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getStatus(trxIdOrReference: string): Promise<PaymentEvent>;
  verifyAndParseWebhook(
    rawBody: string,
    headers: Headers,
    now?: Date,
  ): PaymentEvent;
}
