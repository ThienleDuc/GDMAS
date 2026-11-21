# Implementation Plan: Trực quan hóa 6 Patterns trên `/statistics` (T7.06–T7.09)

## Metadata
- ID: 2026-11-21-statistics-six-patterns-charts-thien
- Proposal: .agents/notes/proposed/2026-11-21-statistics-six-patterns-charts-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay `PlaceholderPage` trên `/statistics` bằng 6 panel biểu đồ Pattern 1–6 từ API T6, dùng lại lớp transform thuần `chart-data.ts`, đủ Loading/Error/Empty, đúng tên pattern, không mock/số giả.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/statistics/` — statistics-view, StatisticsPage, StatisticsLayout, StatisticsRoutes, statistics-data, pattern-nav, insight-structure, ai-insights, ExpertInsightsPanel, CSS và 7 trang con.
- `apps/web/src/components/charts/` — 11 tệp: PatternPanel, 6 chart, ChartReadingGuide, chart-guides, chart-theme, index.
- `apps/web/src/app/App.tsx` — route `/statistics` + lazy `<StatisticsRoutes />`.
- `apps/web/src/styles/index.css` — import CSS tập trung.
- `apps/web/src/styles/globals.css` — 6 token `--highlight-*` pastel.
- `apps/web/src/layouts/navigation.ts` — nhãn "6 nhóm phân tích" + badge "Trực tiếp".
- `apps/web/src/lib/transforms/chart-data.ts`, `apps/web/src/lib/transforms/chart-types.ts` — adapter normalize payload Pattern 5/6 (giữ chữ ký).
- `apps/web/src/components/map/`, `apps/web/src/features/monitoring/MonitoringMapPage.tsx` — đổi chuỗi hiển thị sang tiếng Việt.
- `apps/web/dev-mock.ts` — 4 route `/api/v1/analysis/*` (opt-in `VITE_API_MOCKING`).
- `apps/web/tests/` — 5 test mới + bổ sung `chart-data.test.ts`, `dev-mock.test.ts`, `layout-navigation.test.ts`.
- `contracts/examples/analysis_sample.json`, `contracts/examples/classifications_sample.json` — chỉ fixture, không đổi schema.
- `docs/analysis/insights-structure.md` — cấu trúc báo cáo chuyên gia.
- `.agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md` — đặc tả sinh đồng thời.

### Out of Scope
- `apps/api/**`, migration, schema repo `contracts/schemas/**`, `docs/api/API.md`, `AGENTS.md`, `docs/quyuocchung.md`, `package.json`.
- Commit/push/merge (dừng CHECKPOINT 1).

---

## 3. Các bước
### Step 1 — Logic thuần
`statistics-view.ts`: `intervalToParams`, `metricsFor`, `buildCorrelationCells`, `correlationColor`, `evaluationText`, `forecastRows`, `statisticsView`. Không import Recharts/DOM.

### Step 2 — Component charts
8 tệp trong `components/charts/`: PatternPanel wrapper (Loading/Error/Empty) + 6 chart/panel + barrel. Dùng `buildLineSeriesFromScatter`, `buildHistogramBins`, `buildTrendSeries`, `buildSeasonalSeries`, `buildForecastBand`, `normalizeRiskLabel`, `buildRiskBars`, `resolvePatternView` có sẵn.

### Step 3 — Page & wire
`StatisticsPage.tsx` gọi 6 service (AbortController), đổi interval refetch; CSS import trong `styles/index.css`; `App.tsx` thay placeholder bằng `<StatisticsPage />`.

### Step 4 — Test & validation
Bổ sung `chart-data.test.ts`, tạo `statistics-view.test.ts`; chạy `pnpm build && pnpm test` (baseline 110, không giảm), `notes_index.py --check`, kiểm tra OCP. Dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Chỉ tiêu thụ 6 endpoint đã có; không đổi schema/env/dependency.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo testcase `.agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md`
- [x] Đã tạo/chạy test offline `apps/web/tests/statistics-view.test.ts`
- [x] `cd apps/web && pnpm build`
- [x] `cd apps/web && pnpm test` (baseline thực tế 116 sau merge layout — không giảm; kết quả 124/124)
- [x] `python3 scripts/notes_index.py --check`
- [x] Kiểm tra OCP: 0 deletion, không đụng tệp lõi
- [x] Kiểm chức năng: 6 tên pattern đúng; đổi interval refetch; `insufficient_data` hiện thông điệp BE; heatmap 5×5; CI hợp lệ

---

## 6. Rủi ro khi làm
- Empty envelope 200/`success:false` → `metricsFor` trả null, không throw.
- BE bỏ qua param thời gian trên trend/seasonality/correlation → chỉ filter trên `/temporal`.
- Heatmap sai thứ tự biến → test đối xứng.
- Recharts kích thước 0 → ResponsiveContainer + key ổn định; test tầng thuần.

---

## 7. Rollback
Revert commit/PR; page quay lại placeholder. Không có DB/schema thay đổi.

---

## 8. Ghi chú
`node --test` không render Recharts → mọi logic cần test được tách vào `statistics-view.ts`; component chỉ render + gọi helper. CSS page import tập trung trong `styles/index.css` để tránh lỗi thứ tự như bản đồ.
