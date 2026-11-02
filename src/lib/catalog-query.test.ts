import { describe, expect, it } from "vitest";
import { parseCatalogParams, toTsQuery } from "./catalog-query";

describe("parseCatalogParams", () => {
  it("memberi nilai default untuk URL tanpa filter", () => {
    expect(parseCatalogParams({})).toEqual({
      q: "",
      kategori: [],
      sdg: [],
      hargaMin: null,
      hargaMax: null,
      tersedia: false,
      urut: "terbaru",
      hal: 1,
    });
  });

  it("membaca daftar kategori dan SDG dari koma maupun parameter berulang", () => {
    const params = parseCatalogParams({
      kategori: ["dapur-bebas-plastik,perawatan-diri", "berkebun"],
      sdg: ["12,13", "15"],
    });

    expect(params.kategori).toEqual([
      "dapur-bebas-plastik",
      "perawatan-diri",
      "berkebun",
    ]);
    expect(params.sdg).toEqual([12, 13, 15]);
  });

  it("membuang kategori dan SDG yang tidak dikenal", () => {
    const params = parseCatalogParams({
      kategori: "tidak-ada,dapur-bebas-plastik",
      sdg: "7,99,abc",
    });

    expect(params.kategori).toEqual(["dapur-bebas-plastik"]);
    expect(params.sdg).toEqual([7]);
  });

  it("mengabaikan harga tidak valid dan membatasi halaman minimal 1", () => {
    const params = parseCatalogParams({
      harga_min: "-100",
      harga_max: "bukan-angka",
      hal: "0",
    });

    expect(params.hargaMin).toBeNull();
    expect(params.hargaMax).toBeNull();
    expect(params.hal).toBe(1);
  });

  it("membaca parameter tersedia, urutan, dan q dengan aman", () => {
    const params = parseCatalogParams({
      q: "  Botol  ",
      tersedia: "1",
      urut: "dampak",
      hal: "3",
    });

    expect(params.q).toBe("Botol");
    expect(params.tersedia).toBe(true);
    expect(params.urut).toBe("dampak");
    expect(params.hal).toBe(3);
  });

  it("memakai default saat urutan tidak dikenal", () => {
    expect(parseCatalogParams({ urut: "termahal" }).urut).toBe("terbaru");
  });
});

describe("toTsQuery", () => {
  it("mengubah kata menjadi prefix query dengan AND", () => {
    expect(toTsQuery("Botol Minum")).toBe("botol:* & minum:*");
  });

  it("membersihkan tanda baca dan karakter khusus", () => {
    expect(toTsQuery('botol"; DROP TABLE products; --')).toBe(
      "botol:* & drop:* & table:* & products:*",
    );
  });

  it("tidak mengulang kata yang sama", () => {
    expect(toTsQuery("botol botol BOTOL")).toBe("botol:*");
  });

  it("mengembalikan string kosong untuk input tanpa huruf atau angka", () => {
    expect(toTsQuery("   !!! --- ")).toBe("");
  });

  it("membatasi jumlah kata agar query tetap wajar", () => {
    expect(toTsQuery("a b c d e f g h i j")).toBe(
      "a:* & b:* & c:* & d:* & e:* & f:* & g:* & h:*",
    );
  });
});
