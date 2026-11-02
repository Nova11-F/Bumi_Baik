import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Lupa Password",
  description: "Minta tautan untuk mengatur ulang password akun Bumi Baik.",
};

export default async function LupaPasswordPage() {
  const { user } = await getCurrentUser();

  if (user) {
    redirect("/akun");
  }

  return (
    <div>
      <p className="font-mono text-sm text-forest-700">Akun Bumi Baik</p>
      <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] text-forest-900">
        Lupa password
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-600">
        Masukkan email akun Anda. Kami akan mengirim tautan untuk mengatur ulang password jika
        email tersebut terdaftar.
      </p>

      <div className="mt-8 rounded-md border border-paper-200 bg-paper-50 p-6">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
