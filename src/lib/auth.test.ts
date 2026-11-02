import { describe, expect, it } from "vitest";
import { loginHref, safeRedirectPath } from "@/lib/auth";

describe("safeRedirectPath", () => {
  it("falls back to /akun when no redirect is provided", () => {
    expect(safeRedirectPath(undefined)).toBe("/akun");
    expect(safeRedirectPath(null)).toBe("/akun");
    expect(safeRedirectPath("")).toBe("/akun");
  });

  it("accepts internal paths", () => {
    expect(safeRedirectPath("/checkout")).toBe("/checkout");
    expect(safeRedirectPath("/pesanan?status=paid")).toBe("/pesanan?status=paid");
    expect(safeRedirectPath("/produk?q=botol")).toBe("/produk?q=botol");
  });

  it("rejects external and protocol-relative paths", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/akun");
    expect(safeRedirectPath("//evil.example")).toBe("/akun");
    expect(safeRedirectPath("/\\evil.example")).toBe("/akun");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/akun");
  });

  it("rejects auth pages to avoid redirect loops", () => {
    expect(safeRedirectPath("/masuk")).toBe("/akun");
    expect(safeRedirectPath("/daftar?redirect=/checkout")).toBe("/akun");
    expect(safeRedirectPath("/lupa-password")).toBe("/akun");
  });

  it("uses the requested fallback", () => {
    expect(safeRedirectPath("//evil.example", "/")).toBe("/");
  });

  it("takes the first value when search params repeat", () => {
    expect(safeRedirectPath(["/checkout", "/akun"])).toBe("/checkout");
  });
});

describe("loginHref", () => {
  it("encodes the redirect target", () => {
    expect(loginHref("/checkout?step=2")).toBe(
      "/masuk?redirect=%2Fcheckout%3Fstep%3D2",
    );
  });

  it("sanitizes unsafe redirect targets", () => {
    expect(loginHref("//evil.example")).toBe("/masuk?redirect=%2Fakun");
  });
});
