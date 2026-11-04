<div align="center">

## 🌍 BUMI BAIK

### *Sustainable Marketplace & Real-Time Impact Tracker*

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-Educational-blue?style=for-the-badge)]()

Platform e-commerce berkelanjutan yang membantu pengguna membeli produk ramah lingkungan sekaligus melacak dampak positif terhadap pelestarian bumi secara real-time.

</div>

# 📖 Tentang Proyek

**Bumi Baik** merupakan platform *sustainable marketplace* berbasis web yang dibangun menggunakan **Next.js (App Router), TypeScript, Tailwind CSS, dan Supabase**.

Platform ini memungkinkan pengguna untuk:

- 🛒 Menjelajahi dan membeli produk ramah lingkungan berbasis SDGs (*Sustainable Development Goals*).
- 🔍 Mencari dan menyaring produk berdasarkan kategori keberlanjutan dan dampaknya.
- 🧮 Mengelola keranjang belanja dan memproses *checkout* secara terintegrasi.
- 💳 Melakukan pembayaran melalui integrasi **Paymenku** maupun lingkungan pengujian **Mock Pay**.
- 📊 Memantau dampak akumulatif pengurangan jejak karbon dan kontribusi lingkungan secara transparan.

Proyek ini dibuat untuk menerapkan arsitektur web modern dengan prinsip **Server-Side Rendering (SSR)**, **Row Level Security (RLS)**, **Modular Component Design**, **State Management**, dan **Automated Cron Jobs**.

## ✨ Fitur Utama

**🛍️ Katalog & Filter Produk Berkelanjutan**
- Menampilkan daftar produk ramah lingkungan dengan indikator tag dampak SDGs.
- Filter tingkat lanjut berdasarkan kategori keberlanjutan.
- Kolom pencarian produk berbasis API dengan respons instan.

**🧾 Keranjang Belanja & Checkout Interaktif**
- Manajemen *cart* secara global dengan sinkronisasi state.
- Perubahan kuantitas item dan penghitungan subtotal secara instan.
- Alur *checkout* bertahap yang aman dari pemilihan alamat hingga opsi pengiriman.

**💳 Integrasi Pembayaran Multiple Gateway**
- Integrasi *payment gateway* resmi menggunakan **Paymenku** (QRIS, Virtual Account, dll).
- Tersedia halaman **Mock Pay** khusus untuk lingkungan simulasi/pengujian transaksi tanpa biaya.
- *Webhook handler* otomatis untuk memperbarui status pesanan setelah pembayaran berhasil.

**📊 Panel Pelacakan Dampak (Impact Tracker)**
- Metrik khusus yang menampilkan estimasi kontribusi pengurangan karbon per produk.
- Visualisasi pencapaian target SDGs untuk setiap transaksi pesanan.

**⚙️ Dashboard Administrator & Cron Tasks**
- Pengelolaan daftar produk, stok, dan kategori oleh admin.
- Pemantauan status transaksi dan Sinkronisasi Pembayaran (*Sync Payment*).
- Fitur otomatisasi *Cron Job* (`expire-orders`) untuk membatalkan pesanan yang melewati batas waktu pembayaran secara berkala.

## 🎬 Modul & Alur Transaksi

Bumi Baik menerapkan alur transaksi terintegrasi dari pemilihan produk hingga verifikasi pembayaran:

| Tahapan | Komponen / API | Perilaku |
| --- | --- | --- |
| **Pencarian Produk** | `SearchBox` & `/api/search` | Memfilter dan menampilkan hasil pencarian produk ramah lingkungan. |
| **Keranjang Belanja** | `CartDrawer` & `CartProvider` | Menyimpan dan memperbarui item belanjaan secara dinamis. |
| **Checkout & Alamat** | `CheckoutFlow` & `AddressForm` | Memilih alamat pengiriman dan menghitung rinci biaya akhir. |
| **Proses Pembayaran** | `paymenku.ts` / `mock.ts` | Menggenerasi transaksi pembayaran & mengarahkan ke gateway. |
| **Verifikasi Webhook** | `/api/payments/paymenku/webhook` | Menerima callback pembayaran dan memperbarui status pesanan di database. |
| **Otomatisasi Expire** | `/api/cron/expire-orders` | Membatalkan pesanan *pending* yang telah habis masa berlakunya. |

## 🛠️ Teknologi yang Digunakan

- **Next.js 15 (App Router)**: Framework React untuk rendering server-side dan API routes.
- **TypeScript**: Kepastian tipe data secara ketat di seluruh lapisan aplikasi.
- **Tailwind CSS**: Styling modern dengan pendekatan utility-first.
- **Supabase**: PostgreSQL database, autentikasi user, dan Row Level Security (RLS).
- **Zustand / Context API**: Manajemen state keranjang dan sesi pengguna.
- **Vitest**: Unit testing untuk logika pembayaran, kalkulasi harga, dan validator.

## 📁 Struktur Proyek

