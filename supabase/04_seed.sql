-- 04: Seed schedule slots with SMT 2026 tournament day (April 18)

insert into public.schedule_slots (slug, starts_at, title, location, description, track, sort_order) values
  ('CheckIn',  '2026-04-18T07:00:00-07:00', 'Check-In',          'Main Entrance',       'Badge pickup and team registration.',                              'All',         1),
  ('Opening',  '2026-04-18T08:00:00-07:00', 'Opening Ceremony',   'Hewlett 200',          'Welcome remarks and contest overview.',                            'All',         2),
  ('Power',    '2026-04-18T08:50:00-07:00', 'Power Round',        'Assigned Room',        'Proof-based team round.',                                         'Competition', 3),
  ('Team',     '2026-04-18T10:10:00-07:00', 'Team Round',         'Assigned Room',        'Collaborative team problem set.',                                  'Competition', 4),
  ('Lunch',    '2026-04-18T11:20:00-07:00', 'Lunch Break',        'Tresidder Courtyard',  'Catered lunch and free time.',                                     'All',         5),
  ('Subject1', '2026-04-18T12:30:00-07:00', 'Subject Test #1',    'Assigned Room',        'Individual subject exam. Algebra, Calculus, Discrete, or Geometry.','Competition', 6),
  ('Subject2', '2026-04-18T13:40:00-07:00', 'Subject Test #2',    'Assigned Room',        'Second individual subject exam, or General Test.',                 'Competition', 7),
  ('Guts',     '2026-04-18T15:20:00-07:00', 'Guts Round',         'Hewlett 200',          'Live-scored team sprint. 8 sets of 4 questions.',                  'Competition', 8),
  ('Activity', '2026-04-18T16:40:00-07:00', 'Afternoon Activities','TBD',                  'Guest Speaker, Integration Bee Finals, and more.',                 'All',         9),
  ('Awards',   '2026-04-18T18:00:00-07:00', 'Awards Ceremony',    'Hewlett 200',          'Results, prizes, and closing remarks.',                            'All',        10)
on conflict (slug) do nothing;

-- Seed a sample announcement
insert into public.announcements (title, body_markdown, sms_enabled, push_enabled, audience_mode, author_name) values
  ('Check-In Opens at 7:00 AM', E'Arrive through the **main entrance** on Serra Mall and keep your badge visible.\n\nVolunteers will direct teams to their assigned rooms.', true, true, 'all', 'SMT Ops')
on conflict do nothing;
