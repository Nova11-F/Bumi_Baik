import { describe, expect, it } from "vitest";
import { clampCartQuantity, mergeCartQuantities } from "@/lib/cart";

describe("clampCartQuantity", () => {
  it("limits quantity to current stock", () => {
    expect(clampCartQuantity(8, 3)).toBe(3);
  });

  it("caps quantity at 99", () => {
    expect(clampCartQuantity(120, 150)).toBe(99);
  });

  it("returns zero when no stock is available", () => {
    expect(clampCartQuantity(1, 0)).toBe(0);
  });
});

describe("mergeCartQuantities", () => {
  it("sums account and guest quantities while limiting them to stock", () => {
    const result = mergeCartQuantities(
      [
        { productId: "in-stock", quantity: 2 },
        { productId: "capped", quantity: 4 },
      ],
      [
        { productId: "in-stock", quantity: 3 },
        { productId: "capped", quantity: 5 },
      ],
      new Map([
        ["in-stock", 10],
        ["capped", 6],
      ]),
    );

    expect(result.items).toEqual([
      { productId: "in-stock", quantity: 5 },
      { productId: "capped", quantity: 6 },
    ]);
    expect(result.adjustedProductIds).toEqual(["capped"]);
  });

  it("drops unavailable products and reports their IDs", () => {
    const result = mergeCartQuantities(
      [],
      [{ productId: "unavailable", quantity: 1 }],
      new Map(),
    );

    expect(result.items).toEqual([]);
    expect(result.unavailableProductIds).toEqual(["unavailable"]);
  });
});
