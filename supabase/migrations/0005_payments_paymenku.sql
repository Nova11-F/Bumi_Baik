-- 0005_payments_paymenku.sql — kolom pembayaran PaymenKu
-- Jalankan SEKALI di Supabase SQL Editor (aman diulang). Hanya untuk project yang sudah memakai 0001–0004.

-- Nominal dasar tetap di payments.amount_idr (= orders.total_idr).
-- payable_idr = nominal yang dibayar pelanggan (bisa lebih besar karena fee_mode 'customer').
alter table public.payments
  add column if not exists channel_code text,
  add column if not exists payable_idr  integer,
  add column if not exists expires_at   timestamptz,
  add column if not exists attempt      integer not null default 1;

create index if not exists payments_order_idx on public.payments (order_id);
