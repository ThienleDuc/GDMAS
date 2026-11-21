# Proposal: Trực quan hóa 6 Patterns chuỗi thời gian trên `/statistics` (Task T7.06–T7.09)

## Metadata
- ID: 2026-11-21-statistics-six-patterns-charts-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: feature
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: high
- Area: `apps/web/src/components/charts/`, `apps/web/src/features/statistics/`, `apps/web/src/app/App.tsx`, `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ dựng UI FE tiêu thụ 6 endpoint T6 đã có; không đổi endpoint, schema, payload, docs/api/API.md hay contracts/. Cây thư mục components/charts/ đã được docs/architecture.md §12 dự kiến (mã cũ bị gỡ PR #26) nên không phát sinh drift. -->
- Related Docs:
  - docs/task/thien.md — T7.06 (dòng 168–185), T7.07 (190–209), T7.08 (212–229), T7.09 (233–250)
  - docs/api/API.md §3.3 (`/analysis/temporal|trend|seasonality|correlation`, `/predictions`, `/classifications`)
  - docs/yeucaubatbuoc.md §2 (đúng tên 6 patterns), §3.1 (Zoom/Brush, filter thời gian), §4 (Demo 6 bước)
  - docs/architecture.md §5 (5 biến correlation), §9.4 (dữ liệu cũ), §12 (cấu trúc FE)
  - contracts/schemas/analysis.json, contracts/examples/{analysis,patterns,predictions,classifications}_sample.json
  - docs/coding-rules.md, docs/quyuocchung.md (I1–I7)
- Related Proposals:
  - .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md — Approved/completed nhưng toàn bộ `components/charts/` đã bị gỡ trong PR #26; proposal này **dựng lại trên nền `lib/transforms/`**, không khôi phục mã cũ.
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — nền FE mới: 1 layout, `styles/index.css` import tập trung, `lib/transforms/chart-data.ts`, `services/earthquake-api.ts`.
  - .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md — T7.02 đã chuẩn hóa 6 hàm service + envelope/404.
  - .agents/notes/proposed/2026-11-12-seismic-prediction-worker-tai.md — T5 đã merge (Pattern 5/6 có dữ liệu thật).
  - Overrides: 2026-11-16-six-patterns-chart-components-thien — **chỉ riêng phần component biểu đồ** (đã xóa trong PR #26); giữ nguyên hợp đồng/test transform của proposal đó. Scope of Rejection của proposal cũ là `-`, không cấm dựng lại.
- Related Bugs: none (BUG-thien-001 — dải tin cậy Pattern 5 — đã fixed trong `buildForecastBand`; proposal này dùng lại hàm đã sửa)

---

## 1. Vấn đề
### Bối cảnh
Sau PR #26, route `APP_ROUTES.STATISTICS` (`/statistics`) vẫn trỏ tới `PlaceholderPage title="6 Patterns Phân tích"`. Thư mục `components/charts/` **rỗng**, `features/statistics/` **chưa tồn tại**. Tuy nhiên lớp transform thuần đã đầy đủ: `chart-data.ts` (~435 dòng) cung cấp `buildLineSeriesFromScatter`, `buildHistogramBins`, `buildTrendSeries`, `buildSeasonalSeries`, `buildForecastBand`, `buildRiskBars`, `normalizeRiskLabel`, `resolvePatternView`, `asTemporal/asTrend/asSeasonality/asCorrelation/asPrediction/asClassification`, `formatNumber/formatCoefficient/formatPercent`. Dependency `recharts@^3.10.1` đã có trong `package.json`.

### Vấn đề
Chưa có giao diện nào tiêu thụ 6 endpoint phân tích của T6; người dùng không thấy được 6 patterns chuỗi thời gian bắt buộc, trong khi T3/T5 đã chạy và có dữ liệu thật. Các hàm transform đúng chuẩn UTC (I3) và "không bịa số" (I5) chưa được nối vào UI.

### Ảnh hưởng
6 Patterns là 3/5 điểm thang điểm (`yeucaubatbuoc.md` §5) và là nội dung trình diễn chính của Kịch bản Demo 6 bước. Nếu vẽ bằng số giả hoặc sai tên pattern sẽ vi phạm I5 và làm sai báo cáo đồ án.

---

## 2. Hiện trạng
| Thành phần | Hiện trạng |
|---|---|
| `apps/web/src/app/App.tsx` | `APP_ROUTES.STATISTICS` → `<PlaceholderPage title="6 Patterns Phân tích" />` |
| `apps/web/src/components/charts/` | Rỗng (mã cũ gỡ trong PR #26) |
| `apps/web/src/features/statistics/` | Chưa tồn tại |
| `apps/web/src/lib/transforms/chart-data.ts` | Đầy đủ hàm thuần (giữ nguyên, không sửa) |
| `services/earthquake-api.ts` | Có `getTemporalAnalysis`, `getTrendAnalysis`, `getSeasonalityAnalysis`, `getCorrelationAnalysis`, `getPredictions`, `getClassifications`, `getPatterns` |
| `tests/chart-data.test.ts` | Đã có 12 test thuần, pass; **không xóa/sửa case cũ** |
| `contracts/examples/analysis_sample.json` | Fixture 4 response Pattern 1–4 (dùng để test transform) |
| Recharts | `^3.10.1` đã cài; không thêm dependency |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Trang `/statistics` — chính là page **"6 Patterns Phân tích"** trên thanh điều hướng (`NAV_META` ở `layouts/navigation.ts`) — thay `PlaceholderPage`, hiển thị **đúng 6 tên** pattern: Temporal, Trend, Seasonality, Correlation, Dự báo t+1, Phân loại t+1 (không dùng Cyclic/Swarm/…). Cả 6 panel dùng chung nguồn dữ liệu T3/T5 qua T6.
  2. **T7.06 — Pattern 1**: 3 biểu đồ Line/Scatter/Histogram từ `/analysis/temporal`, nút `day|week|month`, refetch đúng `interval`; dùng `buildLineSeriesFromScatter`/`buildHistogramBins`.
  3. **T7.07 — Pattern 2 & 3**: Trend (`actual_value` vs `trend_value`, hiển thị `slope`/`trend_direction`/`r_squared`, Brush zoom) và Seasonality (`seasonal_line`, `seasonality_strength`, `interpretation` nguyên văn). Dùng `buildTrendSeries`/`buildSeasonalSeries`.
  4. **T7.08 — Pattern 4**: Heatmap 5×5 từ `variables[]` + `matrix[][]`, 5 biến đúng SAD §5, thang màu phân kỳ, tooltip hệ số Pearson `[-1,1]`; **không suy diễn nhân quả**.
  5. **T7.09 — Pattern 5 & 6**: Forecast với dải tin cậy 95% từ `buildForecastBand` (đã sửa BUG-thien-001); Classification chuẩn hóa nhãn qua `normalizeRiskLabel` + `buildRiskBars` (4 mức LOW→CRITICAL), ghi chú "chỉ báo thống kê thử nghiệm"; thiếu `mae`/`rmse` → "chưa có dữ liệu kiểm định".
  6. Mỗi panel có 3 trạng thái Loading/Error/Empty; `status = insufficient_data` hoặc `PENDING` → Empty State kèm **thông điệp BE** (`resolvePatternView` là nguồn quyết định duy nhất). DB rỗng → không fallback mock.
  7. UI cố gắng giữ Dark/Light theo token `globals.css`, brush/zoom cho chart dạng line; logic tách thuần để test offline.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi `contracts/`, `docs/api/API.md`, `apps/api/**`, migration, `lib/transforms/chart-data.ts`, services, `styles/globals.css`, layout shell.
  - Không thêm dependency (Recharts có sẵn); không dùng mock runtime thay API thật.
  - Không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân thủ **RULE-03/I2**: chỉ thêm tệp mới + thay 1 dòng route; **I3**: mọi trục thời gian UTC `Z` do `chart-data.ts` tạo; **I5**: đúng 6 patterns, token CSS, 3 trạng thái, không số giả; **I7**: test thuần offline.

### 4.1. Module thuần `features/statistics/statistics-view.ts`
- `intervalToParams(interval, now)` → `{start_time, end_time}` UTC `Z` cho `/analysis/temporal` (dùng helper `toUtcIso`/`timeRangeBounds`-like hiện có).
- `toPatternView(pattern)` wrapper `resolvePatternView`, `metricsFor(response)` lấy `response.data` an toàn (empty envelope → `null`, không throw).
- `buildCorrelationCells(variables, matrix)` → mảng `{row, col, variableX, variableY, value}`; bỏ ô `null`/không hữu hạn, giữ `"—"`; kiểm tra đối xứng bằng hàm thuần.
- `correlationColor(value)` → 5 dải màu phân kỳ (âm/xanh — dương/đỏ), trả token màu cố định của palette biểu đồ (không phải dữ liệu giả).
- `forecastRows(prediction, observed)` → `buildForecastBand(...)` + kiểm tra CI hợp lệ (`lower ≤ predicted ≤ upper` đã được `buildForecastBand` clamp).
- `evaluationText(metrics)` → `mae`/`rmse` hoặc `"chưa có dữ liệu kiểm định"`.
- `statisticsView(response)` — điều phối 3 trạng thái cho từng panel.

### 4.2. Component `components/charts/` (mới)
| Tệp | Vai trò |
|---|---|
| `PatternPanel.tsx` | Wrapper chung: tiêu đề pattern + Loading/Error/Empty (dùng `PatternView.reason`) |
| `TemporalPatternCharts.tsx` | 3 biểu đồ Pattern 1: `LineChart` (event_count/avg/max), `ScatterChart` (magnitude vs depth_km), `BarChart` histogram; nút day/week/month; `Brush` trên Line |
| `TrendPatternChart.tsx` | Pattern 2: line actual + trend, `Brush`, badge slope/direction/r² |
| `SeasonalityPatternChart.tsx` | Pattern 3: line seasonal_factor theo period_label, hiện strength + `interpretation` nguyên văn |
| `CorrelationHeatmap.tsx` | Pattern 4: lưới 5×5 ô màu từ `correlationColor`, `title` tooltip Pearson, viết rõ "không suy diễn nhân quả" |
| `ForecastPatternChart.tsx` | Pattern 5: ComposedChart (observed line + predicted dot + CI area/bar + bridge), `evaluationText` |
| `ClassificationPatternChart.tsx` | Pattern 6: nhãn risk 4 mức từ `normalizeRiskLabel`, bar xác suất từ `buildRiskBars`, ghi chú thử nghiệm |
| `index.ts` | Barrel export |

### 4.3. Page `features/statistics/`
- `StatisticsPage.tsx`: gọi 6 hàm service (có `AbortController`), đưa vào `statistics-view.ts`, render 6 `PatternPanel`; filter thời gian dùng `getTemporalAnalysis({interval,start_time,end_time})`, đổi interval → refetch.
- `StatisticsPage.css`: CSS riêng (theo convention `EarthquakesPage.css`), import tập trung trong `styles/index.css` (không import trong component — tránh lỗi thứ tự CSS đã gặp ở bản đồ).
- `App.tsx`: thay 1 dòng placeholder bằng `<StatisticsPage />`.

### 4.4. Test strategy
- `apps/web/tests/chart-data.test.ts` — **bổ sung additive** (giữ 12 test cũ; lúc triển khai baseline cả suite là 116 sau khi merge layout): case sample `analysis_sample.json` cho `buildLineSeriesFromScatter`/`buildHistogramBins`, `resolvePatternView` thông điệp insufficient_data.
- `apps/web/tests/statistics-view.test.ts` (mới) — thuần: `intervalToParams` UTC `Z`, `buildCorrelationCells` đối xứng/bỏ null, `correlationColor` biên [-1,1], `evaluationText` thiếu mae/rmse, `statisticsView` 3 trạng thái.
- Chạy `cd apps/web && pnpm build && pnpm test` (baseline **116 test** sau khi merge layout — không giảm), `python3 scripts/notes_index.py --check`.
- Component Recharts không render trong `node --test` → chỉ test tầng thuần; ghi rõ trong testcase.

### 4.19. Viền hướng dẫn
- Bỏ `border-left: 3px solid var(--primary)` của panel hướng dẫn; dùng viền **mỏng bao quanh** `border: var(--border-width-thin) solid var(--border)` (token 1px có sẵn trong globals).

### 4.18. Token màu pastel
- Thêm 6 token trong `apps/web/src/styles/globals.css` mục 3.4.1: `--highlight-{blue,orange,red}-{bg,fg}` (nền pastel nhạt, chữ đủ tương phản).
- `StatisticsPage.css` dùng lại các token này, bỏ màu hardcode/fallback, để đổi theme tập trung tại một chỗ.

### 4.17. Hướng dẫn bên phải
- Chuyển khối hướng dẫn từ cuối chart sang **cột phải** (`.stat-chart-row`: nội dung trái, guide 240px phải) cho cả 6 pattern; co lại thành câu ngắn.
- `GUIDE_HIGHLIGHTS` tô màu từ khóa theo ngữ nghĩa: xanh (quan sát/đường), cam (cảnh báo/khoảng tin cậy), đỏ (dự báo/điểm chưa xảy ra). Giải thích RMSE đầy đủ giữ trong thuộc tính `title` để di chuột xem.

### 4.16. Hướng dẫn đọc biểu đồ
- `chart-guides.ts` (thuần): đổi mã `M/W/D` thành Tháng/Tuần/Ngày; định nghĩa giải thích sai số căn quân phương bằng ngôn ngữ dễ hiểu (bình phương độ lệch, càng nhỏ càng sát, phạt nặng sai lớn); 6 bộ hướng dẫn đọc tương ứng Pattern 1–6.
- `ChartReadingGuide.tsx` + CSS `.stat-reading-guide`: khối "Cách đọc biểu đồ" dùng chung, render ở cuối mỗi chart. Trend dùng `resampleFreqLabel()` thay cho mã `M`.

### 4.15. Ngôn ngữ hiển thị
- Thay ký hiệu viết tắt bằng cụm tiếng Việt đầy đủ: `R²` → độ phù hợp mô hình, `MAE/RMSE` → sai số tuyệt đối trung bình / sai số căn quân phương, `t+1` → ngày kế tiếp, `M` → độ lớn, `WGS84 · UTC` → tọa độ địa lý · giờ quốc tế, `Live` → Trực tiếp, `↔`/`≥` → và / từ … trở lên, `API`/`BE` → dịch vụ dữ liệu / máy chủ. Chỉ đổi chuỗi hiển thị, không đổi tên biến/hàm.

### 4.14. Giao diện cuối
- Bỏ hoàn toàn `stat-layout__aside`: nội dung diễn giải của BE đã nằm ngay dưới chart, không cần cột note riêng; các trang chuyển về 1 cột full-width.
- Tăng chiều cao vẽ: Pattern 1 `240 → 320`, Pattern 2/3 `260/240 → 340`, Pattern 5 `260 → 360`.
- Gộp Pattern 5 & 6 thành một trang nội dung `ForecastClassificationPatternPage` (subnav còn **5 mục**, slug `du-bao-phan-loai`); giữ file cũ để tương thích import (RULE-03).

### 4.13. Điều chỉnh sau phản hồi
- Thuật ngữ Pattern 3 dùng **"chu kỳ"** thay cho "mùa vụ" trên toàn UI (nav, tiêu đề, legend, nhận xét). Lưu ý docs gốc dùng "Tính mùa vụ" — divergence được ghi nhận trong status, không tự sửa spec.
- Bảng phân tích dời từ góc phải-dưới lên **header sublayout** (`top/right = 0`), panel mở xuống phủ nội dung.
- Cấu trúc báo cáo được mô tả trong `docs/analysis/insights-structure.md` (5 phần: Tổng quan · Nhận xét theo 6 nhóm · Triển vọng · Khuyến nghị · Lưu ý phương pháp) và dùng làm nguồn cho `insight-structure.ts`; test đối chiếu docs↔code. Báo cáo bổ sung `summary`, `evidence`, `recommendations`, `caveats`.

### 4.12. Bảng phân tích chuyên gia nổi (yêu cầu bổ sung)
- `ai-insights.ts` thuần: từ dữ liệu 6 pattern sinh 6 nhận xét (mức `info`/`watch`/`alert`), headline + triển vọng ngày kế tiếp. **Không gọi AI/mạng**, không bịa số — thiếu dữ liệu thì nói rõ. Dùng lại `normalizeRiskLabel`, `correlationVariableLabel`, `riskLevelLabel`.
- `ExpertInsightsPanel.tsx`: bảng `position:absolute` trên `.stat-shell`, nút "Phân tích chuyên gia" mở/thu (cả nút ×), dùng chung context nên dùng được ở mọi tab pattern; kèm disclaimer "không phải cảnh báo chính thức".
- Test `ai-insights.test.ts`: empty/thật/low — đảm bảo bám số liệu và phân loại đúng.

### 4.11. Sublayout điều hướng 6 pattern (yêu cầu bổ sung)
- Thay lưới 6 panel bằng **sublayout** `StatisticsLayout` gồm thanh điều hướng con dọc + `<Outlet/>`; 6 route con `/statistics/<slug>` (`pattern-nav.ts` là nguồn slug/nhãn thuần).
- Mỗi pattern là một trang riêng trong `features/statistics/patterns/` với **bố cục nội dung khác nhau**: `--stack` (Pattern 1), `--metrics-left` (2), `--chart-note` (3), `--heatmap` (4), `--forecast` (5), `--split` (6).
- `statistics-data.tsx` giữ context nạp 6 nguồn **một lần** tại sublayout → chuyển tab không refetch; `StatisticsPage.tsx` giữ lại làm redirect sang pattern đầu (RULE-03).
- Responsive: subnav chuyển ngang, có scroll khi màn hình hẹp.

### 4.10. Đối chiếu lại tài liệu & hợp đồng (yêu cầu bổ sung)
- Đọc lại `docs/yeucaubatbuoc.md` §2, `docs/architecture.md` §12, `docs/architecture/{SAD,ERD}.md`, `docs/api/API.md` §2–§4; đối chiếu FE contracts ↔ BE routes/schemas ↔ fixtures.
- **Tên 6 pattern**: dùng đúng 6 nhóm theo `yeucaubatbuoc.md` §2 / `architecture.md` §12, dịch tiếng Việt theo yêu cầu; giải thích rõ **"t+1 = ngày kế tiếp"** trên trang và panel 5/6.
- **Sửa 2 blocking khi dùng API thật**: BE `/predictions` trả `confidence_interval` lồng nhau, `/classifications` trả `probabilities` — typed view FE chỉ đọc alias phẳng. Thêm adapter trong `asPrediction`/`asClassification` (giữ chữ ký — RULE-03), bổ sung type optional; fixture phân loại cập nhật 4 nhãn thật của BE.
- **Ghi nhận, không tự sửa**: `docs/api/API.md` lỗi thời (stats/SSE/Pattern 6/danh sách endpoint), BE `/analysis/trend` bỏ `r_squared`, `/analysis/correlation` bỏ `note`/`status` — cần owner T3/T6; đưa vào câu hỏi cuối phiên.

---

## 5. Phương án đã cân nhắc
### Phương án A: Khôi phục mã `components/charts/` cũ từ proposal 2026-11-16
Ưu: nhanh. Nhược: mã đó đã bị gỡ trong PR #26, lệch nền `lib/transforms/` mới, hardcode số liệu/styling cũ. **Không chọn.**
### Phương án B: Gộp mọi logic vào component
Ưu: ít file. Nhược: `node --test` không render Recharts → không test được I7. **Không chọn.**
### Phương án C (chọn): Transform thuần có sẵn + component mỏng + test thuần
Ưu: test offline 100%, đúng hợp đồng, dễ thay đổi chart sau. Nhược: số file tăng (~10). **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +~10 tệp (8 chart + page + view + test) | Mỗi pattern 1 component dễ review/kiểm chứng |
| Hiệu năng | Brush/chỉ vẽ panel đang mở; `AbortController` hủy request cũ | Tránh re-render 6 chart cùng lúc khi đổi filter |
| Bảo trì / OCP | Tốt: giữ nguyên `chart-data.ts`, services, contracts; chỉ thêm file + 1 dòng route | RULE-03 |
| Độ tin cậy | `resolvePatternView` làm nguồn duy nhất cho Empty State; không mock | I5 + Demo §4 |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Service trả empty envelope 200/`success:false` (đã sửa ở B1) | Trung bình | Trung bình | `metricsFor` trả `null` → Empty, không throw |
| BE `/analysis/trend|seasonality|correlation` bỏ qua `start_time/end_time` | Cao | Thấp | Chỉ dùng param cho `/temporal`; ghi chú rõ ở UI, không tự suy diễn |
| Heatmap 5×5 sai thứ tự biến | Trung bình | Trung bình | `buildCorrelationCells` giữ nguyên thứ tự `variables[]`, test đối xứng |
| Recharts double-init / kích thước 0 khi ẩn panel | Trung bình | Thấp | ResponsiveContainer + key ổn định; test qua tầng thuần |
| Thiếu `mae`/`rmse` | Cao | Thấp | `evaluationText` → "chưa có dữ liệu kiểm định", không bịa số |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-statistics-six-patterns-charts-thien.md` *(copy `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/chart-data.test.ts` *(bổ sung additive, giữ 12 test cũ)*
  - `apps/web/tests/statistics-view.test.ts` *(mới — `node:test`, thuần)*
- `apps/web/dev-mock.ts` + `apps/web/tests/dev-mock.test.ts` *(bổ sung mock opt-in 4 route `/analysis/*` từ `contracts/examples/analysis_sample.json` — dev-only, `VITE_API_MOCKING=enabled`; fixture được làm giàu đúng schema để preview 6 pattern)*
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test` (baseline 116 sau merge layout, không giảm); `python3 scripts/notes_index.py --check`; đối chiếu `contracts/examples/analysis_sample.json`; kiểm 6 panel hiển thị đúng tên + đổi interval refetch + `insufficient_data` hiện thông điệp BE.
- **Không** chạy `uv run pytest`/`ruff` (không đụng `apps/api`).

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: Người dùng đang thao tác (`thien`) xác nhận rõ trong chat: "Approved" (2026-11-21), sau khi làm rõ rằng 6 pattern phân tích dùng cho page "6 Patterns Phân tích" (`/statistics`). Duyệt toàn bộ §4: 6 panel/chart, transform thuần có sẵn, 3 trạng thái, test offline. Nhánh `feat/2026-11-21-statistics-six-patterns-charts-thien` đã rẽ từ develop (đã gồm layout mới).
Scope of Rejection: -   <!-- bắt buộc khi Rejected -->

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ `thien|son|van|tai`, không cần `ThienleDuc`). Nhánh `feat/2026-11-21-statistics-six-patterns-charts-thien` đã rẽ từ `develop` theo yêu cầu. Sau `Approved`: chạy `build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement §4, validation, dừng CHECKPOINT 1 (cụm `tiếp tục workflow`).
