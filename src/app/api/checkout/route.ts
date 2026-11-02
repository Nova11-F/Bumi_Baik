import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";
import { calculatePricing } from "@/lib/server/pricing";
import { getPaymentProvider } from "@/lib/server/payments";
import { checkoutRequestSchema } from "@/lib/validators/checkout";
import type { Address, Product } from "@/types";

type CheckoutCartItem = {
  product_id: string;
  quantity: number;
};

type Shortage = {
  productId: string;
  name: string;
  requested: number;
  available: number;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function findShortages(
  items: CheckoutCartItem[],
  products: Product[],
): Shortage[] {
  const productById = new Map(products.map((product) => [product.id, product]));
  return items.flatMap((item) => {
    const product = productById.get(item.product_id);
    if (product && product.stock >= item.quantity) return [];
    return [
      {
        productId: item.product_id,
        name: product?.name ?? "Produk tidak tersedia",
        requested: item.quantity,
        available: product?.stock ?? 0,
      },
    ];
  });
}

async function responseForExistingCheckout(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  idempotencyKey: string,
) {
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (orderError) {
    return errorResponse(
      500,
      "ORDER_LOOKUP_FAILED",
      "Pesanan belum berhasil dimuat.",
    );
  }
  if (!order) return null;

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("payment_url")
    .eq("order_id", order.id)
    .maybeSingle();

  if (paymentError) {
    return errorResponse(
      500,
      "PAYMENT_LOOKUP_FAILED",
      "Informasi pembayaran belum berhasil dimuat.",
    );
  }
  if (!payment?.payment_url) {
    return errorResponse(
      409,
      "CHECKOUT_IN_PROGRESS",
      "Pesanan sedang diproses. Muat ulang beberapa saat lagi.",
    );
  }

  return NextResponse.json(
    { orderId: order.id, paymentUrl: payment.payment_url },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function compensateFailedCheckout(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
) {
  const { error } = await admin.rpc("cancel_pending_order", {
    p_order_id: orderId,
  });
  if (error) {
    console.error("Checkout compensation failed", { orderId, error });
    throw new Error(
      "Pesanan gagal dibatalkan dan stok belum dapat dipulihkan.",
      {
        cause: error,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  const { user } = await getCurrentUser();
  if (!user) {
    return errorResponse(
      401,
      "UNAUTHENTICATED",
      "Silakan masuk untuk checkout.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "INVALID_BODY", "Format permintaan tidak valid.");
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Periksa kembali data checkout.",
      {
        fields: parsed.error.flatten().fieldErrors,
      },
    );
  }

  const admin = createAdminClient();
  const input = parsed.data;
  let provider: ReturnType<typeof getPaymentProvider>;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    console.error("Payment provider configuration is invalid", error);
    return errorResponse(
      503,
      "PAYMENT_PROVIDER_UNAVAILABLE",
      "Metode pembayaran belum tersedia.",
    );
  }

  const existingResponse = await responseForExistingCheckout(
    admin,
    user.id,
    input.idempotencyKey,
  );
  if (existingResponse) return existingResponse;

  const { data: cartItems, error: cartError } = await admin
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", user.id);

  if (cartError) {
    return errorResponse(
      500,
      "CART_LOOKUP_FAILED",
      "Keranjang belum berhasil dimuat.",
    );
  }
  const cart = (cartItems ?? []) as CheckoutCartItem[];
  if (cart.length === 0) {
    return errorResponse(400, "EMPTY_CART", "Keranjang Anda masih kosong.");
  }

  const productIds = cart.map((item) => item.product_id);
  const { data: products, error: productsError } = await admin
    .from("products")
    .select(
      "id, slug, name, description, category_id, price_idr, stock, co2e_avoided_kg, plastic_avoided_g, impact_note, sdg_goals, specs, images, is_active, is_featured, weight_g, created_at",
    )
    .in("id", productIds)
    .eq("is_active", true);

  if (productsError) {
    return errorResponse(
      500,
      "PRODUCT_LOOKUP_FAILED",
      "Harga dan stok belum berhasil diperiksa.",
    );
  }
  const currentProducts = (products ?? []) as Product[];
  const shortages = findShortages(cart, currentProducts);
  if (shortages.length > 0) {
    return errorResponse(
      409,
      "INSUFFICIENT_STOCK",
      "Stok beberapa produk berubah. Periksa kembali keranjang Anda.",
      { items: shortages },
    );
  }

  const productById = new Map(
    currentProducts.map((product) => [product.id, product]),
  );
  const orderItems = cart.map((item) => {
    const product = productById.get(item.product_id);
    if (!product) throw new Error("Produk hilang setelah validasi stok.");
    return {
      product_id: product.id,
      product_name: product.name,
      unit_price_idr: product.price_idr,
      quantity: item.quantity,
      co2e_avoided_kg: product.co2e_avoided_kg,
      priceIdr: product.price_idr,
      co2eAvoidedKg: product.co2e_avoided_kg,
    };
  });
  const pricing = calculatePricing(orderItems, input.shippingMethod);

  let shippingAddress: Address | typeof input.newAddress;
  if (input.addressId) {
    const { data, error } = await admin
      .from("addresses")
      .select(
        "id, user_id, recipient, phone, street, city, province, postal_code, is_default, created_at",
      )
      .eq("id", input.addressId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return errorResponse(
        500,
        "ADDRESS_LOOKUP_FAILED",
        "Alamat belum berhasil dimuat.",
      );
    }
    if (!data) {
      return errorResponse(
        400,
        "ADDRESS_NOT_FOUND",
        "Alamat pengiriman tidak ditemukan.",
      );
    }
    shippingAddress = data as Address;
  } else {
    shippingAddress = input.newAddress;
  }

  if (!shippingAddress) {
    return errorResponse(
      400,
      "ADDRESS_REQUIRED",
      "Alamat pengiriman wajib diisi.",
    );
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return errorResponse(
      500,
      "PROFILE_LOOKUP_FAILED",
      "Data pelanggan belum berhasil dimuat.",
    );
  }

  const addressSnapshot = {
    recipient: shippingAddress.recipient,
    phone: shippingAddress.phone,
    street: shippingAddress.street,
    city: shippingAddress.city,
    province: shippingAddress.province,
    postal_code: shippingAddress.postal_code,
  };
  const orderNumber = `BB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const { data: orderId, error: createOrderError } = await admin.rpc(
    "create_checkout_order",
    {
      p_order: {
        order_number: orderNumber,
        user_id: user.id,
        subtotal_idr: pricing.subtotalIdr,
        shipping_idr: pricing.shippingIdr,
        total_idr: pricing.totalIdr,
        total_co2e_kg: pricing.totalCo2eKg,
        shipping_address: addressSnapshot,
        shipping_method: input.shippingMethod,
        idempotency_key: input.idempotencyKey,
      },
      p_items: orderItems.map(
        ({
          product_id,
          product_name,
          unit_price_idr,
          quantity,
          co2e_avoided_kg,
        }) => ({
          product_id,
          product_name,
          unit_price_idr,
          quantity,
          co2e_avoided_kg,
        }),
      ),
    },
  );

  if (createOrderError || !orderId) {
    if (createOrderError?.message.includes("INSUFFICIENT_STOCK")) {
      const { data: latestProducts, error: stockRefreshError } = await admin
        .from("products")
        .select(
          "id, slug, name, description, category_id, price_idr, stock, co2e_avoided_kg, plastic_avoided_g, impact_note, sdg_goals, specs, images, is_active, is_featured, weight_g, created_at",
        )
        .in("id", productIds)
        .eq("is_active", true);
      if (stockRefreshError) {
        console.error(
          "Could not reload stock after reservation failure",
          stockRefreshError,
        );
      }
      return errorResponse(
        409,
        "INSUFFICIENT_STOCK",
        "Stok berubah saat checkout. Periksa kembali keranjang Anda.",
        {
          items: stockRefreshError
            ? cart.map((item) => ({
                productId: item.product_id,
                name: productById.get(item.product_id)?.name ?? "Produk",
                requested: item.quantity,
                available: 0,
              }))
            : findShortages(cart, (latestProducts ?? []) as Product[]),
        },
      );
    }

    const duplicateResponse = await responseForExistingCheckout(
      admin,
      user.id,
      input.idempotencyKey,
    );
    if (duplicateResponse) return duplicateResponse;

    console.error("Checkout order creation failed", createOrderError);
    return errorResponse(
      500,
      "ORDER_CREATE_FAILED",
      "Pesanan belum berhasil dibuat.",
    );
  }

  let payment;
  try {
    payment = await provider.createPayment({
      orderId,
      orderNumber,
      amountIdr: pricing.totalIdr,
      customer: {
        name: profile?.full_name ?? addressSnapshot.recipient,
        email: user.email ?? "",
        phone: profile?.phone ?? addressSnapshot.phone,
      },
      items: orderItems.map((item) => ({
        name: item.product_name,
        price: item.unit_price_idr,
        quantity: item.quantity,
      })),
      returnUrl: new URL(`/pesanan/${orderId}`, request.url).toString(),
      notifyUrl: new URL(
        "/api/payments/paymentku/webhook",
        request.url,
      ).toString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    await compensateFailedCheckout(admin, orderId);
    console.error("Payment provider failed to create a payment", error);
    return errorResponse(
      502,
      "PAYMENT_CREATE_FAILED",
      "Pembayaran belum berhasil dibuat. Stok telah dikembalikan; silakan coba lagi.",
    );
  }

  const { error: paymentInsertError } = await admin.rpc(
    "save_checkout_payment",
    {
      p_order_id: orderId,
      p_provider: process.env.PAYMENT_PROVIDER ?? "mock",
      p_provider_ref: payment.providerRef,
      p_amount_idr: pricing.totalIdr,
      p_payment_url: payment.paymentUrl,
    },
  );

  if (paymentInsertError) {
    await compensateFailedCheckout(admin, orderId);
    console.error("Payment record creation failed", paymentInsertError);
    return errorResponse(
      502,
      "PAYMENT_SAVE_FAILED",
      "Pembayaran belum berhasil disimpan. Stok telah dikembalikan; silakan coba lagi.",
    );
  }

  return NextResponse.json(
    { orderId, paymentUrl: payment.paymentUrl },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
