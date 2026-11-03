import type { OrderStatus, PaymentStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Menunggu pembayaran",
  paid: "Dibayar",
  shipped: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "border-warning bg-clay-100 text-ink-900",
  paid: "border-success bg-forest-100 text-forest-900",
  shipped: "border-forest-500 bg-forest-100 text-forest-900",
  completed: "border-forest-700 bg-forest-100 text-forest-900",
  cancelled: "border-danger bg-clay-100 text-danger",
  expired: "border-danger bg-clay-100 text-danger",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  initiated: "Menunggu pembayaran",
  paid: "Dibayar",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
};

export const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  initiated: "border-warning bg-clay-100 text-ink-900",
  paid: "border-success bg-forest-100 text-forest-900",
  failed: "border-danger bg-clay-100 text-danger",
  expired: "border-danger bg-clay-100 text-danger",
  cancelled: "border-danger bg-clay-100 text-danger",
  refunded: "border-forest-500 bg-forest-100 text-forest-900",
};
