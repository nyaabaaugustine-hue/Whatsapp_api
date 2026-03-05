-- ============================================
-- Drivemond WhatsApp AI Sales System
-- Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (User Management)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'company', 'user')),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 2. CHAT SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  user_name TEXT,
  user_phone TEXT,
  user_email TEXT,
  lead_temperature TEXT DEFAULT 'cold' CHECK (lead_temperature IN ('cold', 'warm', 'hot')),
  intent TEXT DEFAULT 'browsing',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead_temp ON chat_sessions(lead_temperature);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for chat widget)
CREATE POLICY "Anyone can create chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (true);

-- Allow public update (for chat widget)
CREATE POLICY "Anyone can update chat sessions" ON chat_sessions
  FOR UPDATE USING (true);

-- Admins can view all
CREATE POLICY "Admins can view all sessions" ON chat_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    ) OR auth.uid() IS NULL
  );

-- ============================================
-- 3. MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id TEXT NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
  text TEXT NOT NULL,
  message_timestamp TIMESTAMPTZ DEFAULT NOW(),
  attachment_type TEXT,
  attachment_data TEXT,
  attachment_url TEXT,
  ai_images TEXT[],
  booking_car_id TEXT,
  booking_car_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Anyone can create messages" ON messages
  FOR INSERT WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    ) OR auth.uid() IS NULL
  );

-- ============================================
-- 4. TRACKING LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  log_id TEXT UNIQUE NOT NULL,
  session_id TEXT,
  intent TEXT NOT NULL,
  lead_temperature TEXT NOT NULL,
  recommended_car_id TEXT,
  message_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tracking_logs_session_id ON tracking_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_created_at ON tracking_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_intent ON tracking_logs(intent);
CREATE INDEX IF NOT EXISTS idx_tracking_logs_lead_temp ON tracking_logs(lead_temperature);

-- Enable RLS
ALTER TABLE tracking_logs ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Anyone can create tracking logs" ON tracking_logs
  FOR INSERT WITH CHECK (true);

-- Admins can view all
CREATE POLICY "Admins can view all logs" ON tracking_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    ) OR auth.uid() IS NULL
  );

-- ============================================
-- 5. BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL,
  session_id TEXT,
  car_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  booking_date TIMESTAMPTZ,
  booking_time TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_session_id ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Anyone can create bookings" ON bookings
  FOR INSERT WITH CHECK (true);

-- Admins can view and manage all
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    ) OR auth.uid() IS NULL
  );

CREATE POLICY "Admins can update bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    )
  );

-- ============================================
-- 6. CARS TABLE (Inventory)
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
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'maintenance')),
  description TEXT,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cars_brand ON cars(brand);
CREATE INDEX IF NOT EXISTS idx_cars_model ON cars(model);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year DESC);

-- Enable RLS
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Public can view available cars
CREATE POLICY "Anyone can view available cars" ON cars
  FOR SELECT USING (status = 'available' OR auth.uid() IS NOT NULL);

-- Admins can manage cars
CREATE POLICY "Admins can insert cars" ON cars
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    )
  );

CREATE POLICY "Admins can update cars" ON cars
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'company')
    )
  );

CREATE POLICY "Admins can delete cars" ON cars
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 7. FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. INITIAL DATA
-- ============================================

-- Create admin user profile (you'll need to create the auth user first)
-- After creating a user in Supabase Auth, run this with their UUID:
-- INSERT INTO profiles (id, email, role, full_name)
-- VALUES ('YOUR-USER-UUID-HERE', 'admin@yourdomain.com', 'admin', 'Admin User')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- ============================================
-- 9. VIEWS FOR ANALYTICS
-- ============================================

-- View for session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN lead_temperature = 'hot' THEN 1 END) as hot_leads,
  COUNT(CASE WHEN lead_temperature = 'warm' THEN 1 END) as warm_leads,
  COUNT(CASE WHEN lead_temperature = 'cold' THEN 1 END) as cold_leads
FROM chat_sessions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View for booking analytics
CREATE OR REPLACE VIEW booking_analytics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
FROM bookings
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- To complete setup:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Enable Email Auth in Supabase Dashboard > Authentication > Providers
-- 3. Create your first admin user via Supabase Dashboard > Authentication > Users
-- 4. Get the user's UUID and run:
--    UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
-- 5. Update your .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
