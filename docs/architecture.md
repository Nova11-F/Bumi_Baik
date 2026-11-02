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
| Pembayaran | **PaymentKu** lewat adapter | Lihat bagian 7 |

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
 │ Server Components  (baca katalog)       │   │   PaymentKu   │
 │ Route Handlers /api/*                   │──▶│  (hosted pay) │
 │ Server Actions    (cart, alamat)        │   └──────┬────────┘
 │ Middleware        (refresh session)     │          │ webhook
 │ lib/server/payments/paymentku (adapter) │◀─────────┘
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
│  │  └─ 0004_grants.sql
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
│  │  │  ├─ payments/paymentku/webhook/route.ts
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
│  │  │     ├─ paymentku.ts     # implementasi nyata
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
  provider text not null default 'paymentku',
  provider_ref text,                              -- ID transaksi di PaymentKu
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
  received_at timestamptz not null default now(),
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
export interface CreatePaymentInput {
  orderId: string;
  orderNumber: string;
  amountIdr: number;
  customer: { name: string; email: string; phone?: string };
  items: { name: string; price: number; quantity: number }[];
  returnUrl: string;          // /pesanan/[id]
  notifyUrl: string;          // /api/payments/paymentku/webhook
  expiresAt: Date;
}
export interface CreatePaymentResult {
  providerRef: string;
  paymentUrl: string;         // URL hosted payment page
}
export type PaymentEvent = {
  eventId: string;            // untuk idempotensi
  providerRef: string;
  status: "paid" | "failed" | "expired";
  amountIdr: number;
  paidAt?: Date;
  raw: unknown;
};
export interface PaymentProvider {
  createPayment(i: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyAndParseWebhook(rawBody: string, headers: Headers): PaymentEvent; // throw jika tidak valid
}
```

```ts
// lib/server/payments/index.ts
export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "mock" ? new MockProvider() : new PaymentKuProvider();
}
```

### 8.2 Implementasi PaymentKu (kerangka — isi sesuai dokumentasi)

```ts
// lib/server/payments/paymentku.ts
import crypto from "node:crypto";

export class PaymentKuProvider implements PaymentProvider {
  private base = process.env.PAYMENTKU_BASE_URL!;
  private key  = process.env.PAYMENTKU_SECRET_KEY!;
  private whSecret = process.env.PAYMENTKU_WEBHOOK_SECRET!;

  async createPayment(i: CreatePaymentInput) {
    // TODO: sesuaikan endpoint, header, dan field dengan dokumentasi PaymentKu
    const res = await fetch(`${this.base}/v1/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.key}` },
      body: JSON.stringify({
        reference: i.orderNumber, amount: i.amountIdr, currency: "IDR",
        customer: i.customer, items: i.items,
        return_url: i.returnUrl, callback_url: i.notifyUrl,
        expires_at: i.expiresAt.toISOString(),
      }),
    });
    if (!res.ok) throw new Error(`PAYMENTKU_CREATE_FAILED:${res.status}`);
    const data = await res.json();
    return { providerRef: data.id, paymentUrl: data.payment_url }; // TODO: sesuaikan nama field
  }

  verifyAndParseWebhook(rawBody: string, headers: Headers): PaymentEvent {
    // TODO: sesuaikan nama header & algoritma dengan PaymentKu
    const sig = headers.get("x-paymentku-signature") ?? "";
    const expected = crypto.createHmac("sha256", this.whSecret).update(rawBody).digest("hex");
    const ok = sig.length === expected.length &&
               crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) throw new Error("INVALID_SIGNATURE");

    const b = JSON.parse(rawBody);
    return {
      eventId: b.event_id, providerRef: b.transaction_id,
      status: mapStatus(b.status),            // TODO: pemetaan status
      amountIdr: Number(b.amount),
      paidAt: b.paid_at ? new Date(b.paid_at) : undefined,
      raw: b,
    };
  }
}
```

> **Pengembangan awal:** set `PAYMENT_PROVIDER=mock`. Mock menghasilkan `paymentUrl` ke halaman lokal `/mock-pay/[ref]` dengan tombol "Berhasil / Gagal" yang memicu webhook internal. Dengan begitu seluruh alur bisa diuji sebelum dokumentasi PaymentKu siap.

### 8.3 Alur `POST /api/checkout`

```
1. Auth: ambil user (401 jika tidak ada)
2. Validasi body (Zod): addressId | newAddress, shippingMethod, idempotencyKey
3. Idempotensi: jika orders.idempotency_key sudah ada → kembalikan order/payment yang sama
4. Muat keranjang dari DB → muat produk TERBARU → hitung di server:
     subtotal, ongkir (constants.ts), total, total_co2e
5. Panggil RPC reserve_stock(items)  — gagal → 409 + daftar produk bermasalah
6. Insert orders + order_items (snapshot harga & alamat)  [service_role]
7. provider.createPayment(...)
     - gagal → release_stock(order) + status 'cancelled' + 502
8. Insert payments {status:'initiated', provider_ref, payment_url}
9. Kosongkan cart_items
10. Respons: { orderId, paymentUrl } → klien melakukan window.location = paymentUrl
```

> Langkah 5–9 sebaiknya dibungkus satu fungsi Postgres atau dikompensasi eksplisit (release stok) bila salah satu langkah gagal.

### 8.4 Alur Webhook `POST /api/payments/paymentku/webhook`

```
1. Baca RAW body (await req.text()) — jangan req.json() sebelum verifikasi
2. provider.verifyAndParseWebhook(raw, headers)  → 401 jika signature salah
3. Insert ke webhook_events (provider, event_id)
     - konflik unique → sudah diproses → kembalikan 200 (idempoten)
4. Ambil payments by provider_ref; validasi amountIdr == orders.total_idr
5. Jika status 'paid':   payments.status='paid', orders.status='paid', paid_at=now()
   Jika 'failed'/'expired': payments.status=..., orders.status='expired', release_stock
   (abaikan transisi mundur, mis. paid → expired)
6. Kembalikan 200 secepat mungkin
```

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
| POST | `/api/checkout` | Login | Buat order + transaksi PaymentKu |
| POST | `/api/payments/paymentku/webhook` | Signature | Update status bayar |
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
| Bocornya secret | `service_role`, `PAYMENTKU_*` hanya di server; tidak berawalan `NEXT_PUBLIC_` |
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

PAYMENT_PROVIDER=mock            # mock | paymentku
PAYMENTKU_BASE_URL=
PAYMENTKU_SECRET_KEY=
PAYMENTKU_WEBHOOK_SECRET=

CRON_SECRET=
```

---

## 12. Deploy

### Vercel (disarankan)
1. Push repo ke GitHub → *Import Project* di Vercel (framework terdeteksi otomatis).
2. Isi semua environment variable (Production dan Preview).
3. Supabase: **Authentication → URL Configuration** — tambahkan `Site URL` dan `Redirect URLs` (domain produksi + `*.vercel.app` untuk preview).
4. Daftarkan URL webhook di dashboard PaymentKu: `https://<domain>/api/payments/paymentku/webhook`.
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
9. **PaymentKu:** *"Ganti ke `PaymentKuProvider` memakai dokumentasi berikut: [tempel dokumentasi]."*
10. **Poles:** *"Admin minimal, SEO (metadata, sitemap, JSON-LD), audit a11y dan Lighthouse, empty/error states."*

**Aturan emas saat vibe coding:**
- Selesaikan dan jalankan satu fase sebelum lanjut.
- Jika AI mengusulkan warna/font/komponen baru, tolak dan arahkan kembali ke `design.md`.
- Jangan biarkan AI memindahkan logika harga/stok/pembayaran ke klien.
- Minta AI menulis tes untuk `pricing.ts` dan webhook sebelum menyentuh UI checkout.
