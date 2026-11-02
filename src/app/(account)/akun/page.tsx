import type { Metadata } from "next";
import Link from "next/link";
import { AddressManager } from "@/components/account/AddressManager";
import { ProfileForm } from "@/components/account/ProfileForm";
import { SignOutForm } from "@/components/account/SignOutForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { requireUser } from "@/lib/supabase/auth";
import type { Address, Profile } from "@/types";

export const metadata: Metadata = {
  title: "Akun Saya",
  description: "Kelola profil, password, dan alamat pengiriman Bumi Baik.",
};

type AkunPageProps = {
  searchParams: Promise<{ reset?: string | string[] }>;
};

export default async function AkunPage({ searchParams }: AkunPageProps) {
  const params = await searchParams;
  const { supabase, user } = await requireUser("/akun");

  const [profileResult, addressesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at")
      .eq("id", user.id)
      .returns<Profile[]>()
      .maybeSingle(),
    supabase
      .from("addresses")
      .select("id, user_id, recipient, phone, street, city, province, postal_code, is_default, created_at")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true })
      .returns<Address[]>(),
  ]);

  if (profileResult.error || addressesResult.error) {
    throw new Error("Data akun belum berhasil dimuat.", {
      cause: profileResult.error ?? addressesResult.error,
    });
  }

  const showReset = params.reset === "1";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-forest-700">Akun Bumi Baik</p>
          <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] text-forest-900">
            Akun saya
          </h1>
          <p className="mt-2 text-base text-ink-600">{user.email}</p>
        </div>

        <SignOutForm />
      </header>

      <Link
        href="/pesanan"
        className="mt-6 inline-flex min-h-11 items-center rounded-md border border-forest-700 px-5 font-medium text-forest-700 hover:bg-forest-100"
      >
        Lihat pesanan saya
      </Link>

      <section aria-labelledby="profile-heading" className="mt-8 rounded-md border border-paper-200 bg-paper-50 p-5 sm:p-6">
        <h2
          id="profile-heading"
          className="font-display text-2xl font-semibold leading-tight text-forest-900"
        >
          Profil
        </h2>
        <p className="mt-2 text-base leading-relaxed text-ink-600">
          Nama dan nomor telepon dipakai untuk mempercepat pengisian data pengiriman.
        </p>
        <div className="mt-5">
          <ProfileForm profile={profileResult.data} email={user.email ?? ""} />
        </div>
      </section>

      {showReset && (
        <section
          aria-labelledby="reset-heading"
          className="mt-6 rounded-md border border-paper-200 bg-paper-50 p-5 sm:p-6"
        >
          <h2
            id="reset-heading"
            className="font-display text-2xl font-semibold leading-tight text-forest-900"
          >
            Atur ulang password
          </h2>
          <p className="mt-2 text-base leading-relaxed text-ink-600">
            Masukkan password baru untuk akun Anda.
          </p>
          <div className="mt-5">
            <ResetPasswordForm />
          </div>
        </section>
      )}

      <AddressManager addresses={addressesResult.data ?? []} />
    </div>
  );
}
