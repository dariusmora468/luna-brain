# Luna Brain — Project Memory

## Project Overview
Growth intelligence dashboard for Luna (teen period tracker app).
**Repo:** /Users/dariusmora/Desktop/Projects/luna/luna-brain/
**Live URL:** https://luna-brain.vercel.app/dashboard
**Stack:** Next.js 16 App Router, Supabase (Postgres), Tailwind, Recharts, Claude API
**Deploy:** GitHub → Vercel auto-deploy on push to `main`

## Critical Files
- `src/lib/metrics.ts` — All parsers + computeMetrics() — THE most important file
- `src/lib/types.ts` — TypeScript interfaces (DailyMetrics 70+ fields)
- `src/lib/supabase.ts` — Browser client (anon key) + Server client (service role)
- `src/lib/auth.ts` — SHA-256 password hash, httpOnly cookie, 30-day sessions
- `src/lib/utils.ts` — Formatting helpers

## Key Pages
- `/dashboard` → DashboardView.tsx (hero cards, charts, day detail panel)
- `/data` → DataView.tsx (editable spreadsheet, inline cell editing)
- `/timeline` → TimelineView.tsx (activity log, add/edit/delete)
- `/brain` → AI chat (Claude Sonnet, streaming, 14-day metrics context)
- `/upload` → File upload (drag-drop 5 files, auto-detect types)

## Database Tables
- `metrics` — PK: (client_id, date). client_id always "luna"
- `activities` — id, client_id, date, category, title, description
- `knowledge` — id, client_id, title, content, source, category

## Deploy Workflow
```
git add <files> && git commit -m "msg" && git push
```
Vercel auto-deploys from main branch.

## Known Bugs Fixed (don't re-introduce)
1. TikTok XLSX: skip rows where campaign name starts with "Total" (prevents double-counting)
2. Purchasely dates: use .substring(0, 10) before comparing
3. Import: delete-then-insert (not upsert) for reliable override
4. Activity markers: use dot prop on Area (ReferenceDot doesn't work with categorical X-axis)

## User Preferences
- User wants direct edits to code, not suggestions
- Deploy by pushing to main (Vercel auto-deploys)

## See Also
- /Users/dariusmora/Downloads/LUNA-BRAIN-HANDOFF.md — Full handoff doc
