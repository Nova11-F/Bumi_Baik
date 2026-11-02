import type {
  CreatePaymentResult,
  PaymentEvent,
  PaymentProvider,
} from "./types";

export class PaymentKuProvider implements PaymentProvider {
  async createPayment(): Promise<CreatePaymentResult> {
    // TODO(paymentku): implement according to the provider's API documentation.
    throw new Error("PaymentKu belum dikonfigurasi.");
  }

  verifyAndParseWebhook(): PaymentEvent {
    // TODO(paymentku): implement signature verification and event mapping.
    throw new Error("Verifikasi webhook PaymentKu belum diimplementasikan.");
  }
}
