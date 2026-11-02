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
