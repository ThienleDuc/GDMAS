# Proposal: Bộ component biểu đồ Recharts cho 6 Patterns chuỗi thời gian và nâng cấp trang Thống kê

## Metadata
- ID: 2026-11-16-six-patterns-chart-components-thien
- Author: agent | thien
- Created: 2026-11-16
- Type: feature
- Status: approved
- Priority: high
- Area: apps/web/src/components/charts/, apps/web/src/features/statistics/, contracts/schemas/patterns.json, contracts/examples/patterns_sample.json
- Architecture Impact: contracts/ — thêm mới hợp đồng `GET /api/v1/patterns` (`schemas/patterns.json` + `examples/patterns_sample.json`) và mục 3.3 trong `contracts/README.md`; **không** sửa `docs/api/API.md`, không đổi schemas đã có, không đổi DB/`apps/api`.
  <!-- Theo yêu cầu người dùng 2026-11-16: chỉ triển khai FE, dùng mock để test, ghi hợp đồng với BE vào contracts/. -->
- Related Docs:
  - docs/task/thien.md (Task 1)
  - docs/yeucaubatbuoc.md (§2 — 6 Patterns bắt buộc; §3.1 — Dark Mode, Zoom & Filter)
  - docs/architecture.md (§6.6 T6 Frontend, §10.4 Luồng dự báo & phân loại, §12 6 Patterns)
  - docs/api/API.md (§3.3 Pattern 1–6 — hiện trạng endpoint; **không sửa**)
  - contracts/README.md
  - docs/coding-rules.md, docs/quyuocchung.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md (đã Approved/completed) — proposal này **tiêu thụ** đúng `metrics_data` do T3 sinh ra, không sửa T3.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 7 (`apps/web/`, cổng 3000) đã có trang `StatisticsPage.tsx` gọi `GET /api/v1/patterns` và SSE để làm mới dữ liệu. Terminal 3 (`analysis` worker) đã sinh thật Pattern 1–4 vào `analysis_results`; T4/T5 sinh `prediction_results` / `classification_results`. Nhưng tầng hiển thị vẫn chỉ là 6 thẻ chữ, và **chưa có hợp đồng dữ liệu nào cho `/api/v1/patterns`** trong `contracts/`.

### Vấn đề
1. `apps/web/src/components/charts/` mới có `README.md`, **chưa có component biểu đồ nào**; `recharts@^3.10.1` đã khai báo trong `apps/web/package.json` nhưng chưa dùng.
2. `StatisticsPage.tsx` còn nhiều **giá trị dự phòng tĩnh** khi thiếu trường dữ liệu: `data_points ?? 100`, `"24.5 km"`, `"+0.0125"`, `"Tăng nhẹ (Upward)"`, `"24 Giờ (Diurnal)"`, `"1.42"`, `"-0.184"`, `"Tuyến tính nghịch yếu"`, `"4.35"`, `"[3.80 - 4.90]"`, `"MEDIUM"`, `"Random Forest"`. Điều này vi phạm `docs/yeucaubatbuoc.md` ("không hardcode dữ liệu tĩnh tại Frontend") và kịch bản Demo Bước 3 (DB rỗng phải hiện Empty State).
3. Nhiều nhãn hiển thị sai ngữ nghĩa: Pattern 5 hiện ghi `"Dự báo Mag t+1"` trong khi `predicted_value` là **số lượng sự kiện/ngày** (`metric_name = daily_earthquake_count`).
4. Chưa đáp ứng 6 Patterns bắt buộc: thiếu Line/Scatter/Histogram có chuyển khung Ngày–Tuần–Tháng, thiếu Brush zoom cho Trend, thiếu Seasonal line, thiếu Heatmap tương quan, thiếu dải tin cậy 95% và phân phối xác suất rủi ro.
5. `contracts/` **chưa có schema** cho payload `/api/v1/patterns` (chỉ có `earthquake.json`, `sse-event.json`), nên FE và BE không có văn bản ràng buộc chung; các khóa `evaluation_metrics` (mae/rmse) và `model_version` của Pattern 5 hiện **chưa được route trả** cũng chưa được ghi nhận ở đâu.

