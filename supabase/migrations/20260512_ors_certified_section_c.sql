-- Add Section B certification fields and Section C particulars to ors_entries
alter table public.ors_entries
  add column if not exists certified_by_name     text,
  add column if not exists certified_by_desig    text,
  add column if not exists section_c_particulars text;
