"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/(account)/akun/actions";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import { initialFormState } from "@/lib/validators/common";
import type { Profile } from "@/types";

type ProfileFormProps = {
  profile: Profile | null;
  email: string;
};

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialFormState,
  );
  const fullNameError = state.errors?.fullName;
  const phoneError = state.errors?.phone;

  return (
    <form action={formAction} noValidate className="space-y-4">
      <FormFeedback state={state} />

      <div>
        <label htmlFor="account-email" className={labelClass}>
          Email
        </label>
        <input
          id="account-email"
          type="email"
          value={email}
          readOnly
          className={`${inputClass} bg-paper-100 text-ink-600`}
        />
        <p className="mt-1 text-sm text-ink-600">
          Email dipakai untuk masuk dan tidak dapat diubah di halaman ini.
        </p>
      </div>

      <div>
        <label htmlFor="full_name" className={labelClass}>
          Nama lengkap
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          defaultValue={profile?.full_name ?? ""}
          aria-invalid={Boolean(fullNameError)}
          aria-describedby={fullNameError ? "profile-name-error" : undefined}
          className={`${inputClass} ${fullNameError ? inputErrorClass : ""}`}
        />
        <FieldError id="profile-name-error" messages={fullNameError} />
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Nomor telepon
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          defaultValue={profile?.phone ?? ""}
          aria-invalid={Boolean(phoneError)}
          aria-describedby={phoneError ? "profile-phone-error" : undefined}
          className={`${inputClass} ${phoneError ? inputErrorClass : ""}`}
        />
        <FieldError id="profile-phone-error" messages={phoneError} />
      </div>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Menyimpan…" : "Simpan profil"}
      </button>
    </form>
  );
}
