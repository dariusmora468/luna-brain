# Luna Brain — Changelog

All changes are listed newest-first. Each entry covers what changed, why, and which files were affected.

---

## 2026-03-04 — Architecture docs rewrite + Changelog overhaul

**What changed:**
- Rewrote `ARCHITECTURE.md` from scratch to match actual codebase (previous version had wrong API routes, missing components, outdated data flow)
- Rewrote `CHANGELOG.md` (this file) to document every change since project start

**Files:** `ARCHITECTURE.md`, `CHANGELOG.md`

---

## 2026-03-02 — Revenue import fix: upsert for missing rows

**Problem:** Revenue segment import (`/api/import/revenue`) was doing UPDATE-only. If a date didn't already have a metrics row, the update silently affected 0 rows and revenue data was lost.

**Fix:** Changed to try-UPDATE-then-INSERT pattern: attempt update first, check if any rows were affected, and if not, insert a new row. This handles dates that have revenue data but no daily TikTok/trials upload yet.

**Files:** `src/app/api/import/revenue/route.ts`

---

## 2026-03-02 — Build fix: revenue segment fields in computeMetrics return

**Problem:** `computeMetrics()` wasn't returning the revenue segmentation fields (`parent_revenue_gbp`, `teen_revenue_gbp`, `rev_parent_annual_gbp`, etc.), causing a TypeScript build error.

**Fix:** Added all revenue segment fields to the `computeMetrics()` return object.

**Files:** `src/lib/metrics.ts`

---

## 2026-03-02 — Segmented Revenue Chart + dashboard cleanup

**What changed:**
- Added `SegmentedRevenueChart` component replacing the plain revenue chart. Has 5 segment tabs: Total, Platform (Apple/Google), Country (UK/US), Audience (Teen/Parent), Plan (5 sub-categories)
- Removed from dashboard: ROAS block, market split block, placements table block, data quality checks block — too much noise, not actionable enough at a glance
- Added "Import Revenue Segments" section to the Upload page — accepts 3 Purchasely CSVs (revenues-by-stores, revenues-by-country, revenues-by-plans)
- Added `POST /api/import/revenue` route to process those CSVs

**Files:**
- `src/app/(app)/dashboard/components/SegmentedRevenueChart.tsx` (new)
- `src/app/(app)/dashboard/DashboardView.tsx`
- `src/app/(app)/upload/page.tsx`
- `src/app/api/import/revenue/route.ts` (new)

---

## 2026-03-02 — Timeline: replace Log Activity with auto-detect Refresh button

**What changed:**
- Removed the manual "Log Activity" button from the timeline header
- Added an auto-detect "Refresh" button that calls `/api/activities/detect` to automatically detect activities from metric changes (e.g. spend spikes, trial record days)
- Timeline still supports adding activities manually via the form below

**Files:** `src/app/(app)/timeline/TimelineView.tsx`

---

## 2026-03-02 — Data page: Add Data button (moved from Data tab)

**What changed:**
- Moved the "Refresh Data" / "Add Data" button from inside the Data tab to the top of the Data page

**Files:** `src/app/(app)/data/DataView.tsx`

---

## 2026-03-02 — Parser fixes (TikTok doubling + Purchasely dates)

**Bug 1: TikTok XLSX doubled all numbers**
- Cause: TikTok XLSX export includes a "Total of X results" summary row at the bottom. The parser was summing all rows including the summary, resulting in 2× the actual values.
- Fix: Skip any row where the campaign name starts with "Total".

**Bug 2: Purchasely data always showed 0 trials**
- Cause: Purchasely CSV dates are formatted as `"2026-02-27 00:00:00"` (datetime strings). The parser was comparing them directly to `"2026-02-27"` (date only) — zero rows ever matched.
- Fix: Use `.substring(0, 10)` on Purchasely dates before comparing.

**Files:** `src/lib/metrics.ts`

---

## 2026-03-02 — Activity markers fix on charts

**Problem:** Activity markers (diamond dots) were not appearing on trend charts even when activities existed for a date.

**Root cause:** Recharts `ReferenceDot` component does not work with categorical X-axes (string-based dates). It positions by value, not by category index.

**Fix:** Replaced `ReferenceDot` with a custom `dot` prop on the `Area` component. The custom function renders a diamond SVG shape at the correct position when an activity exists for that date.

**Files:** `src/app/(app)/dashboard/components/TrendChart.tsx`

---

## 2026-03-02 — Ask Luna Brain AI chat

