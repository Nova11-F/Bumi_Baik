"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mergeCartQuantities, type CartQuantity } from "@/lib/cart";
import { getCurrentUser } from "@/lib/supabase/auth";

export type CartActionResult =
  | {
      ok: true;
      items: CartQuantity[];
      adjustedProductIds?: string[];
      unavailableProductIds?: string[];
    }
  | { ok: false; message: string };

const productIdSchema = z.string().uuid();
const quantitySchema = z.number().int().min(1).max(99);
const cartLineSchema = z.object({
  productId: productIdSchema,
  quantity: quantitySchema,
});
const mergeCartSchema = z.array(cartLineSchema).max(100);

function failure(message: string): CartActionResult {
  return { ok: false, message };
}

async function loadCartItems(
  supabase: Awaited<ReturnType<typeof getCurrentUser>>["supabase"],
  userId: string,
): Promise<CartActionResult> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return failure("Keranjang akun belum berhasil dimuat. Coba lagi.");
  }

  return {
    ok: true,
    items: (data ?? []).map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
    })),
  };
}

export async function getCartItems(): Promise<CartActionResult> {
  const { supabase, user } = await getCurrentUser();
  if (!user) return failure("Masuk untuk memuat keranjang akun.");

  return loadCartItems(supabase, user.id);
}

export async function addToCart(input: unknown): Promise<CartActionResult> {
  const parsed = z
    .object({ productId: productIdSchema, quantity: quantitySchema })
    .safeParse(input);
  if (!parsed.success) return failure("Data produk atau jumlah tidak valid.");

  const { supabase, user } = await getCurrentUser();
  if (!user) return failure("Sesi masuk tidak ditemukan. Silakan masuk kembali.");

  const [{ data: product, error: productError }, { data: current, error: cartError }] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, stock")
        .eq("id", parsed.data.productId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", user.id)
        .eq("product_id", parsed.data.productId)
        .maybeSingle(),
    ]);

  if (productError || cartError) {
    return failure("Informasi produk atau keranjang belum berhasil dimuat.");
  }
  if (!product || product.stock < 1) {
    return failure("Produk ini sedang tidak tersedia.");
  }

  const requested = (current?.quantity ?? 0) + parsed.data.quantity;
  const quantity = Math.min(requested, product.stock, 99);
  const { error } = await supabase.from("cart_items").upsert(
    {
      user_id: user.id,
      product_id: product.id,
      quantity,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,product_id" },
  );

  if (error) return failure("Produk belum berhasil ditambahkan ke keranjang.");

  const result = await loadCartItems(supabase, user.id);
  return result.ok && quantity < requested
    ? { ...result, adjustedProductIds: [product.id] }
    : result;
}

export async function updateQuantity(
  input: unknown,
): Promise<CartActionResult> {
  const parsed = z
    .object({ productId: productIdSchema, quantity: quantitySchema })
    .safeParse(input);
  if (!parsed.success) return failure("Data produk atau jumlah tidak valid.");

  const { supabase, user } = await getCurrentUser();
  if (!user) return failure("Sesi masuk tidak ditemukan. Silakan masuk kembali.");

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, stock")
    .eq("id", parsed.data.productId)
    .eq("is_active", true)
    .maybeSingle();

  if (productError) return failure("Stok produk belum berhasil diperiksa.");
  if (!product || product.stock < 1) {
    return failure("Stok produk habis. Hapus produk dari keranjang untuk melanjutkan.");
  }

  const quantity = Math.min(parsed.data.quantity, product.stock, 99);
  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("product_id", product.id)
    .select("product_id")
    .maybeSingle();

  if (error || !data) return failure("Jumlah produk belum berhasil diperbarui.");

  const result = await loadCartItems(supabase, user.id);
  return result.ok && quantity < parsed.data.quantity
    ? { ...result, adjustedProductIds: [product.id] }
    : result;
}

export async function removeItem(input: unknown): Promise<CartActionResult> {
  const parsed = z.object({ productId: productIdSchema }).safeParse(input);
  if (!parsed.success) return failure("Produk tidak valid.");

  const { supabase, user } = await getCurrentUser();
  if (!user) return failure("Sesi masuk tidak ditemukan. Silakan masuk kembali.");

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", parsed.data.productId);

  if (error) return failure("Produk belum berhasil dihapus dari keranjang.");

  return loadCartItems(supabase, user.id);
}

export async function mergeGuestCart(input: unknown): Promise<CartActionResult> {
  const parsed = mergeCartSchema.safeParse(input);
  if (!parsed.success) return failure("Data keranjang tamu tidak valid.");

  const { supabase, user } = await getCurrentUser();
  if (!user) return failure("Sesi masuk tidak ditemukan. Silakan masuk kembali.");

  const { data: accountItems, error: cartError } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", user.id);

  if (cartError) {
    return failure("Keranjang belum berhasil digabungkan. Coba lagi.");
  }

  const productIds = [
    ...new Set([
      ...parsed.data.map((item) => item.productId),
      ...(accountItems ?? []).map((item) => item.product_id),
    ]),
  ];
  const { data: products, error: productError } = productIds.length
    ? await supabase
        .from("products")
        .select("id, stock")
        .in("id", productIds)
        .eq("is_active", true)
    : { data: [], error: null };

  if (productError) {
    return failure("Keranjang belum berhasil digabungkan. Coba lagi.");
  }

  const stockByProductId = new Map(
    (products ?? []).map((product) => [product.id, product.stock]),
  );
  const merged = mergeCartQuantities(
    (accountItems ?? []).map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
    })),
    parsed.data,
    stockByProductId,
  );

  if (merged.items.length > 0) {
    const { error } = await supabase.from("cart_items").upsert(
      merged.items.map((item) => ({
        user_id: user.id,
        product_id: item.productId,
        quantity: item.quantity,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,product_id" },
    );

    if (error) return failure("Keranjang belum berhasil disimpan. Coba lagi.");
  }

  const keptIds = new Set(merged.items.map((item) => item.productId));
  const staleIds = (accountItems ?? [])
    .map((item) => item.product_id)
    .filter((id) => !keptIds.has(id));

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .in("product_id", staleIds);

    if (error) return failure("Produk yang tidak tersedia gagal dibersihkan.");
  }

  revalidatePath("/keranjang");
  return {
    ok: true,
    items: merged.items,
    adjustedProductIds: merged.adjustedProductIds,
    unavailableProductIds: merged.unavailableProductIds,
  };
}
