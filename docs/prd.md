# PRD: Bumi Baik — E-Commerce Produk Ramah Iklim

> Nama "Bumi Baik" adalah placeholder. Ganti sesuka hati, tapi pertahankan konsistensinya di semua file.
> Dokumen ini ditulis untuk dipakai sebagai konteks utama saat vibe coding. Baca bersama `design.md` dan `architecture.md`.

---

## 1. Ringkasan

**Bumi Baik** adalah toko online yang menjual produk sehari-hari yang terbukti mengurangi jejak karbon, sampah plastik, atau konsumsi energi. Setiap produk menampilkan **dampak terukur** (mis. "menghindari 1,2 kg CO₂e") dan **tag SDGs**, sehingga pembeli tahu kontribusi belanjanya.

### Masalah
- Orang ingin belanja lebih berkelanjutan, tetapi sulit membedakan produk yang benar-benar berdampak dari sekadar klaim "eco-friendly".
- Produk ramah lingkungan tersebar di banyak toko dan jarang punya angka dampak yang jelas.

### Solusi
Satu katalog terkurasi dengan angka dampak per produk, pencarian dan filter yang cepat, checkout sederhana, dan ringkasan dampak pribadi di akun pengguna.

### Isu Global & SDGs
| SDG | Peran di produk |
|---|---|
| **SDG 13 — Penanganan Perubahan Iklim** (utama) | Setiap produk menampilkan estimasi CO₂e yang dihindari |
| **SDG 12 — Konsumsi & Produksi Bertanggung Jawab** | Produk guna ulang, isi ulang, dan bebas plastik sekali pakai |
| **SDG 7 — Energi Bersih & Terjangkau** | Produk tenaga surya dan hemat energi |
| **SDG 15 — Ekosistem Daratan** | Produk berkebun, kompos, dan bibit |

---

## 2. Tujuan & Metrik Keberhasilan

| Tujuan | Metrik | Target MVP |
|---|---|---|
| Pengguna bisa menyelesaikan pembelian | Checkout completion rate | ≥ 60% dari yang masuk halaman checkout |
| Pencarian dan filter berguna | Waktu dari landing ke produk dibuka | < 30 detik |
| Performa baik | Lighthouse Performance (mobile) | ≥ 85 |
| Aksesibel | Lighthouse Accessibility | ≥ 95 |
| Katalog memadai | Jumlah produk aktif | ≥ 20 (target seed: 24) |

**Non-goals (di luar MVP):** marketplace multi-penjual, ulasan/rating, wishlist, kupon, multi-bahasa, aplikasi mobile native, kalkulasi ongkir real-time dari kurir.

---

## 3. Target Pengguna

**Persona 1 — Rina, 28, pekerja kantoran di kota besar.** Mulai mengurangi plastik, belanja dari HP, ingin produk yang jelas manfaatnya dan checkout cepat.

**Persona 2 — Dimas, 35, pemilik rumah.** Tertarik penghematan listrik (lampu surya, power bank surya), butuh spesifikasi dan angka yang jelas.

**Persona 3 — Admin toko.** Mengelola produk dan melihat pesanan (lihat bagian Fitur Admin Minimal).

---

## 4. Lingkup Fitur MVP

### 4.1 Autentikasi (Login)
- Daftar dan login dengan **email + password**; opsional **Google OAuth** (via Supabase Auth).
- Logout, lupa password (email reset).
- Halaman akun: profil, alamat pengiriman (min. 1 alamat), riwayat pesanan, ringkasan dampak.
- Rute yang dilindungi: `/checkout`, `/akun/*`, `/pesanan/*`.
- Belanja sebagai tamu diperbolehkan untuk menjelajah dan mengisi keranjang. **Checkout wajib login.**

**Acceptance criteria**
- [ ] Pengguna baru bisa mendaftar dan langsung masuk.
- [ ] Salah password menampilkan pesan error yang jelas tanpa membocorkan apakah email terdaftar.
- [ ] Pengguna yang belum login diarahkan ke `/masuk?redirect=/checkout` dan kembali ke checkout setelah login.
- [ ] Keranjang tamu digabung ke keranjang akun setelah login.

### 4.2 Katalog Produk
- Halaman `/produk` menampilkan grid produk dengan paginasi (12 produk per halaman) atau "muat lebih banyak".
- Kartu produk: foto, nama, harga (Rp), badge dampak (mis. "−1,2 kg CO₂e"), tag SDG.
- Halaman detail `/produk/[slug]`: galeri foto, deskripsi, spesifikasi, **panel dampak** (CO₂e, plastik yang dihindari, penjelasan metodologi singkat), SDG terkait, stok, tombol tambah ke keranjang, produk terkait.
- Landing page `/`: hero, kategori, produk unggulan, penjelasan dampak, ringkasan SDGs.

