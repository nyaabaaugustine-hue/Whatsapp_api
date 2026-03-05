-- ============================================
-- Migration Script: Fix existing tables
-- Run this if tables already exist
-- ============================================

-- Drop existing tables if they exist (CAUTION: This deletes all data!)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS tracking_logs CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS cars CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS session_analytics CASCADE;
DROP VIEW IF EXISTS booking_analytics CASCADE;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_cars_updated_at ON cars;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Now run the full schema from supabase-schema.sql
