-- Supabase PostgreSQL Schema for Multiplayer Sudoku App

-- 1. Create tables
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  start_time TIMESTAMP WITH TIME ZONE
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  color TEXT NOT NULL,
  is_host BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finish_time TIMESTAMP WITH TIME ZONE,
  time_taken INTEGER, -- milliseconds
  mistakes_count INTEGER DEFAULT 0,
  UNIQUE(room_id, username)
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  initial_grid JSONB NOT NULL,
  solution_grid JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE grid_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  row_idx INTEGER NOT NULL,
  col_idx INTEGER NOT NULL,
  value INTEGER NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, row_idx, col_idx)
);

-- 2. Turn on Realtime for necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE grid_state;

-- 3. Setup Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE grid_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read rooms" ON rooms FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert rooms" ON rooms FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update rooms" ON rooms FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous read players" ON players FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert players" ON players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update players" ON players FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow anonymous read games" ON games FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert games" ON games FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous read grid_state" ON grid_state FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anonymous insert grid_state" ON grid_state FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anonymous update grid_state" ON grid_state FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anonymous delete grid_state" ON grid_state FOR DELETE TO anon USING (true);

-- 4. RPC Functions

CREATE OR REPLACE FUNCTION increment_mistakes(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE players SET mistakes_count = mistakes_count + 1 WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
