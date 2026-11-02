# Design System: Bumi Baik

> Dibaca bersama `prd.md` dan `architecture.md`. Semua keputusan visual harus mengacu ke token di dokumen ini. **Jangan menambah warna, font, atau radius baru di luar daftar ini.**

---

## 1. Arah Visual

**Konsep: "Katalog botani yang jujur."** Terinspirasi dari buku lapangan, label kemasan kertas daur ulang, dan majalah editorial. Hangat, tenang, berbasis tipografi dan foto nyata, bukan dekorasi.

**Kata kunci:** tanah, daun, kertas, jujur, terukur.

### Aturan anti "AI slop" (wajib)
Hindari semua ini:
- ❌ Gradien ungu/biru/pink, gradien mesh, atau gradien di tombol dan teks
- ❌ Glassmorphism, blur berlebihan, efek neon, glow
- ❌ Emoji sebagai ikon (🌱🌍♻️), ilustrasi 3D generik, atau stok bumi-di-tangan
- ❌ Kartu dengan bayangan besar dan sudut sangat bulat di mana-mana
- ❌ Hero "Revolutionizing the way you..." dengan tiga kartu fitur identik
- ❌ Teks marketing kosong: "seamless", "cutting-edge", "empower", "eco-warrior"
- ❌ Semua elemen di-center; semua section punya pola yang sama

Lakukan ini:
- ✅ Tipografi serif yang berkarakter untuk judul, sans bersih untuk UI
- ✅ **Foto produk asli** dengan rasio konsisten; latar krem hangat
- ✅ Garis tipis (1 px) sebagai pemisah, bukan bayangan
- ✅ Angka dampak ditampilkan sebagai data (tabular, monospace-ish), bukan slogan
- ✅ Tata letak asimetris dan grid editorial; variasi ritme antar section
- ✅ Copy konkret berbasis angka: "Botol ini menggantikan ±150 botol plastik per tahun"
- ✅ Ikon garis tunggal konsisten (Lucide, stroke 1.5)

---

## 2. Token Warna

Satu warna utama (hijau hutan), satu aksen (terakota), netral hangat. **Tidak ada warna lain** selain status.

### Palet inti
| Token | Hex | Penggunaan |
|---|---|---|
| `forest-900` | `#14301F` | Teks judul di atas krem, footer, tombol primer (hover) |
| `forest-700` | `#1F4A30` | **Warna merek utama**, tombol primer, tautan |
| `forest-500` | `#3A7350` | Ikon aktif, badge dampak |
| `forest-100` | `#DDEBE1` | Latar badge, chip filter aktif |
| `clay-600` | `#B5532F` | **Aksen**: CTA sekunder, harga diskon, sorotan kecil |
| `clay-100` | `#F4E1D6` | Latar sorotan aksen |
| `paper-50` | `#FBF8F2` | **Latar halaman utama** |
| `paper-100` | `#F3EEE3` | Latar section bergantian, kartu |
| `paper-200` | `#E6DFD0` | Border, pemisah |
| `ink-900` | `#1B1A17` | Teks utama |
| `ink-600` | `#5B584F` | Teks sekunder |
| `ink-400` | `#8A867B` | Placeholder, teks nonaktif (hanya ukuran ≥ 18 px) |

### Status
| Token | Hex | Penggunaan |
|---|---|---|
| `success` | `#2F7D4F` | Pesanan dibayar |
| `warning` | `#B7791F` | Stok menipis, menunggu bayar |
| `danger` | `#B3372B` | Error, stok habis |

### Pasangan kontras (sudah dicek ≥ 4,5:1)
- `ink-900` di atas `paper-50` ✔
- `paper-50` di atas `forest-700` ✔
- `forest-900` di atas `forest-100` ✔
- `paper-50` di atas `clay-600` ✔ (hanya teks tebal/besar, ≥ 16 px semibold)

### Aturan pemakaian
- Proporsi: ±70% netral (paper/ink), ±20% hijau, ±10% terakota.
- Satu CTA primer per layar (hijau). Terakota hanya untuk satu sorotan per section.
- Mode gelap **tidak termasuk MVP**.

---

## 3. Tipografi

| Peran | Font | Bobot | Sumber |
|---|---|---|---|
| Judul / display | **Fraunces** (serif variabel) | 500, 600 | `next/font/google` |
| UI & isi | **Inter** | 400, 500, 600 | `next/font/google` |
| Angka dampak & label data | **JetBrains Mono** | 500 | `next/font/google` |

> Fraunces bisa memakai sumbu `opsz` otomatis. Pakai `font-display: swap` dan hanya muat bobot yang dipakai.

