# Architecture: Bumi Baik

> Dibaca bersama `prd.md` dan `design.md`. Dokumen ini adalah sumber kebenaran untuk struktur kode, database, API, dan alur pembayaran.

---

## 1. Keputusan Teknologi

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Next.js berbasis React, jadi *frontend* (komponen React) dan *backend* (Route Handlers / Server Actions) hidup dalam satu proyek |
| UI | **React 19** (Server + Client Components) | Server Components untuk halaman data; Client Components hanya untuk interaksi |
| Styling | **Tailwind CSS 3.4** | Token di `design.md` |
| Database | **Supabase (PostgreSQL)** | Auth, DB, Storage, RLS |
| Auth | **Supabase Auth** via `@supabase/ssr` | Cookie-based session |
| Validasi | **Zod** | Dipakai klien dan server |
| State klien | **Zustand** (keranjang tamu) + **TanStack Query** (opsional) | Minimal |
| Ikon | `lucide-react` | |
| Deploy | **Vercel** (utama), Netlify (alternatif) | Lihat bagian 11 |
| Pembayaran | **PaymenKu** (paymenku.com) lewat adapter | Lihat bagian 8 |

> **Catatan:** "React untuk FE, Next.js untuk BE" diwujudkan dengan satu aplikasi Next.js. Komponen `.tsx` adalah FE React; folder `app/api/**` dan `lib/server/**` adalah BE. Tidak perlu server terpisah, sehingga deploy ke Vercel/Netlify jadi sederhana.

---

## 2. Diagram Arsitektur

```
 ┌─────────────────────────── Browser ───────────────────────────┐
 │  React (Client Components) · Tailwind · Zustand (cart tamu)   │
 └───────────────┬───────────────────────────────┬───────────────┘
                 │ HTML/RSC, fetch               │ redirect bayar
                 ▼                               ▼
 ┌──────────────────── Next.js (Vercel) ───┐   ┌───────────────┐
 │ Server Components  (baca katalog)       │   │   PaymenKu   │
 │ Route Handlers /api/*                   │──▶│  (hosted pay) │
 │ Server Actions    (cart, alamat)        │   └──────┬────────┘
 │ Middleware        (refresh session)     │          │ webhook
 │ lib/server/payments/paymenku (adapter) │◀─────────┘
 └───────────────┬─────────────────────────┘
                 │ supabase-js (publishable key + secret key)
                 ▼
 ┌──────────────────── Supabase ───────────────────┐
 │ Postgres (RLS) · Auth · Storage · RPC functions │
 └──────────────────────────────────────────────────┘
```

**Prinsip:**
1. Pembacaan katalog lewat Server Components (cepat, SEO, di-cache).
2. Penulisan sensitif (order, stok, pembayaran) **hanya di server**.
3. Harga selalu dihitung ulang di server; klien tidak dipercaya.
4. Status pembayaran hanya berubah lewat webhook terverifikasi.

---

## 3. Struktur Proyek

```
bumi-baik/
├─ docs/
│  ├─ prd.md  design.md  architecture.md  credits.md
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_init.sql
│  │  ├─ 0002_rls.sql
│  │  ├─ 0003_functions.sql
│  │  ├─ 0004_grants.sql
│  │  ├─ 0005_checkout_payments.sql
│  │  ├─ 0005_payments_paymenku.sql
│  │  ├─ 0006_payment_status_extra.sql
│  │  ├─ 0007_rpc_grants.sql
│  │  ├─ 0008_webhook_event_processing.sql
│  │  └─ 0009_webhook_event_claim_recovery.sql
│  └─ seed.sql                 # 24 produk
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ (shop)/
│  │  │  ├─ page.tsx                       # Beranda
│  │  │  ├─ produk/page.tsx                # Katalog + filter + cari
│  │  │  ├─ produk/[slug]/page.tsx
│  │  │  ├─ keranjang/page.tsx
│  │  │  ├─ dampak/page.tsx
│  │  ├─ (auth)/
│  │  │  ├─ masuk/page.tsx
│  │  │  ├─ daftar/page.tsx
│  │  │  ├─ lupa-password/page.tsx
│  │  │  └─ auth/callback/route.ts         # OAuth & email confirm
│  │  ├─ (account)/                        # Dilindungi
│  │  │  ├─ checkout/page.tsx
│  │  │  ├─ akun/page.tsx
│  │  │  ├─ pesanan/page.tsx
│  │  │  └─ pesanan/[id]/page.tsx
│  │  ├─ admin/                            # Role admin
│  │  ├─ api/
│  │  │  ├─ search/route.ts                # Autosuggest
│  │  │  ├─ checkout/route.ts              # Buat order + transaksi
│  │  │  ├─ payments/paymenku/webhook/route.ts
│  │  │  └─ cron/expire-orders/route.ts    # Vercel Cron
│  │  ├─ layout.tsx  globals.css  not-found.tsx  error.tsx
│  │  ├─ sitemap.ts  robots.ts
│  ├─ components/
│  │  ├─ ui/            # Button, Input, Badge, Sheet, Toast, Skeleton
│  │  ├─ layout/        # Header, Footer, MobileNav, AnnouncementBar
│  │  ├─ product/       # ProductCard, ProductGrid, ImpactPanel, SdgTag, Gallery
│  │  ├─ catalog/       # FilterSidebar, FilterSheet, SortSelect, ActiveChips
│  │  ├─ cart/          # CartDrawer, CartItemRow, CartSummary
│  │  ├─ checkout/      # Stepper, AddressForm, ShippingOptions, OrderReview
│  │  └─ search/        # SearchBox, Suggestions
│  ├─ lib/
│  │  ├─ supabase/{client.ts, server.ts, admin.ts, middleware.ts}
│  │  ├─ server/
│  │  │  ├─ orders.ts           # createOrder, expireOrders
│  │  │  ├─ pricing.ts          # hitung subtotal, ongkir, dampak
│  │  │  └─ payments/
│  │  │     ├─ types.ts         # PaymentProvider interface
│  │  │     ├─ paymenku.ts      # implementasi nyata
│  │  │     ├─ mock.ts          # provider lokal untuk dev
│  │  │     └─ index.ts         # getPaymentProvider()
│  │  ├─ validators/            # Zod schema
│  │  ├─ format.ts              # rupiah(), tanggal()
│  │  ├─ catalog-query.ts       # parse searchParams → query
│  │  └─ constants.ts           # kategori, SDG, ongkir
│  ├─ stores/cart.ts            # Zustand (tamu)
│  ├─ types/{db.ts, index.ts}   # Tipe hasil `supabase gen types`
│  └─ middleware.ts
├─ .env.example
├─ tailwind.config.ts
├─ next.config.mjs
└─ package.json
```

