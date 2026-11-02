import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MockPayForm } from "./MockPayForm";
import { rupiah } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Pembayaran MOCK",
  description: "Halaman simulasi pembayaran untuk pengujian.",
};

export default async function MockPayPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const { user } = await requireUser(`/mock-pay/${ref}`);
  if ((process.env.PAYMENT_PROVIDER ?? "mock") !== "mock") notFound();

  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("order_id, amount_idr, provider")
    .eq("provider_ref", ref)
    .eq("provider", "mock")
    .maybeSingle();

  if (paymentError) {
    throw new Error("Pembayaran MOCK belum berhasil dimuat.", {
      cause: paymentError,
    });
  }
  if (!payment) notFound();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, order_number, status")
    .eq("id", payment.order_id)
    .maybeSingle();

  if (orderError) {
    throw new Error("Pesanan untuk pembayaran MOCK belum berhasil dimuat.", {
      cause: orderError,
    });
  }
  if (!order || order.user_id !== user.id) notFound();
  if (order.status !== "pending") redirect(`/pesanan/${order.id}`);

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6 lg:py-20">
      <p className="font-mono text-sm text-forest-700">Provider pengujian</p>
      <h1 className="mt-2 text-3xl font-semibold text-forest-900">
        Pembayaran MOCK
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-600">
        Ini simulasi lokal. Pilih hasil untuk mengirim webhook bertanda tangan
        ke pemroses pembayaran.
      </p>
      <dl className="mt-6 space-y-3 rounded-md border border-paper-200 p-5">
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-ink-600">Nomor pesanan</dt>
          <dd className="font-mono text-sm text-ink-900">
            {order.order_number}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-sm text-ink-600">Total</dt>
          <dd className="font-medium text-ink-900">
            {rupiah(payment.amount_idr)}
          </dd>
        </div>
      </dl>
      <MockPayForm ref={ref} />
      <Link
        href={`/pesanan/${order.id}`}
        className="mt-5 inline-block text-sm text-forest-700 underline underline-offset-4"
      >
        Kembali ke pesanan
      </Link>
    </section>
  );
}
