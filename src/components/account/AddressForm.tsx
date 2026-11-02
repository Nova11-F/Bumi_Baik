"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError, FormFeedback } from "@/components/ui/FormFeedback";
import {
  inputClass,
  inputErrorClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/form-styles";
import {
  type FormState,
  initialFormState,
} from "@/lib/validators/common";
import type { Address } from "@/types";

type AddressAction = (state: FormState, formData: FormData) => Promise<FormState>;

type AddressFormProps = {
  action: AddressAction;
  address?: Address;
  submitLabel: string;
  resetOnSuccess?: boolean;
};

export function AddressForm({
  action,
  address,
  submitLabel,
  resetOnSuccess = false,
}: AddressFormProps) {
  const [state, formAction, pending] = useActionState(action, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") {
      formRef.current?.reset();
    }
  }, [resetOnSuccess, state.status]);

  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4">
      <FormFeedback state={state} />

      {address && <input type="hidden" name="id" value={address.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${address?.id ?? "new"}-recipient`} className={labelClass}>
            Nama penerima
          </label>
          <input
            id={`${address?.id ?? "new"}-recipient`}
            name="recipient"
            type="text"
            autoComplete="name"
            defaultValue={address?.recipient ?? ""}
            aria-invalid={Boolean(state.errors?.recipient)}
            aria-describedby={
              state.errors?.recipient ? `${address?.id ?? "new"}-recipient-error` : undefined
            }
            className={`${inputClass} ${state.errors?.recipient ? inputErrorClass : ""}`}
          />
          <FieldError
            id={`${address?.id ?? "new"}-recipient-error`}
            messages={state.errors?.recipient}
          />
        </div>

        <div>
          <label htmlFor={`${address?.id ?? "new"}-phone`} className={labelClass}>
            Nomor telepon
          </label>
          <input
            id={`${address?.id ?? "new"}-phone`}
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={address?.phone ?? ""}
            aria-invalid={Boolean(state.errors?.phone)}
            aria-describedby={
              state.errors?.phone ? `${address?.id ?? "new"}-phone-error` : undefined
            }
            className={`${inputClass} ${state.errors?.phone ? inputErrorClass : ""}`}
          />
          <FieldError
            id={`${address?.id ?? "new"}-phone-error`}
            messages={state.errors?.phone}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${address?.id ?? "new"}-street`} className={labelClass}>
          Alamat lengkap
        </label>
        <textarea
          id={`${address?.id ?? "new"}-street`}
          name="street"
          autoComplete="street-address"
          rows={3}
          defaultValue={address?.street ?? ""}
          aria-invalid={Boolean(state.errors?.street)}
          aria-describedby={
            state.errors?.street ? `${address?.id ?? "new"}-street-error` : undefined
          }
          className={`w-full rounded-md border border-paper-200 bg-white px-3 py-2 text-base text-ink-900 placeholder:text-ink-400 focus:border-forest-700 focus:outline-none ${
            state.errors?.street ? inputErrorClass : ""
          }`}
        />
        <FieldError
          id={`${address?.id ?? "new"}-street-error`}
          messages={state.errors?.street}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`${address?.id ?? "new"}-city`} className={labelClass}>
            Kota/kabupaten
          </label>
          <input
            id={`${address?.id ?? "new"}-city`}
            name="city"
            type="text"
            autoComplete="address-level2"
            defaultValue={address?.city ?? ""}
            aria-invalid={Boolean(state.errors?.city)}
            aria-describedby={
              state.errors?.city ? `${address?.id ?? "new"}-city-error` : undefined
            }
            className={`${inputClass} ${state.errors?.city ? inputErrorClass : ""}`}
          />
          <FieldError
            id={`${address?.id ?? "new"}-city-error`}
            messages={state.errors?.city}
          />
        </div>

        <div>
          <label htmlFor={`${address?.id ?? "new"}-province`} className={labelClass}>
            Provinsi
          </label>
          <input
            id={`${address?.id ?? "new"}-province`}
            name="province"
            type="text"
            autoComplete="address-level1"
            defaultValue={address?.province ?? ""}
            aria-invalid={Boolean(state.errors?.province)}
            aria-describedby={
              state.errors?.province ? `${address?.id ?? "new"}-province-error` : undefined
            }
            className={`${inputClass} ${state.errors?.province ? inputErrorClass : ""}`}
          />
          <FieldError
            id={`${address?.id ?? "new"}-province-error`}
            messages={state.errors?.province}
          />
        </div>

        <div>
          <label htmlFor={`${address?.id ?? "new"}-postal`} className={labelClass}>
            Kode pos
          </label>
          <input
            id={`${address?.id ?? "new"}-postal`}
            name="postal_code"
            type="text"
            autoComplete="postal-code"
            inputMode="numeric"
            pattern="[0-9]{5}"
            defaultValue={address?.postal_code ?? ""}
            aria-invalid={Boolean(state.errors?.postal_code)}
            aria-describedby={
              state.errors?.postal_code ? `${address?.id ?? "new"}-postal-error` : undefined
            }
            className={`${inputClass} ${state.errors?.postal_code ? inputErrorClass : ""}`}
          />
          <FieldError
            id={`${address?.id ?? "new"}-postal-error`}
            messages={state.errors?.postal_code}
          />
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-900">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={address?.is_default ?? false}
          className="h-4 w-4 shrink-0 accent-forest-700"
        />
        <span>Jadikan alamat utama</span>
      </label>

      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Menyimpan…" : submitLabel}
      </button>
    </form>
  );
}
