import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description:
    "Draf kebijakan tentang data yang dikumpulkan saat menggunakan Bumi Baik dan cara data tersebut digunakan.",
  alternates: { canonical: "/kebijakan-privasi" },
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-20">
      <p className="font-mono text-sm text-forest-700">Dokumen draf</p>
      <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.1] text-forest-900 sm:text-5xl">
        Kebijakan Privasi
      </h1>
      <p className="mt-4 rounded-md border border-warning bg-clay-100 p-4 text-sm leading-relaxed text-ink-900">
        Draf untuk ditinjau sebelum publikasi. Lengkapi identitas dan kontak
        pengelola toko serta tinjau kesesuaiannya dengan ketentuan perlindungan
        data yang berlaku.
      </p>

      <div className="mt-8 space-y-8 text-base leading-relaxed text-ink-600">
        <section aria-labelledby="data-heading">
          <h2
            id="data-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Data yang digunakan
          </h2>
          <p className="mt-3">
            Saat Anda membuat akun atau memesan, Bumi Baik memproses alamat
            email, nama, nomor telepon bila diberikan, alamat pengiriman,
            rincian pesanan, dan catatan pembayaran yang diperlukan untuk
            menyediakan layanan. Informasi pembayaran diproses oleh penyedia
            pembayaran; Bumi Baik menyimpan referensi transaksi dan status yang
            diperlukan untuk mengelola pesanan.
          </p>
          <p className="mt-3">
            Data keranjang tamu disimpan di peramban Anda. Data teknis yang
            diperlukan untuk menjaga sesi, mencegah penyalahgunaan, dan
            mendiagnosis gangguan dapat diproses ketika Anda menggunakan situs.
          </p>
        </section>

        <section aria-labelledby="purpose-heading">
          <h2
            id="purpose-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Tujuan dan penyimpanan
          </h2>
          <p className="mt-3">
            Data digunakan untuk mengelola akun, memenuhi dan mengirim pesanan,
            memverifikasi pembayaran, memberi dukungan, serta menjaga keamanan
            layanan. Data disimpan selama diperlukan untuk tujuan tersebut dan
            kewajiban yang berlaku; jadwal retensi terperinci perlu ditetapkan
            oleh pengelola sebelum dokumen ini diterbitkan.
          </p>
        </section>

        <section aria-labelledby="sharing-heading">
          <h2
            id="sharing-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Pihak pemroses
          </h2>
          <p className="mt-3">
            Layanan infrastruktur, basis data, dan pembayaran dapat memproses
            data seperlunya untuk menjalankan toko. Data tidak dijual. Nama
            penyedia, lokasi pemrosesan, dan rincian pengiriman data lintas
            wilayah perlu dikonfirmasi oleh pengelola sebelum publikasi.
          </p>
        </section>

        <section aria-labelledby="rights-heading">
          <h2
            id="rights-heading"
            className="font-display text-[26px] font-medium text-forest-900 sm:text-4xl"
          >
            Pilihan dan pertanyaan
          </h2>
          <p className="mt-3">
            Anda dapat meminta akses, koreksi, atau penghapusan data dengan
            menghubungi pengelola toko. Tambahkan alamat kontak yang aktif di
            bagian ini sebelum kebijakan dipublikasikan.
          </p>
        </section>

        <p className="border-t border-paper-200 pt-5 text-sm">
          Draf terakhir disiapkan 3 November 2026.
        </p>
      </div>
    </article>
  );
}
