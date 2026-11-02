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
4. **Secret** (`SUPABASE_SECRET_KEY`, `PAYMENKU_API_KEY` (sk_*), `PAYMENKU_WEBHOOK_SECRET`, `CRON_SECRET`) hanya dipakai di kode server dan tidak boleh berawalan `NEXT_PUBLIC_`.
5. Penulisan ke `orders`, `order_items`, `payments` hanya lewat `service_role` di server.
6. Status pembayaran hanya berubah lewat (a) webhook PaymenKu yang signature-nya sudah diverifikasi, atau (b) rekonsiliasi server-ke-server ke `check-status` PaymenKu. Halaman return URL dan input klien tidak pernah mengubah status. Keduanya memakai satu fungsi `applyPaymentEvent`.
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
- Detail API PaymenKu ada di `docs/architecture.md` §8.2. Bagian yang ditandai "belum terverifikasi" (encoding signature, format timestamp, nama field payload webhook) jangan ditebak: tandai dengan `// TODO(paymenku)` dan beri tahu saya. Jangan pernah memakai kunci `sk_live_`; pengembangan memakai `sk_test_` saja.

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
