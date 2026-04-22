alter table public.stages
  add column if not exists distance_km numeric(6,1),
  add column if not exists profile_label text;