### Ảnh hưởng
Không có biểu đồ thật thì phần "trực quan hóa 6 patterns" — tiêu chí chất lượng bắt buộc của đồ án — không đạt; số liệu dự phòng tĩnh làm sai lệch báo cáo/phản biện; thiếu hợp đồng khiến FE phải đoán payload và dễ vỡ khi BE đổi cấu trúc.

---

## 2. Hiện trạng
- `apps/web/src/components/charts/README.md` — chỉ mô tả danh mục, không có code.
- `apps/web/src/features/statistics/StatisticsPage.tsx` — grid 6 thẻ; đọc `livePattern.metrics` kiểu `Record<string, any>`; nhiều fallback tĩnh (xem §1.2); giữ banner DB rỗng, SSE `database_cleared`, nút Làm mới.
- `apps/web/src/services/earthquake-api.ts` — `PatternItem.metrics: Record<string, any>`; `getPatterns()` gọi `/api/v1/patterns`; chưa có endpoint `/analysis/*`, `/predictions`, `/classifications` (thuộc Task 4).
- `apps/api/src/gdmas/api/routes/patterns.py` (**chỉ đọc để lấy shape, không sửa**) — trả 6 pattern; Pattern 5 có `target_date`, `predicted_value`, `lower_bound`, `upper_bound`, `model_name`; Pattern 6 có `predicted_label`, `probability_scores`, `model_name`.
- `apps/api/src/gdmas/services/analysis/patterns.py` (**chỉ đọc**) — `metrics_data` thực tế:
  - Pattern 1: `status`, `interval`, `line_chart[{date,event_count,max_magnitude,avg_magnitude}]`, `scatter_plot[{id,timestamp,magnitude,depth_km}]`, `histogram.magnitude_bins[{bin,count}]`, `data_points`, `avg_magnitude`, `max_magnitude`, `avg_depth`.
  - Pattern 2: `status`, `resample_freq`, `interval`, `metric`, `series[{period,actual_value,trend_value,is_complete}]`, `slope`, `trend_direction`, `direction`, `p_value`, `r_squared`, `data_points`, `complete_periods`.
  - Pattern 3: `status`, `interval`, `components.{seasonal_line[{cycle_index,period_label,seasonal_factor,seasonal_effect}],residual_variance,seasonality_strength,interpretation}`, `cycle_hours`, `amplitude`, `data_points`; không đủ chu kỳ → `status = insufficient_data`, `seasonal_line: []`.
  - Pattern 4: `status`, `variables[5]`, `matrix[5][5]` (có thể `null`), `method`, `spearman_matrix`, `sample_size`, `undefined_pairs`, `note`, `corr_mag_depth`, `correlation_strength`.
- `contracts/` — chỉ có `schemas/{earthquake,sse-event}.json` + `examples/earthquake_sample.json`; `contracts/README.md` §2 lại liệt kê các file chưa tồn tại (`aggregate.json`, `cluster.json`, `prediction.json`…), cho thấy chủ trương bổ sung hợp đồng là đúng hướng.
- `apps/web/package.json` — chưa có test script; `apps/web` chưa cài `node_modules`; Node hiện tại `v22.23.4` hỗ trợ chạy trực tiếp `.ts` (type stripping) nên **không cần thêm devDependency** để test offline.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Tạo bộ component biểu đồ Recharts trong `apps/web/src/components/charts/` cho đủ 6 Patterns, tách phần biến đổi dữ liệu thuần (`chart-data.ts`) khỏi phần render.
  2. Pattern 1: Line (số lượng + độ lớn), Scatter (`depth_km` × `magnitude`), Histogram (bin độ lớn) + nút `Ngày | Tuần | Tháng` (`day|week|month`).
  3. Pattern 2: Line 2 chuỗi `actual_value` vs `trend_value` + `<Brush>` zoom + hiển thị `slope`, `trend_direction`, `r_squared`, `p_value`, mức re-sampling (`interval`).
  4. Pattern 3: Seasonal line từ `components.seasonal_line` + chỉ số `seasonality_strength`, `amplitude`, `cycle_hours`, `interpretation`.
  5. Pattern 4: Heatmap 5×5 (`variables`/`matrix`) tương phản cao trên nền tối, tooltip hiện hệ số Pearson tới 4 chữ số thập phân, tế bào `null` hiển thị "không xác định".
  6. Pattern 5: Dự báo `t+1` + dải tin cậy 95% (`lower_bound`→`upper_bound`), `model_name`/`model_version`, `mae`/`rmse`; phân biệt màu/nét đứt giữa **quan sát thực tế** và **dự báo** (`docs/architecture.md` §10.4). Khi API chưa trả `evaluation_metrics` → hiện "chưa có dữ liệu kiểm định", **không bịa số**.
  7. Pattern 6: Nhãn rủi ro `LOW | MEDIUM/NORMAL | HIGH | CRITICAL` + thanh phân phối xác suất từng lớp + ghi chú "chỉ báo thống kê thử nghiệm".
  8. Mọi pattern `PENDING`, thiếu bản ghi hoặc payload rỗng (`status = insufficient_data`) → Empty State rõ ràng; **xóa toàn bộ fallback tĩnh** trong `StatisticsPage.tsx`; giá trị thiếu hiển thị `—` kèm nhãn "chưa có dữ liệu".
  9. **Ghi hợp đồng dữ liệu** `GET /api/v1/patterns` vào `contracts/schemas/patterns.json` + mock payload `contracts/examples/patterns_sample.json`; các khóa tương lai (`evaluation_metrics`, `model_version`, `metric_name`, `generated_at` của Pattern 5) khai báo **optional** để BE có thể bổ sung sau mà FE không vỡ.
