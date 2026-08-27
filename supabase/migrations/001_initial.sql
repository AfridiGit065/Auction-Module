-- DPL 2026 — Supabase Initial Migration
-- Run this in your Supabase SQL Editor

-- ──────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────
-- TABLE: settings  (single-row global config)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id              INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_budget    INT NOT NULL DEFAULT 300000,
  bid_increment   INT NOT NULL DEFAULT 1000,
  countdown_time  INT NOT NULL DEFAULT 30,
  logo_url        TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────
-- TABLE: teams
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  logo_url    TEXT,
  spent       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- TABLE: players
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'A',
  position    TEXT NOT NULL DEFAULT 'Forward',
  base_price  INT NOT NULL DEFAULT 5000,
  status      TEXT NOT NULL DEFAULT 'UPCOMING'
              CHECK (status IN ('UPCOMING', 'LIVE', 'SOLD', 'UNSOLD')),
  sold_price  INT,
  sold_to     UUID REFERENCES teams(id) ON DELETE SET NULL,
  photo_url   TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- TABLE: auction_state  (single-row live state)
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auction_state (
  id                INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status            TEXT NOT NULL DEFAULT 'UPCOMING'
                    CHECK (status IN ('UPCOMING', 'LIVE', 'PAUSED', 'SOLD', 'UNSOLD')),
  current_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  current_bid       INT NOT NULL DEFAULT 0,
  leading_team_id   UUID REFERENCES teams(id) ON DELETE SET NULL,
  timer             INT NOT NULL DEFAULT 30,
  timer_active      BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO auction_state (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ──────────────────────────────────────────
-- TABLE: bids
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bids (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name   TEXT NOT NULL,
  amount      INT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- TABLE: history
-- ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  player_id   UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name TEXT,
  team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name   TEXT,
  amount      INT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_sort   ON players(sort_order);
CREATE INDEX IF NOT EXISTS idx_bids_player    ON bids(player_id);
CREATE INDEX IF NOT EXISTS idx_bids_team      ON bids(team_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);

-- ──────────────────────────────────────────
-- FUNCTION: update updated_at automatically
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS auction_state_updated_at ON auction_state;
CREATE TRIGGER auction_state_updated_at
  BEFORE UPDATE ON auction_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────
-- FUNCTION: Recalculate team spent from actual sold records
-- Called after every SELL/UNSOLD to keep spent column accurate
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_team_spent(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE teams
  SET spent = COALESCE((
    SELECT SUM(sold_price)
    FROM players
    WHERE sold_to = p_team_id AND status = 'SOLD' AND sold_price IS NOT NULL
  ), 0)
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────
-- FUNCTION: Compute max bid for a team (server-side)
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_team_max_bid(p_team_id UUID)
RETURNS INT AS $$
DECLARE
  v_total_budget      INT;
  v_team_spent        INT;
  v_reserved          INT := 0;
  v_current_player_id UUID;
  v_current_cat       TEXT;
  v_cat_order         TEXT[] := ARRAY['H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'];
  v_idx               INT;
BEGIN
  SELECT total_budget INTO v_total_budget FROM settings WHERE id = 1;

  SELECT spent INTO v_team_spent
  FROM teams WHERE id = p_team_id;

  SELECT current_player_id INTO v_current_player_id
  FROM auction_state WHERE id = 1;

  IF v_current_player_id IS NOT NULL THEN
    SELECT category INTO v_current_cat FROM players WHERE id = v_current_player_id;
  END IF;

  v_idx := array_position(v_cat_order, UPPER(v_current_cat));

  IF v_idx IS NOT NULL AND v_idx < array_length(v_cat_order, 1) THEN
    SELECT COALESCE(SUM(base_price), 0) INTO v_reserved
    FROM players
    WHERE UPPER(category) = ANY(v_cat_order[v_idx + 1:]);
  END IF;

  RETURN GREATEST(0, v_total_budget - COALESCE(v_team_spent, 0) - v_reserved);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────
ALTER TABLE settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids          ENABLE ROW LEVEL SECURITY;
ALTER TABLE history       ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (auction is visible to everyone)
CREATE POLICY "public_read_settings"      ON settings      FOR SELECT USING (true);
CREATE POLICY "public_read_teams"         ON teams         FOR SELECT USING (true);
CREATE POLICY "public_read_players"       ON players       FOR SELECT USING (true);
CREATE POLICY "public_read_auction_state" ON auction_state FOR SELECT USING (true);
CREATE POLICY "public_read_bids"          ON bids          FOR SELECT USING (true);
CREATE POLICY "public_read_history"       ON history       FOR SELECT USING (true);

-- All writes go through API routes using service_role key (bypasses RLS)
-- No additional write policies needed for anon role

-- ──────────────────────────────────────────
-- REALTIME: Enable for live auction tables
-- ──────────────────────────────────────────
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_state;
ALTER PUBLICATION supabase_realtime ADD TABLE bids;
