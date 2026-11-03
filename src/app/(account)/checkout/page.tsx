import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";
import {
  getPaymentProvider,
  getPaymentProviderName,
} from "@/lib/server/payments";
import { listPaymentChannels } from "@/lib/server/payments/channels";
import type { PaymentChannel } from "@/lib/server/payments/types";
import { calculatePricing } from "@/lib/server/pricing";
import { requireUser } from "@/lib/supabase/auth";
import type { Address, Product } from "@/types";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Periksa alamat, pengiriman, dan ringkasan pesanan Anda.",
};

export default async function CheckoutPage() {
  const { supabase, user } = await requireUser("/checkout");
  const { data: cartData, error: cartError } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", user.id);

  if (cartError) {
    throw new Error("Keranjang belum berhasil dimuat untuk checkout.", {
      cause: cartError,
    });
  }
  if (!cartData?.length) redirect("/keranjang");

  const productIds = cartData.map((item) => item.product_id);
  const [productsResult, addressesResult, profileResult] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, name, description, category_id, price_idr, stock, co2e_avoided_kg, plastic_avoided_g, impact_note, sdg_goals, specs, images, is_active, is_featured, weight_g, created_at",
      )
      .in("id", productIds)
      .eq("is_active", true),
    supabase
      .from("addresses")
      .select(
        "id, user_id, recipient, phone, street, city, province, postal_code, is_default, created_at",
      )
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
  ]);

  if (productsResult.error || addressesResult.error || profileResult.error) {
    throw new Error("Data checkout belum berhasil dimuat.", {
      cause:
        productsResult.error ??
        addressesResult.error ??
        profileResult.error,
    });
  }

  let channels: PaymentChannel[] = [];
  let channelsError: string | null = null;
  try {
    channels = await listPaymentChannels(
      getPaymentProvider(),
      getPaymentProviderName(),
    );
  } catch (error) {
    console.error("Payment channels could not be loaded for checkout", error);
    channelsError =
      "Metode pembayaran belum tersedia. Muat ulang halaman beberapa saat lagi.";
  }

  const products = (productsResult.data ?? []) as Product[];
  const productById = new Map(products.map((product) => [product.id, product]));
  const items = cartData.map((item) => ({
    product: productById.get(item.product_id) ?? null,
    productId: item.product_id,
    quantity: item.quantity,
    lineTotalIdr:
      (productById.get(item.product_id)?.price_idr ?? 0) * item.quantity,
  }));
  const validItems = items.flatMap((item) => {
    if (!item.product || item.product.stock < item.quantity) return [];
    return [
      {
        priceIdr: item.product.price_idr,
        quantity: item.quantity,
        co2eAvoidedKg: item.product.co2e_avoided_kg,
      },
    ];
  });
  const quotes = {
    jawa: calculatePricing(validItems, "jawa"),
    luarJawa: calculatePricing(validItems, "luarJawa"),
  };

  return (
    <CheckoutFlow
      addresses={(addressesResult.data ?? []) as Address[]}
      items={items}
      quotes={quotes}
      hasUnavailableItems={validItems.length !== items.length}
      email={user.email ?? ""}
      channels={channels}
      channelsError={channelsError}
      defaultPhone={profileResult.data?.phone ?? ""}
    />
  );
}
