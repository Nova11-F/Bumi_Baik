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
