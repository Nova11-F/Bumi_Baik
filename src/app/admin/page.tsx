import type { Metadata } from "next";
import { AdminOrderForm } from "@/components/admin/AdminOrderForm";
import { AdminProductForm } from "@/components/admin/AdminProductForm";
import { channelDisplayName } from "@/lib/payments/channel-utils";
import { rupiah, tanggal } from "@/lib/format";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/order-status";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import type { Order, Payment, Product, WebhookEvent } from "@/types";

export const metadata: Metadata = {
  title: "Admin",
  description: "Kelola pesanan, pengiriman, harga, dan stok Bumi Baik.",
  robots: { index: false, follow: false },
};

type AdminOrder = Pick<
  Order,
  | "id"
  | "order_number"
  | "status"
  | "subtotal_idr"
  | "shipping_idr"
  | "total_idr"
  | "tracking_number"
  | "created_at"
>;

type AdminPayment = Pick<
  Payment,
  | "id"
  | "order_id"
  | "provider"
  | "provider_ref"
  | "status"
  | "amount_idr"
  | "payable_idr"
  | "channel_code"
  | "created_at"
>;

type ActionOrder = Pick<Order, "id" | "order_number" | "status" | "total_idr">;

type ActionPayment = AdminPayment & {
  orders: ActionOrder | ActionOrder[] | null;
};

