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
  v_old_rider uuid;
  v_old_status text;
begin
  select public.current_stage_is_locked(p_stage_id) into v_stage_locked;
  if v_stage_locked then
    raise exception 'Stage is locked';
  end if;

  select id, picked_rider_id into v_existing_bet, v_old_rider
  from public.bets
  where user_id = p_user_id
    and stage_id = p_stage_id
    and is_active_pick = true
  limit 1;

  if v_existing_bet is null and p_is_joker_repick then
    raise exception 'No active pick to replace.';
  end if;

  if v_existing_bet is not null and not p_is_joker_repick then
    raise exception 'An active pick already exists; use joker replacement flow.';
  end if;

  if p_is_joker_repick then
    if exists (
      select 1
      from public.bets b
      where b.replaces_bet_id = v_existing_bet
    ) then
      raise exception 'Only one joker replacement is allowed per stage.';
    end if;

    select rss.status into v_old_status
    from public.rider_stage_status rss
    where rss.stage_id = p_stage_id
      and rss.rider_id = v_old_rider;

    if v_old_status not in ('dns', 'dnf') then
      raise exception 'Joker replacement allowed only for DNS/DNF riders.';
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
