-- F3: prayer and meal anchors. Spec: docs/specs/F3.md
-- One entry per dose, same order as `times`: '' = a plain clock time, or a moment in the day.
-- Nullable: medicines added before F3 have no anchors and keep working as clock times.

alter table public.medications
  add column anchors text[],
  add constraint medications_anchors_valid check (
    anchors is null
    or (
      cardinality(anchors) = cardinality(times)
      and anchors <@ array[
        '', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'suhoor', 'iftar',
        'breakfast:before', 'breakfast:with', 'breakfast:after',
        'lunch:before', 'lunch:with', 'lunch:after',
        'dinner:before', 'dinner:with', 'dinner:after'
      ]::text[]
    )
  );