---

## 4. Model Data (PostgreSQL / Supabase)

### 4.1 Migrasi `0001_init.sql`

```sql
-- Ekstensi
create extension if not exists "pgcrypto";

-- Peran pengguna
create type user_role as enum ('customer', 'admin');
create type order_status as enum
  ('pending','paid','shipped','completed','cancelled','expired');
create type payment_status as enum ('initiated','paid','failed','expired');

-- Profil (1:1 dengan auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Trigger: buat profil saat user daftar
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Kategori
create table categories (
  id serial primary key,
  slug text unique not null,
  name text not null
);

-- Produk
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  category_id int not null references categories(id),
  price_idr integer not null check (price_idr > 0),
  stock integer not null default 0 check (stock >= 0),
  co2e_avoided_kg numeric(6,2) not null default 0,
  plastic_avoided_g integer not null default 0,
  impact_note text,
  sdg_goals smallint[] not null default '{}',     -- mis. {12,13}
  specs jsonb not null default '[]',              -- [{label, value}]
  images text[] not null default '{}',            -- URL Supabase Storage
  is_active boolean not null default true,
  is_featured boolean not null default false,
  weight_g integer not null default 500,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(description,''))
  ) stored,
  created_at timestamptz not null default now()
);
create index products_search_idx   on products using gin (search);
create index products_category_idx on products (category_id);
create index products_sdg_idx      on products using gin (sdg_goals);
create index products_price_idx    on products (price_idr);

-- Alamat
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  recipient text not null,
  phone text not null,
  street text not null,
  city text not null,
  province text not null,
  postal_code text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Keranjang (hanya untuk pengguna login)
create table cart_items (
  user_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- Pesanan
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,              -- BB-20261102-XXXX
  user_id uuid not null references profiles(id),
  status order_status not null default 'pending',
  subtotal_idr integer not null,
  shipping_idr integer not null,
  total_idr integer not null,
  total_co2e_kg numeric(8,2) not null default 0,
  shipping_address jsonb not null,                -- snapshot alamat
  shipping_method text not null,
  tracking_number text,
  idempotency_key text unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);
create index orders_user_idx on orders (user_id, created_at desc);

-- Item pesanan (snapshot harga)
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  unit_price_idr integer not null,
  quantity integer not null check (quantity > 0),
  co2e_avoided_kg numeric(6,2) not null default 0
);

-- Pembayaran
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null default 'paymenku',
  provider_ref text,                              -- trx_id di PaymenKu
  status payment_status not null default 'initiated',
  amount_idr integer not null,
  payment_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index payments_provider_ref_idx on payments (provider, provider_ref);

-- Log webhook (idempotensi + audit)
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processing_status text not null default 'processed'
    check (processing_status in ('processing', 'processed', 'failed')),
  received_at timestamptz not null default now(),
  claimed_at timestamptz not null default now(),
  unique (provider, event_id)
);
```

### 4.2 RLS `0002_rls.sql`

```sql
alter table profiles      enable row level security;
alter table addresses     enable row level security;
alter table cart_items    enable row level security;
alter table orders        enable row level security;
alter table order_items   enable row level security;
alter table payments      enable row level security;
alter table webhook_events enable row level security;
alter table products      enable row level security;
alter table categories    enable row level security;

-- Helper admin
create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Katalog: publik hanya baca
create policy "products_read"   on products   for select using (is_active or is_admin());
create policy "categories_read" on categories for select using (true);
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

-- Profil
create policy "profiles_self_read"   on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_self_update" on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- Alamat & keranjang: milik sendiri
create policy "addresses_own" on addresses  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_own"      on cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pesanan: baca milik sendiri; penulisan hanya via service role (server)
create policy "orders_own_read"      on orders      for select using (user_id = auth.uid() or is_admin());
create policy "order_items_own_read" on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "payments_own_read"    on payments    for select using (
  exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
create policy "orders_admin_update"  on orders for update using (is_admin());
-- webhook_events: tanpa policy → hanya service role
```

> Tabel `orders`, `order_items`, `payments` **tidak punya policy insert/update untuk klien**. Semua penulisan lewat server memakai `service_role`.

### 4.3 Fungsi RPC `0003_functions.sql`

```sql
-- Reservasi stok atomik: semua berhasil atau gagal bersama
create function reserve_stock(items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  for it in select * from jsonb_array_elements(items) loop
    update products
       set stock = stock - (it->>'quantity')::int
     where id = (it->>'product_id')::uuid
       and stock >= (it->>'quantity')::int
       and is_active;
    if not found then
      raise exception 'INSUFFICIENT_STOCK:%', it->>'product_id';
    end if;
  end loop;
end $$;

-- Kembalikan stok (untuk pesanan kedaluwarsa/dibatalkan)
create function release_stock(p_order_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update products p set stock = p.stock + oi.quantity
    from order_items oi
   where oi.order_id = p_order_id and oi.product_id = p.id;
end $$;

revoke all on function reserve_stock(jsonb), release_stock(uuid) from public, anon, authenticated;
-- hanya service_role yang boleh memanggil
```

