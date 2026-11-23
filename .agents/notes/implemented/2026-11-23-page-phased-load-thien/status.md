# Implementation Status: Giảm tải & chống giật các page

## Metadata
- ID: 2026-11-23-page-phased-load-thien
- Status: completed
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

## Tiến độ
Progress: 100%
Current Phase: completed — PR #101 đã merge vào develop (merge SHA `f2d193e`)

Completed:
- Proposal §9 Approved; plan/status/testcase sinh đồng thời
- `useEarthquakeInsights(..., options)` — tắt temporal/clusters khi flag false (default true, I2)
- `useOverviewData` chia 2 phase: phase 1 statistics/clusters/trend/5 sự kiện; phase 2 catalog/seasonality/monthly/forecast, defer qua `scheduleIdle`
- Bỏ request `seasonality?interval=month` vô dụng, giữ field `seasonalityMonthly = null`
- `OverviewPage`: banner + placeholder "Đang tải…" cho card phase 2; `loading` aggregate
- `EarthquakesPage` tắt 2 nguồn không dùng; test `page-phased-load.test.ts`
- Gộp theo yêu cầu: 5 pattern page lazy riêng (`StatisticsRoutes.tsx`) + Suspense fallback ở `StatisticsLayout` — build tạo 5 chunk riêng

In Progress: none
Blocked: none

## Validation
| Kiểm tra | Kết quả |
|---|---|
| Testcase & test | DONE — `testcase/<id>.md` + `page-phased-load.test.ts` |
| Test/Build | PASS — FE `pnpm test` 297/297, `pnpm build` OK |
| Notes check | PASS — `notes_index.py --check` |

## Known Issues
- Filtering `country/region/range` vẫn khiến BE tính on-the-fly (đúng proposal trước) — proposal này chỉ giảm số request, không đổi tải BE.
- Card phase 2 có nháy nhẹ khi chuyển từ placeholder sang chart — chấp nhận, thay vì hiện "Chưa có dữ liệu" sai.

## Deviations From Plan
- Không dùng IntersectionObserver; defer bằng `requestIdleCallback` fallback `setTimeout(0)` (dễ test, không thêm hạ tầng).

## Decisions
- Giữ nguyên tên file/call trong `useOverviewData.ts` để không phá test khóa source; chỉ thêm flag/effect.

## Next Actions
- none — đã merge PR #101 vào develop, đồng bộ xong.

## Last Update
2026-11-23 — PR #101 merged vào develop (`f2d193e`); status → completed.
