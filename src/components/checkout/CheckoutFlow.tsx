"use client";

import { useState } from "react";
import { PaymentMethodStep } from "@/components/checkout/PaymentMethodStep";
import { FREE_SHIPPING_MIN_IDR } from "@/lib/constants";
import { addressSchema } from "@/lib/validators/account";
import { angka, rupiah } from "@/lib/format";
import {
  channelAmountError,
  isAmountAllowed,
  isOvoChannel,
} from "@/lib/payments/channel-utils";
import type { PaymentChannel } from "@/lib/server/payments/types";
import type { Address } from "@/types";
import type { PricingSummary } from "@/lib/server/pricing";

type CheckoutItem = {
  product: {
    id: string;
    name: string;
    price_idr: number;
    stock: number;
    co2e_avoided_kg: number;
  } | null;
  productId: string;
  quantity: number;
  lineTotalIdr: number;
};

type AddressFormValues = {
  recipient: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
};

type CheckoutFlowProps = {
  addresses: Address[];
  items: CheckoutItem[];
  quotes: Record<"jawa" | "luarJawa", PricingSummary>;
  hasUnavailableItems: boolean;
  email: string;
  channels: PaymentChannel[];
  channelsError: string | null;
  defaultPhone: string;
};

const EMPTY_ADDRESS: AddressFormValues = {
  recipient: "",
  phone: "",
  street: "",
  city: "",
  province: "",
  postal_code: "",
};

const STEPS = ["Alamat", "Pengiriman", "Tinjau & bayar"] as const;