### 4.4 Grants `0004_grants.sql`

> **Wajib untuk project Supabase baru.** Project yang dibuat sekarang tidak lagi memberi hak akses otomatis pada tabel baru di schema `public`. Tanpa grant, API menjawab `Could not find the table 'public.products' in the schema cache`. RLS tetap berlaku di atas grant ini; grant hanya menentukan tabel mana yang boleh dijangkau tiap role.

```sql
-- =====================================================================
-- 0004_grants.sql — hak akses Data API (wajib untuk project Supabase baru)
-- Project baru TIDAK lagi memberi grant otomatis pada tabel di schema public.
-- Tanpa file ini, API mengembalikan:
--   "Could not find the table 'public.products' in the schema cache"
-- RLS tetap berlaku di atas grant ini.
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Katalog: dibaca publik (RLS: hanya produk aktif)
grant select on public.categories, public.products to anon, authenticated;

-- Pengguna login (RLS membatasi ke data milik sendiri / admin)
grant select, update                  on public.profiles    to authenticated;
grant select, insert, update, delete  on public.addresses   to authenticated;
grant select, insert, update, delete  on public.cart_items  to authenticated;
grant select                          on public.orders, public.order_items, public.payments to authenticated;
grant update                          on public.orders      to authenticated;  -- admin ubah status (RLS)
grant insert, update, delete          on public.products    to authenticated;  -- admin (RLS)

-- Server (secret key = service_role): akses penuh, melewati RLS
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Fungsi
grant execute on function public.is_admin() to anon, authenticated, service_role;
grant execute on function public.reserve_stock(jsonb), public.release_stock(uuid) to service_role;
```

### 4.5 RPC checkout `0005_checkout_payments.sql`

Fungsi `security definer` yang dipanggil server: `create_checkout_order` (reserve stok + buat order), `save_checkout_payment` (catat payment + bersihkan cart), dan `cancel_pending_order` (batalkan order pending + kembalikan stok). File ini juga memuat fungsi lama `process_payment_event` dan `expire_pending_orders`; keduanya tidak dipakai aplikasi. Status pembayaran hanya diubah lewat `applyPaymentEvent`.

### 4.6 Kolom pembayaran PaymenKu `0005_payments_paymenku.sql`

```sql
-- Nominal dasar tetap di payments.amount_idr (= orders.total_idr).
-- payable_idr = nominal yang dibayar pelanggan (bisa lebih besar karena fee_mode 'customer').
alter table public.payments
  add column if not exists channel_code text,
  add column if not exists payable_idr  integer,
  add column if not exists expires_at   timestamptz,
  add column if not exists attempt      integer not null default 1;

create index if not exists payments_order_idx on public.payments (order_id);
```

### 4.7 Status pembayaran tambahan `0006_payment_status_extra.sql`

```sql
-- Enum payment_status awal hanya: initiated, paid, failed, expired.
alter type public.payment_status add value if not exists 'cancelled';
alter type public.payment_status add value if not exists 'refunded';
```

---

## 5. Pencarian & Filter

Semua filter berasal dari URL: `/produk?q=&kategori=a,b&sdg=12,13&harga_min=&harga_max=&tersedia=1&urut=dampak&hal=2`

```ts
// lib/catalog-query.ts
export async function queryProducts(sp: CatalogParams) {
  const supabase = await createServerClient();
  let q = supabase
    .from("products")
    .select("id,slug,name,price_idr,stock,co2e_avoided_kg,sdg_goals,images,categories(slug,name)",
            { count: "exact" })
    .eq("is_active", true);

  if (sp.q)         q = q.textSearch("search", toTsQuery(sp.q), { config: "simple" });
  if (sp.kategori?.length) q = q.in("categories.slug", sp.kategori);
  if (sp.sdg?.length)      q = q.overlaps("sdg_goals", sp.sdg);       // OR dalam SDG
  if (sp.hargaMin) q = q.gte("price_idr", sp.hargaMin);
  if (sp.hargaMax) q = q.lte("price_idr", sp.hargaMax);
  if (sp.tersedia) q = q.gt("stock", 0);

  const order = {
    terbaru: ["created_at", false], murah: ["price_idr", true],
    mahal: ["price_idr", false],    dampak: ["co2e_avoided_kg", false],
  }[sp.urut ?? "terbaru"];
  q = q.order(order[0], { ascending: order[1] });

  const from = (sp.hal - 1) * 12;
  return q.range(from, from + 11);
}
```

- `toTsQuery()` membersihkan input dan menyusun `kata1:* & kata2:*` agar prefix match bekerja.
- Filter kategori memakai `!inner` join agar baris produk yang tidak cocok tidak ikut.
- Autosuggest: `GET /api/search?q=bot` → 5 hasil, `Cache-Control: s-maxage=30`.
- Halaman katalog adalah Server Component; interaksi filter memperbarui URL lewat `router.replace` dengan `useTransition`.

---

## 6. Autentikasi & Proteksi Rute

- **Supabase Auth** dengan email+password dan Google OAuth.
- `middleware.ts` menyegarkan sesi (`@supabase/ssr`) pada setiap request dan mengarahkan:
  - `/checkout`, `/akun/*`, `/pesanan/*` tanpa sesi → `/masuk?redirect=<path>`
  - `/admin/*` tanpa role `admin` → 404
- **Server-side check wajib** di setiap Route Handler dan Server Action: `const { data:{ user } } = await supabase.auth.getUser()`. Jangan hanya mengandalkan middleware.
- Gunakan `getUser()` (bukan `getSession()`) untuk keputusan keamanan.
- **Penggabungan keranjang:** setelah login berhasil, klien memanggil Server Action `mergeGuestCart(items)` yang melakukan `upsert` dengan menjumlahkan quantity (dibatasi stok), lalu mengosongkan `localStorage`.

