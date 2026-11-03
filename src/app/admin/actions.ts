"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { type FormState, zodFieldErrors } from "@/lib/validators/common";

const orderUpdateSchema = z.object({
  orderId: z.string().uuid("Pesanan tidak valid."),
  status: z.enum(["shipped", "completed"]),
  trackingNumber: z
    .string()
    .trim()
    .max(100, "Nomor resi maksimal 100 karakter.")
    .optional(),
});

const productUpdateSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  priceIdr: z.coerce.number().int().min(1).max(2_000_000_000),
});

export async function updateAdminOrderAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = orderUpdateSchema.safeParse({
    orderId: formData.get("order_id"),
    status: formData.get("status"),
    trackingNumber: formData.get("tracking_number") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali status dan nomor resi.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { admin } = await requireAdmin();
  const allowedFrom = parsed.data.status === "shipped" ? "paid" : "shipped";
  const { data, error } = await admin
    .from("orders")
    .update({
      status: parsed.data.status,
      ...(parsed.data.trackingNumber
        ? { tracking_number: parsed.data.trackingNumber }
        : {}),
    })
    .eq("id", parsed.data.orderId)
    .eq("status", allowedFrom)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Admin order update failed", {
      orderId: parsed.data.orderId,
      code: error.code,
    });
    return {
      status: "error",
      message: "Pesanan belum berhasil diperbarui. Coba lagi.",
    };
  }
  if (!data) {
    return {
      status: "error",
      message: "Status pesanan berubah atau tidak dapat diperbarui.",
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/pesanan/${parsed.data.orderId}`);
  return { status: "success", message: "Pesanan berhasil diperbarui." };
}

export async function updateAdminProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = productUpdateSchema.safeParse({
    productId: formData.get("product_id"),
    stock: formData.get("stock"),
    priceIdr: formData.get("price_idr"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Harga dan stok harus berupa angka yang valid.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { admin } = await requireAdmin();
  const { data, error } = await admin
    .from("products")
    .update({
      stock: parsed.data.stock,
      price_idr: parsed.data.priceIdr,
    })
    .eq("id", parsed.data.productId)
    .select("id, slug")
    .maybeSingle();

  if (error) {
    console.error("Admin product update failed", {
      productId: parsed.data.productId,
      code: error.code,
    });
    return {
      status: "error",
      message: "Harga atau stok belum berhasil disimpan. Coba lagi.",
    };
  }
  if (!data) {
    return { status: "error", message: "Produk tidak ditemukan." };
  }

  revalidateTag("products");
  revalidatePath("/");
  revalidatePath("/produk");
  revalidatePath(`/produk/${data.slug}`);
  revalidatePath("/admin");
  return { status: "success", message: "Harga dan stok berhasil disimpan." };
}