**Acceptance criteria**
- [ ] Minimal 20 produk aktif dari seed data.
- [ ] Produk stok 0 tampil "Stok habis" dan tombol beli nonaktif.
- [ ] Setiap halaman produk punya `<title>` dan meta description unik.

### 4.3 Filter Produk
Filter di sidebar (desktop) atau bottom sheet (mobile):
- **Kategori** (multi-pilih)
- **SDG** (multi-pilih: 7, 12, 13, 15)
- **Rentang harga** (min–maks)
- **Hanya yang tersedia** (toggle stok)
- **Urutkan**: Terbaru, Harga naik, Harga turun, Dampak terbesar

State filter disimpan di **URL query string** agar bisa dibagikan dan tombol Back berfungsi.
Contoh: `/produk?kategori=dapur&sdg=12,13&harga_min=50000&urut=dampak`

**Acceptance criteria**
- [ ] Kombinasi filter bekerja bersamaan (AND antar jenis filter, OR di dalam jenis yang sama).
- [ ] Tombol "Reset filter" tersedia dan menampilkan jumlah filter aktif.
- [ ] Hasil kosong menampilkan empty state dengan saran mengubah filter.

### 4.4 Pencarian Produk
- Kolom pencarian di header, tersedia di semua halaman.
- Mencari di nama, deskripsi, dan kategori memakai **Postgres full-text search** (konfigurasi `simple` atau `indonesian` bila tersedia) dengan fallback `ILIKE`.
- **Autosuggest** (debounce 300 ms) menampilkan maks. 5 produk.
- Hasil ada di `/produk?q=kata`, dan bisa dikombinasikan dengan filter.

**Acceptance criteria**
- [ ] Mengetik "botol" menemukan produk botol minum.
- [ ] Pencarian toleran huruf besar/kecil.
- [ ] Input tidak rentan terhadap SQL injection (query berparameter).

### 4.5 Keranjang
- Tambah, ubah jumlah, hapus item. Jumlah dibatasi stok.
- **Mini-cart drawer** dari header, plus halaman penuh `/keranjang`.
- Tamu: disimpan di `localStorage`. Login: disimpan di database (tabel `cart_items`), digabung saat login.
- Menampilkan subtotal dan **total dampak keranjang** (mis. "Belanja ini menghindari 4,8 kg CO₂e").
- Harga di keranjang selalu diverifikasi ulang dari server saat checkout.

**Acceptance criteria**
- [ ] Badge jumlah item di header selalu sinkron.
- [ ] Item yang stoknya berubah memberi peringatan di keranjang.

### 4.6 Checkout
Alur 3 langkah dalam satu halaman (stepper):
1. **Alamat pengiriman** — pilih alamat tersimpan atau isi baru (nama, telepon, alamat, kota, provinsi, kode pos).
2. **Pengiriman** — opsi pengiriman dengan tarif flat per zona (Jawa / luar Jawa) sebagai MVP.
3. **Tinjau & bayar** — ringkasan pesanan, total (subtotal + ongkir), tombol "Bayar sekarang".

Alur sistem: buat `order` berstatus `pending` → reservasi stok → buat transaksi di PaymentKu → arahkan pengguna ke halaman pembayaran → tunggu webhook → status `paid`.

**Acceptance criteria**
- [ ] Validasi form di klien dan server (Zod).
- [ ] Klik ganda pada "Bayar" tidak membuat dua pesanan (idempotency key).
- [ ] Jika stok tidak cukup saat checkout, pengguna diberi tahu item mana yang bermasalah.
- [ ] Pesanan `pending` yang tidak dibayar dalam 24 jam otomatis `expired` dan stok dikembalikan.

### 4.7 Pembayaran (PaymentKu)
- Integrasi dengan layanan pembayaran milik pengguna, **PaymentKu**, lewat **lapisan adapter** (lihat `architecture.md`) agar detail API-nya terisolasi di satu modul.
- Status pembayaran diperbarui **hanya lewat webhook yang diverifikasi signature-nya**, bukan dari redirect klien.
- Halaman `/pesanan/[id]` menampilkan status: Menunggu pembayaran, Dibayar, Dikirim, Selesai, Dibatalkan/Kedaluwarsa.
- Pengguna bisa melanjutkan pembayaran dari pesanan `pending`.

