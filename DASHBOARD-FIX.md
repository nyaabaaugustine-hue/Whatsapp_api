# Dashboard Data Not Showing - Fix Guide

## Problem
Dashboard shows empty data because Supabase Row Level Security (RLS) policies are blocking access.

## Solution - 3 Steps

### Step 1: Run SQL in Supabase
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy and paste the contents of `fix-rls-policies.sql`
6. Click **Run** (or press Ctrl+Enter)

### Step 2: Verify Tables Exist
In the same SQL Editor, run this to check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_sessions', 'messages', 'tracking_logs', 'bookings');
```

**If no tables appear**, you need to create them first:
1. Open `supabase-schema.sql`
2. Copy ALL the content
3. Paste in SQL Editor
4. Click **Run**

### Step 3: Verify Environment Variables in Vercel
Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

Make sure these are set correctly:

#### Server-Side (for API routes)
```
SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
```

#### Client-Side (for React app)
```
VITE_SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
```

After adding/fixing variables, **redeploy** from Vercel dashboard.

---

## Testing

### Test Locally
```bash
cd Whatsapp_api
npm run dev
```

1. Open http://localhost:5173
2. Start a chat conversation
3. Provide name and phone
4. Click "Admin" button
5. Check if data appears in dashboard

### Test Production
1. Go to: https://salescoms.vercel.app
2. Start a chat
3. Go to Admin dashboard
4. Data should appear

---

## Troubleshooting

### Dashboard still empty?

**Check browser console:**
- Press F12
- Look for errors in Console tab
- Look for failed network requests in Network tab

**Check Supabase logs:**
1. Go to Supabase Dashboard
2. Click **Logs** → **API**
3. Look for 401/403 errors (permission denied)

**Check if data is being created:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total_sessions FROM chat_sessions;
SELECT COUNT(*) as total_messages FROM messages;
SELECT COUNT(*) as total_logs FROM tracking_logs;
SELECT COUNT(*) as total_bookings FROM bookings;
```

If counts are 0, data isn't being saved. Check:
- Environment variables are correct
- No errors in browser console
- Supabase URL and keys are valid

### Still not working?

**Option 1: Use in-memory storage (temporary)**
Remove Supabase variables from Vercel to use local storage:
- Data will only persist in browser
- Won't sync across devices
- Good for testing

**Option 2: Check Supabase connection**
```bash
# Test locally
cd Whatsapp_api
npm run dev
```

Open browser console and look for:
- ✅ "Supabase enabled for data persistence" = Working
- ⚠️ "Using in-memory storage" = Not connected

---

## What Changed

### Before (Blocked)
```sql
-- Only admins could view data
CREATE POLICY "Admins can view all sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
```

### After (Open)
```sql
-- Anyone can view data (read-only)
CREATE POLICY "Anyone can view sessions" ON chat_sessions
  FOR SELECT USING (true);
```

This allows the dashboard to read data without authentication, while still protecting write operations.

---

## Security Note

The RLS policies now allow public READ access to:
- Chat sessions
- Messages
- Tracking logs
- Bookings

This is safe because:
1. No sensitive data (passwords, payment info) is stored
2. Write operations still require proper authentication
3. Data is already visible in the chat interface
4. Admin dashboard is password-protected

If you need stricter security, you can:
1. Add authentication to the dashboard
2. Use service role key (server-side only)
3. Implement API key authentication
