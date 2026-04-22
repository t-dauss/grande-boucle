-- Extend user_bonuses to accept baton_attaque bonus type
alter table public.user_bonuses
  drop constraint if exists user_bonuses_bonus_type_check;

alter table public.user_bonuses
  add constraint user_bonuses_bonus_type_check
  check (bonus_type in ('double_multiplier', 'shield_full_odds', 'baton_attaque'));

-- Bâton actions table
-- • one attacker can bâton once per stage  (stage_id, attacker_id) unique
-- • one target can be bâtonned once per stage  (stage_id, target_id) unique
create table if not exists public.baton_actions (
  id               uuid        primary key default gen_random_uuid(),
  stage_id         uuid        not null references public.stages(id) on delete cascade,
  attacker_id      uuid        not null references auth.users(id)   on delete cascade,
  target_id        uuid        not null references auth.users(id)   on delete cascade,
  bonus_cancelled  text,                        -- bonus_type that was cancelled (if any)
  applied_at       timestamptz not null default now(),
  unique (stage_id, attacker_id),
  unique (stage_id, target_id)
);
