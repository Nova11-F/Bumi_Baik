alter table public.webhook_events
  add column if not exists processing_status text not null default 'processed';

alter table public.webhook_events
  add constraint webhook_events_processing_status_check
  check (processing_status in ('processing', 'processed', 'failed'));
