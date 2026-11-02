import "server-only";

import { redirect } from "next/navigation";
import { loginHref } from "@/lib/auth";
import { createServerClient } from "./server";

export async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error("Gagal memverifikasi sesi pengguna.", { cause: error });
  }

  return { supabase, user };
}

export async function requireUser(redirectTo = "/akun") {
  const { supabase, user } = await getCurrentUser();

  if (!user) {
    redirect(loginHref(redirectTo));
  }

  return { supabase, user };
}
