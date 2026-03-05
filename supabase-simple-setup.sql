-- ============================================
-- SIMPLE SETUP - Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CHAT SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT,
  user_phone TEXT,
  user_email TEXT,
  lead_temperature TEXT DEFAULT 'cold',
  intent TEXT DEFAULT 'browsing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);

-- ============================================
-- 2. MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  message_timestamp TIMESTAMPTZ DEFAULT NOW(),
  attachment_type TEXT,
  attachment_data TEXT,
  attachment_url TEXT,
  ai_images TEXT[],
  booking_car_id TEXT,
  booking_car_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(message_timestamp DESC);

-- ============================================
-- 3. TRACKING LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  log_id TEXT UNIQUE NOT NULL,
  session_id TEXT,
  intent TEXT NOT NULL,
  lead_temperature TEXT NOT NULL,
  recommended_car_id TEXT,
  message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_logs_session_id ON tracking_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_created_at ON tracking_logs(created_at DESC);

-- ============================================
-- 4. BOOKINGS
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  session_id TEXT,
  car_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending',
  booking_date TIMESTAMPTZ,
  booking_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- ============================================
-- 5. CARS
-- ============================================
CREATE TABLE IF NOT EXISTS cars (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  car_id TEXT UNIQUE NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  color TEXT,
  fuel TEXT,
  transmission TEXT,
  mileage TEXT,
  image_url TEXT,
  real_image TEXT,
  image_urls TEXT[],
  insured BOOLEAN DEFAULT true,
  registered BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'available',
  description TEXT,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cars_brand ON cars(brand);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);

-- ============================================
-- 6. PROFILES (for auth users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DONE! Tables created successfully.
-- ============================================
-- The app will now save chat logs to Supabase.
-- To create an admin user:
-- 1. Go to Authentication > Users
-- 2. Create a new user
-- 3. Copy their UUID
-- 4. Run: INSERT INTO profiles (id, email, role) VALUES ('USER-UUID-HERE', 'admin@example.com', 'admin');
