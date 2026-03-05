# Vercel Environment Variables Setup

## Required Environment Variables

To enable email notifications and full functionality, add these environment variables in your Vercel dashboard:

### 1. Go to Vercel Dashboard
- Navigate to: https://vercel.com/dashboard
- Select your project: `Whatsapp_api`
- Go to: **Settings** → **Environment Variables**

### 2. Add These Variables

#### Email Service (Resend)
```
RESEND_API_KEY=re_HUQXf59P_7NLPFPuEgdwCtntkjXZfJzG9
ADMIN_EMAIL=josemorgan120@gmail.com
```

#### Supabase (Database)
```
SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
```

#### Client-Side Variables (VITE_ prefix)
```
VITE_SUPABASE_URL=https://nppxyocuvremhdyobrye.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcHh5b2N1dnJlbWhkeW9icnllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTUxNDQsImV4cCI6MjA4NzkzMTE0NH0.QraauD3S054CMZTStoik1iuEk5BU8ny5wyAu8XMFr4k
VITE_APIFREELLM_API_KEY=apf_ivcabm4cxcdvaxh8ju1gxxji
VITE_RESEND_API_KEY=re_HUQXf59P_7NLPFPuEgdwCtntkjXZfJzG9
VITE_ADMIN_EMAIL=josemorgan120@gmail.com
VITE_ADMIN_SECRET=drivemond2026
```

### 3. Environment Scope
For each variable, select:
- ✅ **Production**
- ✅ **Preview**
- ✅ **Development**

### 4. Redeploy
After adding variables:
1. Go to **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Select **Redeploy**

---

## Why Two Sets of Variables?

### Server-Side (API Routes)
- `RESEND_API_KEY` - Used by `/api/email.js`
- `SUPABASE_URL` - Used by `/api/log.js`
- `ADMIN_EMAIL` - Default recipient for notifications

### Client-Side (Browser)
- `VITE_*` prefix - Exposed to browser via Vite
- Used by React components
- Safe to expose (public keys only)

---

## Testing Email Functionality

After deployment:
1. Open your app: https://salescoms.vercel.app
2. Start a chat and provide name/phone
3. Check browser console for any email errors
4. Check your email: josemorgan120@gmail.com

---

## Troubleshooting

### Email Not Sending?
1. Check Vercel logs: **Deployments** → **Functions** → `/api/email`
2. Verify RESEND_API_KEY is valid
3. Check Resend dashboard: https://resend.com/emails

### Supabase Not Working?
1. Verify SUPABASE_URL and SUPABASE_ANON_KEY
2. Check Supabase dashboard: https://supabase.com/dashboard
3. Ensure database tables exist (run schema SQL)

---

## Security Notes

⚠️ **Never commit `.env` or `.env.local` files to Git!**

These files are already in `.gitignore` but double-check:
```bash
git status
# Should NOT show .env or .env.local
```

✅ **Safe to expose:**
- VITE_* variables (client-side)
- SUPABASE_ANON_KEY (public key)

❌ **Keep secret:**
- RESEND_API_KEY (server-side only)
- SUPABASE_SERVICE_ROLE_KEY (if you have one)