- **Không nằm trong mục tiêu (Out of Scope):**
  - **Mọi thay đổi trong `apps/api/`** (route, worker, model, migration, test backend) — người dùng chốt 2026-11-16: **không làm BE**.
  - Sửa `docs/api/API.md` (giữ làm hiện trạng endpoint) và các schema contract đã có.
  - Task 2 (bản đồ Leaflet + DBSCAN), Task 3 (Reports/Settings), Task 4 (typed contracts toàn bộ `src/contracts`, `/analysis/*`, `/predictions`, `/classifications`, `/system/status`).
  - Alembic migration, `main.py`, `demo_seeder.py`, thay đổi schema DB.

---

## 4. Giải pháp đề xuất
Tuân thủ **RULE-03 (Open-Closed)**: chỉ thêm file mới trong `components/charts/`, không xóa/đổi chữ ký `getPatterns()`, `useSSE()`, `formatEventTime()`; `StatisticsPage.tsx` chỉ thay phần thân hiển thị, giữ nguyên logic fetch/SSE/banner.

### 4.1. Tệp mới (`apps/web/src/components/charts/`)
| Tệp | Vai trò |
|---|---|
| `types.ts` | Interface `TemporalMetrics`, `TrendMetrics`, `SeasonalityMetrics`, `CorrelationMetrics`, `PredictionMetrics`, `ClassificationMetrics`, `RiskLevel`; khai báo **optional** để chịu payload thiếu khóa. |
| `theme.ts` | Bảng màu Dark Mode dùng chung (cyan/indigo/emerald/amber/rose/purple), `RISK_COLORS`, `correlationColor(r)`, hằng số grid/axis. |
| `chart-data.ts` | Hàm **thuần, không React, không I/O** — đơn vị kiểm thử offline: `startOfIsoWeekUtc`, `bucketKeyUtc(date, interval)`, `buildLineSeriesFromScatter(points, interval)`, `buildHistogramBins(bins)`, `buildTrendSeries(series)`, `buildSeasonalSeries(components)`, `buildForecastBand(observed, prediction)`, `buildRiskBars(probabilityScores)`, `normalizeRiskLabel(raw)`, `resolvePatternView(pattern)`, `isFiniteNumber`, `formatNumber`, `formatCoefficient`. |
| `EmptyChartState.tsx` | Khối rỗng dùng chung (icon + tiêu đề + lý do: PENDING / chưa có bản ghi / `insufficient_data`), không render số. |
| `ChartPanel.tsx` | Khung panel: tiêu đề pattern, badge `COMPUTED`/`PENDING`, `period`, mô tả thuật toán, slot `children`, tự gọi `EmptyChartState` khi `resolvePatternView()` báo rỗng. |
| `TemporalPatternCharts.tsx` | 3 biểu đồ Recharts + segmented control `Ngày/Tuần/Tháng`; Line dùng `ComposedChart` với `YAxis` kép (`event_count` trái, `max_magnitude`/`avg_magnitude` phải). |
| `TrendPatternChart.tsx` | `LineChart` 2 `Line` + `<Brush>` + `ReferenceLine` slope; chip `slope`, `trend_direction`, `r_squared`, `p_value`, `complete_periods`. |
| `SeasonalityPatternChart.tsx` | `LineChart` `seasonal_factor` theo `period_label` + `ReferenceLine y=1`; thanh cường độ mùa vụ; khối `interpretation`. |
| `CorrelationHeatmap.tsx` | Lưới CSS 5×5 (Recharts không có heatmap) với thang màu phân kỳ `-1 → 0 → +1`, tooltip nổi hiện `r` chính xác 4 chữ số + `method` + `sample_size`; tế bào `null` = "—". |
| `ForecastPatternChart.tsx` | `ComposedChart`: line liền = quan sát thực tế, line nét đứt + marker = dự báo `t+1`, `Area` dải tin cậy (wedge từ điểm thực cuối tới `lower/upper`), card số liệu dự báo + `model_name`, `mae`, `rmse` (nếu có). |
| `ClassificationPatternChart.tsx` | Badge nhãn rủi ro + `BarChart` ngang phân phối xác suất 4 lớp (chuẩn hóa `Normal Activity` → `MEDIUM`) + disclaimer thử nghiệm. |
| `index.ts` | Barrel export cho `StatisticsPage` (và Task 3/Reports sau này). |

