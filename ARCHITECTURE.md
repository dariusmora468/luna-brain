# Luna Brain — Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16.1.6 (App Router, Turbopack) | SSR + API routes in one project, fast iteration |
| UI | React 18 + Tailwind CSS | Component model + utility styling, no design system overhead |
| Charts | Recharts | Lightweight, React-native charting with area chart support |
| Design components | @tremor/react | Pre-built dashboard components (used selectively) |
| Database | Supabase (Postgres) | Managed Postgres with REST API |
| Auth | Custom password hash (SHA-256 + httpOnly cookie) | Simple single-user auth, no OAuth complexity |
| File Parsing | SheetJS (xlsx), PapaParse (csv) | Server-side parsing of uploaded data files |
| Deployment | Vercel (auto-deploy from GitHub) | Zero-config Next.js hosting with serverless API routes |

---

## Database Schema

### `metrics` table
Daily aggregated metrics. One row per client per date. Primary key: `(client_id, date)`.

| Group | Columns |
|-------|---------|
| Identity | `client_id` (always "luna"), `date` (DATE) |
| TikTok Ads | `tiktok_installs`, `tiktok_spend_gbp`, `tiktok_impressions`, `tiktok_clicks`, `tiktok_cpm` |
| Store Revenue | `apple_revenue_gbp`, `google_revenue_gbp`, `total_revenue_gbp` |
| Subscriptions | `new_subscriptions`, `churn`, `net_subscriptions` |
| Trials | `total_trials`, `onboarding_trials`, `non_onboarding_trials`, `annual_discount_trials`, `annual_full_trials`, `monthly_trials` |
| Derived | `cost_per_install_gbp`, `cost_per_trial_gbp`, `cost_per_subscriber_gbp`, `install_to_trial_cr`, `roas_7d`, `potential_trial_value_gbp` |
| A/B Testing | `ab_variant_a_viewers`, `ab_variant_a_trials`, `ab_variant_b_viewers`, `ab_variant_b_trials`, `ab_test_significance` |
| Market | `us_trials`, `gb_trials`, `us_revenue_gbp`, `gb_revenue_gbp` |
| Revenue Segments | `parent_revenue_gbp`, `teen_revenue_gbp`, `rev_parent_annual_gbp`, `rev_parent_monthly_gbp`, `rev_teen_annual_gbp`, `rev_teen_monthly_gbp`, `rev_teen_weekly_gbp` |
| JSON | `placement_breakdown` (JSONB), `data_quality_checks` (JSONB) |
| Meta | `notes`, `computed_at`, `updated_at` |

Indexes:
- `idx_metrics_client_date` — unique on `(client_id, date)`
- `idx_metrics_client_date_desc` — `(client_id, date DESC)` for fast dashboard queries

### `activities` table
Manual and auto-detected business events (campaign launches, paywall changes, etc).

Columns: `client_id`, `date`, `category`, `title`, `description`, `auto_detected`, `source`, `metadata` (JSONB), `created_by`, `created_at`

Categories: `campaign`, `paywall`, `product`, `aso`, `growth`, `other`

Indexes: `idx_activities_client_date` on `(client_id, date DESC)`, `idx_activities_category` on `(client_id, category)`

### `daily_insights` table (Phase 2 — not yet used)
AI-generated daily narratives. Schema exists, no code writes to it yet.

### `data_pipeline_logs` table (Phase 2 — not yet used)
Debugging logs for data processing. Schema exists, no code writes to it yet.

---

## File Structure