### Skala (mobile → desktop)
| Token | Mobile | Desktop | Font | Line-height | Dipakai di |
|---|---|---|---|---|---|
| `display` | 40 px | 72 px | Fraunces 600 | 1.05 | Hero |
| `h1` | 32 px | 48 px | Fraunces 600 | 1.1 | Judul halaman |
| `h2` | 26 px | 36 px | Fraunces 500 | 1.15 | Judul section |
| `h3` | 20 px | 24 px | Fraunces 500 | 1.25 | Judul kartu/blok |
| `body-lg` | 18 px | 18 px | Inter 400 | 1.6 | Lead paragraph |
| `body` | 16 px | 16 px | Inter 400 | 1.6 | Isi |
| `small` | 14 px | 14 px | Inter 400/500 | 1.5 | Meta, label |
| `data` | 14 px | 14 px | JetBrains Mono 500 | 1.4 | Angka dampak |

- Panjang baris isi maks. **68 karakter** (`max-w-prose`).
- Judul memakai `text-wrap: balance`.
- Teks tidak boleh di bawah 14 px.

---

## 4. Spasi, Grid, Bentuk

### Spasi
Basis 4 px. Pakai skala Tailwind: `1 2 3 4 6 8 12 16 24 32`.
- Jarak antar section: `py-16` mobile, `py-24` desktop.
- Padding kontainer: `px-4` (mobile), `px-6` (tablet), `px-8` (desktop).

### Grid & kontainer
- Lebar maks konten: **1280 px** (`max-w-7xl`), terpusat.
- Grid katalog: 2 kolom (mobile) → 3 (tablet) → 4 (desktop). Gap `gap-x-4 gap-y-8` (mobile) / `gap-x-6 gap-y-12` (desktop).
- Detail produk: 1 kolom (mobile) → 12 kolom dengan galeri 7 / info 5 (desktop).

### Radius
| Token | Nilai | Dipakai di |
|---|---|---|
| `rounded-sm` | 4 px | Badge, chip |
| `rounded-md` | 8 px | Input, tombol, kartu |
| `rounded-full` | — | Hanya avatar dan indikator jumlah keranjang |

> Tidak ada radius lebih besar dari 8 px kecuali foto hero (boleh 0 untuk kesan editorial).

### Elevasi
- Default: **tanpa bayangan**, pakai border `1px solid paper-200`.
- Hanya dua bayangan: `shadow-sm` untuk dropdown/popover dan `shadow-md` untuk drawer/modal, keduanya berwarna `ink-900` opasitas ≤ 10%.

---

## 5. Konfigurasi Tailwind

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 100: "#DDEBE1", 500: "#3A7350", 700: "#1F4A30", 900: "#14301F" },
        clay:   { 100: "#F4E1D6", 600: "#B5532F" },
        paper:  { 50: "#FBF8F2", 100: "#F3EEE3", 200: "#E6DFD0" },
        ink:    { 400: "#8A867B", 600: "#5B584F", 900: "#1B1A17" },
        success: "#2F7D4F",
        warning: "#B7791F",
        danger:  "#B3372B",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: { sm: "4px", md: "8px" },
      maxWidth: { prose: "68ch" },
    },
  },
  plugins: [],
};
export default config;
```

```css
/* globals.css */
@tailwind base; @tailwind components; @tailwind utilities;

