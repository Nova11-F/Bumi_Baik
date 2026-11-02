import { describe, expect, it } from "vitest";
import { angka, co2e, rupiah, tanggal } from "./format";

describe("rupiah", () => {
  it("memformat rupiah tanpa desimal dengan pemisah id-ID", () => {
    expect(rupiah(129000)).toBe("Rp 129.000");
    expect(rupiah(0)).toBe("Rp 0");
    expect(rupiah(1500000)).toBe("Rp 1.500.000");
  });
});

describe("tanggal", () => {
  it("memformat tanggal dalam bahasa Indonesia", () => {
    expect(tanggal(new Date(2026, 10, 2))).toBe("2 November 2026");
  });

  it("menerima string tanggal ISO tanpa menggeser hari", () => {
    expect(tanggal("2026-11-02")).toBe("2 November 2026");
  });
});

describe("angka", () => {
  it("memakai koma desimal id-ID", () => {
    expect(angka(3.2)).toBe("3,2");
    expect(angka(13.04)).toBe("13,04");
  });
});

describe("co2e", () => {
  it("memformat dampak CO2e dengan tanda minus dan satuan", () => {
    expect(co2e(3.2)).toBe("−3,2 kg CO₂e");
    expect(co2e(12)).toBe("−12 kg CO₂e");
  });
});
