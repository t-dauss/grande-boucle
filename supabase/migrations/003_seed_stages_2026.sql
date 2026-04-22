insert into public.stages (
  stage_number, date, start_city, finish_city, stage_type, start_time_utc, status
) values
  (1, '2026-07-04', 'Barcelona', 'Barcelona', 'ttt', '2026-07-04T12:00:00Z', 'scheduled'),
  (2, '2026-07-05', 'TBD', 'TBD', 'flat', '2026-07-05T11:00:00Z', 'scheduled'),
  (3, '2026-07-06', 'TBD', 'TBD', 'hilly', '2026-07-06T11:00:00Z', 'scheduled'),
  (4, '2026-07-07', 'TBD', 'TBD', 'flat', '2026-07-07T11:00:00Z', 'scheduled'),
  (5, '2026-07-08', 'TBD', 'TBD', 'itt', '2026-07-08T11:00:00Z', 'scheduled'),
  (6, '2026-07-09', 'TBD', 'TBD', 'mountain', '2026-07-09T11:00:00Z', 'scheduled'),
  (7, '2026-07-10', 'TBD', 'TBD', 'hilly', '2026-07-10T11:00:00Z', 'scheduled'),
  (8, '2026-07-11', 'TBD', 'TBD', 'mountain', '2026-07-11T11:00:00Z', 'scheduled'),
  (9, '2026-07-12', 'TBD', 'TBD', 'flat', '2026-07-12T11:00:00Z', 'scheduled'),
  (10, '2026-07-14', 'TBD', 'TBD', 'hilly', '2026-07-14T11:00:00Z', 'scheduled'),
  (11, '2026-07-15', 'TBD', 'TBD', 'mountain', '2026-07-15T11:00:00Z', 'scheduled'),
  (12, '2026-07-16', 'TBD', 'TBD', 'flat', '2026-07-16T11:00:00Z', 'scheduled'),
  (13, '2026-07-17', 'TBD', 'TBD', 'itt', '2026-07-17T11:00:00Z', 'scheduled'),
  (14, '2026-07-18', 'TBD', 'TBD', 'mountain', '2026-07-18T11:00:00Z', 'scheduled'),
  (15, '2026-07-19', 'TBD', 'TBD', 'hilly', '2026-07-19T11:00:00Z', 'scheduled'),
  (16, '2026-07-21', 'TBD', 'TBD', 'mountain', '2026-07-21T11:00:00Z', 'scheduled'),
  (17, '2026-07-22', 'TBD', 'TBD', 'flat', '2026-07-22T11:00:00Z', 'scheduled'),
  (18, '2026-07-23', 'TBD', 'TBD', 'hilly', '2026-07-23T11:00:00Z', 'scheduled'),
  (19, '2026-07-24', 'TBD', 'TBD', 'mountain', '2026-07-24T11:00:00Z', 'scheduled'),
  (20, '2026-07-25', 'TBD', 'TBD', 'itt', '2026-07-25T11:00:00Z', 'scheduled'),
  (21, '2026-07-26', 'TBD', 'Paris', 'flat', '2026-07-26T14:00:00Z', 'scheduled')
on conflict (stage_number) do update set
  date = excluded.date,
  start_city = excluded.start_city,
  finish_city = excluded.finish_city,
  stage_type = excluded.stage_type,
  start_time_utc = excluded.start_time_utc,
  status = excluded.status;
