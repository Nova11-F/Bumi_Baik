import { handlePaymentWebhook } from "@/lib/server/payments/webhook";
import { createPaymentWebhookDependencies } from "@/lib/server/payments/webhook-adapter";

export async function POST(request: Request) {
  return handlePaymentWebhook(request, createPaymentWebhookDependencies());
}
