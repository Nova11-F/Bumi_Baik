"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updatePasswordAction } from "@/app/(auth)/actions";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import { initialFormState } from "@/lib/validators/common";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePasswordAction,
    initialFormState,
  );
  const passwordError = state.errors?.password;
  const confirmError = state.errors?.confirmPassword;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormFeedback state={state} />

      <div>
        <label htmlFor="reset-password" className={labelClass}>
          Password baru
        </label>
        <input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(passwordError)}
          aria-describedby={passwordError ? "reset-password-error" : "reset-password-hint"}
          className={`${inputClass} ${passwordError ? inputErrorClass : ""}`}
        />
        <p id="reset-password-hint" className="mt-1 text-sm text-ink-600">
          Minimal 8 karakter.
        </p>
        <FieldError id="reset-password-error" messages={passwordError} />
      </div>

      <div>
        <label htmlFor="reset-confirm-password" className={labelClass}>
          Ulangi password baru
        </label>
        <input
          id="reset-confirm-password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(confirmError)}
          aria-describedby={confirmError ? "reset-confirm-error" : undefined}
          className={`${inputClass} ${confirmError ? inputErrorClass : ""}`}
        />
        <FieldError id="reset-confirm-error" messages={confirmError} />
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Menyimpan…" : "Simpan password baru"}
      </button>

      <p className="text-center text-sm text-ink-600">
        <Link
          href="/akun"
          className="font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Kembali ke akun
        </Link>
      </p>
    </form>
  );
}
