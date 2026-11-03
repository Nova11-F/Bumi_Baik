import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { safeRedirectPath } from "@/lib/auth";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Daftar",
  description:
    "Buat akun Bumi Baik untuk menyimpan alamat dan riwayat pesanan.",
  robots: { index: false, follow: false },
};

type DaftarPageProps = {
  searchParams: Promise<{ redirect?: string | string[] }>;
};

export default async function DaftarPage({ searchParams }: DaftarPageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);
  const { user } = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";

  return (
    <div>
      <p className="font-mono text-sm text-forest-700">Akun Bumi Baik</p>
      <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] text-forest-900">
        Buat akun
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-600">
        Daftar agar alamat, pesanan, dan ringkasan dampak belanja tersimpan di
        satu tempat.
      </p>

      <div className="mt-8 rounded-md border border-paper-200 bg-paper-50 p-6">
        <SignUpForm redirectTo={redirectTo} googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}
