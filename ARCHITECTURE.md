# luna Brain — Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16.1.6 (App Router, Turbopack) | SSR + API routes in one project, fast iteration |
| UI | React 18 + Tailwind CSS | Component model + utility styling, no design system overhead |
| Charts | Recharts | Lightweight, React-native charting with area chart support |
| Design components | @tremor/react | Pre-built dashboard components (used selectively) |
| Database | Supabase (Postgres) | Managed Postgres with REST API and real-time |
| Auth | Custom password hash (SHA-256 + httpOnly cookie) | Simple single-user auth, no OAuth complexity |
| File Parsing | SheetJS (xlsx), PapaParse (csv) | Client and server-side parsing of uploaded data files |
| Deployment | Vercel (auto-deploy from GitHub) | Zero-config Next.js hosting with serverless API routes |

## Database Schema

### `metrics` table
Daily aggregated metrics. One row per client per date.

Key columns:
- Identity: `client_id` (always "luna"), `date`
- TikTok: `tiktok_installs`, `tiktok_spend_gbp`, `tiktok_impressions`, `tiktok_clicks`, `tiktok_cpm`
- Revenue: `apple_revenue_gbp`, `google_revenue_gbp`, `total_revenue_gbp`
- Subscriptions: `new_subscriptions`, `churn`, `net_subscriptions`
- Trials: `total_trials`, `onboarding_trials`, `non_onboarding_trials`, `annual_discount_trials`, `annual_full_trials`, `monthly_trials`
- Derived: `cost_per_install_gbp`, `cost_per_trial_gbp`, `cost_per_subscriber_gbp`, `install_to_trial_cr`, `roas_7d`, `potential_trial_value_gbp`
- A/B Testing: `ab_variant_a_viewers`, `ab_variant_a_trials`, `ab_variant_b_viewers`, `ab_variant_b_trials`, `ab_test_significance`
- Market: `us_trials`, `gb_trials`, `us_revenue_gbp`, `gb_revenue_gbp`
- JSON: `placement_breakdown` (JSONB), `data_quality_checks` (JSONB)
- Meta: `notes`, `computed_at`, `updated_at`

Unique index: `idx_metrics_client_date` on `(client_id, date)`.
Descending index: `idx_metrics_client_date_desc` on `(client_id, date DESC)`.

### `activities` table
Manual and auto-detected business events (campaign launches, paywall changes, etc).

Key columns: `client_id`, `date`, `category`, `title`, `description`, `auto_detected`, `source`, `metadata` (JSONB), `created_by`, `created_at`.

Categories: `campaign`, `paywall`, `product`, `aso`, `growth`, `other`.

Indexes: `idx_activities_client_date` on `(client_id, date DESC)`, `idx_activities_category` on `(client_id, category)`.

### `daily_insights` table (Phase 2, not yet used)
AI-generated daily narratives. Schema exists, no code references it yet.

