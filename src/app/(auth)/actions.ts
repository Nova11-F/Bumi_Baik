"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/supabase/auth";
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validators/auth";
import {
  type FormState,
  zodFieldErrors,
} from "@/lib/validators/common";

const GENERIC_LOGIN_ERROR = "Email atau password salah.";
const GENERIC_SIGN_UP_MESSAGE =
  "Jika pendaftaran dapat dilanjutkan, petunjuk berikutnya akan dikirim ke email tersebut.";

function rateLimitedMessage(status?: number): string | null {
  return status === 429
    ? "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi."
    : null;
}

export async function signInAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirect: formData.get("redirect") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data yang Anda masukkan.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: rateLimitedMessage(error.status) ?? GENERIC_LOGIN_ERROR,
    };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(parsed.data.redirect));
}

export async function signUpAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirm_password"),
    redirect: formData.get("redirect") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali data yang Anda masukkan.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerClient();
  const siteUrl = await getSiteUrl();
  const redirectTo = safeRedirectPath(parsed.data.redirect);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        rateLimitedMessage(error.status) ??
        "Pendaftaran belum berhasil. Periksa data Anda dan coba lagi.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect(redirectTo);
  }

  return {
    status: "success",
    message: GENERIC_SIGN_UP_MESSAGE,
  };
}

export async function forgotPasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali email yang Anda masukkan.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const supabase = await createServerClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/akun?reset=1")}`,
  });

  if (error) {
    return {
      status: "error",
      message:
        rateLimitedMessage(error.status) ??
        "Permintaan reset belum berhasil. Coba lagi beberapa saat lagi.",
    };
  }

  return {
    status: "success",
    message:
      "Jika email tersebut terdaftar, kami telah mengirim tautan untuk mengatur ulang password.",
  };
}

export async function updatePasswordAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Periksa kembali password baru Anda.",
      errors: zodFieldErrors(parsed.error),
    };
  }

  const { supabase } = await requireUser("/akun?reset=1");
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      status: "error",
      message:
        rateLimitedMessage(error.status) ??
        "Password belum berhasil diperbarui. Coba lagi.",
    };
  }

  revalidatePath("/akun");
  return {
    status: "success",
    message: "Password berhasil diperbarui.",
  };
}

export async function signOutAction(
  _previousState: FormState,
  _formData: FormData,
): Promise<FormState> {
  void _previousState;
  void _formData;

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      status: "error",
      message: "Anda belum berhasil keluar. Coba lagi.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
