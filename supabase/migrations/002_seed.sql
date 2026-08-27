-- DPL 2026 — Seed Data
-- Run AFTER 001_initial.sql
-- Inserts the default 5 teams and 8 players from the existing system

-- Teams
INSERT INTO teams (name, logo_url) VALUES
  ('Dewvog Strikers',  NULL),
  ('Premier Titans',   NULL),
  ('Crown Kings',      NULL),
  ('Stadium Warriors', NULL),
  ('Falcon United',    NULL)
ON CONFLICT DO NOTHING;

-- Players (ordered by auction sequence)
INSERT INTO players (name, category, position, base_price, sort_order) VALUES
  ('Player 1', 'A', 'Forward',    25000, 1),
  ('Player 2', 'A', 'Forward',    18000, 2),
  ('Player 3', 'B', 'Midfielder', 15000, 3),
  ('Player 4', 'B', 'Midfielder', 12000, 4),
  ('Player 5', 'C', 'Defender',   10000, 5),
  ('Player 6', 'C', 'Defender',    8000, 6),
  ('Player 7', 'D', 'Goalkeeper',  7000, 7),
  ('Player 8', 'D', 'Goalkeeper',  5000, 8)
ON CONFLICT DO NOTHING;
