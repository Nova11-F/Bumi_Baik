import { describe, expect, it } from "vitest";
import { getStockStatus, stockLabel } from "./stock";

describe("status stok", () => {
  it("menandai stok 0 sebagai habis", () => {
    expect(getStockStatus(0)).toBe("habis");
    expect(stockLabel(0)).toBe("Stok habis");
  });

  it("menandai stok 1 sampai 5 sebagai menipis", () => {
    expect(getStockStatus(1)).toBe("menipis");
    expect(getStockStatus(5)).toBe("menipis");
    expect(stockLabel(4)).toBe("Stok menipis · sisa 4");
  });

  it("menandai stok di atas 5 sebagai tersedia", () => {
    expect(getStockStatus(6)).toBe("tersedia");
    expect(stockLabel(40)).toBe("Tersedia");
  });
});