function relatedOrder(value: ActionPayment["orders"]): ActionOrder | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AdminPage() {
  const { admin } = await requireAdmin();
  const [ordersResult, productsResult, lateResult, unlinkedResult] =
    await Promise.all([
      admin
        .from("orders")
        .select(
          "id, order_number, status, subtotal_idr, shipping_idr, total_idr, tracking_number, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("products")
        .select("id, slug, name, price_idr, stock")
        .order("name", { ascending: true }),
      admin
        .from("payments")
        .select(
          "id, order_id, provider, provider_ref, status, amount_idr, payable_idr, channel_code, created_at, orders!inner(id, order_number, status, total_idr)",
        )
        .eq("status", "paid")
        .in("orders.status", ["expired", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(100),
      admin
        .from("payments")
        .select(
          "id, order_id, provider, provider_ref, status, amount_idr, payable_idr, channel_code, created_at, orders!inner(id, order_number, status, total_idr)",
        )
        .is("provider_ref", null)
        .eq("orders.status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const queryError =
    ordersResult.error ??
    productsResult.error ??
    lateResult.error ??
    unlinkedResult.error;
  if (queryError) {
    throw new Error("Data administrasi belum berhasil dimuat.", {
      cause: queryError,
    });
  }

  const orders = (ordersResult.data ?? []) as AdminOrder[];
  const products = (productsResult.data ?? []) as Pick<
    Product,
    "id" | "slug" | "name" | "price_idr" | "stock"
  >[];
  const latePayments = (lateResult.data ?? []) as unknown as ActionPayment[];
  const unlinkedPayments = (unlinkedResult.data ??
    []) as unknown as ActionPayment[];

  const orderIds = orders.map((order) => order.id);
  const paymentResult = orderIds.length
    ? await admin
        .from("payments")
        .select(
          "id, order_id, provider, provider_ref, status, amount_idr, payable_idr, channel_code, created_at",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (paymentResult.error) {
    throw new Error("Data pembayaran belum berhasil dimuat.", {
      cause: paymentResult.error,
    });
  }

  const latestPaymentByOrder = new Map<string, AdminPayment>();
  const payments = (paymentResult.data ?? []) as AdminPayment[];
  for (const payment of payments) {
    if (!latestPaymentByOrder.has(payment.order_id)) {
      latestPaymentByOrder.set(payment.order_id, payment);
    }
  }

  const paymentEventKeys = [
    ...new Map(
      [...latestPaymentByOrder.values()]
        .filter((payment) => payment.provider_ref)
        .map((payment) => [
          `${payment.provider}:${payment.provider_ref}`,
          payment,
        ]),
    ).values(),
  ];
  const eventIds = [
    ...new Set(
      paymentEventKeys.flatMap((payment) =>
        [
          "pending",
          "paid",
          "failed",
          "expired",
          "cancelled",
          "refunded",
        ].map((status) => `${payment.provider_ref}:${status}`),
      ),
    ),
  ];
  const providers = [...new Set(paymentEventKeys.map((payment) => payment.provider))];
  const eventsResult = eventIds.length
    ? await admin
        .from("webhook_events")
        .select(
          "id, provider, event_id, payload, processing_status, received_at, claimed_at",
        )
        .in("provider", providers)
        .in("event_id", eventIds)
        .order("received_at", { ascending: false })
    : { data: [], error: null };
  if (eventsResult.error) {
    throw new Error("Riwayat event pembayaran belum berhasil dimuat.", {
      cause: eventsResult.error,
    });
  }

  const latestEventByPayment = new Map<string, WebhookEvent>();
  for (const event of (eventsResult.data ?? []) as WebhookEvent[]) {
    const ref = event.event_id.slice(0, event.event_id.lastIndexOf(":"));
    const key = `${event.provider}:${ref}`;
    if (!latestEventByPayment.has(key)) latestEventByPayment.set(key, event);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <header className="border-b border-paper-200 pb-8">
        <p className="font-mono text-sm text-forest-700">Pengelolaan toko</p>
        <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
          Admin
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-600">
          Perbarui status pesanan, catat nomor resi, dan jaga harga serta stok
          katalog tetap akurat.
        </p>
      </header>

      <section aria-labelledby="actions-heading" className="py-10">
        <p className="font-mono text-sm text-forest-700">Perlu ditinjau</p>
        <h2
          id="actions-heading"
          className="mt-2 font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
        >
          Perlu tindakan
        </h2>
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-warning bg-clay-100 p-5">
            <h3 className="font-display text-xl font-medium text-forest-900 sm:text-2xl">
              Pembayaran terlambat
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Pembayaran tercatat dibayar, tetapi pesanannya kedaluwarsa atau
              dibatalkan. Periksa transaksi di penyedia pembayaran dan tindak
              lanjuti refund secara manual.
            </p>
            {latePayments.length ? (
              <ul className="mt-4 divide-y divide-paper-200">
                {latePayments.map((payment) => {
                  const order = relatedOrder(payment.orders);
                  if (!order) return null;
                  return (
                    <li key={payment.id} className="py-3 text-sm">
                      <p className="font-medium text-ink-900">
                        {order.order_number} ·{" "}
                        {ORDER_STATUS_LABELS[order.status]}
                      </p>
                      <p className="mt-1 text-ink-600">
                        {channelDisplayName(payment.channel_code)} ·{" "}
                        {rupiah(payment.payable_idr ?? payment.amount_idr)} ·{" "}
                        Referensi {payment.provider_ref ?? "belum tersedia"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-600">
                Tidak ada pembayaran terlambat yang perlu ditinjau.
              </p>
            )}
          </div>
          <div className="rounded-md border border-paper-200 bg-paper-100 p-5">
            <h3 className="font-display text-xl font-medium text-forest-900 sm:text-2xl">
              Transaksi tanpa referensi
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              Pesanan masih menunggu pembayaran, tetapi catatan pembayarannya
              belum memiliki referensi transaksi. Cocokkan secara manual dengan
              dashboard penyedia sebelum mengubah status.
            </p>
            {unlinkedPayments.length ? (
              <ul className="mt-4 divide-y divide-paper-200">
                {unlinkedPayments.map((payment) => {
                  const order = relatedOrder(payment.orders);
                  if (!order) return null;
                  return (
                    <li key={payment.id} className="py-3 text-sm">
                      <p className="font-medium text-ink-900">
                        {order.order_number} ·{" "}
                        {ORDER_STATUS_LABELS[order.status]}
                      </p>
                      <p className="mt-1 text-ink-600">
                        {channelDisplayName(payment.channel_code)} · Nominal
                        dasar {rupiah(payment.amount_idr)} ·{" "}
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-600">
                Tidak ada transaksi tanpa referensi untuk pesanan pending.
              </p>
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="orders-heading"
        className="border-t border-paper-200 py-10"
      >
        <p className="font-mono text-sm text-forest-700">Operasional</p>
        <h2
          id="orders-heading"
          className="mt-2 font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
        >
          Pesanan
        </h2>
        {orders.length ? (
          <div className="mt-5 overflow-x-auto rounded-md border border-paper-200">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Daftar 100 pesanan terbaru dengan data pembayaran dan tindakan
                administrasi
              </caption>
              <thead className="bg-paper-100 text-ink-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pesanan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status pesanan
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Kanal pembayaran
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nominal dasar
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Total dibayar
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status pembayaran
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Event webhook terakhir
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Perbarui pesanan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {orders.map((order) => {
                  const payment = latestPaymentByOrder.get(order.id);
                  const latestEvent = payment?.provider_ref
                    ? latestEventByPayment.get(
                        `${payment.provider}:${payment.provider_ref}`,
                      )
                    : undefined;
                  return (
                    <tr key={order.id} className="align-top">
                      <th
                        scope="row"
                        className="px-4 py-4 font-medium text-ink-900"
                      >
                        <span className="block">{order.order_number}</span>
                        <span className="mt-1 block font-normal text-ink-600">
                          {tanggal(order.created_at)}
                        </span>
                      </th>
                      <td className="px-4 py-4">
                        {ORDER_STATUS_LABELS[order.status]}
                      </td>
                      <td className="px-4 py-4">
                        {payment
                          ? channelDisplayName(payment.channel_code)
                          : "Belum tercatat"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {rupiah(payment?.amount_idr ?? order.total_idr)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {rupiah(
                          payment?.payable_idr ??
                            payment?.amount_idr ??
                            order.total_idr,
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {payment
                          ? PAYMENT_STATUS_LABELS[payment.status]
                          : "Belum tercatat"}
                      </td>
                      <td className="px-4 py-4">
                        {latestEvent
                          ? `${latestEvent.processing_status} · ${tanggal(latestEvent.received_at)}`
                          : payment?.provider_ref
                            ? "Belum ada event"
                            : "Belum ada referensi"}
                      </td>
                      <td className="px-4 py-4">
                        <AdminOrderForm
                          orderId={order.id}
                          status={order.status}
                          trackingNumber={order.tracking_number}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-paper-200 bg-paper-100 p-6 text-ink-600">
            Belum ada pesanan untuk ditampilkan.
          </p>
        )}
      </section>

      <section
        aria-labelledby="products-heading"
        className="border-t border-paper-200 py-10"
      >
        <p className="font-mono text-sm text-forest-700">Katalog</p>
        <h2
          id="products-heading"
          className="mt-2 font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
        >
          Harga dan stok produk
        </h2>
        {products.length ? (
          <div className="mt-5 overflow-x-auto rounded-md border border-paper-200">
            <table className="w-full min-w-[740px] border-collapse text-left text-sm">
              <caption className="sr-only">
                Daftar produk dengan formulir untuk mengubah harga dan stok
              </caption>
              <thead className="bg-paper-100 text-ink-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Produk
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Perbarui harga dan stok
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <th
                      scope="row"
                      className="min-w-56 px-4 py-4 font-medium text-ink-900"
                    >
                      {product.name}
                    </th>
                    <td className="px-4 py-4">
                      <AdminProductForm
                        productId={product.id}
                        priceIdr={product.price_idr}
                        stock={product.stock}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-paper-200 bg-paper-100 p-6 text-ink-600">
            Belum ada produk di katalog.
          </p>
        )}
      </section>
    </div>
  );
}
