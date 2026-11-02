import Link from "next/link";
import { Leaf } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-forest-900 text-paper-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2 text-paper-50">
              <Leaf className="h-6 w-6 text-forest-100" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-display text-xl font-semibold tracking-tight">Bumi Baik</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-forest-100">
              Produk sehari-hari dengan dampak iklim yang bisa diukur dan dijelaskan.
            </p>
            <p className="mt-4 font-mono text-sm text-forest-100">SDG 7 · 12 · 13 · 15</p>
          </div>

          <div>
            <h3 className="font-display text-xl font-medium text-paper-50">Jelajahi</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/produk" className="text-forest-100 hover:text-paper-50">
                  Semua produk
                </Link>
              </li>
              <li>
                <Link href="/dampak" className="text-forest-100 hover:text-paper-50">
                  Cara menghitung dampak
                </Link>
              </li>
              <li>
                <Link href="/keranjang" className="text-forest-100 hover:text-paper-50">
                  Keranjang
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl font-medium text-paper-50">Bantuan</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link href="/pengiriman" className="text-forest-100 hover:text-paper-50">
                  Pengiriman dan pengembalian
                </Link>
              </li>
              <li>
                <Link href="/kontak" className="text-forest-100 hover:text-paper-50">
                  Hubungi kami
                </Link>
              </li>
              <li>
                <Link href="/akun" className="text-forest-100 hover:text-paper-50">
                  Akun saya
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-xl font-medium text-paper-50">Surat dari Bumi Baik</h3>
            <p className="mt-4 text-sm leading-relaxed text-forest-100">
              Catatan singkat tentang produk baru dan angka dampaknya. Tanpa promosi berlebihan.
            </p>
            <div className="mt-4">
              <label htmlFor="newsletter-email" className="text-sm text-forest-100">
                Email
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="newsletter-email"
                  type="email"
                  placeholder="nama@email.com"
                  className="h-11 min-w-0 flex-1 rounded-md border border-forest-700 bg-paper-50 px-3 text-base text-ink-900 placeholder:text-ink-400 focus:border-paper-50 focus:outline-none"
                />
                <button
                  type="button"
                  className="h-11 shrink-0 rounded-md bg-paper-50 px-4 text-sm font-medium text-forest-900 hover:bg-forest-100"
                >
                  Daftar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-forest-700 pt-6 text-sm text-forest-100 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Bumi Baik. Semua estimasi dampak bersifat ilustratif.</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/kebijakan-privasi" className="text-forest-100 hover:text-paper-50">
              Kebijakan Privasi
            </Link>
            <Link href="/syarat-ketentuan" className="text-forest-100 hover:text-paper-50">
              Syarat dan Ketentuan
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
