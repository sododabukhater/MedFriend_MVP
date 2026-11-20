-- Strength becomes a number + a unit from a fixed list (was free text, prone to rubbish).
-- Step 1 of 2: add the new columns and copy over old values that look like "500 mg".
-- Old values that do not fit (e.g. "abc", "50/1000 mg") become empty: strength is optional.

alter table public.medications
  add column strength_value numeric check (strength_value > 0 and strength_value < 100000),
  add column strength_unit text check (strength_unit in ('mg', 'mcg', 'g', 'ml', 'unit', 'percent')),
  add constraint medications_strength_complete
    check ((strength_value is null) = (strength_unit is null));

with parsed as (
  select id, regexp_match(strength, '^\s*([0-9]+(?:\.[0-9]+)?)\s*(mg|mcg|g|ml|units?|%)\s*$', 'i') as m
  from public.medications
  where strength is not null
)
update public.medications med
set strength_value = parsed.m[1]::numeric,
    strength_unit = case lower(parsed.m[2])
      when 'units' then 'unit'
      when '%' then 'percent'
      else lower(parsed.m[2])
    end
from parsed
where med.id = parsed.id
  and parsed.m is not null
  and parsed.m[1]::numeric > 0
  and parsed.m[1]::numeric < 100000;
