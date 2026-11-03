import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Nomor telepon minimal 8 karakter.")
  .max(20, "Nomor telepon maksimal 20 karakter.")
  .regex(/^[0-9+\-()\s]+$/, "Nomor telepon hanya boleh berisi angka dan tanda +, -, atau spasi.");

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(100, "Nama maksimal 100 karakter."),
  phone: z
    .union([phoneSchema, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
});

export const addressSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(2, "Nama penerima minimal 2 karakter.")
    .max(100, "Nama penerima maksimal 100 karakter."),
  phone: phoneSchema,
  street: z
    .string()
    .trim()
    .min(5, "Alamat minimal 5 karakter.")
    .max(300, "Alamat maksimal 300 karakter."),
  city: z
    .string()
    .trim()
    .min(2, "Kota/kabupaten minimal 2 karakter.")
    .max(100, "Kota/kabupaten maksimal 100 karakter."),
  province: z
    .string()
    .trim()
    .min(2, "Provinsi minimal 2 karakter.")
    .max(100, "Provinsi maksimal 100 karakter."),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "Kode pos harus 5 digit angka."),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
