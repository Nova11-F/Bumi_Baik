-- 0007_rpc_grants.sql — hak EXECUTE fungsi RPC untuk server (service_role)
-- Di project Supabase baru, fungsi baru di schema public TIDAK otomatis bisa dipanggil lewat API.
-- Gejalanya: PGRST202 "Could not find the function public.xxx in the schema cache".
-- Aman dijalankan berulang. Hanya memberi akses ke service_role (secret key), bukan anon/authenticated.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_checkout_order','save_checkout_payment','cancel_pending_order',
                        'process_payment_event','expire_pending_orders','reserve_stock','release_stock')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
  end loop;
end $$;

notify pgrst, 'reload schema';