### 4.2. Hợp đồng dữ liệu với BE (`contracts/`)
- **`contracts/schemas/patterns.json`** (JSON Schema draft 2020-12): mô tả `GET /api/v1/patterns` → `{success, total_patterns, patterns[6], clustering_summary, message?, last_updated?}`; mỗi pattern bắt buộc `{id, name, type, status ∈ COMPUTED|PENDING, metrics, period}`; định nghĩa `metrics` chi tiết cho từng `pattern_1`…`pattern_6` theo shape ở §2.
  - Pattern 5 khai báo **optional**: `metric_name`, `model_version`, `evaluation_metrics.{mae,rmse,confidence_level}`, `generated_at` — đây là phần "hợp đồng với BE" để đợt sau BE bổ sung mà FE đã sẵn sàng đọc.
  - Pattern 3/4 khai báo `status = insufficient_data` và các trường có thể `null`.
- **`contracts/examples/patterns_sample.json`**: mock payload đầy đủ 6 patterns (dữ liệu UTC `Z`, `latitude`/`longitude` WGS84, kèm 1 pattern `PENDING` để demo Empty State) — dùng làm **fixture cho test FE**, không dùng trong runtime.
- **`contracts/README.md`**: thêm mục `3.3 Hợp đồng 6 Patterns (/api/v1/patterns)` trỏ tới schema + example; sửa danh sách §2 cho khớp file thực tế (không xóa mục đã có, chỉ ghi rõ trạng thái "sẽ bổ sung").
- Không sửa `contracts/schemas/earthquake.json`, `contracts/schemas/sse-event.json`, `contracts/examples/earthquake_sample.json`, `docs/api/API.md`.

### 4.3. Nguồn dữ liệu & chuyển khung thời gian
- Một nguồn duy nhất `GET /api/v1/patterns` (đã có, kèm SSE refresh) — không thêm request mới trong task này.
- Toggle Ngày/Tuần/Tháng: nếu `metrics.interval === interval` thì dùng `metrics.line_chart` của server; ngược lại **re-bucket `scatter_plot` phía client** bằng `bucketKeyUtc` (UTC, tuần bắt đầu Thứ 2, tháng `YYYY-MM`) rồi tính `event_count`, `avg_magnitude`, `max_magnitude`. Không bịa điểm: `scatter_plot` rỗng → Empty State.
- Mọi timestamp hiển thị đi qua `formatEventTime`/nhãn UTC (`I3`); không dùng giờ local ngầm định khi gom nhóm.
- Pattern 5 dùng `pattern_2.series.actual_value` (nếu có) làm lịch sử quan sát; fallback `pattern_1.line_chart` (interval `day`); nếu cả hai rỗng → chỉ hiển thị card dự báo + dải tin cậy, không vẽ line giả.

