import "server-only";

import { isMockPaymentEnabled, MockProvider } from "./mock";
import { PaymenkuProvider } from "./paymenku";
import type { PaymentProvider, PaymentProviderName } from "./types";

export function getPaymentProviderName(): PaymentProviderName {
  const providerName = process.env.PAYMENT_PROVIDER ?? "mock";
  if (providerName !== "mock" && providerName !== "paymenku") {
    throw new Error(`Payment provider tidak dikenal: ${providerName}`);
  }
  return providerName;
}

export function getPaymentProvider(): PaymentProvider {
  const providerName = getPaymentProviderName();

  if (providerName === "mock") {
    if (!isMockPaymentEnabled()) {
      throw new Error("Provider pembayaran MOCK dinonaktifkan di production.");
    }
    return new MockProvider();
  }

  return new PaymenkuProvider();
}