---

## 7. Keranjang

| Kondisi | Penyimpanan | Sumber kebenaran |
|---|---|---|
| Tamu | Zustand + `localStorage` (`bb-cart-v1`) berisi `{productId, quantity}` saja | Klien |
| Login | Tabel `cart_items` via Server Actions | Database |

- Harga **tidak** disimpan di keranjang. Tampilan memuat harga terbaru dari `products` lewat endpoint `POST /api/cart/hydrate` (daftar id → data produk).
- Server Actions: `addToCart`, `updateQuantity`, `removeItem`, `mergeGuestCart` (semua divalidasi Zod, dibatasi stok).

---

## 8. Checkout & Pembayaran

### 8.1 Antarmuka Adapter

```ts
// lib/server/payments/types.ts
export interface PaymentChannel {
  code: string;                 // mis. "qris", "bca_va", "dana", "indomaret"
  name: string;
  type: string;                 // "va" | "qris" | "ewallet" | "cstore" (selalu ada)
  group: string;                // untuk tampilan; API kadang mengirim null → turunkan dari `type`
  flowType: string;             // "direct" | "redirect"
  feeMode: "merchant" | "customer" | "split";
  feeFlat: number;              // rupiah
  feePercent: number;           // persen, mis. 0.7 atau 3
  minAmount: number;            // rupiah
  maxAmount: number | null;     // null = TANPA batas atas (jangan diubah menjadi 0)
  iconUrl?: string;
}

export type PaymentInfo = {
  qrUrl?: string; qrString?: string;                 // QRIS
  bank?: string; vaNumber?: string;                  // Virtual Account
  checkoutUrl?: string;                              // E-wallet
  store?: string; paymentCode?: string;              // Gerai ritel
};

export interface CreatePaymentInput {
  orderId: string;
  referenceId: string;          // unik per percobaan bayar; juga dipakai sebagai Idempotency-Key
  channelCode: string;
  amountIdr: number;            // nominal dasar = orders.total_idr
  customer: { name: string; email: string; phone?: string };   // phone WAJIB untuk OVO
  items: { name: string; quantity: number }[];
  returnUrl: string;            // /pesanan/[id]  (BUKAN bukti bayar)
}

export interface CreatePaymentResult {
  providerRef: string;          // trx_id
  payUrl: string;
  payableAmountIdr: number;     // yang dibayar pelanggan (bisa = amount + fee, tergantung fee_mode)
  expiresAt: Date | null;
  paymentInfo: PaymentInfo;
  sandbox: boolean;
  simulatorUrl?: string;        // hanya sandbox
  raw: unknown;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded";

export interface PaymentEvent {
  eventId: string;              // `${trx_id}:${status}` untuk idempotensi
  providerRef: string;          // trx_id
  referenceId?: string;
  status: PaymentStatus;
  amountIdr?: number;
  paidAt?: Date;
  raw: unknown;
}

export interface PaymentProvider {
  listChannels(): Promise<PaymentChannel[]>;
  createPayment(i: CreatePaymentInput): Promise<CreatePaymentResult>;
  getStatus(trxIdOrReference: string): Promise<PaymentEvent>;                  // rekonsiliasi server-ke-server
  verifyAndParseWebhook(rawBody: string, headers: Headers, now?: Date): PaymentEvent; // throw jika tidak valid
}
```

```ts
// lib/server/payments/index.ts
export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "paymenku" ? new PaymenkuProvider() : new MockProvider();
}
```

### 8.2 PaymenKu (https://paymenku.com)

Dokumentasi resmi: `docs.paymenku.com` dan repo `github.com/paymenku/docs-paymenku` (berkas `openapi.yaml` adalah kontrak API). SDK resmi hanya PHP, Node.js, dan Go; kita menulis adapter `fetch` sendiri.

**Fakta yang sudah terverifikasi dari dokumentasi resmi**

