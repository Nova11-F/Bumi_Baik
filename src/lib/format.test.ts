import { describe, expect, it } from "vitest";
import { rupiah, tanggal } from "./format";

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
