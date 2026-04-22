insert into public.stages (
  stage_number, date, start_city, finish_city, stage_type, start_time_utc, status, distance_km, profile_label
) values
  (1, '2026-07-04', 'Barcelone', 'Barcelone', 'ttt', '2026-07-04T12:00:00Z', 'scheduled', 19.7, 'Contre-la-montre par équipes'),
  (2, '2026-07-05', 'Tarragone', 'Barcelone', 'hilly', '2026-07-05T11:00:00Z', 'scheduled', 182.0, 'Accidentée'),
  (3, '2026-07-06', 'Granollers', 'Les Angles', 'mountain', '2026-07-06T11:00:00Z', 'scheduled', 196.0, 'Montagne'),
  (4, '2026-07-07', 'Carcassonne', 'Foix', 'mountain', '2026-07-07T11:00:00Z', 'scheduled', 182.0, 'Montagne'),
  (5, '2026-07-08', 'Lannemezan', 'Pau', 'flat', '2026-07-08T11:00:00Z', 'scheduled', 158.0, 'Plaine'),
  (6, '2026-07-09', 'Pau', 'Gavarnie-Gèdre', 'mountain', '2026-07-09T11:00:00Z', 'scheduled', 186.0, 'Montagne'),
  (7, '2026-07-10', 'Hagetmau', 'Bordeaux', 'flat', '2026-07-10T11:00:00Z', 'scheduled', 175.0, 'Plaine'),
  (8, '2026-07-11', 'Périgueux', 'Bergerac', 'flat', '2026-07-11T11:00:00Z', 'scheduled', 182.0, 'Plaine'),
  (9, '2026-07-12', 'Malemort', 'Ussel', 'hilly', '2026-07-12T11:00:00Z', 'scheduled', 185.0, 'Accidentée'),
  (10, '2026-07-14', 'Aurillac', 'Le Lioran', 'mountain', '2026-07-14T11:00:00Z', 'scheduled', 167.0, 'Montagne'),
  (11, '2026-07-15', 'Vichy', 'Nevers', 'flat', '2026-07-15T11:00:00Z', 'scheduled', 161.0, 'Plaine'),
  (12, '2026-07-16', 'Circuit de Nevers Magny-Cours', 'Chalon-sur-Saône', 'flat', '2026-07-16T11:00:00Z', 'scheduled', 181.0, 'Plaine'),
  (13, '2026-07-17', 'Dole', 'Belfort', 'hilly', '2026-07-17T11:00:00Z', 'scheduled', 205.0, 'Accidentée'),
  (14, '2026-07-18', 'Mulhouse', 'Le Markstein - Fellering', 'mountain', '2026-07-18T11:00:00Z', 'scheduled', 155.0, 'Montagne'),
  (15, '2026-07-19', 'Champagnole', 'Plateau de Solaison', 'mountain', '2026-07-19T11:00:00Z', 'scheduled', 184.0, 'Montagne'),
  (16, '2026-07-21', 'Évian-les-Bains', 'Thonon-les-Bains', 'itt', '2026-07-21T11:00:00Z', 'scheduled', 26.0, 'Contre-la-montre individuel'),
  (17, '2026-07-22', 'Chambéry', 'Voiron', 'flat', '2026-07-22T11:00:00Z', 'scheduled', 175.0, 'Plaine'),
  (18, '2026-07-23', 'Voiron', 'Orcières-Merlette', 'mountain', '2026-07-23T11:00:00Z', 'scheduled', 185.0, 'Montagne'),
  (19, '2026-07-24', 'Gap', 'L''Alpe d''Huez', 'mountain', '2026-07-24T11:00:00Z', 'scheduled', 128.0, 'Montagne'),
  (20, '2026-07-25', 'Le Bourg-d''Oisans', 'L''Alpe d''Huez', 'mountain', '2026-07-25T11:00:00Z', 'scheduled', 171.0, 'Montagne'),
  (21, '2026-07-26', 'Thoiry', 'Paris - Champs-Élysées', 'flat', '2026-07-26T14:00:00Z', 'scheduled', 130.0, 'Plaine')
on conflict (stage_number) do update set
  date = excluded.date,
  start_city = excluded.start_city,
  finish_city = excluded.finish_city,
  stage_type = excluded.stage_type,
  start_time_utc = excluded.start_time_utc,
  status = excluded.status,
  distance_km = excluded.distance_km,
  profile_label = excluded.profile_label;