| Hal | Isi |
|---|---|
| Base URL | `https://paymenku.com/api/v1` (live dan sandbox sama; dibedakan oleh kunci) |
| Autentikasi | Header `Authorization: Bearer <kunci>`. `sk_test_*` = sandbox (tanpa dana nyata, tanpa KYC). `sk_live_*` = produksi, **hanya aktif setelah KYC disetujui** |
| Header autentikasi | **Terverifikasi (uji nyata sandbox, 3 Nov 2026):** `Authorization: Bearer <kunci>` → HTTP 200; `X-Api-Key: <kunci>` → HTTP 401 "API Token required". Teks "header X-Api-Key" di dashboard keliru; pakai Bearer |
| Daftar kanal | `GET /payment-channels` (kanal aktif per merchant, beserta `fee_mode`, `min_amount`, `max_amount`). **Jangan hardcode kode kanal** |
| Buat transaksi | `POST /transaction/create` dengan `channel_code`, `amount` (angka), `reference_id`, `customer_name`, `customer_email`, `return_url`, opsional `customer_phone`, `order_items[{name,quantity}]` |
| Respons buat transaksi | `data.trx_id`, `data.reference_id`, `data.amount` (**string desimal**, mis. `"15305.00"`), `data.status`, `data.pay_url`, `data.payment_info`. Sandbox menambah `sandbox_mode`, `sandbox_notice`, `simulator_url` |
| `payment_info` per kanal | QRIS: `qr_url`, `qr_string`, `expiration_date`. VA: `bank`, `va_number`, `expiration_date`. E-wallet: `checkout_url`. Gerai ritel: `store`, `payment_code` (bukan `pay_code`) |
| Kanal nyata | Terlihat di uji: 12 VA (BCA, BRI, BNI, CIMB, Danamon, BSI, Mandiri, Permata, Bank Neo, Maybank, Muamalat, OCBC), QRIS, DANA, OVO, LinkAja, ShopeePay, Indomaret, Alfamart. Field per kanal: `code,name,type,group,flow_type,icon,fee_mode,fee_flat,fee_percent,min_amount,max_amount`. `type` ∈ {va,qris,ewallet,cstore}; `group` bisa `null`. Semua `fee_mode` = `merchant` (pelanggan tidak ditambah biaya) |
| Fee | `fee_mode`: `merchant` (pelanggan bayar `amount`), `customer` (pelanggan bayar `amount + fee`), `split`. Nominal pelanggan dibulatkan ke rupiah utuh. Berbeda per kanal |
| Batas nominal | **Selalu baca dari API, jangan hardcode.** Hasil uji nyata: `max_amount` bernilai **`null`** (tanpa batas) untuk hampir semua kanal, hanya Indomaret/Alfamart yang 2.500.000; minimum QRIS 1.000, VA 10.000, **e-wallet (DANA, OVO, LinkAja, ShopeePay) 10.000**, gerai ritel 15.000. Nominal di luar batas → HTTP 422 |
| Masa berlaku | QRIS ± 15 menit; VA dan gerai ritel ± 24 jam. Baca `expiration_date`, jangan hardcode |
| OVO | `customer_phone` wajib |
| Cek status | `GET /check-status/{order_id}` (menerima `trx_id` **atau** `reference_id`). Untuk rekonsiliasi, bukan pengganti webhook |
| Envelope | **Tidak seragam**: transaksi memakai `{status:"success"|"error"}`, fee/instruksi/wallet memakai `{success:true|false}`. Periksa envelope **dan** kode HTTP; galat bisa datang dengan HTTP 200 |
| Idempotensi | Header `Idempotency-Key` (maks 255 karakter, berlaku 24 jam, respons 2xx/4xx diputar ulang). Pakai nilai yang **stabil per niat bayar**, bukan UUID baru tiap percobaan |
| Rate limit | 120 permintaan/menit per merchant; HTTP 429 + header `Retry-After`. Jangan polling |
| Webhook | Header `X-PaymenKu-Signature` dan `X-PaymenKu-Timestamp`. Tanda tangan = `HMAC-SHA256(timestamp + "." + rawBody, secret)`. Verifikasi dengan body **mentah**, jangan parse lalu serialisasi ulang. Balas 2xx. Pemrosesan idempoten per `trx_id` |
| Status | `pending`, `paid`, `expired`, `failed`, `cancelled`, `refunded` |
| Sandbox | Kunci `sk_test_*`; buka `simulator_url` dari respons untuk menandai lunas dan memicu webhook |

**Belum terverifikasi — periksa di `docs.paymenku.com/docs/webhook` atau dengan satu uji sandbox, jangan ditebak**

| Hal | Asumsi sementara | Cara memastikan |
|---|---|---|
| Field payload `amount`, `paid_at`, `reference_id` | Bentuk field belum terkonfirmasi | Periksa `webhook_events.payload` setelah webhook sandbox |
| Endpoint batalkan transaksi | Ada (SDK punya `cancel`), path belum dipastikan | `openapi.yaml`, tag "Aksi Transaksi" |
| Asal webhook secret | **Terverifikasi (dashboard):** Merchant / Credentials, ada *sandbox webhook secret* yang **terpisah** dari secret production, dan URL webhook sandbox juga terpisah dari URL production | Dashboard → Merchant / Credentials (mode Sandbox) |
| Endpoint batalkan transaksi | Ada (SDK punya `cancel`), path belum dipastikan | `openapi.yaml`, tag "Aksi Transaksi" |

