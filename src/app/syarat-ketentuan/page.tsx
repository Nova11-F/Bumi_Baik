import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat dan Ketentuan",
  description:
    "Draf syarat penggunaan katalog, pemesanan, pembayaran, dan pengiriman Bumi Baik.",
  alternates: { canonical: "/syarat-ketentuan" },
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-20">
      <p className="font-mono text-sm text-forest-700">Dokumen draf</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
        Syarat dan Ketentuan
      </h1>
      <p className="mt-4 rounded-md border border-warning bg-clay-100 p-4 text-sm leading-relaxed text-ink-900">
        Draf untuk ditinjau sebelum publikasi. Ketentuan ini belum menjadi
        nasihat hukum; pengelola perlu memastikan rincian usaha, kebijakan
        pembatalan, pengembalian, dan mekanisme pengaduan telah benar.
      </p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-ink-600">
        <section aria-labelledby="use-heading">
          <h2 id="use-heading" className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl">
            Penggunaan situs
          </h2>
          <p className="mt-3">
            Dengan mengakses Bumi Baik, Anda setuju menggunakan situs secara sah
            dan memberikan informasi pemesanan yang benar. Pengelola dapat
            memperbaiki informasi katalog yang keliru dan akan menghubungi
            pelanggan bila perubahan memengaruhi pesanan.
          </p>
        </section>

        <section aria-labelledby="orders-heading">
          <h2
            id="orders-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Pesanan dan pembayaran
          </h2>
          <p className="mt-3">
            Harga ditampilkan dalam rupiah. Pesanan diproses setelah informasi
            stok, alamat, ongkos kirim, dan total dikonfirmasi. Pesanan
            berstatus menunggu pembayaran bukan bukti pembayaran; status akhir
            diperbarui setelah konfirmasi dari penyedia pembayaran atau
            rekonsiliasi transaksi.
          </p>
        </section>

        <section aria-labelledby="shipping-heading">
          <h2
            id="shipping-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Pengiriman dan pembatalan
          </h2>
          <p className="mt-3">
            Metode dan biaya pengiriman ditampilkan saat checkout. Waktu
            pengiriman, syarat perubahan alamat, pembatalan, pengembalian dana,
            dan penanganan barang rusak harus diisi serta disetujui pengelola
            sebelum situs dibuka untuk transaksi publik.
          </p>
        </section>

        <section aria-labelledby="impact-heading">
          <h2
            id="impact-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Informasi dampak
          </h2>
          <p className="mt-3">
            Angka dampak produk adalah estimasi ilustratif untuk MVP, bukan
            jaminan hasil atau pengukuran dampak individual. Catatan asumsi dan
            keterbatasannya tersedia di halaman{" "}
            <a
              href="/dampak"
              className="text-forest-700 underline underline-offset-4"
            >
              Dampak
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="contact-heading">
          <h2
            id="contact-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Pengelola dan perubahan
          </h2>
          <p className="mt-3">
            Identitas usaha, alamat, dan kontak pengaduan perlu dicantumkan
            sebelum penerbitan. Pengelola dapat memperbarui ketentuan ini; versi
            yang berlaku dan tanggal perubahannya harus ditampilkan dengan
            jelas.
          </p>
        </section>

        <p className="border-t border-paper-200 pt-5 text-sm">
          Draf terakhir disiapkan 3 November 2026.
        </p>
      </div>
    </article>
  );
}
