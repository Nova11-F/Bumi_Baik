"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/(auth)/actions";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import { initialFormState } from "@/lib/validators/common";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialFormState,
  );
  const emailError = state.errors?.email;

  return (
    <div>
      <form action={formAction} noValidate className="space-y-4">
        <FormFeedback state={state} />

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

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Mengirim…" : "Kirim tautan reset"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Ingat password Anda?{" "}
        <Link
          href="/masuk"
          className="font-medium text-forest-700 underline underline-offset-4 hover:text-forest-900"
        >
          Kembali ke halaman masuk
        </Link>
      </p>
    </div>
  );
}
