import { NextResponse } from "next/server";
import {
  getPaymentProvider,
  getPaymentProviderName,
} from "@/lib/server/payments";
import { listPaymentChannels } from "@/lib/server/payments/channels";
import { getCurrentUser } from "@/lib/supabase/auth";

export async function GET() {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Silakan masuk untuk melihat metode pembayaran.",
        },
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const providerName = getPaymentProviderName();
    const channels = await listPaymentChannels(
      getPaymentProvider(),
      providerName,
    );

    return NextResponse.json(
      { channels },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      },
    );
  } catch (error) {
    console.error("Payment channels could not be loaded", error);
    return NextResponse.json(
      {
        error: {
          code: "PAYMENT_CHANNELS_UNAVAILABLE",
          message: "Metode pembayaran belum tersedia.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
