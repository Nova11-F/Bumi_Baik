import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "./index";
import type { PaymentWebhookDependencies } from "./webhook";

export function createPaymentWebhookDependencies(): PaymentWebhookDependencies {
  const providerName = process.env.PAYMENT_PROVIDER ?? "mock";
  if (providerName !== "mock" && providerName !== "paymentku") {
    throw new Error(`Payment provider tidak dikenal: ${providerName}`);
  }

  const admin = createAdminClient();
  const provider = getPaymentProvider();

  return {
    providerName,
    verifyAndParseWebhook: (rawBody, headers) =>
      provider.verifyAndParseWebhook(rawBody, headers),
    async findExpectedAmount(providerRef, name) {
      const { data: payment, error: paymentError } = await admin
        .from("payments")
        .select("order_id")
        .eq("provider", name)
        .eq("provider_ref", providerRef)
        .maybeSingle();

      if (paymentError) {
        throw new Error("Gagal memuat pembayaran.", { cause: paymentError });
      }
      if (!payment) return null;

      const { data: order, error: orderError } = await admin
        .from("orders")
        .select("total_idr")
        .eq("id", payment.order_id)
        .maybeSingle();

      if (orderError) {
        throw new Error("Gagal memuat pesanan.", { cause: orderError });
      }
      return order?.total_idr ?? null;
    },
    async processEvent(event, name) {
      const { data, error } = await admin.rpc("process_payment_event", {
        p_provider: name,
        p_event_id: event.eventId,
        p_payload: event.raw,
        p_provider_ref: event.providerRef,
        p_status: event.status,
        p_amount_idr: event.amountIdr,
        p_paid_at: event.paidAt?.toISOString() ?? null,
      });

      if (error) {
        if (error.message.includes("PAYMENT_NOT_FOUND")) {
          throw new Error("PAYMENT_NOT_FOUND", { cause: error });
        }
        if (error.message.includes("PAYMENT_AMOUNT_MISMATCH")) {
          throw new Error("PAYMENT_AMOUNT_MISMATCH", { cause: error });
        }
        throw new Error("PAYMENT_EVENT_PROCESSING_FAILED", { cause: error });
      }

      if (data === "processed" || data === "duplicate" || data === "ignored") {
        return data;
      }
      throw new Error("PAYMENT_EVENT_PROCESSING_FAILED");
    },
  };
}
