import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPaymentEvent,
  createSupabasePaymentEventStore,
} from "@/lib/server/payments/apply-event";
import {
  getPaymentProvider,
  getPaymentProviderName,
} from "@/lib/server/payments";
import { PaymenkuApiError } from "@/lib/server/payments/paymenku";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/auth";

const RATE_LIMIT_MS = 10_000;
const lastSync = new Map<string, number>();

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return errorResponse(400, "INVALID_ORDER_ID", "Nomor pesanan tidak valid.");
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return errorResponse(
      401,
      "UNAUTHENTICATED",
      "Silakan masuk terlebih dahulu.",
    );
  }

  const key = `${user.id}:${id}`;
  const now = Date.now();
  const previous = lastSync.get(key);
  if (previous && now - previous < RATE_LIMIT_MS) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Tunggu beberapa detik sebelum memeriksa lagi.",
        },
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(
            Math.ceil((RATE_LIMIT_MS - (now - previous)) / 1000),
          ),
        },
      },
    );
  }
  lastSync.set(key, now);

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    return errorResponse(
      500,
      "ORDER_LOOKUP_FAILED",
      "Pesanan belum berhasil dimuat.",
    );
  }
  if (!order) {
    return errorResponse(404, "ORDER_NOT_FOUND", "Pesanan tidak ditemukan.");
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("provider_ref, status")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (paymentError) {
    return errorResponse(
      500,
      "PAYMENT_LOOKUP_FAILED",
      "Pembayaran belum berhasil dimuat.",
    );
  }
  if (!payment?.provider_ref) {
    return errorResponse(
      404,
      "PAYMENT_NOT_FOUND",
      "Pembayaran untuk pesanan ini belum tersedia.",
    );
  }

  let providerName: ReturnType<typeof getPaymentProviderName>;
  try {
    providerName = getPaymentProviderName();
  } catch (configError) {
    console.error("Payment provider configuration is invalid", configError);
    return errorResponse(
      503,
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      "Penyedia pembayaran belum dikonfigurasi.",
    );
  }
  if (providerName !== "paymenku") {
    return errorResponse(
      400,
      "SYNC_NOT_AVAILABLE",
      "Cek status manual hanya tersedia untuk pembayaran PaymenKu.",
    );
  }

  try {
    const provider = getPaymentProvider();
    const event = await provider.getStatus(payment.provider_ref);
    const store = createSupabasePaymentEventStore(admin);
    const result = await applyPaymentEvent(store, providerName, event);
    return NextResponse.json(
      { result, eventStatus: event.status },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PAYMENT_EVENT_IN_PROGRESS"
    ) {
      return errorResponse(
        409,
        "PAYMENT_EVENT_IN_PROGRESS",
        "Pembayaran sedang diproses, coba lagi sebentar",
      );
    }
    if (error instanceof PaymenkuApiError) {
      if (error.httpStatus === 429) {
        return NextResponse.json(
          {
            error: {
              code: "PAYMENT_PROVIDER_RATE_LIMITED",
              message: "Penyedia pembayaran sedang sibuk. Coba lagi nanti.",
            },
          },
          {
            status: 429,
            headers: {
              "Cache-Control": "no-store",
              ...(error.retryAfterSeconds
                ? { "Retry-After": String(error.retryAfterSeconds) }
                : {}),
            },
          },
        );
      }
      console.error("PaymenKu status check failed", {
        orderId: order.id,
        providerRef: payment.provider_ref,
        error,
      });
      return errorResponse(
        502,
        "PAYMENT_STATUS_UNAVAILABLE",
        "Status pembayaran belum dapat diperiksa.",
      );
    }
    if (error instanceof Error && error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return errorResponse(
        400,
        "PAYMENT_AMOUNT_MISMATCH",
        "Nominal pembayaran tidak sesuai.",
      );
    }
    console.error("Payment sync failed", {
      orderId: order.id,
      providerRef: payment.provider_ref,
      error,
    });
    return errorResponse(
      500,
      "PAYMENT_SYNC_FAILED",
      "Status pembayaran belum berhasil diperbarui.",
    );
  }
}
