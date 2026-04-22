create or replace function public.cancel_outright_bet(p_user_id uuid)
returns void
language sql
security definer
as $$
  delete from public.outright_bets where user_id = p_user_id;
$$;
