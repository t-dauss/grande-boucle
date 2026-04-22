create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  uci_code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  stage_number int not null unique check (stage_number between 1 and 21),
  date date not null,
  start_city text not null,
  finish_city text not null,
  stage_type text not null check (stage_type in ('flat', 'hilly', 'mountain', 'itt', 'ttt')),
  start_time_utc timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'finished', 'results_published')),
  created_at timestamptz not null default now()
);

create table if not exists public.stage_odds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  odds numeric(6, 2) not null check (odds > 1),
  source text not null default 'betclic_manual',
  entered_by uuid references auth.users(id) on delete set null,
  entered_at timestamptz not null default now(),
  unique(stage_id, rider_id)
);

create table if not exists public.bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_id uuid not null references public.stages(id) on delete cascade,
  picked_rider_id uuid not null references public.riders(id) on delete restrict,
  placed_at timestamptz not null default now(),
  is_locked boolean not null default false,
  replaces_bet_id uuid references public.bets(id) on delete set null,
  is_active_pick boolean not null default true,
  claim_screenshot_url text,
  validated_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists bets_one_active_pick_idx
  on public.bets(user_id, stage_id)
  where is_active_pick = true;

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rank int not null check (rank between 1 and 5),
  rider_id uuid not null references public.riders(id) on delete restrict,
  official_time text,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  unique(stage_id, rank),
  unique(stage_id, rider_id)
);

create table if not exists public.team_stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  rank int not null check (rank > 0),
  created_at timestamptz not null default now(),
  unique(stage_id, rank),
  unique(stage_id, team_id)
);

create table if not exists public.user_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bonus_type text not null check (bonus_type in ('double_multiplier', 'shield_full_odds')),
  stock_total int not null check (stock_total >= 0),
  stock_used int not null default 0 check (stock_used >= 0 and stock_used <= stock_total),
  created_at timestamptz not null default now(),
  unique(user_id, bonus_type)
);

create table if not exists public.bet_bonus_usage (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references public.bets(id) on delete cascade,
  bonus_type text not null check (bonus_type in ('double_multiplier', 'shield_full_odds')),
  applied_at timestamptz not null default now(),
  unique(bet_id, bonus_type)
);

create table if not exists public.bet_scores (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null unique references public.bets(id) on delete cascade,
  base_odds numeric(6,2) not null,
  effective_rank int,
  base_points numeric(8,3) not null,
  bonus_multiplier numeric(4,2) not null default 1,
  final_points numeric(8,3) not null,
  score_reason text not null,
  computed_at timestamptz not null default now()
);

create table if not exists public.rider_stage_status (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  rider_id uuid not null references public.riders(id) on delete cascade,
  status text not null check (status in ('started', 'dns', 'dnf')),
  updated_at timestamptz not null default now(),
  unique(stage_id, rider_id)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.stages(id) on delete cascade,
  kind text not null check (kind in ('stage_starting', 'results_published')),
  idempotency_key text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
