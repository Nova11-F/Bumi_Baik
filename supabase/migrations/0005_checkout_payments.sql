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

create function process_payment_event(
  p_provider text,
  p_event_id text,
  p_payload jsonb,
  p_provider_ref text,
  p_status payment_status,
  p_amount_idr integer,
  p_paid_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_status order_status;
  v_total_idr integer;
begin
  select p.order_id, o.status, o.total_idr
    into v_order_id, v_order_status, v_total_idr
    from payments p
    join orders o on o.id = p.order_id
   where p.provider = p_provider and p.provider_ref = p_provider_ref
   for update of p, o;

  if v_order_id is null then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  if p_amount_idr <> v_total_idr then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  insert into webhook_events (provider, event_id, payload)
  values (p_provider, p_event_id, p_payload)
  on conflict (provider, event_id) do nothing;

  if not found then
    return 'duplicate';
  end if;

  if v_order_status <> 'pending' then
    return 'ignored';
  end if;

  if p_status = 'paid' then
    update payments
       set status = 'paid', paid_at = coalesce(p_paid_at, now()), raw_payload = p_payload
     where order_id = v_order_id;
    update orders set status = 'paid' where id = v_order_id;
    return 'processed';
  end if;

  if p_status in ('failed', 'expired') then
    update payments set status = p_status, raw_payload = p_payload
     where order_id = v_order_id;
    update orders set status = 'expired' where id = v_order_id;
    perform release_stock(v_order_id);
    return 'processed';
  end if;

  raise exception 'INVALID_PAYMENT_STATUS';
end;
$$;

create function expire_pending_orders(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_expired_count integer := 0;
begin
  for v_order_id in
    select id
      from orders
     where status = 'pending' and expires_at <= now()
     order by expires_at
     limit greatest(1, least(p_limit, 500))
     for update skip locked
  loop
    update orders set status = 'expired'
     where id = v_order_id and status = 'pending';
    if found then
      update payments set status = 'expired'
       where order_id = v_order_id and status = 'initiated';
      perform release_stock(v_order_id);
      v_expired_count := v_expired_count + 1;
    end if;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function create_checkout_order(jsonb, jsonb),
  save_checkout_payment(uuid, text, text, integer, text),
  cancel_pending_order(uuid),
  process_payment_event(text, text, jsonb, text, payment_status, integer, timestamptz),
  expire_pending_orders(integer)
from public, anon, authenticated;

grant execute on function create_checkout_order(jsonb, jsonb),
  save_checkout_payment(uuid, text, text, integer, text),
  cancel_pending_order(uuid),
  process_payment_event(text, text, jsonb, text, payment_status, integer, timestamptz),
  expire_pending_orders(integer)
to service_role;
