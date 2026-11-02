import { NextResponse } from "next/server";
import type { PaymentEvent, PaymentProviderName } from "./types";

export type PaymentWebhookDependencies = {
  providerName: PaymentProviderName;
  verifyAndParseWebhook: (rawBody: string, headers: Headers) => PaymentEvent;
  findExpectedAmount: (
    providerRef: string,
    providerName: PaymentProviderName,
  ) => Promise<number | null>;
  processEvent: (
    event: PaymentEvent,
    providerName: PaymentProviderName,
  ) => Promise<"processed" | "duplicate" | "ignored">;
};

export async function handlePaymentWebhook(
  request: Request,
  dependencies: PaymentWebhookDependencies,
): Promise<Response> {
  const rawBody = await request.text();
  let event: PaymentEvent;
  try {
    event = dependencies.verifyAndParseWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_SIGNATURE") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_SIGNATURE",
            message: "Signature pembayaran tidak valid.",
          },
        },
        { status: 401 },
      );
    }
    if (error instanceof Error && error.message === "INVALID_WEBHOOK_PAYLOAD") {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_WEBHOOK_PAYLOAD",
            message: "Data webhook tidak valid.",
          },
        },
        { status: 400 },
      );
    }
    console.error("Payment webhook verification failed", error);
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_VERIFICATION_FAILED",
          message: "Webhook belum dapat diverifikasi.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const expectedAmount = await dependencies.findExpectedAmount(
      event.providerRef,
      dependencies.providerName,
    );
    if (expectedAmount === null) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_NOT_FOUND",
            message: "Pembayaran tidak ditemukan.",
          },
        },
        { status: 404 },
      );
    }
    if (event.amountIdr !== expectedAmount) {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_AMOUNT_MISMATCH",
            message: "Nominal pembayaran tidak sesuai.",
          },
        },
        { status: 400 },
      );
    }

    const result = await dependencies.processEvent(
      event,
      dependencies.providerName,
    );
    return NextResponse.json(
      { received: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_NOT_FOUND",
            message: "Pembayaran tidak ditemukan.",
          },
        },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "PAYMENT_AMOUNT_MISMATCH") {
      return NextResponse.json(
        {
          error: {
            code: "PAYMENT_AMOUNT_MISMATCH",
            message: "Nominal pembayaran tidak sesuai.",
          },
        },
        { status: 400 },
      );
    }
    console.error("Payment webhook processing failed", error);
    return NextResponse.json(
      {
        error: {
          code: "WEBHOOK_PROCESSING_FAILED",
          message: "Webhook belum berhasil diproses.",
        },
      },
      { status: 500 },
    );
  }
}
