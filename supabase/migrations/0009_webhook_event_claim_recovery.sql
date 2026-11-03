alter table public.webhook_events
  add column if not exists claimed_at timestamptz;

update public.webhook_events
set claimed_at = received_at
where claimed_at is null;

alter table public.webhook_events
  alter column claimed_at set default now(),
  alter column claimed_at set not null;

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

notify pgrst, 'reload schema';
