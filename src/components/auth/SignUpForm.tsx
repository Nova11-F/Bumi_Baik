"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/app/(auth)/actions";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import { initialFormState } from "@/lib/validators/common";

type SignUpFormProps = {
  redirectTo: string;
  googleEnabled: boolean;
};

export function SignUpForm({ redirectTo, googleEnabled }: SignUpFormProps) {
  const [state, formAction, pending] = useActionState(signUpAction, initialFormState);
  const fullNameError = state.errors?.fullName;
  const emailError = state.errors?.email;
  const passwordError = state.errors?.password;
  const confirmError = state.errors?.confirmPassword;

  return (
    <div>
      <form action={formAction} noValidate className="space-y-4">
        <FormFeedback state={state} />

        <input type="hidden" name="redirect" value={redirectTo} />

        <div>
          <label htmlFor="full_name" className={labelClass}>
            Nama lengkap
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fullNameError)}
            aria-describedby={fullNameError ? "full-name-error" : undefined}
            className={`${inputClass} ${fullNameError ? inputErrorClass : ""}`}
          />
          <FieldError id="full-name-error" messages={fullNameError} />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
            className={`${inputClass} ${emailError ? inputErrorClass : ""}`}
          />
          <FieldError id="email-error" messages={emailError} />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={
              passwordError ? "password-error" : "password-hint"
            }
            className={`${inputClass} ${passwordError ? inputErrorClass : ""}`}
          />
          <p id="password-hint" className="mt-1 text-sm text-ink-600">
            Minimal 8 karakter.
          </p>
          <FieldError id="password-error" messages={passwordError} />
        </div>

        <div>
          <label htmlFor="confirm_password" className={labelClass}>
            Ulangi password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? "confirm-password-error" : undefined}
            className={`${inputClass} ${confirmError ? inputErrorClass : ""}`}
          />
          <FieldError id="confirm-password-error" messages={confirmError} />
        </div>

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Memproses…" : "Buat akun"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-200" />
        <span className="text-sm text-ink-600">atau</span>
        <span className="h-px flex-1 bg-paper-200" />
      </div>

      <GoogleAuthButton enabled={googleEnabled} redirectTo={redirectTo} />

      <p className="mt-6 text-center text-sm text-ink-600">
        Sudah punya akun?{" "}
        <Link
          href={`/masuk?redirect=${encodeURIComponent(redirectTo)}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
