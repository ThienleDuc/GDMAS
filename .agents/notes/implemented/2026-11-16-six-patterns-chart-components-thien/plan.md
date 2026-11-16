# Implementation Plan: Bộ component biểu đồ Recharts cho 6 Patterns chuỗi thời gian

## Metadata
- ID: 2026-11-16-six-patterns-chart-components-thien
- Proposal: .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md
- Approved By: thien
- Approved At: 2026-11-16
- Implementer: agent | thien
- Status: completed

---

## 1. Mục tiêu
Xây bộ component biểu đồ Recharts trong `apps/web/src/components/charts/` cho đủ 6 Patterns chuỗi thời gian, tích hợp vào `StatisticsPage.tsx`, xóa toàn bộ số liệu dự phòng tĩnh; đồng thời ghi hợp đồng dữ liệu `GET /api/v1/patterns` vào `contracts/` (schema + mock example) làm căn cứ phối hợp với BE. **Không thay đổi mã nguồn BE.**

---

## 2. Phạm vi
### In Scope
- `apps/web/src/components/charts/types.ts` *(mới)*
- `apps/web/src/components/charts/theme.ts` *(mới)*
- `apps/web/src/components/charts/chart-data.ts` *(mới — hàm thuần)*
- `apps/web/src/components/charts/EmptyChartState.tsx` *(mới)*
- `apps/web/src/components/charts/ChartPanel.tsx` *(mới)*
- `apps/web/src/components/charts/TemporalPatternCharts.tsx` *(mới)*
- `apps/web/src/components/charts/TrendPatternChart.tsx` *(mới)*
- `apps/web/src/components/charts/SeasonalityPatternChart.tsx` *(mới)*
- `apps/web/src/components/charts/CorrelationHeatmap.tsx` *(mới)*
- `apps/web/src/components/charts/ForecastPatternChart.tsx` *(mới)*
- `apps/web/src/components/charts/ClassificationPatternChart.tsx` *(mới)*
- `apps/web/src/components/charts/index.ts` *(mới)*
- `apps/web/src/components/charts/README.md` *(cập nhật danh mục component)*
- `apps/web/src/features/statistics/StatisticsPage.tsx` *(thay phần render, giữ fetch/SSE/banner)*
- `apps/web/src/lib/api-client.ts` *(mới — bổ sung module `fetchApi` bị thiếu trên `develop` khiến `pnpm build` fail; RULE-03 chỉ thêm file, giữ nguyên chữ ký import)*
- `.gitignore` *(thêm ngoại lệ `!apps/web/src/lib/` — luật `lib/` của Python đang nuốt module Frontend)*
- `apps/web/package.json` *(thêm script `test`, không thêm dependency)*
- `contracts/schemas/patterns.json` *(mới)*
- `contracts/examples/patterns_sample.json` *(mới — mock fixture)*
- `contracts/README.md` *(thêm mục 3.3)*
- `apps/web/tests/chart-data.test.ts` *(file test offline mới)*
- `.agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md` *(đặc tả testcase sinh đồng thời)*
- `.agents/notes/implemented/2026-11-16-six-patterns-chart-components-thien/{plan.md,status.md}`

### Out of Scope
- Toàn bộ `apps/api/**` (route, service, worker, model, migration, test backend) — chỉ FE theo chỉ đạo người dùng.
- `docs/api/API.md`, `contracts/schemas/earthquake.json`, `contracts/schemas/sse-event.json`, `contracts/examples/earthquake_sample.json`.
- Task 2 (bản đồ Leaflet), Task 3 (Reports/Settings), Task 4 (typed contracts toàn bộ `src/contracts`, endpoint `/analysis/*`).
- `apps/web/src/services/earthquake-api.ts`, `useSSE.ts`, `utils/timezone.ts` — giữ nguyên chữ ký.
- `AGENTS.md`, `docs/quyuocchung.md`, `.githooks/`.

---

## 3. Các bước
### Step 1 — Hợp đồng dữ liệu (`contracts/`)
- `contracts/schemas/patterns.json`: JSON Schema draft 2020-12 cho `GET /api/v1/patterns`; định nghĩa 6 pattern, `status ∈ {COMPUTED, PENDING}`, `metrics` theo shape thực tế của T3/T5; Pattern 5 khai báo optional `metric_name`, `model_version`, `evaluation_metrics.{mae,rmse,confidence_level}`, `generated_at`.
- `contracts/examples/patterns_sample.json`: mock đủ 6 pattern + 1 pattern `PENDING` để test Empty State; timestamp UTC `Z`, tọa độ WGS84.
- `contracts/README.md`: thêm mục 3.3 trỏ schema/example mới.