```
luna-brain/
├── src/
│   ├── app/
│   │   ├── globals.css              # Warm light theme, CSS custom properties
│   │   ├── layout.tsx               # Root layout (Inter font, meta)
│   │   ├── page.tsx                 # Root redirect (auth check → /dashboard or /login)
│   │   ├── login/page.tsx           # Password login page
│   │   ├── (app)/                   # Authenticated route group
│   │   │   ├── layout.tsx           # Auth guard + Sidebar wrapper
│   │   │   ├── error.tsx            # Error boundary (catches render/data errors)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx         # Server component: fetches metrics + activities
│   │   │   │   ├── DashboardView.tsx # Client component: hero cards, charts, detail panel
│   │   │   │   └── components/
│   │   │   │       ├── HeroMetric.tsx          # Gradient stat cards with sparklines + yesterday delta
│   │   │   │       ├── TrendChart.tsx          # Area charts with activity dot markers
│   │   │   │       ├── SegmentedRevenueChart.tsx # Revenue chart with Total/Platform/Country/Audience/Plan tabs
│   │   │   │       ├── InsightsPanel.tsx       # Auto-generated metric insights
│   │   │   │       ├── ABTestCard.tsx          # A/B test significance card
│   │   │   │       ├── PlacementTable.tsx      # Non-onboarding placement breakdown
│   │   │   │       └── DayDetailPanel.tsx      # Single-day drill-down panel
│   │   │   ├── timeline/
│   │   │   │   ├── page.tsx         # Server component: fetches activities
│   │   │   │   └── TimelineView.tsx # Client component: timeline + auto-detect Refresh button
│   │   │   ├── data/
│   │   │   │   ├── page.tsx         # Server component
│   │   │   │   └── DataView.tsx     # Editable spreadsheet of all daily metrics rows
│   │   │   ├── ask/page.tsx         # Ask Luna Brain — AI chat (Claude Sonnet, streaming)
│   │   │   ├── brain/page.tsx       # Knowledge base (placeholder, v2)
│   │   │   └── upload/page.tsx      # Upload page — 3 sections:
│   │   │                            #   1. Daily data upload (5 files, auto-detect)
│   │   │                            #   2. Historical import (Google Sheets XLSX)
│   │   │                            #   3. Revenue segment import (Purchasely CSVs)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts   # POST: verify password, create session cookie
│   │   │   │   └── logout/route.ts  # POST: clear session cookie
│   │   │   ├── metrics/
│   │   │   │   ├── route.ts         # GET: last 90 days | PATCH: cell edit | PUT: upsert empty row
│   │   │   │   └── upload/route.ts  # POST: parse 5 files → computeMetrics() → delete+insert
│   │   │   ├── import/
│   │   │   │   ├── route.ts         # POST: bulk historical import from Google Sheets XLSX
│   │   │   │   └── revenue/route.ts # POST: revenue segments from Purchasely CSVs (stores/country/plans)
│   │   │   ├── activities/
│   │   │   │   ├── route.ts         # GET: list with filters | POST: create activity
│   │   │   │   └── detect/route.ts  # GET: auto-detect activities from metric changes
│   │   │   ├── ask/route.ts         # POST: streaming Claude AI chat (14-day metrics context)
│   │   │   ├── debug/route.ts       # GET: dump all metrics + activities (authenticated)
│   │   │   └── health/route.ts      # GET: health check (unauthenticated)
│   │   └── components/
│   │       └── Sidebar.tsx          # Fixed left sidebar with nav + logout
│   └── lib/
│       ├── auth.ts                  # SHA-256 hash, httpOnly cookie, 30-day sessions
│       ├── metrics.ts               # ALL parsing + computeMetrics() — most critical file
│       ├── supabase.ts              # Browser client (anon key) + server client (service role)
│       ├── types.ts                 # TypeScript interfaces for all data structures
│       └── utils.ts                 # Formatting helpers (currency, numbers, %, dates)
├── scripts/
│   ├── schema.sql                   # Full DB schema
│   └── activities-table.sql         # Activities table migration
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── ARCHITECTURE.md                  # This file
├── CHANGELOG.md
└── SETUP.md
```

---

## Dashboard Layout (current state)

```
Header (sticky)
  └─ "Growth Dashboard" title + last updated date

Hero Cards (3 columns)
  ├─ Cost Per Install   — 7-day avg, yesterday delta, sparkline (amber)
  ├─ Cost Per Trial     — 7-day avg, yesterday delta, sparkline (green)
  └─ Cost Per Subscriber — 7-day avg, yesterday delta, sparkline (purple)

Time Range Toggle
  └─ 7 Days / 30 Days / All Time

Cost Trend Charts (3 columns)
  ├─ Cost Per Install
  ├─ Cost Per Trial
  └─ Cost Per Subscriber

Volume Charts (3 columns)
  ├─ New Installs
  ├─ New Trials (+ Non-Onboarding overlay)
  └─ Subscribers (+ Churn overlay)

Segmented Revenue Chart (full width)
  └─ Tabs: Total | Platform (Apple/Google) | Country (UK/US) | Audience (Teen/Parent) | Plan

Day Detail Panel (shows on chart click)
  └─ Full breakdown for selected date + activities for that day

AI Insights Panel

A/B Test Card
```

---

## Data Flow

### Daily Upload (5 files)
```
User drops files at /upload
        │
        ▼
POST /api/metrics/upload
        │
        ├── parseTikTokXLSX()    → installs, spend, impressions, clicks, CPM
        ├── parseRevenueCSV()    → apple + google revenue by date
        ├── parseSubsCSV()       → new subs, churn by date
        ├── parseConversionsCSV() → trials by plan, placement, country
        └── parseScreenViewsCSV() → paywall viewers by placement, A/B variant
                │
                ▼
        detectLatestDate() → auto-detects target date from conversions or revenue CSV
                │
                ▼
        computeMetrics() — deterministic computation
                ├── Derived: CPI, CPT, CPS, install-to-trial CR
                ├── ROAS: looks up spend from 7 days ago
                ├── A/B test: z-test significance (Abramowitz & Stegun)
                ├── Placement breakdown: non-onboarding conversion rates
                └── Checksums: validate trial sums, revenue sums, market splits
                        │
                        ▼
                delete existing row for date → insert fresh row
                (guaranteed override, no upsert ambiguity)
                        │
                        ▼
                Dashboard reads via GET /api/metrics
```

