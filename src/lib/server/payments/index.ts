import "server-only";

import { isMockPaymentEnabled, MockProvider } from "./mock";
import { PaymentKuProvider } from "./paymentku";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const providerName = process.env.PAYMENT_PROVIDER ?? "mock";

  if (providerName === "mock") {
    if (!isMockPaymentEnabled()) {
      throw new Error("Provider pembayaran MOCK dinonaktifkan di production.");
    }
    return new MockProvider();
  }
  if (providerName === "paymentku") return new PaymentKuProvider();

  throw new Error(`Payment provider tidak dikenal: ${providerName}`);
}
