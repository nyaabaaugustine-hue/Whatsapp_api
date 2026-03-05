# 🚀 Automated Setup Scripts - WhatsApp AI

This folder contains PowerShell scripts to automatically migrate your WhatsApp AI app from Gemini to APIFREELLM and add Supabase database support.

## ⚡ Quick Start

Run this in PowerShell from your project root:

```powershell
.\RUN-ALL-SETUP.ps1
```

This will automatically:
- ✅ Backup your files
- ✅ Install dependencies  
- ✅ Switch from Gemini to APIFREELLM
- ✅ Add Supabase support
- ✅ Update all configuration files

## After Running

1. **Set up Supabase database** - See instructions below
2. **Update .env with real credentials**
3. **Run** `npm run dev` to test

## Supabase Setup (Required)

1. Go to https://app.supabase.com
2. Create new project (takes ~2 min)
3. Go to SQL Editor
4. Copy SQL from the artifact "Supabase Database Schema"
5. Run the SQL
6. Go to Settings → API
7. Copy your URL and anon key
8. Update .env file with real values

## Files Created by Scripts

- `src/services/supabase.ts` - NEW file
- `src/services/gemini.ts` - Updated (now uses APIFREELLM)
- `src/services/logService.ts` - Updated (Supabase support)
- `src/components/AdminPanel.tsx` - Updated (async)
- `src/vite-env.d.ts` - Updated
- `.env` - Updated with new variables

## Troubleshooting

**"Execution policy error"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"Supabase not configured" in console**  
You haven't updated .env with real Supabase credentials yet.

**Need help?**
Check the backup folder created during setup.
All original files are saved there.