### 4.4. Empty State & loại bỏ fallback tĩnh
- Hàm `resolvePatternView(pattern)` trả `{ available, reason }`:
  - `!pattern` → "Chưa có bản ghi trong CSDL";
  - `status !== "COMPUTED"` → "PENDING — worker chưa tính toán";
  - `status === "insufficient_data"` (Pattern 3/4) → hiển thị `interpretation`/`note` của backend;
  - mảng/biến cần thiết rỗng → Empty State thay vì vẽ trục trống.
- Bỏ toàn bộ `?? 100`, `?? "24.5 km"`, `?? "+0.0125"`...; thay bằng `formatNumber(value)` trả `"—"` khi `null/undefined/NaN`.
- Sửa nhãn Pattern 5 thành "Số sự kiện dự báo t+1" (đơn vị theo `metric_name`), không gọi là magnitude.

### 4.5. Kiểm thử offline (không đụng BE)
- `apps/web/tests/chart-data.test.ts` chạy bằng `node --test` (Node 22 type stripping, **không cần cài thêm package**):
  - Đọc `contracts/examples/patterns_sample.json` bằng `node:fs` (offline, không mạng) → map qua `chart-data.ts` để chứng minh **hợp đồng mẫu render được** (TC happy path).
  - Bucket UTC (biên ngày/tuần/tháng, hậu tố `Z`, tuần bắt đầu Thứ 2).
  - Histogram/bins, dải tin cậy 95%, chuẩn hóa nhãn rủi ro (`Normal Activity` → `MEDIUM`, `CRITICAL` giữ nguyên).
  - `resolvePatternView` cho `PENDING`, thiếu bản ghi, `insufficient_data`, payload rỗng → luôn `available: false`.
  - `formatNumber`/`formatCoefficient` không bao giờ trả số dự phòng tĩnh.
- Thêm script `"test": "node --test tests/*.test.ts"` vào `apps/web/package.json` (không thêm dependency).
- **Không tạo test backend**, không chạy `pytest` cho task này.

---

## 5. Phương án đã cân nhắc
### Phương án A: Gọi các endpoint chi tiết `/api/v1/analysis/temporal|trend|seasonality|correlation`, `/predictions`, `/classifications`
Ưu: đúng hợp đồng `docs/api/API.md` §3.3, payload sạch theo từng pattern. Nhược: **các endpoint này chưa tồn tại** trong `apps/api/src/gdmas/api/router.py` (thuộc Task 4) → muốn dùng phải làm BE, trái chỉ thị "không làm BE". **Không chọn.**

### Phương án B: Dùng duy nhất `GET /api/v1/patterns` + hợp đồng `contracts/` + mock fixture (chọn)
Ưu: chạy được ngay với dữ liệu thật T3/T5 đã sinh; một request; FE có văn bản ràng buộc với BE; test offline bằng mock contract. Nhược: Pattern 1 phải re-bucket từ `scatter_plot` (giới hạn 2000 điểm mới nhất) khi đổi khung; Pattern 5 hiện thiếu `mae/rmse` → hiển thị trung thực "chưa có dữ liệu kiểm định" cho tới khi BE bổ sung theo hợp đồng.