**Asumsi yang perlu dikonfirmasi** (saya belum punya dokumentasi PaymentKu):
| Hal | Asumsi default | Perlu diganti dengan |
|---|---|---|
| Model integrasi | Redirect ke halaman bayar hosted + webhook | Sesuai dokumentasi PaymentKu |
| Autentikasi API | Secret key di header server-side | Metode sebenarnya |
| Verifikasi webhook | HMAC-SHA256 pada raw body | Metode sebenarnya |
| Mata uang | IDR (integer, tanpa desimal) | — |
| Mode sandbox | Tersedia | — |

**Acceptance criteria**
- [ ] Webhook dengan signature salah ditolak (401).
- [ ] Webhook yang sama dikirim dua kali tidak menggandakan efek (idempoten).
- [ ] Secret key tidak pernah muncul di bundle klien.

### 4.8 Fitur Admin Minimal
- Peran `admin` pada tabel `profiles`.
- Halaman `/admin` (dilindungi): daftar pesanan, ubah status (Dikirim/Selesai), tambah nomor resi; daftar produk dengan edit stok dan harga.
- Pembuatan produk massal dilakukan lewat **seed script**, bukan UI, pada MVP.

---

## 5. Konten & Data Produk (Seed 24 Produk)

Angka dampak adalah **estimasi ilustratif untuk MVP**. Sebelum rilis publik, ganti dengan sumber yang dapat dirujuk dan tampilkan metodologinya di halaman `/dampak`.

| # | Produk | Kategori | Harga (Rp) | CO₂e dihindari (kg) | SDG |
|---|---|---|---|---|---|
| 1 | Lampu Taman Tenaga Surya (set 4) | Energi Surya | 189.000 | 12,0 | 7, 13 |
| 2 | Power Bank Surya 20.000 mAh | Energi Surya | 249.000 | 6,5 | 7, 13 |
| 3 | Pengisi Daya Surya Lipat 21W | Energi Surya | 459.000 | 14,0 | 7, 13 |
| 4 | Lampu Belajar Surya Isi Ulang | Energi Surya | 135.000 | 4,0 | 7 |
| 5 | Pemanas Air Surya Portabel 20L | Energi Surya | 389.000 | 18,0 | 7, 13 |
| 6 | Botol Minum Stainless 750 ml | Dapur Bebas Plastik | 129.000 | 3,2 | 12 |
| 7 | Set Sedotan Bambu & Sikat (6 pcs) | Dapur Bebas Plastik | 45.000 | 0,8 | 12 |
| 8 | Kotak Bekal Stainless 2 Sekat | Dapur Bebas Plastik | 119.000 | 2,5 | 12 |
| 9 | Beeswax Wrap (3 ukuran) | Dapur Bebas Plastik | 79.000 | 1,4 | 12 |
| 10 | Tas Belanja Kanvas Lipat | Dapur Bebas Plastik | 59.000 | 1,6 | 12, 13 |
| 11 | Spons Sabut Alami (isi 3) | Dapur Bebas Plastik | 35.000 | 0,6 | 12 |
| 12 | Sabun Batang Cuci Piring | Dapur Bebas Plastik | 29.000 | 0,5 | 12 |
| 13 | Sampo Batang Rempah | Perawatan Diri | 59.000 | 0,9 | 12 |
| 14 | Sikat Gigi Bambu (isi 4) | Perawatan Diri | 49.000 | 0,7 | 12 |
| 15 | Deodoran Balm Tanpa Kemasan Plastik | Perawatan Diri | 69.000 | 0,6 | 12 |
| 16 | Pembalut Kain Reusable (set 3) | Perawatan Diri | 99.000 | 2,8 | 12, 13 |
| 17 | Kaus Katun Organik Unisex | Fesyen Sirkular | 179.000 | 5,0 | 12, 13 |
| 18 | Tote Bag dari Kain Perca | Fesyen Sirkular | 89.000 | 2,2 | 12 |
| 19 | Dompet Kulit Nanas (Piñatex-style) | Fesyen Sirkular | 149.000 | 3,0 | 12 |
| 20 | Komposter Rumah Tangga 20L | Berkebun | 329.000 | 9,0 | 12, 15 |
| 21 | Paket Bibit Sayur Organik (5 jenis) | Berkebun | 65.000 | 2,0 | 15 |
| 22 | Pot Tanam dari Sabut Kelapa (isi 6) | Berkebun | 55.000 | 1,1 | 15 |
| 23 | Bibit Pohon Buah Mini (Jambu/Jeruk) | Berkebun | 85.000 | 22,0 | 13, 15 |
| 24 | Pupuk Organik Cair 1 L | Berkebun | 49.000 | 1,3 | 15 |

