import "server-only";

import type { PaymentChannel, PaymentProvider } from "./types";

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  channels: PaymentChannel[];
};

const cache = new Map<string, CacheEntry>();

export async function listPaymentChannels(
  provider: PaymentProvider,
  providerName: string,
): Promise<PaymentChannel[]> {
  const now = Date.now();
  const cached = cache.get(providerName);
  if (cached && cached.expiresAt > now) return cached.channels;

  const channels = await provider.listChannels();
  cache.set(providerName, { channels, expiresAt: now + CACHE_TTL_MS });
  return channels;
}

export function clearPaymentChannelCache() {
  cache.clear();
}
