import { rupiah } from "@/lib/format";
import {
  PAYMENT_GROUP_ORDER,
  channelAmountError,
  channelGroupLabel,
  estimateFeeIdr,
  isAmountAllowed,
  isOvoChannel,
} from "@/lib/payments/channel-utils";
import type { PaymentChannel } from "@/lib/server/payments/types";

type PaymentMethodStepProps = {
  channels: PaymentChannel[];
  channelsError: string | null;
  selectedCode: string;
  totalIdr: number;
  phone: string;
  onSelect: (code: string) => void;
  onPhoneChange: (value: string) => void;
};

function groupChannels(channels: PaymentChannel[]) {
  const groups = new Map<string, PaymentChannel[]>();
  for (const channel of channels) {
    const label = channelGroupLabel(channel);
    const current = groups.get(label) ?? [];
    current.push(channel);
    groups.set(label, current);
  }
  const known = new Set<string>(PAYMENT_GROUP_ORDER);
  return [
    ...PAYMENT_GROUP_ORDER.flatMap((label) => {
      const items = groups.get(label);
      return items ? [{ label, items }] : [];
    }),
    ...Array.from(groups.entries())
      .filter(([label]) => !known.has(label))
      .map(([label, items]) => ({ label, items })),
  ];
}

export function PaymentMethodStep({
  channels,
  channelsError,
  selectedCode,
  totalIdr,
  phone,
  onSelect,
  onPhoneChange,
}: PaymentMethodStepProps) {
  const selected = channels.find((channel) => channel.code === selectedCode);
  const selectedError = selected
    ? channelAmountError(selected, totalIdr)
    : null;

  if (channelsError) {
    return (
      <p
        role="alert"
        className="rounded-md border border-warning px-4 py-3 text-sm text-ink-900"
      >
        {channelsError}
      </p>
    );
  }

  if (channels.length === 0) {
    return (
      <p className="rounded-md border border-paper-200 px-4 py-3 text-sm text-ink-600">
        Belum ada metode pembayaran aktif.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groupChannels(channels).map((group) => (
        <fieldset key={group.label}>
          <legend className="text-sm font-semibold text-forest-900">
            {group.label}
          </legend>
          <div className="mt-2 space-y-2">
            {group.items.map((channel) => {
              const disabled = !isAmountAllowed(channel, totalIdr);
              const fee = estimateFeeIdr(channel, totalIdr);
              return (
                <label
                  key={channel.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
                    disabled
                      ? "cursor-not-allowed border-paper-200 bg-paper-100 text-ink-400"
                      : selectedCode === channel.code
                        ? "border-forest-700 bg-forest-100"
                        : "border-paper-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-channel"
                    value={channel.code}
                    checked={selectedCode === channel.code}
                    disabled={disabled}
                    onChange={() => onSelect(channel.code)}
                    className="mt-1 accent-forest-700"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-900">
                      {channel.name}
                    </span>
                    <span className="mt-1 block text-sm text-ink-600">
                      {channel.maxAmount === null
                        ? `Mulai ${rupiah(channel.minAmount)}`
                        : `${rupiah(channel.minAmount)} – ${rupiah(channel.maxAmount)}`}
                    </span>
                    {fee !== null && (
                      <span className="mt-1 block text-sm text-ink-600">
                        Estimasi biaya layanan {rupiah(fee)} ditambahkan
                        penyedia.
                      </span>
                    )}
                    {disabled && (
                      <span className="mt-1 block text-sm text-danger">
                        Tidak tersedia untuk total pesanan ini.
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {selected && isOvoChannel(selected) && (
        <div>
          <label
            htmlFor="checkout-customer-phone"
            className="mb-1 block text-sm font-medium text-ink-900"
          >
            Nomor telepon OVO
          </label>
          <input
            id="checkout-customer-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            className="h-11 w-full rounded-md border border-paper-200 bg-white px-3 text-base text-ink-900 outline-none focus:border-forest-700"
            required
          />
          <p className="mt-1 text-sm text-ink-600">
            Nomor ini dipakai untuk mengirim tagihan ke aplikasi OVO.
          </p>
        </div>
      )}

      {selectedError && (
        <p role="alert" className="text-sm text-danger">
          {selectedError}
        </p>
      )}
    </div>
  );
}
