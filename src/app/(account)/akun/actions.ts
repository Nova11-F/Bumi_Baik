"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/auth";
import { createServerClient } from "@/lib/supabase/server";
import { addressSchema, profileSchema } from "@/lib/validators/account";
import { type FormState, zodFieldErrors } from "@/lib/validators/common";

const idSchema = z.string().uuid("Alamat tidak valid.");

async function setDefaultAddress(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  userId: string,
  addressId: string,
): Promise<string | null> {
  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .select("id")
    .eq("id", addressId)
    .eq("user_id", userId)
    .maybeSingle();

  if (addressError || !address) {
    return "Alamat tidak ditemukan atau tidak dapat diakses.";
  }

  const { error: clearError } = await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("user_id", userId);

  if (clearError) {
    return "Alamat utama belum berhasil diperbarui. Coba lagi.";
  }

  const { data, error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return "Alamat utama belum berhasil diperbarui. Coba lagi.";
  }

  return null;
}

export async function updateProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    fullName: formData.get("full_name"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data profil Anda.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUser("/akun");
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "Profil belum berhasil disimpan. Coba lagi.",
    };
  }

  revalidatePath("/akun");
  return {
    status: "success",
    message: "Profil berhasil diperbarui.",
  };
}

export async function createAddressAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = addressSchema.safeParse({
    recipient: formData.get("recipient"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    city: formData.get("city"),
    province: formData.get("province"),
    postal_code: formData.get("postal_code"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali alamat yang Anda masukkan.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUser("/akun");
  const { count, error: countError } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    return {
      status: "error",
      message: "Alamat tersimpan belum berhasil dimuat. Coba lagi.",
    };
  }

  const shouldBeDefault = formData.get("is_default") === "on" || (count ?? 0) === 0;

  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: user.id,
      ...parsed.data,
      is_default: false,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "Alamat belum berhasil disimpan. Coba lagi.",
    };
  }

  if (shouldBeDefault) {
    const defaultError = await setDefaultAddress(supabase, user.id, data.id);

    if (defaultError) {
      const { error: cleanupError } = await supabase
        .from("addresses")
        .delete()
        .eq("id", data.id)
        .eq("user_id", user.id);

      revalidatePath("/akun");

      return {
        status: "error",
        message: cleanupError
          ? `${defaultError} Alamat tersimpan tetapi belum menjadi alamat utama.`
          : defaultError,
      };
    }
  }

  revalidatePath("/akun");
  return {
    status: "success",
    message: "Alamat berhasil ditambahkan.",
  };
}

export async function updateAddressAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", message: "Alamat tidak ditemukan." };
  }

  const parsed = addressSchema.safeParse({
    recipient: formData.get("recipient"),
    phone: formData.get("phone"),
    street: formData.get("street"),
    city: formData.get("city"),
    province: formData.get("province"),
    postal_code: formData.get("postal_code"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali alamat yang Anda masukkan.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase, user } = await requireUser("/akun");
  const shouldBeDefault = formData.get("is_default") === "on";
  const { data, error } = await supabase
    .from("addresses")
    .update({
      ...parsed.data,
      is_default: false,
    })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      status: "error",
      message: "Alamat belum berhasil diperbarui. Coba lagi.",
    };
  }

  if (shouldBeDefault) {
    const defaultError = await setDefaultAddress(supabase, user.id, id.data);

    if (defaultError) {
      revalidatePath("/akun");
      return { status: "error", message: defaultError };
    }
  }

  revalidatePath("/akun");
  return {
    status: "success",
    message: "Alamat berhasil diperbarui.",
  };
}

export async function deleteAddressAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", message: "Alamat tidak valid." };
  }

  const { supabase, user } = await requireUser("/akun");
  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .select("id, is_default")
    .eq("id", id.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (addressError || !address) {
    return { status: "error", message: "Alamat tidak ditemukan atau gagal dimuat." };
  }

  const { data: deleted, error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return { status: "error", message: "Alamat belum berhasil dihapus. Coba lagi." };
  }

  if (address.is_default) {
    const { data: nextAddress, error: nextAddressError } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextAddressError) {
      revalidatePath("/akun");
      return {
        status: "error",
        message: "Alamat terhapus, tetapi alamat utama baru gagal dimuat.",
      };
    }

    if (nextAddress) {
      const defaultError = await setDefaultAddress(supabase, user.id, nextAddress.id);

      if (defaultError) {
        revalidatePath("/akun");
        return {
          status: "error",
          message: "Alamat terhapus, tetapi alamat utama baru belum berhasil ditetapkan.",
        };
      }
    }
  }

  revalidatePath("/akun");
  return { status: "success", message: "Alamat berhasil dihapus." };
}

export async function setDefaultAddressAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) {
    return { status: "error", message: "Alamat tidak valid." };
  }

  const { supabase, user } = await requireUser("/akun");
  const error = await setDefaultAddress(supabase, user.id, id.data);

  if (error) {
    revalidatePath("/akun");
    return { status: "error", message: error };
  }

  revalidatePath("/akun");
  return { status: "success", message: "Alamat utama berhasil diperbarui." };
}
