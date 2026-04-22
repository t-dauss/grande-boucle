alter table public.bets enable row level security;
alter table public.user_bonuses enable row level security;
alter table public.bet_bonus_usage enable row level security;
alter table public.bet_scores enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "bets_select_own" on public.bets;
create policy "bets_select_own"
  on public.bets for select
  using (auth.uid() = user_id);

drop policy if exists "bets_insert_own" on public.bets;
create policy "bets_insert_own"
  on public.bets for insert
  with check (auth.uid() = user_id);

drop policy if exists "bets_update_own" on public.bets;
create policy "bets_update_own"
  on public.bets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bonuses_select_own" on public.user_bonuses;
create policy "bonuses_select_own"
  on public.user_bonuses for select
  using (auth.uid() = user_id);

drop policy if exists "bonus_usage_select_own" on public.bet_bonus_usage;
create policy "bonus_usage_select_own"
  on public.bet_bonus_usage for select
  using (
    exists (
      select 1 from public.bets b
      where b.id = bet_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "scores_select_own" on public.bet_scores;
create policy "scores_select_own"
  on public.bet_scores for select
  using (
    exists (
      select 1 from public.bets b
      where b.id = bet_id and b.user_id = auth.uid()
    )
  );

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.current_stage_is_locked(target_stage_id uuid)
returns boolean
language sql
stable
as $$
  select now() >= s.start_time_utc
  from public.stages s
  where s.id = target_stage_id;
$$;

create or replace function public.place_or_replace_bet(
  p_user_id uuid,
  p_stage_id uuid,
  p_rider_id uuid,
  p_is_joker_repick boolean default false
) returns uuid
language plpgsql
security definer
as $$
declare
  v_stage_locked boolean;
  v_existing_bet uuid;
  v_new_bet uuid;
begin
  select public.current_stage_is_locked(p_stage_id) into v_stage_locked;
  if v_stage_locked then
    raise exception 'Stage is locked';
  end if;

  select id into v_existing_bet
  from public.bets
  where user_id = p_user_id
    and stage_id = p_stage_id
    and is_active_pick = true
  limit 1;

  if v_existing_bet is not null and not p_is_joker_repick then
    raise exception 'An active pick already exists; use joker replacement flow.';
  end if;

  if p_is_joker_repick then
    if v_existing_bet is null then
      raise exception 'No active pick to replace.';
    end if;

    update public.bets
      set is_active_pick = false
      where id = v_existing_bet;
  end if;

  insert into public.bets (
    user_id, stage_id, picked_rider_id, replaces_bet_id
  ) values (
    p_user_id, p_stage_id, p_rider_id, v_existing_bet
  )
  returning id into v_new_bet;

  return v_new_bet;
end;
$$;

create or replace function public.compute_stage_scores(p_stage_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  bet_row record;
  v_stage_type text;
  v_rank int;
  v_odds numeric(6,2);
  v_points numeric(8,3);
  v_multiplier numeric(4,2);
  v_shield_used boolean;
  v_double_used boolean;
begin
  select stage_type into v_stage_type
  from public.stages
  where id = p_stage_id;

  delete from public.bet_scores
  where bet_id in (
    select id from public.bets where stage_id = p_stage_id and is_active_pick = true
  );

  for bet_row in
    select b.*
    from public.bets b
    where b.stage_id = p_stage_id
      and b.is_active_pick = true
  loop
    select so.odds into v_odds
    from public.stage_odds so
    where so.stage_id = p_stage_id
      and so.rider_id = bet_row.picked_rider_id;

    if v_stage_type = 'ttt' then
      select tsr.rank into v_rank
      from public.team_stage_results tsr
      join public.riders r on r.team_id = tsr.team_id
      where tsr.stage_id = p_stage_id
        and r.id = bet_row.picked_rider_id;
    else
      select rank into v_rank
      from public.results
      where stage_id = p_stage_id
        and rider_id = bet_row.picked_rider_id;
    end if;

    select exists(
      select 1 from public.bet_bonus_usage bbu
      where bbu.bet_id = bet_row.id
        and bbu.bonus_type = 'shield_full_odds'
    ) into v_shield_used;

    select exists(
      select 1 from public.bet_bonus_usage bbu
      where bbu.bet_id = bet_row.id
        and bbu.bonus_type = 'double_multiplier'
    ) into v_double_used;

    if v_rank is null or v_rank > 5 then
      v_points := 0;
    elsif v_rank = 1 then
      v_points := coalesce(v_odds, 0);
    elsif v_shield_used then
      v_points := coalesce(v_odds, 0);
    else
      v_points := coalesce(v_odds, 0) / v_rank;
    end if;

    v_multiplier := case when v_double_used then 2 else 1 end;

    insert into public.bet_scores (
      bet_id, base_odds, effective_rank, base_points, bonus_multiplier, final_points, score_reason
    ) values (
      bet_row.id,
      coalesce(v_odds, 0),
      v_rank,
      coalesce(v_points, 0),
      v_multiplier,
      coalesce(v_points, 0) * v_multiplier,
      case
        when v_rank is null or v_rank > 5 then 'outside_top5'
        when v_rank = 1 then 'top1'
        when v_shield_used then 'top5_shield'
        else 'top5_divided'
      end
    );
  end loop;
end;
$$;
