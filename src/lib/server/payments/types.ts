import type { ShippingZone } from "@/lib/constants";

export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: { name: string; email: string; phone?: string };
  items: { name: string; price: number; quantity: number }[];
  returnUrl: string;
  notifyUrl: string;
  expiresAt: Date;
}

export interface CreatePaymentResult {
  providerRef: string;
  paymentUrl: string;
}

export type PaymentEvent = {
  eventId: string;
  providerRef: string;
  status: "paid" | "failed" | "expired";
  amountIdr: number;
  paidAt?: Date;
  raw: unknown;
};

export type PaymentProviderName = "mock" | "paymentku";

export type ShippingMethod = ShippingZone;

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyAndParseWebhook(rawBody: string, headers: Headers): PaymentEvent;
}