### Phương án C: Nhúng mock payload vào runtime FE để giao diện luôn "đầy"
Ưu: demo trông đủ số. Nhược: vi phạm `docs/yeucaubatbuoc.md` và kịch bản Demo Bước 3 (DB rỗng), trái I5. **Loại bỏ** — mock chỉ tồn tại trong `contracts/examples/` và test.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +12 tệp FE (~900–1100 dòng) + 2 tệp contract | Tách `chart-data.ts` thuần để test offline, component mỗi pattern độc lập |
| Hiệu năng | Recharts render 6 panel; Scatter tối đa 2000 điểm; re-bucket client chỉ khi đổi tab | Dữ liệu đã được giới hạn từ T3; không thêm request |
| Bảo trì / Open-Closed | Không sửa `apps/api`, không xóa file cũ, không đổi chữ ký service/hook | `StatisticsPage` chỉ thay phần render; hợp đồng nằm ở `contracts/` |
| Độ tin cậy | Không còn số dự phòng tĩnh | `resolvePatternView` + `formatNumber("—")` |
| Phối hợp BE | Hợp đồng ghi trước, BE bổ sung sau | `evaluation_metrics`/`model_version` là optional trong schema |
| Ngữ nghĩa dữ liệu | Sửa nhãn Pattern 5 từ "Mag" → "Số sự kiện/ngày" | Đúng `metric_name = daily_earthquake_count` |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `apps/web/node_modules` chưa cài, máy không có mạng → không chạy được `pnpm build` | Trung bình | Trung bình | Chạy `pnpm install --frozen-lockfile` trước validation; nếu offline hoàn toàn, ghi rõ `NOT_RUN` trong `status.md` và không merge |
| Recharts v3 đổi API `Brush`/`Area` | Thấp | Trung bình | Chỉ dùng component ổn định (`LineChart/ComposedChart/BarChart/Area/XAxis/YAxis/Tooltip/Legend/Brush`); kiểm bằng `tsc -b` |
| Backend đổi shape `metrics_data` tương lai | Thấp | Trung bình | Interface optional + `resolvePatternView` coi thiếu khóa là rỗng, không crash; schema contract là nguồn tham chiếu |
| Sửa `contracts/` là vùng khóa | Trung bình | Thấp | Có chỉ thị rõ của người dùng 2026-11-16; chỉ **thêm** file/mục mới, không sửa schema cũ; ghi rõ trong PR |
| Re-bucket từ `scatter_plot` lệch số với server do giới hạn 2000 điểm | Trung bình | Thấp | Ưu tiên `line_chart` server khi khớp `interval`; ghi chú giới hạn trong tooltip panel |
| Pattern 5 hiện không có `mae/rmse` → demo trông thiếu | Cao | Thấp | Hiện "chưa có dữ liệu kiểm định"; mock contract có mẫu để chạy test; đề xuất BE bổ sung ở đợt sau |
| Heatmap không dùng Recharts | Thấp | Thấp | Lưới CSS có ARIA label + tooltip; các biểu đồ còn lại đều Recharts |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline 100%, không BE):**
  - `apps/web/tests/chart-data.test.ts` — `node --test`; fixture đọc từ `contracts/examples/patterns_sample.json`; không gọi mạng, không `fetch`, không `EventSource`.
- **Cách kiểm chứng:**
  - `cd apps/web && pnpm install --frozen-lockfile && pnpm test && pnpm build` (`tsc -b && vite build`).
  - `python3 -c "import json;json.load(open('contracts/schemas/patterns.json'));json.load(open('contracts/examples/patterns_sample.json'))"` (JSON hợp lệ).
  - `python3 scripts/notes_index.py --check`
  - Kiểm thủ công: DB rỗng (Demo Bước 3) → cả 6 panel hiện Empty State; có dữ liệu → đủ 6 biểu đồ, Brush kéo được, tooltip heatmap hiện 4 chữ số.
- **Không chạy `uv run pytest`/`ruff`** cho task này vì không đụng `apps/api`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-16
Comments: Người dùng xác nhận trong chat 2026-11-16 ("đồng ý triển khai") cho bản revision FE-only: chỉ làm `apps/web/` + thêm hợp đồng tại `contracts/`, dùng mock trong `contracts/examples/` để test, **không làm BE**. Người dùng yêu cầu dừng ở bước commit để tự kiểm thử trước khi đẩy PR.
Scope of Rejection: -

---

## 10. Next Action
Đã `Approved` — agent chạy `build-implementation`: `./scripts/git-ship.sh start feat/2026-11-16-six-patterns-chart-components-thien`, sinh đồng thời `implemented/<id>/{plan.md,status.md}` và `testcase/<id>.md`, triển khai theo In Scope, chạy validation; **dừng trước bước commit** để người dùng kiểm thử.

### Revision 2026-11-16
- Bỏ `apps/api/src/gdmas/api/routes/patterns.py` và `apps/api/tests/unit/test_patterns_route.py` khỏi phạm vi; task còn **FE-only**.
- Thêm `contracts/schemas/patterns.json`, `contracts/examples/patterns_sample.json`, mục 3.3 trong `contracts/README.md` làm hợp đồng dữ liệu với BE (kèm optional `evaluation_metrics`/`model_version` cho Pattern 5).
- Đổi kiểm chứng: chỉ `pnpm test` + `pnpm build` + JSON contract check + `notes_index.py --check`; mock payload trong `contracts/examples/` là fixture offline duy nhất.
- Giữ nguyên mục tiêu 6 biểu đồ, Empty State và việc xóa fallback tĩnh; Pattern 5 hiển thị trung thực khi API chưa có `mae/rmse`.
