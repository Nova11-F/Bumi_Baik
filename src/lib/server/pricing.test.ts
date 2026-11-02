import { describe, expect, it } from "vitest";
import { calculatePricing } from "./pricing";

describe("calculatePricing", () => {
  const items = [
    { priceIdr: 129_000, quantity: 2, co2eAvoidedKg: 3.2 },
    { priceIdr: 45_000, quantity: 1, co2eAvoidedKg: 0.8 },
  ];

  it("calculates subtotal, flat shipping, total, and proportional impact", () => {
    expect(calculatePricing(items, "jawa")).toEqual({
      subtotalIdr: 303_000,
      shippingIdr: 0,
      totalIdr: 303_000,
      totalCo2eKg: 7.2,
    });
  });

  it("uses the Java shipping rate below the free-shipping threshold", () => {
    expect(
      calculatePricing(
        [{ priceIdr: 129_000, quantity: 1, co2eAvoidedKg: 3.2 }],
        "jawa",
      ),
    ).toEqual({
      subtotalIdr: 129_000,
      shippingIdr: 20_000,
      totalIdr: 149_000,
      totalCo2eKg: 3.2,
    });
  });

  it("uses the outside-Java shipping rate below the free-shipping threshold", () => {
    expect(
      calculatePricing(
        [{ priceIdr: 129_000, quantity: 1, co2eAvoidedKg: 3.2 }],
        "luarJawa",
      ),
    ).toEqual({
      subtotalIdr: 129_000,
      shippingIdr: 35_000,
      totalIdr: 164_000,
      totalCo2eKg: 3.2,
    });
  });

  it("waives shipping at the free-shipping threshold", () => {
    expect(
      calculatePricing(
        [{ priceIdr: 100_000, quantity: 3, co2eAvoidedKg: 1 }],
        "luarJawa",
      ).shippingIdr,
    ).toBe(0);
  });

  it("keeps all monetary values as integer rupiah", () => {
    const result = calculatePricing(
      [{ priceIdr: 10_001, quantity: 3, co2eAvoidedKg: 0.35 }],
      "jawa",
    );

    expect(result.subtotalIdr).toBe(30_003);
    expect(result.shippingIdr).toBe(20_000);
    expect(result.totalIdr).toBe(50_003);
    expect(result.totalCo2eKg).toBe(1.05);
  });
});
