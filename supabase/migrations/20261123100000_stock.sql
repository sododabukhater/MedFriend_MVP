-- F7: stock count + low-stock refill alert. Spec: docs/specs/F7.md
-- The app stores the count at one moment; what is left = stock_count - (amount x taken doses recorded after stock_set_at).
-- All three empty = no stock count for this medicine.

alter table public.medications
  add column pack_size    numeric check (pack_size > 0 and pack_size <= 9999),
  add column stock_count  numeric check (stock_count >= 0 and stock_count <= 99999),
  add column stock_set_at timestamptz;

alter table public.medications
  add constraint medications_stock_all_or_none check (
    (pack_size is null and stock_count is null and stock_set_at is null)
    or (pack_size is not null and stock_count is not null and stock_set_at is not null)
  );