```text
.
├── docs/                      # Dokumentasi teknis (PRD, Arsitektur, Desain UI/UX)
├── src/
│   ├── app/                   # Next.js App Router (Halaman & API Routes)
│   │   ├── (account)/         # Manajemen profil, alamat, & riwayat pesanan
│   │   ├── (auth)/            # Autentikasi (Masuk, Daftar, Lupa Password)
│   │   ├── admin/             # Dashboard administrasi toko & pesanan
│   │   ├── api/               # Serverless API endpoints (Cart, Checkout, Webhook, Cron)
│   │   ├── dampak/            # Halaman informasi pelacakan dampak lingkungan
│   │   ├── mock-pay/          # Halaman simulasi pembayaran (Dev/UAT)
│   │   └── produk/            # Katalog & halaman detail produk
│   ├── components/            # Komponen UI modular (Cart, Catalog, Admin, Product, UI)
│   ├── lib/                   # Utility helper, konfigurasi Supabase, & logika bisnis
│   ├── stores/                # Global state management
│   └── types/                 # Definisi Tipe TypeScript & Database Schema Enums
├── supabase/                  # Skema SQL, migrasi database RLS, RPC, dan seed data
└── public/                    # Aset gambar & statis aplikasi
```

## 💻 Cara Menjalankan Proyek

### 1. Prasyarat

Pastikan komputer Anda telah terpasang:
- **Node.js** (v18.x atau lebih baru)
- **npm** / **pnpm** / **yarn**
- Akun **Supabase** (atau Supabase CLI lokal)

### 2. Instalasi Dependensi

```bash
git clone https://github.com/Nova11-F/Bumi_Baik.git
cd Bumi_Baik
npm install
```

### 3. Konfigurasi Environment Variables

Buat file `.env.local` berdasarkan file panduan `.env.example`:

```bash
cp .env.example .env.local
```

Isi variabel berikut pada `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

PAYMENKU_API_KEY=your-paymenku-api-key
PAYMENKU_MERCHANT_ID=your-merchant-id
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Setup Database Supabase

Eksekusi migrasi dan seed data ke database Supabase Anda:

```bash
npx supabase db reset
```

*Atau jalankan skrip SQL di folder `supabase/migrations/` dan `supabase/seed.sql` melalui SQL Editor Supabase.*

### 5. Menjalankan Server Pengembang

```bash
npm run dev
```

Buka browser dan akses alamat `http://localhost:3000`.

## 🔄 Status Transaksi & Pembayaran

| Status Pesanan | Kondisi Trigger | Tindakan Sistem |
| --- | --- | --- |
| **`pending`** | Pesanan baru saja dibuat | Menunggu konfirmasi pembayaran dari gateway |
| **`paid`** | Webhook menerima konfirmasi | Mengubah status pesanan menjadi lunas & menyesuaikan stok |
| **`cancelled`** | Dibatalkan user / Kadaluarsa | Stok produk dikembalikan & pesanan ditutup |
| **`expired`** | Waktu bayar habis (via Cron) | Mengubah status pesanan menjadi kadaluarsa |

## ⚙️ Penjelasan Fungsi & Logika Utama

- **`apply-event.ts` (`src/lib/server/payments/`)**:
  Memproses event status pembayaran dari webhook gateway dan memperbarui database secara transaksional.
- **`paymenku.ts` (`src/lib/server/payments/`)**:
  Integrasi API Paymenku untuk membuat invoice, mengecek status transaksi, dan memverifikasi signature webhook.
- **`catalog-query.ts` (`src/lib/`)**:
  Memproses kueri pencarian, penyaringan kriteria dampak lingkungan, dan pengurutan produk.
- **`cart.ts` (`src/stores/`)**:
  Manajemen *state* keranjang belanja lokal dengan persisted storage dan sinkronisasi ke server.
- **`expire-orders/route.ts` (`src/app/api/cron/`)**:
  Endpoint otomatis untuk memeriksa dan meng-expire pesanan yang belum dibayar dalam batas waktu tertentu.

# 🎯 Tujuan Proyek

Proyek ini dibuat untuk menghadirkan solusi belanja ramah lingkungan sekaligus penerapan praktis dalam:

- Pengembangan web modern berbasis Next.js App Router dan Server Components.
- Keamanan akses data menggunakan **Supabase Row Level Security (RLS)**.
- Integrasi sistem pembayaran terotomatisasi (*Real & Mock Payment Gateways*).
- Pembuatan pengujian otomatis (Unit Testing) dengan Vitest.
- Perancangan UI/UX yang responsif dan berfokus pada produk berkelanjutan.

# 🚀 Rencana Pengembangan

Fitur yang direncanakan untuk tahap pengembangan berikutnya:

- 🌳 **Kalkulator Jejak Karbon**: Fitur otomatis untuk menghitung total offset emisi dari seluruh belanjaan.
- 📦 **Integrasi Pengiriman Lanjutan**: Lacak posisi paket secara real-time dari penyedia kurir lokal.
- 🏆 **Sistem Gamifikasi & Reward**: Poin penghargaan ramah lingkungan (*Eco-Points*) untuk setiap pembelian.
- 📱 **Mobile App Version**: Pengembangan aplikasi seluler menggunakan React Native.

## 📜 Lisensi

Proyek ini dikembangkan untuk mendukung konsumsi berkelanjutan dan pelestarian lingkungan. Silakan kembangkan dan manfaatkan sesuai kebutuhan.

<div align="center">

### ⭐ Jangan lupa berikan Star jika proyek ini bermanfaat!

Created by [Nova11-F](https://github.com/Nova11-F)

</div>
