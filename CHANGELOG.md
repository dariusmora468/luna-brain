# luna Brain - Changelog

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
