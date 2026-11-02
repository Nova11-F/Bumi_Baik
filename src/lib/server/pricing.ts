import {
  FREE_SHIPPING_MIN_IDR,
  SHIPPING_ZONES,
  type ShippingZone,
} from "@/lib/constants";

export type PricingItem = {
  priceIdr: number;
  quantity: number;
  co2eAvoidedKg: number;
};

export type PricingSummary = {
  subtotalIdr: number;
  shippingIdr: number;
  totalIdr: number;
  totalCo2eKg: number;
};

export function calculatePricing(
  items: PricingItem[],
  shippingZone: ShippingZone,
): PricingSummary {
  const subtotalIdr = items.reduce(
    (subtotal, item) => subtotal + item.priceIdr * item.quantity,
    0,
  );
  const shippingIdr =
    subtotalIdr >= FREE_SHIPPING_MIN_IDR
      ? 0
      : SHIPPING_ZONES[shippingZone].rateIdr;
  const impact = items.reduce(
    (total, item) => total + item.co2eAvoidedKg * item.quantity,
    0,
  );

  return {
    subtotalIdr,
    shippingIdr,
    totalIdr: subtotalIdr + shippingIdr,
    totalCo2eKg: Math.round((impact + Number.EPSILON) * 100) / 100,
  };
}