### Step 2 — Lớp dữ liệu thuần (`types.ts`, `theme.ts`, `chart-data.ts`)
- Types optional cho từng pattern; `resolvePatternView` quyết định available/reason.
- `bucketKeyUtc`/`startOfIsoWeekUtc` (UTC, tuần bắt đầu Thứ 2), `buildLineSeriesFromScatter`, `buildHistogramBins`, `buildTrendSeries`, `buildSeasonalSeries`, `buildForecastBand`, `buildRiskBars`, `normalizeRiskLabel`, `formatNumber`, `formatCoefficient`, `isFiniteNumber`.

### Step 3 — Component UI
- `EmptyChartState`, `ChartPanel` (khung + badge + tự rỗng).
- `TemporalPatternCharts` (Line + Scatter + Histogram + segmented control ngày/tuần/tháng).
- `TrendPatternChart` (2 Line + Brush + chip slope/direction/r²/p-value).
- `SeasonalityPatternChart` (seasonal line + strength + interpretation).
- `CorrelationHeatmap` (lưới CSS 5×5 + tooltip 4 chữ số, tế bào null = "—").
- `ForecastPatternChart` (quan sát vs dự báo + dải tin cậy + model/mae/rmse).
- `ClassificationPatternChart` (badge nhãn + thanh xác suất 4 lớp + disclaimer).
- `index.ts` barrel export.

### Step 4 — Tích hợp `StatisticsPage.tsx`
- Giữ nguyên fetch `getPatterns()`, SSE refresh, banner DB rỗng, nút làm mới.
- Thay grid thẻ chữ bằng 6 panel biểu đồ dùng `ChartPanel` + component pattern tương ứng.
- Xóa toàn bộ fallback tĩnh; sửa nhãn Pattern 5 thành "Số sự kiện dự báo t+1".

### Step 5 — Test offline & tài liệu
- `apps/web/tests/chart-data.test.ts` (`node:test`, fixture đọc từ `contracts/examples/patterns_sample.json`).
- `apps/web/package.json` thêm `"test": "node --test tests/*.test.ts"`.
- Cập nhật `charts/README.md`.

### Step 6 — Validation
- `cd apps/web && pnpm install --frozen-lockfile` (nếu thiếu node_modules) → `pnpm test` → `pnpm build`.
- JSON contract parse check; `python3 scripts/notes_index.py --check`.
- Cập nhật `testcase/<id>.md` + `status.md` → `Status: validation`.

### Step 7 — DỪNG trước commit
- Người dùng yêu cầu dừng ở bước commit để tự kiểm thử. Không chạy `scope`/`project-review`/`commit`/`push` cho tới khi có lệnh mới.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Không có migration, không đổi schema DB, không đổi endpoint BE.
- `contracts/`: thêm 2 tệp mới + 1 mục README (additive).
- `apps/web/package.json`: thêm script `test` (không thêm dependency).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md`
- [x] **Đã tạo và chạy pass file unit test offline** `apps/web/tests/chart-data.test.ts` (12/12 PASS)
- [x] Frontend typecheck & build: `cd apps/web && pnpm build`
- [x] Frontend test: `cd apps/web && pnpm test`
- [x] Hợp đồng JSON parse được: `contracts/schemas/patterns.json`, `contracts/examples/patterns_sample.json`
- [x] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [x] Tài liệu bị ảnh hưởng: `contracts/README.md`, `apps/web/src/components/charts/README.md` đã cập nhật
- [x] Kiểm chức năng: DB rỗng → 6 panel Empty State; có dữ liệu → 6 biểu đồ, Brush zoom, tooltip heatmap 4 chữ số
- [x] Không chạy `uv run pytest`/`ruff` (không đụng `apps/api`)

---

## 6. Rủi ro khi làm
- Chưa có `apps/web/node_modules` → `pnpm install` cần mạng. Nếu thất bại, ghi `NOT_RUN` và báo người dùng.
- Recharts v3 typing chặt; dùng `tsc -b` để phát hiện sớm sai prop.
- `apps/web/tests/**` nằm ngoài `tsconfig include: ["src"]` nên không ảnh hưởng build; Node 22 tự strip type khi chạy test.

---

## 7. Rollback
- Revert commit/PR là đủ; không có migration. Xóa các tệp mới nếu huỷ tính năng (cần hỏi người dùng vì là thao tác xóa).

---

## 8. Ghi chú
- Mock payload chỉ dùng cho test (`contracts/examples/`), không import vào runtime.
- Giữ `PatternItem.metrics: Record<string, any>` ở service hiện tại (Task 4 sẽ siết type); chart dùng typed view trong `components/charts/types.ts`.
