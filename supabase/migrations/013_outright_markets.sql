drop function if exists public.get_outright_snapshot(uuid);

create or replace function public.get_outright_snapshot(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'market_id',   m.id,
      'slug',        m.slug,
      'label',       m.label,
      'emoji',       m.emoji,
      'description', m.description,
      'deadline',    m.deadline,
      'is_open',     m.is_open and now() < m.deadline,
      'my_bet', case when ob.id is not null then jsonb_build_object(
        'bet_id',      ob.id,
        'rider_id',    ob.rider_id,
        'rider_name',  r.full_name,
        'locked_odds', ob.locked_odds,
        'placed_at',   ob.placed_at,
        'won',         os.won,
        'points',      os.final_points
      ) end,
      'odds', (
        select jsonb_agg(
          jsonb_build_object(
            'rider_id',   oo.rider_id,
            'rider_name', ri.full_name,
            'odds',       oo.odds
          ) order by oo.odds asc
        )
        from public.outright_odds oo
        join public.riders ri on ri.id = oo.rider_id
        where oo.market_id = m.id
      )
    ) order by m.deadline asc
  ) into v_result
  from public.outright_markets m
  left join public.outright_bets ob
    on ob.market_id = m.id and ob.user_id = p_user_id
  left join public.riders r on r.id = ob.rider_id
  left join public.outright_scores os on os.bet_id = ob.id;

  return v_result;
end;
$$;
