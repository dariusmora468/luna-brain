# luna Brain - Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | SSR + API routes in one project, fast iteration |
| UI | React 18 + Tailwind CSS | Component model + utility styling, no design system overhead |
| Charts | Recharts | Lightweight, React-native charting with good area chart support |
| Database | Supabase (Postgres) | Managed Postgres with REST API, auth, and real-time built in |
| Auth | Supabase Auth | Simple email/password, integrated with the DB layer |
| File Parsing | SheetJS (xlsx), PapaParse (csv) | Client and server-side parsing of uploaded data files |
| Validation | Zod | Runtime schema validation for API inputs |
| Deployment | Vercel | Zero-config Next.js hosting with serverless API routes |

## Database Schema

### `metrics` table
Daily aggregated metrics per client. One row per client per date.

Key columns: `client_id`, `date`, `tiktok_spend_gbp`, `tiktok_installs`, `all_trials`, `all_new_subscribers`, `total_revenue_gbp`, `cost_per_install_gbp`, `cost_per_trial_gbp`, `cost_per_subscriber_gbp`, `roas`, `non_onboarding_conversion_rate`, `spend_seven_days_ago`.

Unique index: `idx_metrics_client_date` on `(client_id, date)`.

### `activities` table
Manual and auto-detected business events (campaign launches, paywall changes, etc).

Key columns: `client_id`, `date`, `category`, `title`, `description`, `auto_detected`, `source`, `created_by`.

Categories: `campaign`, `paywall`, `product`, `aso`, `growth`, `other`.

## File Structure

```
luna-brain/
├── src/
│   ├── app/
│   │   ├── globals.css              # Warm light theme, CSS custom properties
│   │   ├── layout.tsx               # Root layout (Inter font, meta)
│   │   ├── login/page.tsx           # Auth login page
│   │   ├── (app)/                   # Authenticated route group
│   │   │   ├── layout.tsx           # Sidebar + main content wrapper
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx         # Server component, fetches metrics
│   │   │   │   ├── DashboardView.tsx # Client component, all charts + hero cards
│   │   │   │   └── components/
│   │   │   │       ├── HeroMetric.tsx     # Gradient stat cards
│   │   │   │       ├── TrendChart.tsx     # Area charts with gradient fills
│   │   │   │       ├── InsightsPanel.tsx  # Auto-generated metric insights
│   │   │   │       ├── ABTestCard.tsx     # A/B test progress cards
│   │   │   │       ├── PlacementTable.tsx # Campaign placement breakdown
│   │   │   │       └── DayDetailPanel.tsx # Single-day detail view
│   │   │   ├── timeline/
│   │   │   │   ├── page.tsx         # Server component, fetches activities
│   │   │   │   └── TimelineView.tsx # Client component, timeline + entry form
│   │   │   ├── brain/page.tsx       # Knowledge base (v2 preview)
│   │   │   └── upload/page.tsx      # Daily upload + historical import
│   │   ├── api/
│   │   │   ├── activities/route.ts  # GET/POST activities
│   │   │   ├── auth/route.ts        # Auth endpoints
│   │   │   ├── cron/route.ts        # Scheduled tasks
│   │   │   ├── debug/route.ts       # DB diagnostic endpoint
│   │   │   ├── health/route.ts      # Health check
│   │   │   ├── import/route.ts      # Historical XLSX import
│   │   │   ├── metrics/
│   │   │   │   ├── route.ts         # GET metrics
│   │   │   │   └── upload/route.ts  # Daily file upload + processing
│   │   │   └── slack/route.ts       # Slack integration
│   │   └── components/
│   │       └── Sidebar.tsx          # Navigation sidebar
│   └── lib/
│       ├── auth.ts                  # Auth utilities
│       ├── metrics.ts               # Metrics computation engine
│       ├── supabase.ts              # Supabase client init
│       ├── types.ts                 # TypeScript interfaces
│       └── utils.ts                 # Shared helpers
├── scripts/
│   ├── schema.sql                   # Full DB schema
│   └── activities-table.sql         # Activities table migration
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Key Technical Decisions

1. **Route groups `(app)`**: Separates authenticated pages from login. Sidebar only renders inside `(app)`.

2. **`enrichMetrics()` client-side fallback**: CPI, CPT, CPS are computed on the fly when DB values are null. This handles gaps in historical data without requiring backfill scripts.

3. **Area charts over bar charts**: Switched to Recharts AreaChart with `type="monotone"` and SVG `<linearGradient>` fills for a softer, more modern look matching the Crextio-style reference design.

4. **Warm light theme**: Background `#F8F5F0`, white cards with soft CSS shadows (`--shadow-sm/md/lg`), amber/orange gradient accents. Inter font from Google Fonts.

5. **Historical import via API route**: The VM can't reach Supabase directly, so the import route (`/api/import`) accepts XLSX uploads and bulk-inserts using the Supabase client server-side.

6. **Upsert strategy**: Metrics use `onConflict: "client_id,date"` to handle re-imports cleanly without duplicates.

## Environment Variables

Required in `.env.local` (and Vercel):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only, for admin operations
