import { z } from "zod";
import { addressSchema } from "./account";

export const checkoutRequestSchema = z
  .object({
    addressId: z.string().uuid().optional(),
    newAddress: addressSchema.optional(),
    shippingMethod: z.enum(["jawa", "luarJawa"]),
    idempotencyKey: z.string().uuid(),
  })
  .refine((input) => Boolean(input.addressId) !== Boolean(input.newAddress), {
    message: "Pilih alamat tersimpan atau masukkan alamat baru.",
    path: ["addressId"],
  });

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
