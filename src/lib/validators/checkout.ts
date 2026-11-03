import { z } from "zod";
import { addressSchema, phoneSchema } from "./account";

export const checkoutRequestSchema = z
  .object({
    addressId: z.string().uuid().optional(),
    newAddress: addressSchema.optional(),
    shippingMethod: z.enum(["jawa", "luarJawa"]),
    channelCode: z.string().trim().min(1, "Pilih metode pembayaran."),
    customerPhone: phoneSchema.optional(),
    idempotencyKey: z.string().uuid(),
  })
  .refine((input) => Boolean(input.addressId) !== Boolean(input.newAddress), {
    message: "Pilih alamat tersimpan atau masukkan alamat baru.",
    path: ["addressId"],
  });

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
