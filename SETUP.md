# luna Brain — Setup Guide

## Quick Start (15-20 minutes)

### Step 1: Clone and Install

```bash
cd ~/Projects  # or wherever you keep your projects
cp -r /path/to/luna-brain .
cd luna-brain
npm install
```

### Step 2: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Name: `luna-brain`
4. Choose a strong database password (save it somewhere)
5. Region: Choose closest to you (London or EU West)
6. Click "Create new project" — wait 2 minutes

### Step 3: Set Up Database

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `scripts/schema.sql`
4. Paste into the SQL editor
5. Click "Run" — should show "Success" for all statements

### Step 4: Get Your Keys

In Supabase, go to **Settings → API**:
- Copy **Project URL** (starts with `https://`)
- Copy **anon public** key
- Copy **service_role** key (click "Reveal")

### Step 5: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real values:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key
DASHBOARD_PASSWORD=choose-something-strong
```

### Step 6: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the login page.
Enter the password you set in `.env.local`.

### Step 7: Upload First Data

1. Click "Upload Data" in the dashboard header
2. Drop your 5 data files (TikTok XLSX, Revenue CSV, Subscriptions CSV, Purchasely Conversions CSV, Purchasely Screen Views CSV)
3. They'll be auto-detected by filename pattern
4. Click "Process" — metrics are computed and saved to database
5. Click "View Dashboard" to see your numbers

### Step 8: Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name? luna-brain
# - Framework? Next.js (auto-detected)
```

After deployment:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add all variables from `.env.local`
4. Redeploy: `vercel --prod`

Your dashboard is now live at `https://luna-brain.vercel.app` (or your chosen domain).

---

## File Detection

The upload system auto-detects file types by filename:

| Pattern | Detected As |
|---------|-------------|
| Contains "Campaign" or "tiktok" | TikTok Ads XLSX |
| Contains "revenue" | Store Revenue CSV |
| Contains "subscription" or "churn" | Subscriptions CSV |
| Contains "Conversion" | Purchasely Conversions CSV |
| Contains "Screen" + "View" | Purchasely Screen Views CSV |

Name your exports consistently and they'll be auto-categorized.

---

## Daily Workflow

1. Export 5 files from your data sources
2. Go to luna Brain → Upload Data
3. Drop all 5 files
4. Click Process
5. View Dashboard

Total time: ~2 minutes.

---

## Troubleshooting

**Login doesn't work:**
Check that `DASHBOARD_PASSWORD` is set in `.env.local` and restart `npm run dev`.

**Upload fails:**
Check browser console (F12) for error details. Most common: Supabase keys not set correctly.

**Charts show no data:**
Make sure at least one day's data has been uploaded successfully.

**Vercel deployment fails:**
Ensure all environment variables are set in the Vercel dashboard. The service role key is especially important for API routes.
