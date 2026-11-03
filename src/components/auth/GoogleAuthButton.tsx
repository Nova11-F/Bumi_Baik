"use client";

import { useId, useState } from "react";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GoogleAuthButtonProps = {
  enabled: boolean;
  redirectTo: string;
};

export function GoogleAuthButton({
  enabled,
  redirectTo,
}: GoogleAuthButtonProps) {
  const noteId = useId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      redirectTo,
    )}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });

    if (oauthError) {
      setError("Login Google belum berhasil. Coba lagi atau gunakan email.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={!enabled || loading}
        aria-describedby={!enabled ? noteId : undefined}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-paper-200 bg-paper-50 px-6 font-medium text-ink-900 hover:bg-paper-100 disabled:cursor-not-allowed disabled:bg-paper-100 disabled:text-ink-600"
      >
        <LogIn className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        {loading ? "Mengalihkan…" : "Lanjutkan dengan Google"}
      </button>

      {!enabled && (
        <p id={noteId} className="mt-2 text-sm text-ink-600">
          Google OAuth belum dikonfigurasi. Gunakan email dan password.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