```ts
// lib/server/payments/paymenku.ts  (server only)
import "server-only";
import crypto from "node:crypto";

const BASE = process.env.PAYMENKU_BASE_URL ?? "https://paymenku.com/api/v1";
const API_KEY = process.env.PAYMENKU_API_KEY!;            // sk_test_... / sk_live_...
const WH_SECRET = process.env.PAYMENKU_WEBHOOK_SECRET!;
const WEBHOOK_TOLERANCE_SECONDS = 300;                    // TODO(paymenku): konfirmasi di dokumentasi webhook

export class PaymenkuApiError extends Error {
  constructor(public httpStatus: number, message: string, public errors?: unknown) { super(message); }
}

// Envelope tidak seragam: periksa status/success DAN kode HTTP.
async function call(path: string, init: RequestInit & { idempotencyKey?: string } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* bukan JSON */ }
  const failed = !res.ok || body?.status === "error" || body?.success === false || body == null;
  if (failed) throw new PaymenkuApiError(res.status, body?.message ?? "PAYMENKU_REQUEST_FAILED", body?.errors);
  return body.data;
}

// Nominal respons berupa string desimal ("15305.00"). Rupiah utuh, jadi bulatkan.
export const parseIdr = (v: string | number) => Math.round(Number(v));

export class PaymenkuProvider implements PaymentProvider {
  async listChannels() {
    const data = await call("/payment-channels");
    const GROUP_BY_TYPE: Record<string, string> = {
      qris: "QRIS", va: "Virtual Account", ewallet: "E-Wallet", cstore: "Gerai Ritel",
    };
    return (data as any[]).map((c) => ({
      code: c.code, name: c.name, type: c.type, flowType: c.flow_type,
      group: GROUP_BY_TYPE[c.type] ?? (c.group || "Lainnya"),   // c.group bisa null/kosong
      feeMode: c.fee_mode, feeFlat: Number(c.fee_flat ?? 0), feePercent: Number(c.fee_percent ?? 0),
      minAmount: Number(c.min_amount ?? 0),
      maxAmount: c.max_amount == null ? null : Number(c.max_amount),  // null = tanpa batas
      iconUrl: c.icon,
    }));
  }

  async createPayment(i: CreatePaymentInput) {
    const d = await call("/transaction/create", {
      method: "POST",
      idempotencyKey: i.referenceId,
      body: JSON.stringify({
        channel_code: i.channelCode,
        amount: i.amountIdr,
        reference_id: i.referenceId,
        customer_name: i.customer.name,
        customer_email: i.customer.email,
        ...(i.customer.phone ? { customer_phone: i.customer.phone } : {}),
        return_url: i.returnUrl,
        order_items: i.items,
      }),
    });
    const info = d.payment_info ?? {};
    return {
      providerRef: d.trx_id,
      payUrl: d.pay_url,
      payableAmountIdr: parseIdr(d.amount),
      expiresAt: info.expiration_date ? new Date(info.expiration_date) : null,
      paymentInfo: {
        qrUrl: info.qr_url, qrString: info.qr_string, bank: info.bank, vaNumber: info.va_number,
        checkoutUrl: info.checkout_url, store: info.store, paymentCode: info.payment_code,
      },
      sandbox: Boolean(d.sandbox_mode),
      simulatorUrl: d.simulator_url,
      raw: d,
    };
  }

  async getStatus(ref: string) {
    const d = await call(`/check-status/${encodeURIComponent(ref)}`);
    return {
      eventId: `${d.trx_id}:${d.status}`, providerRef: d.trx_id, referenceId: d.reference_id,
      status: d.status, amountIdr: parseIdr(d.amount),
      paidAt: d.paid_at ? new Date(d.paid_at) : undefined, raw: d,
    };
  }

  verifyAndParseWebhook(rawBody: string, headers: Headers, now = new Date()) {
    const ts = headers.get("x-paymenku-timestamp") ?? "";
    const sig = (headers.get("x-paymenku-signature") ?? "").replace(/^sha256=/, "");
    const expected = crypto.createHmac("sha256", WH_SECRET).update(`${ts}.${rawBody}`).digest("hex");
    const a = Buffer.from(sig), b = Buffer.from(expected);
    if (!ts || a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("INVALID_SIGNATURE");

    // Tolak replay. TODO(paymenku): pastikan format timestamp (detik epoch?)
    const tsNum = Number(ts);
    if (Number.isFinite(tsNum) && Math.abs(now.getTime() / 1000 - tsNum) > WEBHOOK_TOLERANCE_SECONDS)
      throw new Error("STALE_TIMESTAMP");

    // TODO(paymenku): sesuaikan nama field setelah melihat payload sandbox pertama
    const body = JSON.parse(rawBody);
    const d = body.data ?? body;
    if (!d.trx_id || !d.status) throw new Error("MALFORMED_PAYLOAD");
    return {
      eventId: `${d.trx_id}:${d.status}`, providerRef: d.trx_id, referenceId: d.reference_id,
      status: d.status, amountIdr: d.amount != null ? parseIdr(d.amount) : undefined,
      paidAt: d.paid_at ? new Date(d.paid_at) : undefined, raw: body,
    } as PaymentEvent;
  }
}
```

> **Pengembangan awal:** `PAYMENT_PROVIDER=mock`. Mock mengembalikan kanal palsu, `payUrl` ke `/mock-pay/[ref]`, dan memicu webhook internal dengan signature valid. Halaman `/mock-pay` wajib 404 bila provider bukan `mock`.
>
> **Webhook butuh URL publik.** `localhost` tidak bisa dijangkau PaymenKu. Untuk uji sandbox pakai tunnel (ngrok atau cloudflared) atau deploy preview Vercel, lalu daftarkan URL callback di dashboard merchant. Alternatif tanpa tunnel: tombol "Cek status pembayaran" (§8.4) yang memanggil `check-status`.

### 8.3 Alur `POST /api/checkout`

Body (Zod): `addressId | newAddress`, `shippingMethod`, `channelCode`, `idempotencyKey`.

```
1. Auth: ambil user (401 jika tidak ada)
2. Validasi body (Zod)
3. Idempotensi: jika orders.idempotency_key sudah ada → kembalikan order/payment yang sama
4. Muat keranjang → produk TERBARU → hitung di server: subtotal, ongkir, total, total_co2e
5. provider.listChannels() → pastikan channelCode ada DAN total >= min_amount DAN (max_amount == null ATAU total <= max_amount)
     - gagal → 422 dengan pesan jelas (mis. "Indomaret maksimal Rp 2.500.000")
     - OVO → wajib nomor telepon
6. RPC reserve_stock(items)  — gagal → 409 + daftar produk bermasalah
7. Insert orders + order_items (snapshot harga & alamat)  [service_role]
8. provider.createPayment({ referenceId: order_number, channelCode, amountIdr: total, ... })
     - galat/422/5xx → release_stock + orders.status='cancelled' + 502
9. Insert payments { provider:'paymenku', provider_ref: trx_id, status:'initiated', amount_idr: total,
                     payable_idr, channel_code, expires_at, payment_url: pay_url, raw_payload: respons }
10. Kosongkan cart_items
11. Respons { orderId, payUrl } → klien mengarahkan ke payUrl (halaman bayar PaymenKu).
    return_url = /pesanan/[id] menampilkan status; halaman ini TIDAK mengubah status.
```

- `payments.amount_idr` = total order (nominal dasar). `payments.payable_idr` = nominal yang dibayar pelanggan (bisa lebih besar karena fee). Tampilkan selisihnya sebagai "Biaya layanan pembayaran" di halaman pesanan.
- Satu `reference_id` per percobaan: percobaan pertama `order_number`; "Bayar ulang" membuat `payments` baru dengan `reference_id = ${order_number}-R${attempt}`. Idempotency-Key = `reference_id`.
- Rate limit 120/menit: simpan hasil `listChannels()` di cache server (± 5 menit).

### 8.4 Alur Webhook `POST /api/payments/paymenku/webhook`

