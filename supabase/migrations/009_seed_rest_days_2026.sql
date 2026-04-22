insert into public.rest_days (rest_day_number, date, city, label) values
  (1, '2026-07-13', 'Cantal', 'Repos 1'),
  (2, '2026-07-20', 'Haute-Savoie', 'Repos 2')
on conflict (rest_day_number) do update set
  date = excluded.date,
  city = excluded.city,
  label = excluded.label;
