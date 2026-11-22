-- Change times (22 Nov, owner): a medicine's earlier dose times are kept, so past days keep the times that applied
-- then and their answers still match. Spec: docs/specs/TIMES.md
-- Each entry: {"until": "YYYY-MM-DD" (last Amman date it applied), "times": [...], "anchors": [...]}, oldest first.
-- Existing medicines get an empty list: their current times apply to every day, as before.

alter table public.medications
  add column past_schedules jsonb not null default '[]'::jsonb,
  add constraint medications_past_schedules_is_array check (jsonb_typeof(past_schedules) = 'array');
