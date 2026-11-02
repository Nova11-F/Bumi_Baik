# AGENTS.md — Bumi Baik

E-commerce produk ramah iklim (SDGs 7, 12, 13, 15). Next.js 15 (App Router) + TypeScript + Tailwind + Supabase, deploy ke Vercel.

## Dokumen acuan (baca sesuai kebutuhan, jangan dimuat semua sekaligus)

- Produk, fitur, acceptance criteria: @docs/prd.md
- Warna, font, komponen, aturan responsif: @docs/design.md
- Skema DB, RLS, API, alur checkout/webhook, struktur folder: @docs/architecture.md
- Data produk awal: @supabase/seed.sql

Saat tugas menyentuh UI, baca `docs/design.md` dulu. Saat menyentuh database, auth, keranjang, checkout, atau pembayaran, baca bagian terkait di `docs/architecture.md` dulu. Perlakukan isinya sebagai aturan yang wajib diikuti. Jika dokumen bertentangan dengan permintaan saya, tanyakan sebelum lanjut.

## Aturan keras

1. **UI:** hanya pakai token warna, font, dan radius dari `docs/design.md`. Dilarang menambah warna/font baru, gradien, glassmorphism, glow, atau emoji sebagai ikon. Ikon hanya `lucide-react`.
2. **Uang:** integer rupiah. Tampilkan lewat `rupiah()` di `src/lib/format.ts`.
3. **Harga, stok, total, dan status pembayaran dihitung dan diubah hanya di server.** Jangan pernah mempercayai harga dari klien.
4. **Secret** (`SUPABASE_SECRET_KEY`, `PAYMENTKU_*`, `CRON_SECRET`) hanya dipakai di kode server dan tidak boleh berawalan `NEXT_PUBLIC_`.
5. Penulisan ke `orders`, `order_items`, `payments` hanya lewat `service_role` di server.
6. Status pembayaran hanya berubah lewat webhook yang signature-nya sudah diverifikasi.
7. Validasi semua input eksternal dengan Zod (Route Handler, Server Action).
8. Server Component secara default. `"use client"` hanya jika butuh state/event.
9. TypeScript `strict`, tanpa `any` kecuali diberi komentar alasan.
10. Teks antarmuka berbahasa Indonesia.

## Cara kerja

- Kerjakan **satu fase per sesi** sesuai urutan di `docs/prd.md` §9. Jangan melompat atau mengerjakan fitur fase berikutnya.
- Untuk tugas yang menyentuh banyak file, buat rencana dulu (mode Plan) dan tunggu persetujuan saya.
- Sebelum menyatakan selesai, jalankan `npm run lint`, `npm run typecheck`, dan `npm run test` (jika ada), lalu laporkan hasilnya apa adanya.
- Jangan install dependensi di luar daftar di `docs/architecture.md` §1 tanpa bertanya.
- Jangan menjalankan perintah destruktif (`rm -rf`, `supabase db reset` pada project produksi, `git push --force`) tanpa konfirmasi.
- Jangan membuat atau mengubah `.env.local`; cukup perbarui `.env.example` dan beri tahu saya variabel apa yang perlu diisi.
- Jangan mengarang detail API PaymentKu. Selama dokumentasinya belum diberikan, gunakan `PAYMENT_PROVIDER=mock` dan tandai bagian yang belum pasti dengan `// TODO(paymentku)`.

## Perintah

```bash
npm run dev        # server lokal
npm run lint
npm run typecheck  # tsc --noEmit
npm run test       # vitest
npm run build
```

## Struktur & konvensi

Ikuti struktur folder di `docs/architecture.md` §3. Berkas `kebab-case` untuk rute/util, `PascalCase` untuk komponen. Commit memakai Conventional Commits.
