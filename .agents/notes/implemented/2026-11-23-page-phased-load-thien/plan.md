# Implementation Plan: Giảm tải & chống giật các page bằng phased load

## Metadata
- ID: 2026-11-23-page-phased-load-thien
- Proposal: .agents/notes/proposed/2026-11-23-page-phased-load-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: in_progress

## 1. Mục tiêu
Overview 12 → 10 request (4 phase 1 + 6 defer); Earthquakes 5 → 3; phân biệt Loading/Empty cho card phase 2.

## 2. Phạm vi
### In Scope
- `apps/web/src/hooks/useEarthquakeInsights.ts` (options `includeTemporal`/`includeClusters`, default true)
- `apps/web/src/features/overview/useOverviewData.ts` (2 phase, bỏ call seasonality-month vô dụng, giữ field)
- `apps/web/src/features/overview/OverviewPage.tsx` (skeleton riêng card phase 2, banner loading aggregate)
- `apps/web/src/features/overview/OverviewPage.css` (skeleton card)
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` (truyền flag false)
- `apps/web/src/features/statistics/StatisticsRoutes.tsx` (lazy từng pattern page — gộp theo yêu cầu 2026-11-23)
- `apps/web/src/features/statistics/StatisticsLayout.tsx` (Suspense fallback cho Outlet)
- `apps/web/src/features/statistics/StatisticsPage.css` (class fallback)
- `apps/web/tests/page-phased-load.test.ts` (mới)
- `apps/web/tests/chart-region-filter.test.ts`, `apps/web/tests/monthly-peaks.test.ts` *(cập nhật assertion theo flag/call mới — không xoá test)*
- `.agents/notes/testcase/2026-11-23-page-phased-load-thien.md`

### Out of Scope
- BE/API/contract/migration, SSE, MonitoringMap, Shell, 4 chart component, filter country/region/range.

## 3. Các bước
1. Thêm options vào `useEarthquakeInsights` (I2 default true) — không gọi temporal/clusters khi false.
2. Tách `useOverviewData`: phase 1 (statistics + clusters + trend + 5 events) + phase 2 (catalog, seasonality, monthly, predictions, classifications), `secondaryEnabled` sau phase 1 settle, deps gồm refreshVersion.
3. Bỏ promise `getSeasonalityAnalysis(interval:"month")` nhưng giữ field `seasonalityMonthly` = null.
4. `OverviewPage`: card phase 2 có skeleton; `loading` = phase1 || phase2; giữ banner error + refresh.
5. EarthquakesPage truyền flag false.
6. Test offline + build.

## 4. Thay đổi dữ liệu/API/cấu hình
- Không đổi payload/schema; chỉ thời điểm/số request FE.

## 5. Validation
- [x] testcase note sinh đồng thời
- [ ] `pnpm test` + `pnpm build`
- [ ] fetch spy: phase 1 = 4 request, Earthquakes = 3
- [ ] `notes_index.py --check`

## 6. Rủi ro
- database_cleared refetch cả 2 phase; Empty vs Loading; test khóa source.

## 7. Rollback
Revert PR; Hook/service/contract giữ nguyên, chỉ flag & effect.

## 8. Ghi chú
I2 (default true), I5 (không mock), I7 (test offline).
