import { describe, expect, it } from "vitest";
import { getInitials, isUsableImageUrl } from "./product";

describe("inisial produk", () => {
  it("mengambil dua huruf dari dua kata pertama", () => {
    expect(getInitials("Botol Minum Stainless 750 ml")).toBe("BM");
  });

  it("mengambil dua huruf dari nama satu kata", () => {
    expect(getInitials("Lampu")).toBe("LA");
  });

  it("memberi fallback untuk nama kosong", () => {
    expect(getInitials("   ")).toBe("BB");
  });
});

describe("URL gambar", () => {
  it("menolak gambar kosong atau placeholder seed", () => {
    expect(isUsableImageUrl("")).toBe(false);
    expect(isUsableImageUrl(null)).toBe(false);
    expect(
      isUsableImageUrl(
        "https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/product-images/a/1.jpg",
      ),
    ).toBe(false);
  });

  it("menerima URL gambar http/https", () => {
    expect(
      isUsableImageUrl(
        "https://abc.supabase.co/storage/v1/object/public/product-images/a/1.jpg",
      ),
    ).toBe(true);
  });
});