@layer base {
  html { @apply bg-paper-50 text-ink-900 antialiased; }
  h1, h2, h3 { @apply font-display text-forest-900; text-wrap: balance; }
  :focus-visible { @apply outline-2 outline-offset-2 outline-forest-700; }
}
```

---

## 6. Komponen

### 6.1 Tombol
| Varian | Gaya |
|---|---|
| **Primer** | `bg-forest-700 text-paper-50 hover:bg-forest-900`, tinggi 44 px, `px-6`, `rounded-md`, font 500 |
| **Sekunder** | `border border-forest-700 text-forest-700 hover:bg-forest-100` |
| **Aksen** | `bg-clay-600 text-paper-50` — dipakai sangat jarang |
| **Teks** | Tautan bergaris bawah `underline-offset-4`, tanpa latar |
| **Nonaktif** | `bg-paper-200 text-ink-400 cursor-not-allowed` |

Semua tombol: target sentuh min. **44×44 px**, ada status `focus-visible`, `disabled`, dan `loading` (spinner kecil + teks tetap terbaca).

### 6.2 Kartu Produk
```
┌──────────────────┐
│   FOTO 4:5       │  ← latar paper-100, object-cover
│                  │
├──────────────────┤
│ DAPUR · SDG 12   │  ← small, ink-600, uppercase tracking-wide
│ Botol Minum      │  ← h3 Fraunces
│ Stainless 750 ml │
│ Rp 129.000       │  ← body 600
│ −3,2 kg CO₂e     │  ← data (mono), badge forest-100
└──────────────────┘
```
- Tanpa bayangan; border `paper-200`; hover: border menjadi `forest-500`, foto `scale-[1.02]` (durasi 200 ms).
- Seluruh kartu adalah satu tautan (area klik penuh).
- Label stok menipis (`warning`) muncul jika `stock ≤ 5`.

### 6.3 Badge Dampak
- Format: `−3,2 kg CO₂e` dalam `font-mono`, `bg-forest-100 text-forest-900`, `rounded-sm`, `px-2 py-0.5`.
- Di halaman detail diperbesar menjadi **panel dampak**: angka besar (Fraunces 40 px), satu kalimat penjelasan, tautan "Bagaimana kami menghitung".

### 6.4 Tag SDG
- Kotak persegi 28×28 px berisi nomor SDG, border `forest-700`, teks `forest-700`. **Jangan memakai ikon resmi berwarna PBB** (tabrakan palet dan ada aturan penggunaan logo); cukup nomor + nama pendek di tooltip.

### 6.5 Header
- Desktop: logo kiri, navigasi tengah (Produk, Dampak), kanan: kolom cari, akun, keranjang.
- Mobile: logo, ikon cari, keranjang, menu hamburger → drawer penuh.
- Sticky, latar `paper-50` dengan border bawah `paper-200`. Jangan memakai blur.
- Bar pengumuman tipis (`forest-900`, teks `paper-50`) untuk info gratis ongkir.

### 6.6 Pencarian
- Input tinggi 44 px, ikon kaca pembesar di kiri, `rounded-md`.
- Dropdown autosuggest: maks. 5 item (foto kecil 40 px + nama + harga), navigasi panah atas/bawah, `Esc` menutup.
- Mobile: membuka overlay layar penuh.

### 6.7 Filter
- **Desktop:** sidebar kiri 260 px, grup bisa dilipat (kategori, SDG, harga, ketersediaan).
- **Mobile:** tombol "Filter (2)" membuka bottom sheet; tombol "Lihat 14 produk" di bawah.
- Chip filter aktif ditampilkan di atas grid dengan tombol hapus.
- Dropdown "Urutkan" di kanan atas grid.

### 6.8 Keranjang
- **Drawer** dari kanan (lebar 420 px; layar penuh di mobile): daftar item, stepper jumlah (− 1 +), subtotal, blok "Dampak belanja ini", tombol "Lanjut ke checkout".
- **Halaman keranjang**: tabel (desktop) / daftar bertumpuk (mobile) + ringkasan lengket di kanan.

### 6.9 Form
- Label selalu terlihat di atas input (bukan hanya placeholder).
- Input: tinggi 44 px, border `paper-200` → `forest-700` saat fokus, `rounded-md`, latar `#fff`.
- Error: teks `danger` 14 px di bawah input + ikon; border `danger`. Jangan hanya mengandalkan warna.
- Stepper checkout: tiga langkah bernomor, langkah selesai bercentang.

### 6.10 Status Pesanan
| Status | Warna | Label |
|---|---|---|
| `pending` | warning | Menunggu pembayaran |
| `paid` | success | Dibayar |
| `shipped` | forest-500 | Dikirim |
| `completed` | forest-700 | Selesai |
| `cancelled` / `expired` | danger | Dibatalkan / Kedaluwarsa |

### 6.11 Feedback
- Toast: kanan bawah (desktop), atas (mobile), auto-hilang 4 detik, `role="status"`.
- Skeleton loading dengan warna `paper-100`→`paper-200` (animasi pelan, hormati `prefers-reduced-motion`).
- Empty state: ilustrasi garis sederhana (SVG satu warna `forest-500`) + kalimat konkret + satu tombol aksi.

---

## 7. Tata Letak Halaman Kunci

### Beranda
1. **Hero asimetris:** kiri teks (display + satu kalimat + CTA "Lihat semua produk"), kanan foto besar produk nyata. Di bawahnya satu baris data: `24 produk · 3 SDG · estimasi dampak transparan`.
2. **Kategori:** 6 blok foto dengan ukuran bervariasi (bukan 6 kartu identik), label di atas foto.
3. **Produk unggulan:** carousel/grid 4 produk.
4. **Bagian "Angka di balik label":** latar `forest-900`, tiga angka besar mono (mis. total kg CO₂e dihindari dari semua pesanan) + penjelasan metodologi.
5. **SDG:** daftar vertikal 4 SDG dengan satu kalimat peran masing-masing, bukan kartu ikon.
6. **Footer:** 3 kolom + newsletter sederhana.

