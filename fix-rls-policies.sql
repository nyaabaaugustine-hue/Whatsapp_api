-- ============================================
-- FIX RLS POLICIES FOR DASHBOARD ACCESS
-- Run this in Supabase SQL Editor to allow dashboard to view data
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view all sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all logs" ON tracking_logs;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Create new open policies for SELECT (read-only)
CREATE POLICY "Anyone can view sessions" ON chat_sessions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view logs" ON tracking_logs
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view bookings" ON bookings
  FOR SELECT USING (true);

-- Create events table if it doesn't exist (for API logging)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  lead_temperature TEXT,
  intent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  server_timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public access to events
CREATE POLICY "Anyone can create events" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Verify policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('chat_sessions', 'messages', 'tracking_logs', 'bookings', 'events')
ORDER BY tablename, policyname;