### Revenue Segment Import (separate from daily upload)
```
User uploads Purchasely CSVs at /upload → "Import Revenue Segments"
        │
        ▼
POST /api/import/revenue
        │
        ├── revenues-by-stores.csv  → apple_revenue_gbp, google_revenue_gbp, total_revenue_gbp
        ├── revenues-by-country.csv → gb_revenue_gbp, us_revenue_gbp
        └── revenues-by-plans.csv   → parent/teen/annual/monthly/weekly revenue fields
                │
                ▼
        For each date: try UPDATE existing row → if no row found, INSERT new row
        (handles dates that may not have a full daily upload yet)
```

### Historical Import
```
User uploads Google Sheets XLSX at /upload → "Import Historical Data"
        │
        ▼
POST /api/import
        │
        ├── Parse pre-aggregated metrics columns
        ├── Extract activities from note columns
        └── delete + insert for each date (guaranteed override)
```

---

## Key Technical Decisions

1. **Route groups `(app)`**: Separates authenticated pages from login. Auth check and Sidebar only render inside `(app)`. Error boundary catches all errors within the authenticated section.

2. **Three data ingestion paths**:
   - Daily upload (5 files) → full `computeMetrics()` pipeline
   - Revenue segment import (3 Purchasely CSVs) → patches revenue columns only
   - Historical import (Google Sheets XLSX) → bulk backfill with pre-aggregated data

3. **`enrichMetrics()` client-side fallback**: Historical rows may have null CPI/CPT/CPS. The dashboard recomputes these on the fly using identical formulas to the server-side computation.

4. **Delete-then-insert for uploads**: All upload routes delete the existing row for a date before inserting the new one. This guarantees a clean override — upsert was unreliable in practice.

5. **Activity markers on charts**: `ReferenceDot` doesn't work with categorical X-axes in Recharts. Solution: custom `dot` prop on the `Area` component that renders a diamond shape when activities exist for that date.

6. **TikTok XLSX parsing**: Must skip rows where campaign name starts with "Total" — these are summary rows that would double all numbers.

7. **Purchasely date matching**: Purchasely dates come as `"2026-02-27 00:00:00"`. Must use `.substring(0, 10)` before comparing to `"YYYY-MM-DD"` target dates.

8. **Warm light theme**: Background `#F8F5F0`, white cards with soft CSS shadows (`--shadow-sm/md/lg`), amber/orange gradient accents. Inter font from Google Fonts.

9. **Custom password auth**: Single password in env var, hashed with SHA-256, stored in `httpOnly` secure cookie. 30-day sessions. No OAuth, no Supabase Auth.

10. **Turbopack for dev**: Next.js 16 defaults to Turbopack in development for faster HMR. Production builds use standard webpack.

---

## API Routes Reference

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/auth/login` | POST | None | Verify password, create session cookie |
| `/api/auth/logout` | POST | Session | Clear session cookie |
| `/api/metrics` | GET | Session | Fetch last 90 days of metrics |
| `/api/metrics` | PATCH | Session | Update specific fields for a date (cell edit) |
| `/api/metrics` | PUT | Session | Upsert empty row for a date |
| `/api/metrics/upload` | POST | None | Parse 5 files, compute metrics, save |
| `/api/import` | POST | None | Bulk historical import from Google Sheets XLSX |
| `/api/import/revenue` | POST | None | Revenue segment import from Purchasely CSVs |
| `/api/activities` | GET | None (RLS) | List activities with optional filters |
| `/api/activities` | POST | None | Create activity entry |
| `/api/activities/detect` | GET | None | Auto-detect activities from metric changes |
| `/api/ask` | POST | None | Streaming Claude AI chat |
| `/api/debug` | GET | Session | Dump all metrics + activities |
| `/api/health` | GET | None | Health check |

---

## Environment Variables

Required in `.env.local` and Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (client-side reads)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side only, bypasses RLS for writes
- `DASHBOARD_PASSWORD` — Login password (hashed with SHA-256 at auth time)
- `ANTHROPIC_API_KEY` — For the Ask Luna Brain AI chat

Optional:
- `SLACK_WEBHOOK_URL` — Slack notifications (not yet connected)
- `CRON_SECRET` — For scheduled tasks (not yet implemented)

---

## Row Level Security

RLS enabled on `metrics`, `activities`, `daily_insights`. Anon key: SELECT only. Service role key (used by all API routes): full access.

---

## Known Limitations

- No automated data ingestion — manual upload required daily
- `debugInfo` prop still passed through dashboard (renders as tiny gray text at bottom — removable)
- Knowledge (`/brain`) page is a placeholder — v2
- Plan ID to price mapping hardcoded in `metrics.ts` (`PLAN_PRICES` constant)
- A/B test fields exist in schema but only populated when screen view + conversion CSVs contain variant data
- No automated tests
