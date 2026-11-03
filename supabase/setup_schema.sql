-- =====================================================================
-- Bumi Baik — setup_schema.sql
-- Gabungan migrasi 0001–0006. Jalankan SEKALI di Supabase SQL Editor
-- pada project yang masih kosong. Setelah itu jalankan seed.sql.
-- Jika sebelumnya pernah gagal di tengah jalan, jalankan reset_schema.sql dulu.
-- =====================================================================

-- ############ 0001_init ############
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

create or replace function public.claim_stale_webhook_event(
  p_provider text,
  p_event_id text,
  p_payload jsonb
)
returns timestamptz
language sql
security definer
set search_path = public
as $$
  with claimed as (
    update public.webhook_events
       set processing_status = 'processing',
           claimed_at = now(),
           payload = p_payload
     where provider = p_provider
       and event_id = p_event_id
       and processing_status = 'processing'
       and claimed_at < now() - interval '2 minutes'
     returning claimed_at
  )
  select claimed_at from claimed;
$$;

revoke all on function public.claim_stale_webhook_event(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.claim_stale_webhook_event(text, text, jsonb)
  to service_role;

-- ############ 0002_rls ############
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

-- ############ 0003_functions ############
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

-- ############ 0004_grants ############
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

-- ############ 0005_checkout_payments ############
create function create_checkout_order(p_order jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_item jsonb;
  v_user_id uuid := (p_order->>'user_id')::uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;

  perform reserve_stock(p_items);

  insert into orders (
    id, order_number, user_id, status, subtotal_idr, shipping_idr,
    total_idr, total_co2e_kg, shipping_address, shipping_method,
    idempotency_key
  ) values (
    v_order_id, p_order->>'order_number', v_user_id, 'pending',
    (p_order->>'subtotal_idr')::integer,
    (p_order->>'shipping_idr')::integer,
    (p_order->>'total_idr')::integer,
    (p_order->>'total_co2e_kg')::numeric,
    p_order->'shipping_address', p_order->>'shipping_method',
    p_order->>'idempotency_key'
  );

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into order_items (
      order_id, product_id, product_name, unit_price_idr, quantity,
      co2e_avoided_kg
    ) values (
      v_order_id, (v_item->>'product_id')::uuid, v_item->>'product_name',
      (v_item->>'unit_price_idr')::integer,
      (v_item->>'quantity')::integer,
      (v_item->>'co2e_avoided_kg')::numeric
    );
  end loop;

  return v_order_id;
end;
$$;

create function save_checkout_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_ref text,
  p_amount_idr integer,
  p_payment_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_order_status order_status;
  v_total_idr integer;
begin
  select user_id, status, total_idr
    into v_user_id, v_order_status, v_total_idr
    from orders
   where id = p_order_id
   for update;

  if v_user_id is null or v_order_status <> 'pending' then
    raise exception 'ORDER_NOT_PENDING';
  end if;
  if p_amount_idr <> v_total_idr then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  insert into payments (
    order_id, provider, provider_ref, status, amount_idr, payment_url
  ) values (
    p_order_id, p_provider, p_provider_ref, 'initiated', p_amount_idr, p_payment_url
  );

  delete from cart_items c
   using order_items oi
   where c.user_id = v_user_id
     and oi.order_id = p_order_id
     and oi.product_id = c.product_id
     and oi.quantity = c.quantity;
end;
$$;

create function cancel_pending_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
begin
  update orders
     set status = 'cancelled'
   where id = p_order_id and status = 'pending'
  returning id into v_order_id;

  if v_order_id is null then
    return false;
  end if;

  update payments set status = 'failed'
   where order_id = v_order_id and status = 'initiated';
  perform release_stock(v_order_id);
  return true;
end;
$$;

revoke all on function create_checkout_order(jsonb, jsonb),
  save_checkout_payment(uuid, text, text, integer, text),
  cancel_pending_order(uuid)
from public, anon, authenticated;

grant execute on function create_checkout_order(jsonb, jsonb),
  save_checkout_payment(uuid, text, text, integer, text),
  cancel_pending_order(uuid)
to service_role;

-- ############ 0005_payments_paymenku ############
-- Nominal dasar tetap di payments.amount_idr (= orders.total_idr).
-- payable_idr = nominal yang dibayar pelanggan (bisa lebih besar karena fee_mode 'customer').
alter table public.payments
  add column if not exists channel_code text,
  add column if not exists payable_idr  integer,
  add column if not exists expires_at   timestamptz,
  add column if not exists attempt      integer not null default 1;

create index if not exists payments_order_idx on public.payments (order_id);

-- ############ 0006_payment_status_extra ############
alter type public.payment_status add value if not exists 'cancelled';
alter type public.payment_status add value if not exists 'refunded';
