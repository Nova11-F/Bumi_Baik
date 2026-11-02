import { describe, expect, it } from "vitest";
import { profileSchema, addressSchema } from "@/lib/validators/account";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validators/auth";
import { zodFieldErrors } from "@/lib/validators/common";

describe("signInSchema", () => {
  it("accepts a valid email and password", () => {
    const result = signInSchema.safeParse({
      email: "  warga@bumi.id ",
      password: "rahasia123",
      redirect: "/checkout",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("warga@bumi.id");
    }
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({
      email: "bukan-email",
      password: "rahasia123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).email).toContain("Format email tidak valid.");
    }
  });
});

describe("signUpSchema", () => {
  const valid = {
    fullName: "Warga Bumi",
    email: "warga@bumi.id",
    password: "rahasia123",
    confirmPassword: "rahasia123",
  };

  it("accepts matching passwords", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an internal post-sign-up redirect", () => {
    expect(
      signUpSchema.safeParse({ ...valid, redirect: "/checkout" }).success,
    ).toBe(true);
  });

  it("rejects a short password", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "pendek",
      confirmPassword: "pendek",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).password).toContain(
        "Password minimal 8 karakter.",
      );
    }
  });

  it("rejects mismatched confirmation", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: "berbeda123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).confirmPassword).toContain(
        "Konfirmasi password tidak cocok.",
      );
    }
  });
});

describe("password reset schemas", () => {
  it("accepts a valid forgot-password email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "warga@bumi.id" }).success).toBe(
      true,
    );
  });

  it("rejects mismatched new passwords", () => {
    const result = updatePasswordSchema.safeParse({
      password: "baru12345",
      confirmPassword: "lain12345",
    });

    expect(result.success).toBe(false);
  });
});

describe("account schemas", () => {
  it("turns an empty phone into null", () => {
    const result = profileSchema.safeParse({ fullName: "Warga Bumi", phone: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeNull();
    }
  });

  it("accepts a valid address", () => {
    const result = addressSchema.safeParse({
      recipient: "Warga Bumi",
      phone: "+62 812-3456-7890",
      street: "Jl. Hijau No. 1",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid postal code", () => {
    const result = addressSchema.safeParse({
      recipient: "Warga Bumi",
      phone: "081234567890",
      street: "Jl. Hijau No. 1",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "12A",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error).postal_code).toContain(
        "Kode pos harus 5 digit angka.",
      );
    }
  });
});