```
1. Baca RAW body (await req.text()) — jangan req.json() sebelum verifikasi
2. provider.verifyAndParseWebhook(raw, headers) → 401 jika signature salah/timestamp kedaluwarsa; 400 jika payload tidak dikenal
3. Klaim `webhook_events` dengan status `processing`
     - status `processed` → duplikat sukses, kembalikan 200
     - status `failed` → klaim ulang dan proses lagi
     - status `processing` berumur kurang dari 2 menit → proses masih berjalan; sync mengembalikan 409
     - status `processing` berumur lebih dari 2 menit → ambil alih atomik; hanya satu pemanggil menang
4. applyPaymentEvent(event)  ← fungsi bersama (webhook, sinkronisasi, cron):
     a. Ambil payments by (provider='paymenku', provider_ref = trx_id); tak ada → 200 + log
     b. Jika status 'paid': validasi amountIdr == payments.payable_idr (bila ada di payload)
     c. 'paid'  → payments.status='paid', paid_at; orders.status='paid' (hanya dari 'pending')
        'failed'|'expired'|'cancelled' → payments.status sesuai; jika tidak ada payment lain yang masih aktif
                      → orders.status='expired' + release_stock
        'refunded' → catat di payments; orders.status='cancelled' bila belum dikirim
     d. Abaikan transisi mundur (mis. paid → expired)
     e. Pembayaran TERLAMBAT (order sudah 'expired'/'cancelled' lalu 'paid' datang): tandai payments.status='paid',
        biarkan order apa adanya, dan tampilkan di admin untuk refund manual (stok sudah dikembalikan)
5. Tandai `processed` hanya setelah seluruh pemrosesan sukses; saat gagal tandai `failed`.
6. Kembalikan 500 saat gagal agar PaymenKu mencoba ulang; 200 hanya setelah sukses atau duplikat sukses.
   Pemrosesan dibatasi 25 detik; fetch PaymenKu dibatasi 10 detik.
```

**Rekonsiliasi (jalur kedua, server-ke-server)**
- `POST /api/orders/[id]/sync-payment` (login, hanya pemilik; maks 1 kali per 10 detik): memanggil `provider.getStatus(provider_ref)` lalu `applyPaymentEvent`. Dipakai oleh tombol "Cek status pembayaran" di halaman pesanan `pending`. Ini aman karena respons berasal dari panggilan API ber-secret, bukan dari klien.
- Cron `expire-orders`: sebelum mengkedaluwarsakan pesanan `pending`, panggil `getStatus` sekali agar pesanan yang sebenarnya sudah dibayar (webhook hilang) tidak ikut kedaluwarsa.

### 8.5 Mesin Status Pesanan

```
pending ──paid──▶ paid ──admin──▶ shipped ──admin──▶ completed
   │
   ├──expired/failed──▶ expired   (stok dikembalikan)
   └──user/admin──────▶ cancelled (stok dikembalikan)
```

### 8.6 Kedaluwarsa Otomatis
`/api/cron/expire-orders` (Vercel Cron, tiap 30 menit, dilindungi header `Authorization: Bearer $CRON_SECRET`): cari `orders` `pending` dengan `expires_at < now()` → set `expired` + `release_stock`.

```json
// vercel.json
{ "crons": [{ "path": "/api/cron/expire-orders", "schedule": "*/30 * * * *" }] }
```

---

## 9. Kontrak API

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| GET | `/api/search?q=` | Publik | Autosuggest maks. 5 |
| POST | `/api/cart/hydrate` | Publik | Id produk → data terbaru (harga, stok) |
| GET | `/api/payment-channels` | Login | Kanal pembayaran aktif + batas nominal (cache) |
| POST | `/api/checkout` | Login | Buat order + transaksi PaymenKu |
| POST | `/api/orders/[id]/sync-payment` | Login (pemilik) | Rekonsiliasi status ke PaymenKu; 409 bila event masih diproses, 429 menyertakan `Retry-After` |
| POST | `/api/payments/paymenku/webhook` | Signature | Update status bayar |
| GET | `/api/cron/expire-orders` | `CRON_SECRET` | Kedaluwarsakan pesanan |

Format error seragam: `{ "error": { "code": "INSUFFICIENT_STOCK", "message": "…", "details": {…} } }`.

**Server Actions:** `addToCart`, `updateQuantity`, `removeItem`, `mergeGuestCart`, `saveAddress`, `updateProfile`, `adminUpdateOrderStatus`, `adminUpdateProduct`.

---

## 10. Keamanan

| Ancaman | Kontrol |
|---|---|
| Manipulasi harga dari klien | Harga dihitung ulang di server dari DB |
| Akses data pengguna lain | RLS di semua tabel + pemeriksaan `user.id` di server |
| Webhook palsu | HMAC + `timingSafeEqual`, cek nominal, idempotensi `event_id` |
| Oversell stok | `reserve_stock` atomik dengan `stock >= qty` |
| Bocornya secret | `service_role`, `PAYMENKU_API_KEY` (sk_*), `PAYMENKU_WEBHOOK_SECRET` hanya di server; tidak berawalan `NEXT_PUBLIC_` |
| Brute force login/checkout | Rate limit (Upstash Ratelimit atau Vercel Firewall) pada `/api/checkout`, `/api/search`, auth |
| XSS | React escape default; jangan memakai `dangerouslySetInnerHTML` untuk data pengguna |
| Eskalasi peran | Policy update profil mengunci kolom `role` |
| Klik ganda "Bayar" | `idempotency_key` per sesi checkout |
| Header | CSP, `X-Frame-Options`, `Referrer-Policy` di `next.config.mjs` |

---

## 11. Environment Variables

