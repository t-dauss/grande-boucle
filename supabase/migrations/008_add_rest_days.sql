create table if not exists public.rest_days (
  id uuid primary key default gen_random_uuid(),
  rest_day_number int not null unique check (rest_day_number > 0),
  date date not null unique,
  city text not null,
  label text not null default 'Repos',
  created_at timestamptz not null default now()
);
