"use client";

import { useActionState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2, type LucideIcon } from "lucide-react";
import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
} from "@/app/(account)/akun/actions";
import { AddressForm } from "@/components/account/AddressForm";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { initialFormState, type FormState } from "@/lib/validators/common";
import type { Address } from "@/types";

type AddressMutationAction = (
  state: FormState,
  formData: FormData,
) => Promise<FormState>;

function AddressMutationForm({
  action,
  addressId,
  label,
  icon: Icon,
  confirmMessage,
  danger = false,
}: {
  action: AddressMutationAction;
  addressId: string;
  label: string;
  icon: LucideIcon;
  confirmMessage?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, initialFormState);

  return (
    <div>
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirmMessage && !window.confirm(confirmMessage)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={addressId} />
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:border-paper-200 disabled:text-ink-400 ${
            danger
              ? "border-danger text-danger hover:bg-paper-100"
              : "border-forest-700 text-forest-700 hover:bg-forest-100"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          {pending ? "Memproses…" : label}
        </button>
      </form>
      <FormFeedback state={state} />
    </div>
  );
}

export function AddressManager({ addresses }: { addresses: Address[] }) {
  return (
    <section aria-labelledby="address-heading" className="mt-10 border-t border-paper-200 pt-8">
      <h2
        id="address-heading"
        className="font-display text-2xl font-semibold leading-tight text-forest-900"
      >
        Alamat pengiriman
      </h2>
      <p className="mt-2 text-base leading-relaxed text-ink-600">
        Simpan alamat untuk mempercepat checkout. Satu alamat dapat dijadikan alamat utama.
      </p>

      <details className="group mt-5 rounded-md border border-paper-200 bg-paper-50">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 font-medium text-forest-700 [&::-webkit-details-marker]:hidden">
          <Plus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          Tambah alamat
        </summary>
        <div className="border-t border-paper-200 p-4">
          <AddressForm
            action={createAddressAction}
            submitLabel="Simpan alamat"
            resetOnSuccess
          />
        </div>
      </details>

      {addresses.length === 0 ? (
        <div className="mt-6 rounded-md border border-paper-200 bg-paper-50 p-6 text-center">
          <MapPin
            className="mx-auto h-8 w-8 text-forest-700"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <p className="mt-3 font-medium text-ink-900">Belum ada alamat tersimpan.</p>
          <p className="mt-1 text-sm text-ink-600">
            Tambahkan alamat pengiriman agar checkout berikutnya lebih cepat.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-md border border-paper-200 bg-paper-50 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink-900">{address.recipient}</p>
                {address.is_default && (
                  <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-medium text-forest-900">
                    Utama
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-600">{address.phone}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {address.street}, {address.city}, {address.province} {address.postal_code}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {!address.is_default && (
                  <AddressMutationForm
                    action={setDefaultAddressAction}
                    addressId={address.id}
                    icon={Star}
                    label="Jadikan utama"
                  />
                )}

                <AddressMutationForm
                  action={deleteAddressAction}
                  addressId={address.id}
                  icon={Trash2}
                  label="Hapus"
                  confirmMessage="Hapus alamat ini?"
                  danger
                />
              </div>

              <details className="group mt-4 border-t border-paper-200 pt-4">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-forest-700 [&::-webkit-details-marker]:hidden">
                  <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  Ubah alamat
                </summary>
                <div className="mt-4">
                  <AddressForm
                    action={updateAddressAction}
                    address={address}
                    submitLabel="Perbarui alamat"
                  />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