export function CheckoutFlow({
  addresses,
  items,
  quotes,
  hasUnavailableItems,
  email,
  channels,
  channelsError,
  defaultPhone,
}: CheckoutFlowProps) {
  const defaultAddress = addresses.find((address) => address.is_default);
  const initialChannel =
    channels.find((channel) => isAmountAllowed(channel, quotes.jawa.totalIdr)) ??
    channels[0];
  const [step, setStep] = useState(1);
  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    defaultAddress ? "saved" : "new",
  );
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [newAddress, setNewAddress] =
    useState<AddressFormValues>(EMPTY_ADDRESS);
  const [shippingMethod, setShippingMethod] = useState<"jawa" | "luarJawa">(
    "jawa",
  );
  const [channelCode, setChannelCode] = useState(initialChannel?.code ?? "");
  const [customerPhone, setCustomerPhone] = useState(
    defaultPhone || defaultAddress?.phone || "",
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    crypto.randomUUID(),
  );

  const selectedAddress = addresses.find((address) => address.id === addressId);
  const quote = quotes[shippingMethod];
  const selectedChannel = channels.find(
    (channel) => channel.code === channelCode,
  );
  const channelError = selectedChannel
    ? channelAmountError(selectedChannel, quote.totalIdr)
    : channels.length > 0
      ? "Pilih metode pembayaran terlebih dahulu."
      : "Metode pembayaran belum tersedia.";
  const phoneRequired =
    Boolean(selectedChannel && isOvoChannel(selectedChannel)) &&
    !customerPhone.trim();
  const canSubmit =
    !hasUnavailableItems &&
    items.length > 0 &&
    Boolean(selectedChannel) &&
    !channelError &&
    !phoneRequired;

  function continueFromAddress() {
    setFieldErrors({});
    setErrorMessage(null);

    if (addressMode === "saved") {
      if (!addresses.some((address) => address.id === addressId)) {
        setErrorMessage("Pilih alamat pengiriman terlebih dahulu.");
        return;
      }
    } else {
      const parsed = addressSchema.safeParse(newAddress);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0]?.toString() ?? "form";
          nextErrors[field] = issue.message;
        }
        setFieldErrors(nextErrors);
        setErrorMessage("Periksa kembali alamat yang Anda masukkan.");
        return;
      }
    }

    setStep(2);
  }

  async function submitCheckout() {
    if (!selectedChannel) {
      setErrorMessage("Pilih metode pembayaran terlebih dahulu.");
      return;
    }
    if (channelError) {
      setErrorMessage(channelError);
      return;
    }
    if (phoneRequired) {
      setErrorMessage("Nomor telepon wajib diisi untuk pembayaran OVO.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const body = {
      ...(addressMode === "saved" ? { addressId } : { newAddress }),
      shippingMethod,
      channelCode,
      ...(customerPhone.trim()
        ? { customerPhone: customerPhone.trim() }
        : {}),
      idempotencyKey,
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        orderId?: string;
        paymentUrl?: string;
        error?: {
          code?: string;
          message?: string;
          details?: { items?: Array<{ name: string; available: number }> };
        };
      };

      if (!response.ok || !result.paymentUrl) {
        if (result.error?.code === "PAYMENT_CREATE_FAILED") {
          setIdempotencyKey(crypto.randomUUID());
        }
        const shortages = result.error?.details?.items
          ?.map((item) => `${item.name} (tersedia ${item.available})`)
          .join(", ");
        setErrorMessage(
          shortages
            ? `${result.error?.message ?? "Stok berubah."} ${shortages}`
            : (result.error?.message ?? "Checkout belum berhasil. Coba lagi."),
        );
        return;
      }

      window.location.assign(result.paymentUrl);
    } catch {
      setErrorMessage(
        "Koneksi terputus. Periksa pesanan sebelum mencoba lagi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateAddress(field: keyof AddressFormValues, value: string) {
    setNewAddress((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }

  function continueToReview() {
    if (!selectedChannel || channelError) {
      const allowed = channels.find((channel) =>
        isAmountAllowed(channel, quote.totalIdr),
      );
      setChannelCode(allowed?.code ?? "");
    }
    setStep(3);
  }

  function renderAddressField(
    field: keyof AddressFormValues,
    label: string,
    type = "text",
  ) {
    const error = fieldErrors[field];
    return (
      <div className={field === "street" ? "sm:col-span-2" : ""} key={field}>
        <label
          htmlFor={`checkout-${field}`}
          className="mb-1 block text-sm font-medium text-ink-900"
        >
          {label}
        </label>
        <input
          id={`checkout-${field}`}
          name={field}
          type={type}
          autoComplete={field === "recipient" ? "name" : undefined}
          value={newAddress[field]}
          onChange={(event) => updateAddress(field, event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `checkout-${field}-error` : undefined}
          className={`h-11 w-full rounded-md border bg-white px-3 text-base text-ink-900 outline-none focus:border-forest-700 ${
            error ? "border-danger" : "border-paper-200"
          }`}
          required
        />
        {error && (
          <p
            id={`checkout-${field}-error`}
            className="mt-1 text-sm text-danger"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16 ${
        step === 3 ? "pb-32 lg:pb-16" : ""
      }`}
    >
      <header>
        <p className="font-mono text-sm text-forest-700">Pesanan Anda</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-tight text-forest-900 sm:text-5xl">
          Checkout
        </h1>
      </header>

      <details className="mt-6 rounded-md border border-paper-200 bg-paper-50 p-4 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium text-forest-900">
          Ringkasan pesanan · {rupiah(quote.totalIdr)}
        </summary>
        <dl className="mt-4 space-y-2 border-t border-paper-200 pt-4 text-sm">
          <PriceRow label="Subtotal" amount={quote.subtotalIdr} />
          <PriceRow label="Ongkir" amount={quote.shippingIdr} />
          <PriceRow label="Total" amount={quote.totalIdr} strong />
          <p className="pt-2 font-mono text-forest-700">
            Estimasi {angka(quote.totalCo2eKg)} kg CO₂e dihindari
          </p>
        </dl>
      </details>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        <section>
          <ol
            aria-label="Langkah checkout"
            className="grid grid-cols-3 border-y border-paper-200 py-4"
          >
            {STEPS.map((label, index) => {
              const number = index + 1;
              const complete = number < step;
              return (
                <li
                  key={label}
                  aria-current={number === step ? "step" : undefined}
                  className={`flex items-center gap-2 text-sm ${
                    number === step
                      ? "font-semibold text-forest-900"
                      : complete
                        ? "text-forest-700"
                        : "text-ink-600"
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current font-mono">
                    {complete ? "✓" : number}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>

          {errorMessage && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-danger px-4 py-3 text-sm text-danger"
            >
              {errorMessage}
            </p>
          )}

          {hasUnavailableItems && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-warning px-4 py-3 text-sm text-ink-900"
            >
              Stok produk di keranjang berubah. Kembali ke keranjang untuk
              memperbarui jumlah sebelum checkout.
            </p>
          )}

          {step === 1 && (
            <section aria-labelledby="address-heading" className="mt-7">
              <h2 id="address-heading" className="text-2xl text-forest-900">
                Alamat pengiriman
              </h2>
              {addresses.length > 0 && (
                <fieldset className="mt-4 space-y-3">
                  <legend className="sr-only">Pilih alamat</legend>
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className="flex cursor-pointer gap-3 rounded-md border border-paper-200 p-4"
                    >
                      <input
                        type="radio"
                        name="address-choice"
                        checked={
                          addressMode === "saved" && addressId === address.id
                        }
                        onChange={() => {
                          setAddressMode("saved");
                          setAddressId(address.id);
                        }}
                        className="mt-1 accent-forest-700"
                      />
                      <span>
                        <span className="block font-medium text-ink-900">
                          {address.recipient}
                          {address.is_default ? " · Alamat utama" : ""}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-ink-600">
                          {address.phone} · {address.street}, {address.city},{" "}
                          {address.province} {address.postal_code}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}

              <label className="mt-4 flex cursor-pointer gap-3 rounded-md border border-paper-200 p-4">
                <input
                  type="radio"
                  name="address-choice"
                  checked={addressMode === "new"}
                  onChange={() => setAddressMode("new")}
                  className="mt-1 accent-forest-700"
                />
                <span className="font-medium text-ink-900">
                  Gunakan alamat baru
                </span>
              </label>

              {addressMode === "new" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {renderAddressField("recipient", "Nama penerima")}
                  {renderAddressField("phone", "Nomor telepon", "tel")}
                  {renderAddressField("street", "Alamat lengkap")}
                  {renderAddressField("city", "Kota/kabupaten")}
                  {renderAddressField("province", "Provinsi")}
                  {renderAddressField("postal_code", "Kode pos")}
                </div>
              )}

              <button
                type="button"
                onClick={continueFromAddress}
                disabled={hasUnavailableItems}
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
              >
                Lanjut ke pengiriman
              </button>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="shipping-heading" className="mt-7">
              <h2 id="shipping-heading" className="text-2xl text-forest-900">
                Pilih pengiriman
              </h2>
              <fieldset className="mt-4 space-y-3">
                <legend className="sr-only">Zona pengiriman</legend>
                {(["jawa", "luarJawa"] as const).map((zone) => (
                  <label
                    key={zone}
                    className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-md border border-paper-200 p-4"
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        value={zone}
                        checked={shippingMethod === zone}
                        onChange={() => setShippingMethod(zone)}
                        className="accent-forest-700"
                      />
                      <span className="font-medium text-ink-900">
                        {zone === "jawa" ? "Jawa" : "Luar Jawa"}
                      </span>
                    </span>
                    <span className="text-sm text-ink-600">
                      {quoteForZone(quotes, zone).shippingIdr === 0
                        ? "Gratis"
                        : rupiah(quoteForZone(quotes, zone).shippingIdr)}
                    </span>
                  </label>
                ))}
              </fieldset>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-forest-700 px-6 font-medium text-forest-700 hover:bg-forest-100"
                >
                  Kembali ke alamat
                </button>
                <button
                  type="button"
                  onClick={continueToReview}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
                >
                  Tinjau pesanan
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="review-heading" className="mt-7">
              <h2 id="review-heading" className="text-2xl text-forest-900">
                Tinjau & bayar
              </h2>

              <section aria-labelledby="payment-heading" className="mt-5">
                <h3
                  id="payment-heading"
                  className="text-lg font-medium text-forest-900"
                >
                  Metode pembayaran
                </h3>
                <div className="mt-3">
                  <PaymentMethodStep
                    channels={channels}
                    channelsError={channelsError}
                    selectedCode={channelCode}
                    totalIdr={quote.totalIdr}
                    phone={customerPhone}
                    onSelect={setChannelCode}
                    onPhoneChange={setCustomerPhone}
                  />
                </div>
              </section>

              <div className="mt-4 space-y-4 rounded-md border border-paper-200 p-4">
                <div>
                  <h3 className="font-medium text-forest-900">
                    Alamat pengiriman
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {addressMode === "saved" && selectedAddress
                      ? `${selectedAddress.recipient}, ${selectedAddress.phone}, ${selectedAddress.street}, ${selectedAddress.city}, ${selectedAddress.province} ${selectedAddress.postal_code}`
                      : `${newAddress.recipient}, ${newAddress.phone}, ${newAddress.street}, ${newAddress.city}, ${newAddress.province} ${newAddress.postal_code}`}
                  </p>
                </div>
                <div className="border-t border-paper-200 pt-4">
                  <h3 className="font-medium text-forest-900">Pengiriman</h3>
                  <p className="mt-1 text-sm text-ink-600">
                    {shippingMethod === "jawa" ? "Jawa" : "Luar Jawa"}
                  </p>
                </div>
                <ul className="border-t border-paper-200 pt-4">
                  {items.map((item) => (
                    <li
                      key={item.productId}
                      className="flex justify-between gap-4 py-2 text-sm"
                    >
                      <span className="text-ink-600">
                        {item.product?.name ?? "Produk tidak tersedia"} ×{" "}
                        {item.quantity}
                      </span>
                      <span className="font-medium text-ink-900">
                        {item.product ? rupiah(item.lineTotalIdr) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-forest-700 px-6 font-medium text-forest-700 hover:bg-forest-100 disabled:opacity-60"
                >
                  Kembali ke pengiriman
                </button>
                <button
                  type="button"
                  onClick={submitCheckout}
                  disabled={!canSubmit || submitting}
                  className="hidden min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400 lg:inline-flex"
                >
                  {submitting ? "Memproses pesanan..." : "Bayar sekarang"}
                </button>
              </div>
              <p className="mt-3 text-sm text-ink-600">
                Status pesanan hanya berubah setelah pembayaran terverifikasi.
                Anda akan diarahkan ke halaman pembayaran penyedia.
              </p>
            </section>
          )}

          <p className="mt-6 text-sm text-ink-600">
            Konfirmasi pembayaran akan dikirim ke {email}.
          </p>
        </section>

        <aside className="hidden h-fit rounded-md border border-paper-200 bg-paper-50 p-5 lg:sticky lg:top-8 lg:block">
          <h2 className="font-display text-xl text-forest-900">
            Ringkasan pesanan
          </h2>
          <ul className="mt-3 divide-y divide-paper-200">
            {items.map((item) => (
              <li
                key={item.productId}
                className="flex justify-between gap-4 py-3 text-sm"
              >
                <span className="text-ink-600">
                  {item.product?.name ?? "Produk tidak tersedia"} ×{" "}
                  {item.quantity}
                </span>
                <span className="font-medium text-ink-900">
                  {item.product ? rupiah(item.lineTotalIdr) : "—"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-2 border-t border-paper-200 pt-4 text-sm">
            <PriceRow label="Subtotal" amount={quote.subtotalIdr} />
            <PriceRow label="Ongkir" amount={quote.shippingIdr} />
            <PriceRow label="Total" amount={quote.totalIdr} strong />
          </div>
          <p className="mt-4 border-t border-paper-200 pt-4 font-mono text-sm text-forest-700">
            Estimasi {angka(quote.totalCo2eKg)} kg CO₂e dihindari
          </p>
          <p className="mt-2 text-sm text-ink-600">
            {shippingMethod === "jawa" ? "Tarif zona Jawa" : "Tarif luar Jawa"}.
            Ongkir gratis mulai {rupiah(FREE_SHIPPING_MIN_IDR)}.
          </p>
        </aside>
      </div>

      {step === 3 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-paper-200 bg-paper-50 p-4 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
            <p className="text-sm text-ink-600">
              Total{" "}
              <span className="block font-medium text-ink-900">
                {rupiah(quote.totalIdr)}
              </span>
            </p>
            <button
              type="button"
              onClick={submitCheckout}
              disabled={!canSubmit || submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900 disabled:cursor-not-allowed disabled:bg-paper-200 disabled:text-ink-400"
            >
              {submitting ? "Memproses..." : "Bayar sekarang"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function quoteForZone(
  quotes: CheckoutFlowProps["quotes"],
  zone: "jawa" | "luarJawa",
) {
  return quotes[zone];
}

function PriceRow({
  label,
  amount,
  strong = false,
}: {
  label: string;
  amount: number;
  strong?: boolean;
}) {
  return (
    <p
      className={`flex justify-between gap-4 ${
        strong
          ? "border-t border-paper-200 pt-3 font-semibold text-ink-900"
          : "text-ink-600"
      }`}
    >
      <span>{label}</span>
      <span>{rupiah(amount)}</span>
    </p>
  );
}
