import type { Metadata } from "next";
import Link from "next/link";
import { rupiah, tanggal } from "@/lib/format";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES } from "@/lib/order-status";
import { requireUser } from "@/lib/supabase/auth";
import type { Order } from "@/types";

export const metadata: Metadata = {
  title: "Pesanan Saya",
  description: "Riwayat dan status pesanan Anda di Bumi Baik.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const { supabase, user } = await requireUser("/pesanan");
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, status, subtotal_idr, shipping_idr, total_idr, total_co2e_kg, shipping_address, shipping_method, tracking_number, idempotency_key, expires_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Riwayat pesanan belum berhasil dimuat.", { cause: error });
  }
  const orders = (data ?? []) as Order[];

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <p className="font-mono text-sm text-forest-700">Akun Bumi Baik</p>
      <h1 className="mt-2 text-3xl font-semibold text-forest-900 sm:text-5xl">
        Pesanan saya
      </h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-md border border-paper-200 p-6">
          <p className="text-base text-ink-600">
            Belum ada pesanan. Produk yang Anda beli akan tercatat di sini.
          </p>
          <Link
            href="/produk"
            className="mt-4 inline-flex min-h-11 items-center rounded-md bg-forest-700 px-6 font-medium text-paper-50 hover:bg-forest-900"
          >
            Lihat produk
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-md border border-paper-200 bg-paper-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-sm text-forest-700">
                    {order.order_number}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {tanggal(order.created_at)}
                  </p>
                </div>
                <span
                  className={`rounded-sm border px-3 py-1 text-sm ${ORDER_STATUS_STYLES[order.status]}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-paper-200 pt-4">
                <p className="font-medium text-ink-900">
                  Total {rupiah(order.total_idr)}
                </p>
                <Link
                  href={`/pesanan/${order.id}`}
                  className="inline-flex min-h-11 items-center rounded-md border border-forest-700 px-5 font-medium text-forest-700 hover:bg-forest-100"
                >
                  Lihat pesanan
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
