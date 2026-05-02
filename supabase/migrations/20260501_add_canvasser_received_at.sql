alter table if exists public.canvasser_assignments
  add column if not exists received_at timestamptz null;

comment on column public.canvasser_assignments.received_at is
  'Timestamp when the canvasser acknowledges receipt of the physical canvass copy.';