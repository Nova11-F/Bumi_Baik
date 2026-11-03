"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { signInAction } from "@/app/(auth)/actions";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import { initialFormState } from "@/lib/validators/common";

type SignInFormProps = {
  redirectTo: string;
  googleEnabled: boolean;
};

export function SignInForm({ redirectTo, googleEnabled }: SignInFormProps) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialFormState,
  );
  const emailError = state.errors?.email;
  const passwordError = state.errors?.password;

  return (
    <div>
      <form action={formAction} noValidate className="space-y-4">
        <FormFeedback state={state} />

        <input type="hidden" name="redirect" value={redirectTo} />

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
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <Link
              href="/lupa-password"
              className="inline-flex min-h-11 items-center text-sm font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
            >
              Lupa password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : undefined}
            className={`${inputClass} ${passwordError ? inputErrorClass : ""}`}
          />
          <FieldError id="password-error" messages={passwordError} />
        </div>

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? (
            <>
              <LoaderCircle
                className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
              Memproses…
            </>
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-paper-200" />
        <span className="text-sm text-ink-600">atau</span>
        <span className="h-px flex-1 bg-paper-200" />
      </div>

      <GoogleAuthButton enabled={googleEnabled} redirectTo={redirectTo} />

      <p className="mt-6 text-center text-sm text-ink-600">
        Belum punya akun?{" "}
        <Link
          href={`/daftar?redirect=${encodeURIComponent(redirectTo)}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Daftar
        </Link>
      </p>
    </div>
  );
}
