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
