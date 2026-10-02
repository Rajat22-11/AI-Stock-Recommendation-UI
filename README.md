# Paper P&L

A single public, read-only page showing the paper P&L of the breakout-with-volume tracker in Supabase. All figures are computed by the database (`process_ledger` and the `v_*` views). This app only reads and formats them.

## Run locally

```bash
cp .env.example .env.local   # fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev                  # http://localhost:3000
```

Both variables are server-only: don't add a `NEXT_PUBLIC_` prefix. Use the publishable (anon) key only, never a service-role key.

## Deploy

`render.yaml` defines a free-tier Render web service (Node 24, `npm ci && npm run build`, `npm start`). Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Render dashboard. A free service sleeps when idle, so the first request after a pause takes longer.

## Layout

- `src/app/page.tsx`: the page (summary, equity curve, open positions, closed trades, pending entries)
- `src/app/error.tsx`: shown when the database can't be reached
- `src/components/`: `EquityCurve` (server-rendered SVG) and small table/section helpers
- `src/lib/queries.ts`: the five Supabase reads
- `src/lib/format.ts`: INR (lakh/crore grouping), percent and date formatting
- `openspec/`: the change proposal, specs, design and tasks behind this app
