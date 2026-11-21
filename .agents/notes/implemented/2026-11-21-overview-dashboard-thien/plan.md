# Implementation Plan: Trang Tổng quan — Bento Dashboard có biểu đồ so sánh

## Metadata
- ID: 2026-11-21-overview-dashboard-thien
- Proposal: .agents/notes/proposed/2026-11-21-overview-dashboard-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay `PlaceholderPage` ở `/` bằng trang tổng quan Bento: KPI, 4 biểu đồ so sánh (xu hướng thực tế vs trend, cơ cấu độ lớn, top điểm nóng kèm bảng xếp hạng, khung giờ cao điểm), live feed và dự báo t+1 — từ API thật, không mock. (Card strip 7 Terminals đã bị gỡ theo yêu cầu người dùng 2026-11-21.)

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/overview/OverviewPage.tsx` *(mới)*
- `apps/web/src/features/overview/overview-view.ts` *(mới — hàm thuần offline)*
- `apps/web/src/features/overview/useOverviewData.ts` *(mới — hook gọi API)*
- `apps/web/src/features/overview/OverviewPage.css` *(mới)*
- `apps/web/src/components/charts/OverviewTrendChart.tsx` *(mới)*
- `apps/web/src/components/charts/OverviewSeverityChart.tsx` *(mới)*
- `apps/web/src/components/charts/OverviewHotspotsChart.tsx` *(mới)*
- `apps/web/src/components/charts/OverviewSeasonalityChart.tsx` *(mới)*
- `apps/web/src/components/charts/index.ts` *(bổ sung export)*
- `apps/web/src/app/App.tsx` *(thay 1 dòng placeholder)*
- `apps/web/src/styles/index.css` *(bổ sung 1 dòng import `OverviewPage.css` — convention CSS tập trung)*
- `apps/web/tests/overview-view.test.ts` *(mới — offline)*
- `apps/web/tests/overview-page.test.ts` *(mới — tĩnh)*
- `.agents/notes/testcase/2026-11-21-overview-dashboard-thien.md` *(sinh đồng thời)*

### Out of Scope
- `contracts/**`, `docs/api/API.md`, `apps/api/**`, migration, `.env*`, `AGENTS.md`, docs
- Aside/header, `/monitoring`, `/earthquakes`, `/statistics`, 6 Patterns gốc
- Dependency mới (Recharts/lucide có sẵn); không sửa BE để trả `dominant_place`

---

## 3. Các bước
### Step 1 — View model thuần
`overview-view.ts`: `buildKpis`, `buildSeverityMix`, `rankRegionsForCountry`, `buildTrendComparison`, `buildSeasonalityBars`, `buildLatestEvents`, `formatPrediction`. Mọi timestamp UTC; thiếu số liệu → null/[]; không bịa.
### Step 2 — Hook dữ liệu
`useOverviewData.ts`: `Promise.allSettled` trên statistics/temporal/clusters (qua `useEarthquakeInsights("day")`), trend (14 ngày), seasonality, predictions, classifications, latest events; abortable; 404/insufficient → unavailable. Bỏ request `system/status` sau khi gỡ card G.
### Step 3 — 4 chart component
Recharts wrapper mỏng trong `components/charts/`, nhận props từ view model; dùng `chart-theme.ts`; export qua `index.ts`.
### Step 4 — Page + CSS
`OverviewPage.tsx`: hero + KPI grid + Bento A(8)/B(4)/C(6)/D(6)/E(8)/F(4); lọc quốc gia từ `useCatalogSelection`; chip "Số liệu toàn cục" khi active; skeleton/empty/error. `OverviewPage.css`: grid 12/6/1, token Dark Mode, `.ov-severity--high/medium/low` và override `.ov-page .ds-table` (tiêu đề tiếng Việt, nhãn Cao/Trung bình/Thấp).
### Step 5 — App + test + validation
Đổi `App.tsx`; viết 2 file test; chạy `pnpm test`, `pnpm build`, `notes_index.py --check`, `git status`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không migration, endpoint, schema hay biến môi trường.

---

## 5. Validation
- [x] Testcase `.agents/notes/testcase/<id>.md` tồn tại
- [x] `apps/web/tests/overview-view.test.ts` (9) + `overview-page.test.ts` (2) pass offline
- [x] `cd apps/web && pnpm test` → 171/171 pass
- [x] `cd apps/web && pnpm build` → PASS (main 422 kB nhờ `React.lazy`)
- [x] `python3 scripts/notes_index.py --check` → OK
- [x] `git status --porcelain` — không xóa file
- [x] Kiểm tra: 4 chart có câu hỏi/insight, empty state khi insufficient, ranking đổi country→region, Dark Mode token

---

## 6. Rủi ro
BE `/clusters` chưa trả `dominant_place` → ranking gộp "Khác" + chú thích (đã chọn ở §9). Trend/seasonality `insufficient_data` → empty state riêng.

## 7. Rollback
Revert commit trên nhánh `feat/2026-11-21-overview-dashboard-thien`; không có DB/migration.

## 8. Ghi chú
Lựa chọn §9: giữ 4 chart, FE-only ranking, chart D, trend 14 ngày. Dừng CHECKPOINT 1 sau validation.
