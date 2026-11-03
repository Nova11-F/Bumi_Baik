import { NextResponse } from "next/server";
import {
  applyPaymentEvent,
  createSupabasePaymentEventStore,
} from "@/lib/server/payments/apply-event";
import {
  getPaymentProvider,
  getPaymentProviderName,
} from "@/lib/server/payments";
import { handlePaymentWebhook } from "@/lib/server/payments/webhook";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let providerName: ReturnType<typeof getPaymentProviderName>;
  try {
    providerName = getPaymentProviderName();
  } catch (configError) {
    console.error("Payment provider configuration is invalid", configError);
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
          message: "Penyedia pembayaran belum dikonfigurasi.",
        },
      },
      { status: 503 },
    );
  }

  if (providerName !== "paymenku") {
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_NOT_AVAILABLE",
          message: "Webhook PaymenKu tidak aktif.",
        },
      },
      { status: 404 },
    );
  }

  const provider = getPaymentProvider();
  const store = createSupabasePaymentEventStore(createAdminClient());

  return handlePaymentWebhook(request, {
    providerName: "paymenku",
    verifyAndParseWebhook: (rawBody, headers, now) =>
      provider.verifyAndParseWebhook(rawBody, headers, now),
    applyEvent: (event) => applyPaymentEvent(store, "paymenku", event),
  });
}
