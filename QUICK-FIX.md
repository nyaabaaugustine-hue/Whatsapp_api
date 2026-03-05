# Quick Fix - Dashboard Not Showing Data

## 🚀 3-Step Fix (5 minutes)

### 1️⃣ Run SQL in Supabase
```
1. Go to: https://supabase.com/dashboard
2. Click: SQL Editor → New Query
3. Copy/paste: fix-rls-policies.sql
4. Click: Run
```

### 2️⃣ Verify Vercel Environment Variables
```
Go to: https://vercel.com → Settings → Environment Variables

Check these exist (add if missing):
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY
```

### 3️⃣ Redeploy
```
Vercel Dashboard → Deployments → ... → Redeploy
```

---

## ✅ Test It Works

### Production Test
1. Go to: https://salescoms.vercel.app
2. Start a chat (provide name/phone)
3. Click "Admin" button
4. Data should appear in dashboard

### Local Test
```bash
cd Whatsapp_api
npm run dev
# Open http://localhost:5173
# Chat → Admin → Check dashboard
```

---

## 🔍 Still Not Working?

### Check Supabase Tables Exist
Run in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

**If empty**, run `supabase-schema.sql` first.

### Check Browser Console
Press F12 → Console tab
Look for:
- ✅ "Supabase enabled" = Good
- ❌ "Using in-memory storage" = Env vars missing
- ❌ Red errors = Check error message

### Check Data is Being Created
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) FROM chat_sessions;
SELECT COUNT(*) FROM messages;
SELECT COUNT(*) FROM tracking_logs;
```

**If 0**, data isn't being saved. Check env vars.

---

## 📋 Environment Variables Reference

Copy these to Vercel (one per line):

```
RESEND_API_KEY=re_HUQXf59P_7NLPFPuEgdwCtntkjXZfJzG9
ADMIN_EMAIL=josemorgan120@gmail.com
SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
VITE_SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
VITE_APIFREELLM_API_KEY=apf_ivcabm4cxcdvaxh8ju1gxxji
VITE_RESEND_API_KEY=re_HUQXf59P_7NLPFPuEgdwCtntkjXZfJzG9
VITE_ADMIN_EMAIL=josemorgan120@gmail.com
VITE_ADMIN_SECRET=drivemond2026
```

**IMPORTANT**: Each variable on separate line, no spaces around `=`
