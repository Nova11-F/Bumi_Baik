import { z } from "zod";
import type { PaymentInfo } from "./types";

const paymentInfoSchema = z
  .object({
    qr_url: z.string().optional(),
    qr_string: z.string().optional(),
    bank: z.string().optional(),
    va_number: z.string().optional(),
    checkout_url: z.string().optional(),
    store: z.string().optional(),
    payment_code: z.string().optional(),
  })
  .passthrough();

const wrapperSchema = z
  .object({
    payment_info: paymentInfoSchema.optional(),
    data: z
      .object({ payment_info: paymentInfoSchema.optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();

export function extractPaymentInfo(raw: unknown): PaymentInfo {
  const parsed = wrapperSchema.safeParse(raw);
  if (!parsed.success) return {};

  const info =
    parsed.data.payment_info ?? parsed.data.data?.payment_info ?? undefined;
  if (!info) return {};

  return {
    qrUrl: info.qr_url,
    qrString: info.qr_string,
    bank: info.bank,
    vaNumber: info.va_number,
    checkoutUrl: info.checkout_url,
    store: info.store,
    paymentCode: info.payment_code,
  };
}