**What was added:**
- `/ask` page — full AI chat interface
- `POST /api/ask` route — streams Claude Sonnet responses with the last 14 days of metrics as context
- Sidebar updated: "Ask Luna Brain" nav item now points to `/ask`

**Files:**
- `src/app/(app)/ask/page.tsx`
- `src/app/api/ask/route.ts`
- `src/app/components/Sidebar.tsx`

---

## 2026-03-02 — Robustness audit + fixes

**7 issues found and fixed:**

1. **ARCHITECTURE.md** — Old version referenced wrong Next.js version (14 vs 16.1.6), wrong auth system (Supabase Auth vs custom password hash), non-existent API routes, wrong DB column names. Rewritten to match reality.
2. **Debug endpoint secured** — `/api/debug` was unauthenticated. Now requires valid session cookie.
3. **Error boundary added** — `src/app/(app)/error.tsx` catches render/data errors. Shows friendly retry screen instead of crashing.
4. **Zod removed** — Listed as dependency but never imported anywhere. Removed from `package.json`.
5. **`enrichMetrics()` documented** — Added comment explaining the client-side fallback: historical import rows may have null CPI/CPT/CPS; dashboard recomputes these. Formula is identical to server-side.
6. **`.env.example` created** — `SETUP.md` referenced it but it didn't exist.
7. **RLS policies fixed** — Anon key restricted to SELECT only. Service role gets full access.

**Files:** `ARCHITECTURE.md`, `src/app/api/debug/route.ts`, `src/app/(app)/error.tsx`, `package.json`, `src/app/(app)/dashboard/DashboardView.tsx`, `.env.example`, Supabase RLS policies

---

## 2026-03-02 — GitHub + Vercel auto-deploy setup

**What was done:**
- Created GitHub repo: `github.com/dariusmora468/luna-brain`
- Pushed full codebase (76 objects)
- Connected repo to Vercel (`luna-brain` project, team `dariusmora468's projects`)
- Configured Vercel environment variables

**Deploy workflow from this point:** `git add <files> && git commit -m "message" && git push` → Vercel auto-deploys to `luna-brain.vercel.app`

---

## 2026-03-01 — Visual redesign + theme unification

**What changed:**
- Applied warm light theme across all pages: Dashboard, Timeline, Brain, Upload, Login, Sidebar
- Removed 4 orphaned dark-theme components: `TrialsChart`, `CostChart`, `MetricCard`, `RevenueChart`
- Zero dark zinc/gray-900 background references remaining

**Design system:**
- Background: `#F8F5F0` (warm cream)
- Cards: white with soft CSS shadows (`--shadow-sm/md/lg`)
- Accents: amber/orange gradients for CTAs, emerald for success, purple for insights
- Font: Inter (Google Fonts)
- Charts: smooth area charts with SVG gradient fills

---

## 2026-02 (Sessions 1–4) — Full dashboard build

**What was built from scratch:**
- Next.js project with Supabase Postgres backend
- `computeMetrics()` engine: CPI, CPT, CPS, ROAS, install-to-trial CR, A/B test z-test significance, placement breakdown, data quality checksums
- Dashboard: 3 hero metric cards, 6 trend charts, time range toggle (7d/30d/all), day detail panel on click
- Auto-generated insights panel (detects CPI trends, ROAS thresholds, record days)
- A/B test card and placement table components
- Daily upload page: drag-drop 5 files, auto-detect by filename
- Historical import: Google Sheets XLSX → 32 days backfilled
- Activity timeline: manual entry, category filters, grouped by date
- Data tab: editable spreadsheet with inline cell editing and auto-recompute
- Knowledge/Brain placeholder page
- Sidebar navigation (collapsible on mobile)
- Login page with custom password auth
- API routes: metrics, activities, import, debug, health, auth

**Key bugs fixed during build:**
- Revenue CSV date parsing bug (off by timezone)
- CPT/CPS null values → added `enrichMetrics()` client-side fallback
- Old route conflicts: removed orphaned `src/app/dashboard/` and `src/app/upload/` folders that conflicted with `(app)` route group

---

## Open items / Next Steps

- [ ] Connect TikTok API for automated data ingestion (no manual upload)
- [ ] Connect Purchasely API for automated revenue/subscription sync
- [ ] Connect App Store Connect API
- [ ] Build out Knowledge page (document library, manual notes)
- [ ] Build automated daily data pipeline (cron job)
- [ ] Add Slack integration for daily summary push
- [ ] Remove `debugInfo` prop from DashboardView (currently renders as tiny gray text at bottom)
