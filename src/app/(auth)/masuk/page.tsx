import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { SignInForm } from "@/components/auth/SignInForm";
import { safeRedirectPath } from "@/lib/auth";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Masuk",
  description:
    "Masuk ke akun Bumi Baik untuk melanjutkan belanja dan mengelola alamat.",
  robots: { index: false, follow: false },
};

type MasukPageProps = {
  searchParams: Promise<{
    redirect?: string | string[];
    error?: string | string[];
  }>;
};

export default async function MasukPage({ searchParams }: MasukPageProps) {
  const params = await searchParams;
  const redirectTo = safeRedirectPath(params.redirect);
  const { user } = await getCurrentUser();

  if (user) {
    redirect(redirectTo);
  }

  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true";
  const hasAuthError = Boolean(params.error);

  return (
    <div>
      <p className="font-mono text-sm text-forest-700">Akun Bumi Baik</p>
      <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] text-forest-900">
        Masuk ke akun
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-600">
        Masuk untuk melanjutkan checkout dan mengelola alamat pengiriman.
      </p>

      {hasAuthError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-md border border-danger bg-paper-50 px-3 py-2.5 text-sm text-danger"
        >
          <CircleAlert
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p>
            Tautan masuk tidak valid atau sudah kedaluwarsa. Silakan coba lagi.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-md border border-paper-200 bg-paper-50 p-6">
        <SignInForm redirectTo={redirectTo} googleEnabled={googleEnabled} />
      </div>
    </div>
  );
}
