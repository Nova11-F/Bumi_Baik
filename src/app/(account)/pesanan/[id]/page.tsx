import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SyncPaymentButton } from "@/components/orders/SyncPaymentButton";
import { angka, rupiah, tanggal } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_STYLES,
} from "@/lib/order-status";
import { channelDisplayName } from "@/lib/payments/channel-utils";
import { extractPaymentInfo } from "@/lib/server/payments/payment-info";
import { requireUser } from "@/lib/supabase/auth";
import type { Json, Order, OrderItem, Payment } from "@/types";

export const metadata: Metadata = {
  title: "Detail Pesanan",
  description: "Status, rincian, dan pembayaran pesanan Bumi Baik.",
};

const addressSnapshotSchema = z.object({
  recipient: z.string(),
  phone: z.string(),
  street: z.string(),
  city: z.string(),
  province: z.string(),
  postal_code: z.string(),
});

function getAddressLines(value: Json): string[] {
  const parsed = addressSnapshotSchema.safeParse(value);
  if (!parsed.success) return [];
  const address = parsed.data;
  return [
    address.recipient,
    address.phone,
    address.street,
    `${address.city}, ${address.province} ${address.postal_code}`,
  ];
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { supabase, user } = await requireUser(`/pesanan/${id}`);
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, status, subtotal_idr, shipping_idr, total_idr, total_co2e_kg, shipping_address, shipping_method, tracking_number, idempotency_key, expires_at, created_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    throw new Error("Detail pesanan belum berhasil dimuat.", {
      cause: orderError,
    });
  }
  if (!orderData) notFound();

  const order = orderData as Order;
  const [itemsResult, paymentResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, order_id, product_id, product_name, unit_price_idr, quantity, co2e_avoided_kg",
      )
      .eq("order_id", order.id),
    supabase
      .from("payments")
      .select(
        "id, order_id, provider, provider_ref, status, amount_idr, payable_idr, channel_code, expires_at, attempt, payment_url, raw_payload, created_at, paid_at",
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (itemsResult.error || paymentResult.error) {
    throw new Error("Rincian pembayaran belum berhasil dimuat.", {
      cause: itemsResult.error ?? paymentResult.error,
    });
  }

  const items = (itemsResult.data ?? []) as OrderItem[];
  const addressLines = getAddressLines(order.shipping_address);
  const payment = (paymentResult.data as Payment | null) ?? null;
  const paymentInfo = payment ? extractPaymentInfo(payment.raw_payload) : {};
  const payableIdr = payment?.payable_idr ?? payment?.amount_idr ?? 0;
  const serviceFeeIdr = payment ? payableIdr - payment.amount_idr : 0;
  const paymentUrl = payment?.payment_url;

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <Link
        href="/pesanan"
        className="inline-flex min-h-11 items-center text-sm text-forest-700 underline underline-offset-4"
      >
        Kembali ke pesanan
      </Link>
      <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-forest-700">
            {order.order_number}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-forest-900 sm:text-5xl">
            Detail pesanan
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Dibuat {tanggal(order.created_at)}
          </p>
        </div>
        <span
          className={`rounded-sm border px-3 py-1 text-sm ${ORDER_STATUS_STYLES[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </header>

      {payment && (
        <section
          aria-labelledby="payment-heading"
          className={`mt-6 rounded-md border p-5 ${
            order.status === "pending"
              ? "border-warning bg-clay-100"
              : "border-paper-200"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id="payment-heading"
              className="font-display text-xl text-forest-900"
            >
              Pembayaran
            </h2>
            <span
              className={`rounded-sm border px-3 py-1 text-sm ${PAYMENT_STATUS_STYLES[payment.status]}`}
            >
              {PAYMENT_STATUS_LABELS[payment.status]}
            </span>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Metode</dt>
              <dd className="font-medium text-ink-900">
                {channelDisplayName(payment.channel_code)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-600">Total tagihan</dt>
              <dd className="font-medium text-ink-900">
                {rupiah(payableIdr)}
              </dd>
            </div>
            {serviceFeeIdr > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Biaya layanan pembayaran</dt>
                <dd className="font-medium text-ink-900">
                  {rupiah(serviceFeeIdr)}
                </dd>
              </div>
            )}
            {payment.expires_at && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-600">Berlaku sampai</dt>
                <dd className="text-ink-900">
                  <time dateTime={payment.expires_at}>
                    {tanggal(payment.expires_at)}
                  </time>
                </dd>
              </div>
            )}
          </dl>

          {(paymentInfo.vaNumber ||
            paymentInfo.paymentCode ||
            paymentInfo.qrString ||
            paymentInfo.qrUrl ||
            paymentInfo.checkoutUrl) && (
            <div className="mt-4 space-y-2 border-t border-paper-200 pt-4 text-sm">
              {paymentInfo.bank && paymentInfo.vaNumber && (
                <p className="text-ink-900">
                  {paymentInfo.bank} ·{" "}
                  <span className="font-mono">{paymentInfo.vaNumber}</span>
                </p>
              )}
              {paymentInfo.store && paymentInfo.paymentCode && (
                <p className="text-ink-900">
                  {paymentInfo.store} ·{" "}
                  <span className="font-mono">
                    {paymentInfo.paymentCode}
                  </span>
                </p>
              )}
              {paymentInfo.qrString && (
                <p className="break-all text-ink-900">
                  Kode QR:{" "}
                  <span className="font-mono">{paymentInfo.qrString}</span>
                </p>
              )}
              {paymentInfo.qrUrl && (
                <a
                  href={paymentInfo.qrUrl}
                  className="inline-flex min-h-11 items-center text-forest-700 underline underline-offset-4"
                >
                  Buka gambar QR
                </a>
              )}
              {paymentInfo.checkoutUrl && (
                <a
                  href={paymentInfo.checkoutUrl}
                  className="inline-flex min-h-11 items-center text-forest-700 underline underline-offset-4"
                >
                  Buka halaman pembayaran
                </a>
              )}
            </div>
          )}

          {order.status === "pending" && (
            <div className="mt-4 border-t border-paper-200 pt-4">
              <p className="text-sm text-ink-900">
                Selesaikan pembayaran sebelum{" "}
                <time dateTime={order.expires_at}>
                  {tanggal(order.expires_at)}
                </time>
                .
              </p>
              {paymentUrl && (
                <a
                  href={paymentUrl}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
                >
                  Lanjutkan pembayaran
                </a>
              )}
              <SyncPaymentButton orderId={order.id} />
            </div>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-md border border-paper-200 p-5">
          <h2 className="font-display text-xl text-forest-900">
            Rincian produk
          </h2>
          <ul className="mt-4 divide-y divide-paper-200">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <span className="text-ink-900">
                  {item.product_name} × {item.quantity}
                  <span className="mt-1 block text-ink-600">
                    {rupiah(item.unit_price_idr)} per item
                  </span>
                </span>
                <span className="font-medium text-ink-900">
                  {rupiah(item.unit_price_idr * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-2 border-t border-paper-200 pt-4 text-sm">
            <PriceRow label="Subtotal" amount={order.subtotal_idr} />
            <PriceRow label="Ongkir" amount={order.shipping_idr} />
            <PriceRow label="Total" amount={order.total_idr} strong />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-md border border-paper-200 p-5">
            <h2 className="font-display text-xl text-forest-900">
              Alamat pengiriman
            </h2>
            <address className="mt-3 space-y-1 text-sm not-italic leading-relaxed text-ink-600">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            {order.tracking_number && (
              <p className="mt-4 text-sm text-ink-900">
                Nomor resi: {order.tracking_number}
              </p>
            )}
          </section>
          <section className="rounded-md border border-paper-200 p-5">
            <h2 className="font-display text-xl text-forest-900">
              Dampak belanja
            </h2>
            <p className="mt-2 font-mono text-sm text-forest-700">
              Estimasi {angka(order.total_co2e_kg)} kg CO₂e dihindari
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
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
