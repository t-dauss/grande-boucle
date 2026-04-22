create or replace function public.get_leaderboard_totals()
returns table (
  user_id uuid,
  total_points numeric(12,3)
)
language sql
security definer
as $$
  select b.user_id, coalesce(sum(bs.final_points), 0)::numeric(12,3) as total_points
  from public.bets b
  left join public.bet_scores bs on bs.bet_id = b.id
  where b.is_active_pick = true
  group by b.user_id
  order by total_points desc;
$$;

create or replace function public.queue_notification_campaigns()
returns int
language plpgsql
security definer
as $$
declare
  inserted_count int := 0;
  _rc int;
begin
  insert into public.notification_campaigns(stage_id, kind, idempotency_key, payload)
  select
    s.id,
    'stage_starting',
    concat('stage_starting_', s.stage_number, '_', to_char(s.start_time_utc, 'YYYYMMDDHH24MI')),
    jsonb_build_object(
      'title', concat('Stage ', s.stage_number, ' starts soon'),
      'body', concat(s.start_city, ' -> ', s.finish_city, ' starts in 30 minutes.'),
      'url', concat('/play?stage=', s.stage_number)
    )
  from public.stages s
  where s.start_time_utc between now() + interval '29 minutes' and now() + interval '31 minutes'
  on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;

  insert into public.notification_campaigns(stage_id, kind, idempotency_key, payload)
  select
    s.id,
    'results_published',
    concat('results_published_', s.stage_number, '_', to_char(now(), 'YYYYMMDD')),
    jsonb_build_object(
      'title', concat('Stage ', s.stage_number, ' results are live'),
      'body', concat('Check updated points for ', s.start_city, ' -> ', s.finish_city, '.'),
      'url', '/leaderboard'
    )
  from public.stages s
  where s.status = 'results_published'
  on conflict (idempotency_key) do nothing;
  get diagnostics _rc = row_count;
  inserted_count := inserted_count + _rc;

  return inserted_count;
end;
$$;
