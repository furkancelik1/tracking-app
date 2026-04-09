# Analytics Implementation TODO

- [ ] Add shared analytics service at `src/lib/analytics.ts`
  - [ ] Build 30-day window helpers
  - [ ] Compute daily completions from `RoutineLog` with optimized query strategy
  - [ ] Compute category distribution from routine relations
  - [ ] Compute summary metrics (`totalCompletions`, `longestStreak`)
  - [ ] Export typed analytics response model

- [ ] Add API endpoint `GET /api/v1/stats`
  - [ ] Create `src/app/api/v1/stats/route.ts`
  - [ ] Enforce authenticated user context
  - [ ] Return analytics payload from shared service

- [ ] Add analytics UI components
  - [ ] Create `src/components/dashboard/StatsCard.tsx`
  - [ ] Create `src/components/dashboard/CategoryPieChart.tsx` (Recharts PieChart)

- [ ] Update dashboard analytics layout
  - [ ] Update `src/app/dashboard/page.tsx` to use shared analytics data
  - [ ] Render summary stats cards
  - [ ] Render weekly AreaChart in stats section
  - [ ] Render category PieChart with dark mode friendly styles

- [ ] Update chart compatibility
  - [ ] Apply minimal updates to `src/components/dashboard/WeeklyStatsChart.tsx` if needed
  - [ ] Keep PRO behavior compatible with new analytics section

- [ ] Verification
  - [ ] Run type-check/build and resolve errors
  - [ ] Validate dark mode chart/card contrast
