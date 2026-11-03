"use server";

import crypto from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import {
  applyPaymentEvent,
  createSupabasePaymentEventStore,
} from "@/lib/server/payments/apply-event";
import {
  isMockPaymentEnabled,
  MockProvider,
} from "@/lib/server/payments/mock";
import { handlePaymentWebhook } from "@/lib/server/payments/webhook";
import type { FormState } from "@/lib/validators/common";

const mockPaymentSchema = z.object({
  ref: z.string().uuid(),
  status: z.enum(["paid", "failed"]),
});

export async function submitMockPayment(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isMockPaymentEnabled()) notFound();

  const parsed = mockPaymentSchema.safeParse({
    ref: formData.get("ref"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Data pembayaran MOCK tidak valid." };
  }
  const { user } = await requireUser(`/mock-pay/${parsed.data.ref}`);
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("order_id, amount_idr, provider")
    .eq("provider_ref", parsed.data.ref)
    .eq("provider", "mock")
    .maybeSingle();

  if (paymentError) {
    return { status: "error", message: "Pembayaran belum berhasil dimuat." };
  }
  if (!payment) {
    return { status: "error", message: "Pembayaran tidak ditemukan." };
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", payment.order_id)
    .maybeSingle();

  if (orderError) {
    return { status: "error", message: "Pesanan belum berhasil dimuat." };
  }
  if (!order || order.user_id !== user.id) {
    return { status: "error", message: "Pembayaran tidak ditemukan." };
  }
  if (order.status !== "pending") {
    redirect(`/pesanan/${order.id}`);
  }

  let provider: MockProvider;
  try {
    provider = new MockProvider();
  } catch (error) {
    console.error("Mock payment signing is not configured", error);
    return { status: "error", message: "Pembayaran MOCK belum dikonfigurasi." };
  }

  const rawBody = JSON.stringify({
    event_id: crypto.randomUUID(),
    transaction_id: parsed.data.ref,
    status: parsed.data.status,
    amount: payment.amount_idr,
    ...(parsed.data.status === "paid"
      ? { paid_at: new Date().toISOString() }
      : {}),
  });
  const store = createSupabasePaymentEventStore(admin);
  const response = await handlePaymentWebhook(
    new Request("http://internal/api/payments/paymenku/webhook", {
      method: "POST",
      headers: { "x-mock-signature": provider.signWebhook(rawBody) },
      body: rawBody,
    }),
    {
      providerName: "mock",
      verifyAndParseWebhook: (body, headers) =>
        provider.verifyAndParseWebhook(body, headers),
      applyEvent: (event) => applyPaymentEvent(store, "mock", event),
    },
  );

  if (!response.ok) {
    return {
      status: "error",
      message: "Webhook MOCK belum berhasil diproses. Coba lagi.",
    };
  }

  redirect(`/pesanan/${order.id}`);
}