```bash
# .env.example
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# SERVER ONLY — jangan diawali NEXT_PUBLIC_
SUPABASE_SECRET_KEY=

PAYMENT_PROVIDER=mock            # mock | paymenku
PAYMENKU_BASE_URL=https://paymenku.com/api/v1
PAYMENKU_API_KEY=                 # sk_test_... (sandbox) / sk_live_... (produksi, butuh KYC)
PAYMENKU_WEBHOOK_SECRET=

CRON_SECRET=
```

---

## 12. Deploy

### Vercel (disarankan)
1. Push repo ke GitHub → *Import Project* di Vercel (framework terdeteksi otomatis).
2. Isi semua environment variable (Production dan Preview).
3. Supabase: **Authentication → URL Configuration** — tambahkan `Site URL` dan `Redirect URLs` (domain produksi + `*.vercel.app` untuk preview).
4. Daftarkan URL callback webhook di dashboard PaymenKu: `https://<domain>/api/payments/paymenku/webhook`, dan salin webhook secret-nya ke environment variable. Mulai dengan kunci `sk_test_`; kunci `sk_live_` baru aktif setelah KYC disetujui.
5. `vercel.json` untuk cron (lihat 8.6).

### Netlify (alternatif)
- Pakai runtime Next.js resmi Netlify (otomatis lewat `@netlify/plugin-nextjs`).
- Cron: gunakan *Scheduled Functions* Netlify yang memanggil `/api/cron/expire-orders`, atau penjadwal eksternal.
- Verifikasi bahwa Route Handler webhook menerima **raw body** dengan benar setelah deploy.

### Supabase
- Jalankan migrasi: `supabase db push` (via Supabase CLI).
- Buat bucket Storage `product-images` (publik, baca saja).
- Jalankan `seed.sql`.
- Buat akun admin: daftar normal, lalu `update profiles set role='admin' where id='…'`.

---

## 13. Strategi Caching & Performa

| Halaman | Strategi |
|---|---|
| Beranda, detail produk | ISR `revalidate = 300`; `revalidateTag('products')` saat admin mengubah produk |
| Katalog (`/produk`) | Dinamis (bergantung `searchParams`), query ber-index, `unstable_cache` per kombinasi filter (60 dtk) |
| Keranjang/checkout/akun | Dinamis, tanpa cache |
| Gambar | `next/image`, `sizes`, `priority` hanya untuk gambar hero/LCP |
| Font | `next/font` (self-hosted, tanpa layout shift) |

---

## 14. Pengujian

| Level | Alat | Cakupan minimum |
|---|---|---|
| Unit | Vitest | `pricing.ts`, `catalog-query.ts`, `format.ts`, validator Zod, verifikasi signature |
| Integrasi | Vitest + Supabase lokal | `reserve_stock` (kondisi balapan), handler webhook (valid, signature salah, duplikat) |
| E2E | Playwright | Daftar → cari → filter → tambah keranjang → checkout (mock) → status `paid` |
| A11y | `axe-core` di Playwright | Halaman utama tanpa pelanggaran kritis |

---

## 15. Konvensi Kode

- TypeScript `strict: true`; tanpa `any` kecuali terdokumentasi.
- Tipe DB dihasilkan: `supabase gen types typescript --local > src/types/db.ts`.
- Server Component secara default; tambahkan `"use client"` hanya bila perlu state/event.
- Semua input eksternal divalidasi Zod di batas sistem (Route Handler, Server Action).
- Uang disimpan sebagai **integer rupiah**; format tampilan lewat `rupiah()` (`Intl.NumberFormat('id-ID')`).
- Nama berkas: `kebab-case` untuk rute dan util, `PascalCase` untuk komponen.
- Commit mengikuti Conventional Commits (`feat:`, `fix:`, `chore:`).
- ESLint + Prettier (plugin Tailwind untuk urutan class).

---

## 16. Panduan Prompt untuk Vibe Coding

Gunakan urutan ini; selalu lampirkan ketiga dokumen sebagai konteks.

1. **Fondasi:** *"Buat proyek Next.js 15 + TS + Tailwind sesuai `architecture.md` §3. Terapkan token di `design.md` §2–5, `layout.tsx` dengan font Fraunces/Inter/JetBrains Mono, Header, Footer, AnnouncementBar."*
2. **Database:** *"Tulis migrasi `0001–0003` dan `seed.sql` berisi 24 produk dari `prd.md` §5 dengan deskripsi nyata dan `impact_note`."*
3. **Katalog:** *"Buat `/produk` dan `/produk/[slug]` sesuai `design.md` §6–7, dengan `queryProducts` dari `architecture.md` §5."*
4. **Cari & filter:** *"Tambahkan SearchBox autosuggest, FilterSidebar (desktop), FilterSheet (mobile), chip aktif, state di URL."*
5. **Auth:** *"Implementasi Supabase Auth + middleware proteksi rute + penggabungan keranjang (§6)."*
6. **Keranjang:** *"Zustand untuk tamu, `cart_items` untuk login, CartDrawer dan `/keranjang`."*
7. **Checkout:** *"Implementasi `/api/checkout` sesuai §8.3 dengan `MockProvider` dulu, lalu stepper checkout."*
8. **Webhook:** *"Implementasi webhook §8.4 + cron kedaluwarsa + halaman `/pesanan/[id]`."*
9. **PaymenKu:** *"Implementasikan `PaymenkuProvider` sesuai `architecture.md` §8.2, uji dengan kunci sandbox."* (lihat prompt Fase 5b)
10. **Poles:** *"Admin minimal, SEO (metadata, sitemap, JSON-LD), audit a11y dan Lighthouse, empty/error states."*

**Aturan emas saat vibe coding:**
- Selesaikan dan jalankan satu fase sebelum lanjut.
- Jika AI mengusulkan warna/font/komponen baru, tolak dan arahkan kembali ke `design.md`.
- Jangan biarkan AI memindahkan logika harga/stok/pembayaran ke klien.
- Minta AI menulis tes untuk `pricing.ts` dan webhook sebelum menyentuh UI checkout.
