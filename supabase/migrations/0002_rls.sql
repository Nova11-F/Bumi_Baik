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
