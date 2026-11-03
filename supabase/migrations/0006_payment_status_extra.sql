-- Enum payment_status awal hanya: initiated, paid, failed, expired.
alter type public.payment_status add value if not exists 'cancelled';
alter type public.payment_status add value if not exists 'refunded';
