# Dashboard Stats Page TODO

- [x] Align Prisma schema with current app/runtime fields
  - [x] Sync Routine model fields (`sortOrder`, `category`, `currentStreak`, `longestStreak`, `lastCompletedAt`)
  - [x] Add missing auth compatibility models/fields used in production
  - [x] Regenerate Prisma client successfully

- [x] Stabilize existing analytics foundation
  - [x] Add shared analytics service (`src/lib/analytics.ts`)
  - [x] Add `GET /api/v1/stats` endpoint
  - [x] Add reusable `StatsCard` and `CategoryPieChart`
  - [x] Integrate analytics blocks into `/dashboard`

- [ ] Implement dedicated stats route `/dashboard/stats`
  - [ ] Create `src/app/(dashboard)/stats/page.tsx` as server component
  - [ ] Add server-side metrics (all-time + selected range)
  - [ ] Add quick stat cards and premium layout structure

- [ ] Add range filtering UX
  - [ ] Create `src/components/dashboard/StatsRangeTabs.tsx`
  - [ ] Support `7d`, `30d`, `all` via URL query params

- [ ] Add advanced visualizations
  - [ ] Reuse/add trend line chart block (smooth 30-day trend)
  - [ ] Reuse/add category pie chart block
  - [ ] Create `src/components/dashboard/YearlyActivityHeatmap.tsx` (GitHub-style yearly heatmap)

- [ ] Verification (thorough)
  - [ ] Test `/dashboard/stats` render in light/dark mode
  - [ ] Test range switching behavior and URL state
  - [ ] Test auth gate + session handling for stats page
  - [ ] Run API checks for `/api/v1/stats` (error + happy path where possible)