### Katalog
Breadcrumb → judul + jumlah hasil → chip filter → grid. Sidebar filter di kiri (desktop).

### Detail Produk
Galeri (thumbnail vertikal di desktop, geser di mobile) | Info: kategori, judul, harga, **panel dampak**, pemilih jumlah, tombol "Tambah ke keranjang" (lengket di bawah layar pada mobile), akordeon Deskripsi / Spesifikasi / Pengiriman. Di bawah: produk terkait.

### Checkout
Dua kolom desktop: formulir (kiri), ringkasan pesanan lengket (kanan). Mobile: ringkasan bisa dibuka-tutup di atas, tombol bayar lengket di bawah.

---

## 8. Responsivitas

Pendekatan **mobile-first**. Breakpoint Tailwind default:

| Breakpoint | Lebar | Perilaku utama |
|---|---|---|
| (default) | < 640 | 1–2 kolom, drawer, bottom sheet, tombol lengket |
| `sm` | ≥ 640 | Grid 2–3 kolom |
| `md` | ≥ 768 | Header penuh, grid 3 kolom, form 2 kolom |
| `lg` | ≥ 1024 | Sidebar filter tampil, grid 4 kolom, detail 2 kolom |
| `xl` | ≥ 1280 | Kontainer maks. terpusat |

Aturan:
- Tidak ada scroll horizontal pada lebar 320 px.
- Gambar selalu memakai `sizes` yang benar di `next/image`.
- Tabel lebar (admin) dibungkus `overflow-x-auto` atau diubah jadi daftar kartu di mobile.
- Uji di 360, 390, 768, 1024, 1440 px.

---

## 9. Gambar & Ikonografi

- **Foto produk:** latar netral hangat, rasio **4:5**, minimal 1200 px sisi panjang. Sumber: foto sendiri atau Unsplash/Pexels (catat atribusi di `docs/credits.md`).
- **Foto lifestyle** (hero, kategori): rasio 3:2 atau 16:10, cahaya alami.
- Simpan di Supabase Storage (bucket `product-images`, publik) dan sajikan via `next/image`.
- **Ikon:** `lucide-react`, stroke 1.5, ukuran 20 px (UI) / 24 px (navigasi). Satu keluarga ikon saja.
- Alt text deskriptif untuk setiap foto produk.

---

## 10. Gerak (Motion)

- Durasi 150–250 ms, easing `ease-out`. Tidak ada animasi dekoratif yang berulang.
- Boleh: transisi hover, drawer slide, fade-in toast, skeleton.
- Tidak boleh: parallax berat, partikel, animasi hero berputar, bounce.
- Hormati `prefers-reduced-motion: reduce` (matikan transisi non-esensial).

---

## 11. Copywriting

- Bahasa Indonesia, nada **hangat, lugas, berbasis fakta**. Hindari jargon dan bahasa promosi berlebihan.
- Angka dampak selalu diberi label "estimasi".

| ❌ Hindari | ✅ Gunakan |
|---|---|
| "Selamatkan bumi bersama kami!" | "Satu botol ini menggantikan sekitar 150 botol plastik per tahun." |
| "Produk eco-friendly terbaik" | "Dibuat dari bambu bersertifikat FSC." |
| "Belanja sekarang!!!" | "Lihat semua produk" |
| "Terjadi kesalahan" | "Pembayaran belum berhasil. Coba lagi atau pilih metode lain." |

---

## 12. Aksesibilitas (Checklist)

- [ ] Kontras teks ≥ 4,5:1 (3:1 untuk teks besar)
- [ ] Semua elemen interaktif dapat dijangkau keyboard; urutan tab logis
- [ ] `:focus-visible` terlihat jelas di setiap elemen
- [ ] Landmark HTML: `header`, `nav`, `main`, `footer`; satu `h1` per halaman
- [ ] Drawer/modal menjebak fokus dan bisa ditutup dengan `Esc`
- [ ] Form: `label` terhubung, pesan error dengan `aria-describedby`, `aria-invalid`
- [ ] Info tidak hanya lewat warna (status selalu ada teks/ikon)
- [ ] Perubahan jumlah keranjang diumumkan lewat `aria-live="polite"`
- [ ] Skip link "Lewati ke konten utama"

---

## 13. Daftar Cek Sebelum Merge Tiap UI

1. Hanya memakai token warna, font, dan radius di dokumen ini?
2. Terlihat benar di 360 px dan 1440 px?
3. Ada state loading, kosong, dan error?
4. Bisa dioperasikan hanya dengan keyboard?
5. Copy-nya konkret, bukan slogan?
6. Tidak ada gradien, glow, atau emoji dekoratif?