### `data_pipeline_logs` table (Phase 2, not yet used)
Debugging logs for data processing. Schema exists, no code references it yet.

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
│   │   │   │   ├── page.tsx         # Server component: fetches metrics from Supabase
│   │   │   │   ├── DashboardView.tsx # Client component: all charts + hero cards
│   │   │   │   └── components/
│   │   │   │       ├── HeroMetric.tsx     # Gradient stat cards with sparklines
│   │   │   │       ├── TrendChart.tsx     # Area charts with gradient fills
│   │   │   │       ├── InsightsPanel.tsx  # Auto-generated metric insights
│   │   │   │       ├── ABTestCard.tsx     # A/B test significance cards
│   │   │   │       ├── PlacementTable.tsx # Non-onboarding placement breakdown
│   │   │   │       └── DayDetailPanel.tsx # Single-day drill-down view
│   │   │   ├── timeline/
│   │   │   │   ├── page.tsx         # Server component: fetches activities
│   │   │   │   └── TimelineView.tsx # Client component: timeline + entry form
│   │   │   ├── brain/page.tsx       # Knowledge base placeholder (v2)
│   │   │   └── upload/page.tsx      # Daily file upload + historical import
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts   # POST: password verification, session creation
│   │   │   │   └── logout/route.ts  # POST: clear session cookie
│   │   │   ├── activities/route.ts  # GET (list with filters), POST (create)
│   │   │   ├── metrics/
│   │   │   │   ├── route.ts         # GET: fetch last 90 days (authenticated)
│   │   │   │   └── upload/route.ts  # POST: process 5 data files, compute, upsert
│   │   │   ├── import/route.ts      # POST: historical XLSX import from Google Sheets
│   │   │   ├── debug/route.ts       # GET: dump all metrics + activities (authenticated)
│   │   │   └── health/route.ts      # GET: health check (unauthenticated)
│   │   └── components/
│   │       └── Sidebar.tsx          # Collapsible navigation sidebar
│   └── lib/
│       ├── auth.ts                  # Password auth: SHA-256 hash, httpOnly cookies, 30-day sessions
│       ├── metrics.ts               # Metrics computation engine (CSV/XLSX parsing, derived metrics, checksums)
│       ├── supabase.ts              # Browser client (anon key) + server client (service role key)
│       ├── types.ts                 # TypeScript interfaces for all data structures
│       └── utils.ts                 # Formatting helpers (currency, numbers, percentages, dates)
├── scripts/
│   ├── schema.sql                   # Full DB schema (metrics, activities, daily_insights, pipeline_logs)
│   └── activities-table.sql         # Activities table migration
├── .env.example                     # Template for environment variables
├── .gitignore
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── ARCHITECTURE.md                  # This file
├── CHANGELOG.md
└── SETUP.md
```

## Key Technical Decisions

1. **Route groups `(app)`**: Separates authenticated pages from login. Auth check and Sidebar only render inside `(app)`. Error boundary catches all errors within the authenticated section.

2. **Two data ingestion paths**: Daily uploads parse 5 CSV/XLSX files through `computeMetrics()` which calculates all derived values (CPI, CPT, CPS, ROAS, significance). Historical imports from Google Sheets parse a single XLSX with pre-aggregated data. Both use upsert with `onConflict: "client_id,date"` to prevent duplicates.

3. **Client-side `enrichMetrics()` fallback**: Historical import rows may have null CPI/CPT/CPS (when spend or installs were zero). The dashboard recomputes these on the fly. Daily upload rows always have server-computed values. The two formulas are identical: `spend / installs`, `spend / trials`, `spend / subscribers`.

4. **Area charts over bar charts**: Recharts AreaChart with `type="monotone"` and SVG `<linearGradient>` fills for a softer look matching the warm theme.

5. **Warm light theme**: Background `#F8F5F0`, white cards with soft CSS shadows (`--shadow-sm/md/lg`), amber/orange gradient accents. Inter font from Google Fonts.

6. **Custom password auth**: Single password stored as env var, hashed with SHA-256, stored in httpOnly secure cookie. No OAuth, no Supabase Auth. Simple and sufficient for a single-user dashboard.

7. **Turbopack for dev builds**: Next.js 16 defaults to Turbopack in development for faster HMR. Production builds use standard webpack.

## Environment Variables

Required in `.env.local` (and Vercel dashboard):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key (client-side reads)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side only, for writes/admin ops. **Must be in Production and Preview env only, NOT Development** (prevents build-time hangs)
- `DASHBOARD_PASSWORD` — Login password

Optional:
- `SLACK_WEBHOOK_URL` — For automated Slack updates (not yet connected)
- `CRON_SECRET` — For scheduled tasks (not yet implemented)

## Row Level Security

RLS is enabled on `metrics`, `activities`, and `daily_insights`. Policies restrict anon key to read-only access. Writes require the service role key (used by all API routes server-side).

## Data Flow

```
Export files from TikTok, Purchasely, App Store Connect
        │
        ▼
Upload Page (drag & drop, auto-detect file types)
        │
        ▼
POST /api/metrics/upload
        │
        ├── Parse TikTok XLSX → installs, spend, impressions, clicks
        ├── Parse Revenue CSV → apple + google revenue by date
        ├── Parse Subscriptions CSV → new subs, churn by date
        ├── Parse Conversions CSV → trials by plan, placement, country
        └── Parse Screen Views CSV → paywall viewers by placement, A/B variant
                │
                ▼
        computeMetrics() — deterministic computation
                │
                ├── Derived: CPI, CPT, CPS, ROAS, install-to-trial CR
                ├── A/B test: z-test significance between variants
                ├── Placement: non-onboarding conversion breakdown
                └── Checksums: verify trial sums, revenue sums, market splits
                        │
                        ▼
                Upsert to Supabase (one row per date)
                        │
                        ▼
                Dashboard reads via GET /api/metrics
```
