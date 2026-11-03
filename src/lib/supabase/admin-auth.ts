import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requireAdmin() {
  const { supabase, user } = await requireUser("/admin");
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Peran admin belum berhasil diverifikasi.", {
      cause: error,
    });
  }
  if (profile?.role !== "admin") notFound();

  return { user, admin: createAdminClient() };
}