Setiap produk wajib punya: `slug`, deskripsi 60–120 kata, 3–5 spesifikasi, 1–4 foto, `stock` awal (15–80), dan `impact_note` satu kalimat penjelasan angka.

---

## 6. Persyaratan Non-Fungsional

| Area | Persyaratan |
|---|---|
| **Performa** | LCP < 2,5 s di 4G; gambar via `next/image` (WebP/AVIF); katalog di-cache (ISR/revalidate) |
| **Responsif** | Mobile-first; diuji di 360 px, 768 px, 1280 px, 1536 px |
| **Aksesibilitas** | WCAG 2.1 AA: kontras warna, fokus terlihat, navigasi keyboard, label form, alt text |
| **Keamanan** | RLS aktif di semua tabel; validasi server-side; webhook terverifikasi; tidak ada secret di klien; rate limit pada endpoint auth dan checkout |
| **SEO** | Metadata per halaman, `sitemap.xml`, `robots.txt`, JSON-LD `Product` |
| **Privasi** | Hanya data yang diperlukan; halaman Kebijakan Privasi dan Syarat & Ketentuan |
| **Bahasa** | Bahasa Indonesia; format `Rp 129.000`; tanggal `2 November 2026` |
| **Observabilitas** | Log error server; log setiap event webhook |

---

## 7. Peta Halaman

| Rute | Halaman | Akses |
|---|---|---|
| `/` | Beranda | Publik |
| `/produk` | Katalog + filter + pencarian | Publik |
| `/produk/[slug]` | Detail produk | Publik |
| `/keranjang` | Keranjang | Publik |
| `/masuk`, `/daftar`, `/lupa-password` | Autentikasi | Publik (tamu) |
| `/checkout` | Checkout | Login |
| `/pesanan`, `/pesanan/[id]` | Daftar dan detail pesanan | Login |
| `/akun` | Profil, alamat, ringkasan dampak | Login |
| `/dampak` | Penjelasan metodologi dan SDGs | Publik |
| `/admin` | Pesanan dan produk | Admin |

---

## 8. Alur Pengguna Utama

```
Landing → Cari/Filter → Detail Produk → Tambah ke Keranjang
→ Keranjang → (Belum login? → Masuk) → Checkout (alamat → kirim → tinjau)
→ Redirect PaymentKu → Bayar → Webhook → Status "Dibayar" → Halaman Pesanan
```

---

## 9. Rencana Rilis (urutan pengerjaan vibe coding)

| Fase | Isi | Hasil |
|---|---|---|
| **0. Fondasi** | Setup Next.js, Tailwind, Supabase, token desain, layout dasar | Proyek berjalan di lokal dan ter-deploy kosong |
| **1. Data & Katalog** | Skema DB, seed 24 produk, `/produk`, `/produk/[slug]` | Katalog tampil |
| **2. Cari & Filter** | Search, autosuggest, filter berbasis URL | Produk mudah ditemukan |
| **3. Auth** | Login, daftar, proteksi rute, profil | Pengguna bisa masuk |
| **4. Keranjang** | Keranjang tamu dan akun, penggabungan | Keranjang berfungsi |
| **5. Checkout & Pembayaran** | Alamat, order, adapter PaymentKu, webhook | Transaksi end-to-end di sandbox |
| **6. Admin & Poles** | Admin minimal, SEO, a11y, performa, empty/error state | Siap rilis |

Setiap fase harus bisa dijalankan dan diuji sebelum lanjut ke fase berikutnya.

---

## 10. Risiko & Pertanyaan Terbuka

| Risiko / Pertanyaan | Mitigasi |
|---|---|
| Dokumentasi API PaymentKu belum tersedia | Adapter terisolasi; kerjakan dulu dengan mock provider, lalu ganti |
| Klaim dampak bisa dianggap greenwashing | Tampilkan metodologi, beri label "estimasi", sumber data jelas |
| Foto produk | Gunakan foto lisensi bebas (Unsplash/Pexels) atau foto sendiri; jangan gambar AI generik |
| Ongkir realistis | MVP: tarif flat; fase lanjut: integrasi API kurir |
| Netlify vs Vercel | Disarankan Vercel (native untuk Next.js); Netlify bisa lewat adapter resmi |

**Pertanyaan untuk pemilik proyek:**
1. Bagaimana alur PaymentKu bekerja (redirect, embed, atau API langsung) dan seperti apa format webhook-nya?
2. Metode pembayaran apa saja yang didukung (VA, e-wallet, kartu)?
3. Apakah nama "Bumi Baik" sudah final?
