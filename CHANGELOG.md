# luna Brain - Changelog

## 2026-03-02 - Robustness Audit + Fixes

**What was done:**
Full codebase audit against DB schema, docs, and past chat history. Found and fixed 7 issues:

1. **ARCHITECTURE.md rewritten** - Old version referenced wrong Next.js version (14 vs 16.1.6), wrong auth system (Supabase Auth vs custom password hash), non-existent API routes (/api/cron, /api/slack, /api/auth), and wrong DB column names. Now matches reality exactly.
2. **Debug endpoint secured** - `/api/debug` was unauthenticated. Now requires valid session cookie.
3. **Error boundary added** - New `src/app/(app)/error.tsx` catches render/data errors. Friendly retry screen instead of crashing.
4. **Zod removed** - Listed as dependency but never imported. Removed from package.json.
5. **enrichMetrics() documented** - Added comment explaining client-side fallback purpose and confirming formula parity with server-side.
6. **.env.example created** - SETUP.md referenced it but it didn't exist.
7. **RLS policies fixed** - Anon key restricted to SELECT only. Service role gets full access.

---

## 2026-03-02 - GitHub + Vercel Auto-Deploy

**What was done:**
- Created GitHub repo: github.com/dariusmora468/luna-brain
- Pushed full codebase (76 objects)
- Connected repo to Vercel for auto-deploy on push to main

**New workflow:** `git add . && git commit -m "message" && git push` auto-deploys to luna-brain.vercel.app

---

## 2026-03-01 - Visual Redesign Complete + Cleanup

**What was done:**
- Applied warm light theme (Crextio-style) across ALL pages: Dashboard, Timeline, Brain, Upload, Login, Sidebar
- Removed 4 orphaned dark-theme components (TrialsChart, CostChart, MetricCard, RevenueChart)
- Zero dark zinc references remaining in codebase
- Created ARCHITECTURE.md and CHANGELOG.md
- Initialized git repo, deployed to Vercel

**Design system:**
- Background: `#F8F5F0` (warm cream)
- Cards: white with soft shadows (`--shadow-sm/md/lg`)
- Accents: amber/orange gradients for CTAs, emerald for success, purple for insights
- Font: Inter (Google Fonts)
- Charts: smooth area charts with gradient fills

**Current state:** All pages themed consistently. Ready for production use.

---

## 2026-02 (Sessions 1-4) - Full Dashboard Build

**What was built:**
- Next.js 14 project from scratch with Supabase backend
- Metrics computation engine (CPI, CPT, CPS, ROAS, conversion rates)
- Dashboard with 3 hero metric cards + 8 trend charts (7-day and 30-day views)
- Auto-generated insights panel (detects CPI trends, ROAS thresholds, record days, etc.)
- A/B test card and placement table components
- Day detail panel for drilling into single dates
- Daily upload page (TikTok XLSX, Revenue CSV, Purchasely CSVs)
- Historical import from Google Sheet export (32 days backfilled)
- Activity timeline with manual entry, category filters, search
- Knowledge Base / AI Brain page (v2 preview with Documents, Chat, Insights tabs)
- Sidebar navigation
- Login page with Supabase Auth
- API routes: metrics, activities, import, debug, health, auth, cron, slack

**Key fixes:**
- Revenue CSV date parsing bug (date filtering was off by timezone)
- CPT/CPS null values: added `enrichMetrics()` client-side fallback computation
- Old route conflicts: removed `/src/app/dashboard/` and `/src/app/upload/` that conflicted with `(app)` route group

**What didn't work:**
- VM proxy blocks outbound HTTP, so Python scripts can't reach Supabase. Workaround: all imports go through Next.js API routes
- `next build` can't run in VM (no npm access). Builds run on operator's machine

**Known issues:**
- Brain page AI Chat and Strategic Insights are placeholder (v2)
- Slack integration route exists but not connected
- Cron route exists but no scheduled jobs configured
- No automated tests

---

## Next Steps
- Deploy to Vercel (production)
- Connect TikTok API for automated data ingestion
- Connect Purchasely API
- Connect App Store Connect API
- Build AI Brain chat (Claude API integration)
- Add automated daily data pipeline (cron)
