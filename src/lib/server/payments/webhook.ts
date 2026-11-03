import { NextResponse } from "next/server";
import {
  WebhookVerificationError,
  type PaymentEvent,
  type PaymentProviderName,
} from "./types";

export type PaymentWebhookDependencies = {
  providerName: PaymentProviderName;
  verifyAndParseWebhook: (
    rawBody: string,
    headers: Headers,
    now?: Date,
  ) => PaymentEvent;
  applyEvent: (
    event: PaymentEvent,
  ) => Promise<"processed" | "duplicate" | "ignored">;
};

function errorResponse(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handlePaymentWebhook(
  request: Request,
  dependencies: PaymentWebhookDependencies,
): Promise<Response> {
  const rawBody = await request.text();

  let event: PaymentEvent;
  try {
    event = dependencies.verifyAndParseWebhook(
      rawBody,
      request.headers,
      new Date(),
    );
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      if (error.code === "MALFORMED_PAYLOAD") {
        return errorResponse(
          400,
          "INVALID_WEBHOOK_PAYLOAD",
          "Data webhook tidak valid.",
        );
      }
      return errorResponse(
        401,
        error.code,
        error.code === "STALE_TIMESTAMP"
          ? "Webhook sudah kedaluwarsa."
          : "Signature pembayaran tidak valid.",
      );
    }
    console.error("Payment webhook verification failed", error);
    return errorResponse(
      400,
      "WEBHOOK_VERIFICATION_FAILED",
      "Webhook belum dapat diverifikasi.",
    );
  }

  try {
    const result = await dependencies.applyEvent(event);
    return NextResponse.json(
      { received: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return errorResponse(
        500,
        "PAYMENT_AMOUNT_MISMATCH",
        "Nominal pembayaran belum berhasil diproses.",
      );
    }
    console.error("Payment webhook processing failed", {
      provider: dependencies.providerName,
      eventId: event.eventId,
      error,
    });
    return errorResponse(
      500,
      "WEBHOOK_PROCESSING_FAILED",
      "Webhook belum berhasil diproses.",
    );
  }
}
