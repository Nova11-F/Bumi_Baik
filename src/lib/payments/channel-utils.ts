import { rupiah } from "@/lib/format";
import type { PaymentChannel } from "@/lib/server/payments/types";

const GROUP_BY_TYPE: Record<string, string> = {
  qris: "QRIS",
  va: "Virtual Account",
  ewallet: "E-Wallet",
  cstore: "Gerai Ritel",
};

export const PAYMENT_GROUP_ORDER = [
  "QRIS",
  "Virtual Account",
  "E-Wallet",
  "Gerai Ritel",
  "Lainnya",
] as const;

export function channelGroupLabel(
  channel: Pick<PaymentChannel, "type" | "group">,
): string {
  return GROUP_BY_TYPE[channel.type] ?? (channel.group || "Lainnya");
}

export function isAmountAllowed(
  channel: Pick<PaymentChannel, "minAmount" | "maxAmount">,
  totalIdr: number,
): boolean {
  if (totalIdr < channel.minAmount) return false;
  if (channel.maxAmount !== null && totalIdr > channel.maxAmount) return false;
  return true;
}

export function channelAmountError(
  channel: Pick<PaymentChannel, "name" | "minAmount" | "maxAmount">,
  totalIdr: number,
): string | null {
  if (totalIdr < channel.minAmount) {
    return `Minimal pembayaran ${channel.name} adalah ${rupiah(channel.minAmount)}.`;
  }
  if (channel.maxAmount !== null && totalIdr > channel.maxAmount) {
    return `${channel.name} maksimal ${rupiah(channel.maxAmount)}.`;
  }
  return null;
}

export function estimateFeeIdr(
  channel: Pick<PaymentChannel, "feeMode" | "feeFlat" | "feePercent">,
  totalIdr: number,
): number | null {
  if (channel.feeMode === "merchant") return null;
  return Math.round(channel.feeFlat + (totalIdr * channel.feePercent) / 100);
}

export function isOvoChannel(
  channel: Pick<PaymentChannel, "code" | "name">,
): boolean {
  return (
    channel.code.toLowerCase() === "ovo" ||
    channel.name.toLowerCase().includes("ovo")
  );
}

export function channelDisplayName(code: string | null): string {
  if (!code) return "Metode pembayaran";
  return code.replaceAll("_", " ").toUpperCase();
}
