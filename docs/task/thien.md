# Danh sách Task — Lê Đức Thiện (`thien` / `ThienleDuc`)

Vai trò: Frontend Developer & Techlead (Terminal 7 — `apps/web/`, cổng `3000`).

Phạm vi phụ trách: Xây dựng SPA React + TypeScript + Vite theo design system `apps/web/src/styles/globals.css`, tiêu thụ **duy nhất** Database API (Terminal 6), trực quan hóa 6 Patterns chuỗi thời gian, bản đồ GIS tương tác, luồng SSE và đáp ứng Kịch bản Demo 6 bước từ dữ liệu thật.

> Sau đợt tái cấu trúc 2026-11-20 (PR #26), các component/page cũ trong `components/` và `features/` đã được gỡ. Các task dưới đây được viết lại **trên nền mới**: một layout duy nhất, `index.css` chỉ import, contracts tách theo schema và `lib/` gồm API client/SSE/formatters/transforms. Trang hiện đang là `PlaceholderPage`.

---

## 0. Căn cứ đối chiếu & mô hình 7 Terminals

### 0.1. Tài liệu nguồn (đã đối chiếu khi viết lại task)

| Tài liệu | Mục sử dụng làm căn cứ |
|---|---|
| `docs/api/API.md` | §2 envelope `{success,data,metadata}` / `{success,error}`; §3.1 health/system-status; §3.2 earthquakes/statistics; §3.3 6 patterns; §3.4 clusters; §3.5 SSE; §4 6 mã lỗi |
| `docs/architecture/SAD.md` | §3.3 phân bổ 7 Terminals; §4 đặc tả từng khối; §5 bảng 6 Patterns ↔ khối đảm nhiệm; §7 chịu lỗi |
| `docs/architecture/ERD.md` | §2.1–2.6 các bảng nguồn (`earthquake_events`, `analysis_results`, `clustering_results`, `prediction_results`, `classification_results`, `service_runs`) |
| `docs/architecture.md` | §6.6 trách nhiệm T7; §9.4 kiểm soát dữ liệu cũ; §12 cấu trúc mã nguồn FE |
| `docs/yeucaubatbuoc.md` | §2 6 Patterns bắt buộc; §3.1 deliverable UI; §4 Demo 6 bước; §5 thang điểm (UI 1.0 + patterns 3.0) |
| `docs/task/{son,van,tai}.md` | Ranh giới T2/T3 (Sơn), T1/T4 (Văn), T5/T6 (Tài) — tránh chồng chéo |

### 0.2. Ma trận 7 Terminals ↔ trách nhiệm Terminal 7

| Terminal | Khối / chủ sở hữu | Tần suất | Dữ liệu FE tiêu thụ (qua T6) | Task T7 tương ứng |
|---|---|---|---|---|
| **T1** | PostgreSQL 16 — `van` | Luôn chạy | Gián tiếp qua `/system/status`; kịch bản xóa rỗng/phục hồi | T7.11, T7.13 |
| **T2** | Data Ingestion — `son` | 5 phút | `/earthquakes`, SSE `earthquake_detected` / `ingestion_cycle_completed` | T7.03, T7.04, T7.10 |
| **T3** | Data Analysis — `son` | 5 phút | `/analysis/temporal`, `/trend`, `/seasonality`, `/correlation`, `/patterns` | T7.06, T7.07, T7.08 |
| **T4** | Clustering — `van` | 1 ngày | `/clusters` (fallback `clustering_summary` của `/patterns`) | T7.05 |
| **T5** | Prediction — `tai` | 5 phút | `/predictions`, `/classifications` | T7.09 |
| **T6** | FastAPI REST + SSE — `tai` | Luôn chạy (`:8000`) | Mọi endpoint + envelope + 6 mã lỗi + SSE | T7.01, T7.02, T7.10 |
| **T7** | Frontend — `thien` | Luôn chạy (`:3000`) | `apps/web/` — shell, charts, map, settings, report, test | Tất cả task |

**Nguyên tắc cứng:** T7 **không** truy cập PostgreSQL, không gọi USGS, không gọi trực tiếp worker T2–T5. Mọi dữ liệu đi qua T6. Khi T6 trả 404/503 → dùng `getOptionalApi()` → `unavailable: true`, hiển thị Empty State; **tuyệt đối không thay bằng mock tĩnh** (`contracts/README.md` §3.8, I5).

### 0.3. Tiến độ cập nhật 2026-11-20

| Task | Trạng thái | Bằng chứng / phần còn lại |
|---|---|---|
| T7.01 — Nền tảng FE | Hoàn tất, đã merge | PR #26; `.agents/notes/implemented/2026-11-20-fe-restructure-globals-css-thien/` |
| T7.02 — Đối chiếu hợp đồng T6↔T7 | Chưa bắt đầu | Cần rà soát 11 module contracts với `docs/api/API.md` |
| T7.03 — Danh mục động đất + bộ lọc | Cần xây lại | Bản cũ đã gỡ trong PR #26 |
| T7.04 — Bản đồ Leaflet | Cần xây lại | Bản cũ đã gỡ trong PR #26 |
| T7.05 — Lớp cụm DBSCAN | Cần xây lại | Bản cũ đã gỡ trong PR #26 |
| T7.06 — Pattern 1 (3 biểu đồ) | Cần xây lại | Có sẵn `lib/transforms/chart-data.ts` để dùng lại |
| T7.07 — Pattern 2 & 3 (Trend/Seasonality) | Cần xây lại | Có sẵn transform thuần |
| T7.08 — Pattern 4 (Correlation) | Cần xây lại | Có sẵn transform thuần |
| T7.09 — Pattern 5 & 6 (Prediction/Classification) | Cần xây lại | Có sẵn `normalizeRiskLabel`/`buildRiskBars` |
| T7.10 — SSE realtime shell | Hạ tầng xong, UI chưa | `lib/sse.ts` + `useSSE` đã chạy; cần badge/toast trên layout |
| T7.11 — Cài đặt 7 Terminals | Cần xây lại | Có sẵn `lib/transforms/settings-data.ts` (ngưỡng stale) |
| T7.12 — Báo cáo & xuất bản | Cần xây lại | Phải thay toàn bộ số liệu tĩnh bằng API thật |
| T7.13 — Kịch bản Demo 6 bước | Chưa kiểm chứng | Cần test empty→recovery sau PR #26 |
| T7.14 — Bộ test FE offline | Đang có nền | 56 test hiện hữu; cần thêm test cho UI mới |

### 0.4. Quy ước chung cho mọi task

- **I1:** T7 chỉ giao tiếp T6; không nhúng worker hay gọi DB.
- **I2 / RULE-03:** mở rộng bằng file/component mới; giữ chữ ký `useSSE(endpoint?)`, `fetchApi`, barrel `contracts/`/`lib/`.
- **I3:** timestamp UTC ISO 8601 `Z` (`lib/formatters.ts` → `toUtcIso`, `isUtcIso`); tọa độ WGS84 (`isWgs84`, `formatWgs84Point`). Quy đổi giờ địa phương chỉ ở tầng hiển thị (`utils/timezone.ts`).
- **I5:** dùng token `globals.css`, Dark Mode, đủ 3 trạng thái Loading/Error/Empty; không hardcode số liệu.
- **I7:** test offline 100% (mock fetch/EventSource), kèm `.agents/notes/testcase/<id>.md` khi có logic mới.
- **Đường dẫn nền tảng:** `app/App.tsx` + `app/routes.tsx` (6 route), `layouts/DashboardLayout.tsx` (aside + `Outlet`), `styles/index.css` (chỉ import), `contracts/index.ts`, `lib/index.ts`, `services/earthquake-api.ts`.

---

## Nhóm A — Nền tảng & hợp đồng (T6 + T7)

### Task T7.01 — Hoàn tất nền tảng FE (ĐÃ XONG — giữ lại làm căn cứ)

**Mô tả:** Dọn UI cũ, thiết lập nền dùng `globals.css`, layout đơn nhất, contracts/lib tái thiết. Xem chi tiết tại `.agents/notes/implemented/2026-11-20-fe-restructure-globals-css-thien/`.

---

### Task T7.02 — Kiểm chứng hợp đồng T6 ↔ T7 và lớp Services

**Terminal liên quan:** T6 (FastAPI), T7.

**Mô tả:** Đối chiếu 11 module trong `apps/web/src/contracts/` với `docs/api/API.md` §2–§4 và `contracts/schemas/`; bảo đảm mọi hàm trong `services/earthquake-api.ts` trả đúng envelope và xử lý lỗi chuẩn.

**Đầu việc:**
- Rà soát 20 hàm service (health, system/status, earthquakes, statistics, 4 analysis, predictions, classifications, clusters, patterns, sync) khớp đường dẫn và tham số `API.md` §3.
- Kiểm tra `getOptionalApi()` phân biệt đúng 404 (`unavailable: true`) và các lỗi 0/400/500/503 (ném `ApiError`).
- Chuẩn hóa query params: `start_time`/`end_time` ISO UTC `Z`, bbox WGS84 đúng tên `min_lat/max_lat/min_lon/max_lon` (§3.2).
- Bổ sung type guard cho envelope trước khi đưa vào state (không dùng `any`).

**Tệp dự kiến:** `src/contracts/*.ts`, `src/services/earthquake-api.ts`, `src/lib/api-client.ts`, `tests/services.test.ts`, `tests/contract-mocks.test.ts`.

**DoD:** Mọi endpoint trong `API.md` §3 có 1 hàm service tương ứng; test mock pass; `pnpm build` sạch.

**Kiểm chứng:** `cd apps/web && pnpm build && pnpm test`.

**Phụ thuộc:** T7.01 (xong); T6 đã có đủ route theo notes `2026-11-12-api-rest-endpoints-tai`.

---

## Nhóm B — Dữ liệu động đất & bản đồ (T1 / T2 / T4)

### Task T7.03 — Trang Danh mục động đất với bộ lọc thời gian & độ lớn

**Terminal liên quan:** T1 (dữ liệu gốc), T2 (cập nhật 5 phút), T6 (`GET /api/v1/earthquakes`).

**Mô tả:** Xây trang `/earthquakes` (route `APP_ROUTES.EARTHQUAKES`) hiển thị bảng sự kiện thật, phân trang và lọc.

**Đầu việc:**
- Gọi `getEarthquakes(params)` với `QueryEarthquakeParams`: `page`, `limit`, `min/max_magnitude`, `min/max_depth`, `start_time/end_time` UTC, bbox WGS84, `sort_by`, `order`.
- Bộ lọc Ngày/Tuần/Tháng + thanh magnitude/depth (debounce); đổi filter → refetch, reset `page = 1`.
- Hiển thị `event_time` qua `formatEventTime` (UTC mặc định, cho phép UTC+7), tọa độ qua `formatWgs84Point`.
- Đủ 3 trạng thái: Loading (skeleton), Error (`ApiError` + nút Retry), Empty (0 bản ghi sau khi DB xóa rỗng).

**Tệp dự kiến:** `src/features/earthquakes/EarthquakesPage.tsx` (+ CSS riêng nếu cần), `src/app/App.tsx` (thay `PlaceholderPage`).

**DoD:** F12 Network thấy `GET /api/v1/earthquakes?...` trả dữ liệu thật; filter đổi đúng query; DB rỗng → Empty State, không fallback mock.

**Kiểm chứng:** `pnpm build`; unit test mock `fetchApi` cho 4 trạng thái; đối chiếu `API.md` §3.2.

**Phụ thuộc:** T7.01, T7.02.

---

### Task T7.04 — Bản đồ GIS Leaflet với marker động đất

**Terminal liên quan:** T2 (nguồn sự kiện), T6 (`/earthquakes`, SSE), T1 (WGS84).

**Mô tả:** Xây trang `/monitoring` (route `APP_ROUTES.MONITORING`) trên nền layout đơn nhất, dùng `leaflet`/`react-leaflet` có sẵn.

**Đầu việc:**
- Nạp tile Dark Mode; vẽ marker từ `EarthquakeItem[]` theo đúng `latitude`, `longitude` (WGS84).
- Kích thước/màu marker theo `magnitude` và `depth_km` (dùng `magnitudeToRadius`, `magnitudeToColor`, `depthToOpacity` từ `lib/transforms/map-data.ts`).
- Popup chi tiết: `place`, `source_event_id`, `event_time` (UTC + local), `depth_km`, `magnitude`, `source_url`.
- Điều khiển nổi: thanh trượt magnitude (debounce), khoảng thời gian, hiển thị tọa độ tâm bản đồ thực (không số tĩnh).
- Không import `leaflet` trong file thuần để test offline (`map-data.ts` giữ nguyên).

**Tệp dự kiến:** `src/features/monitoring/MonitoringMapPage.tsx`, `src/components/map/*` (mới), `tests/geo-format.test.ts`, `tests/map-data.test.ts`.

**DoD:** Marker khớp tọa độ sample `contracts/examples/earthquake_sample.json`; popup đủ 6 trường; DB rỗng → bản đồ vẫn nạp, overlay báo "không có sự kiện".

**Kiểm chứng:** `pnpm build`; test thuần WGS84/Haversine pass.

**Phụ thuộc:** T7.01, T7.03, T7.10 (SSE cập nhật marker).

---

### Task T7.05 — Lớp cụm DBSCAN trên bản đồ

**Terminal liên quan:** T4 (chạy 1 ngày/lần), T6 (`GET /api/v1/clusters`).

**Mô tả:** Hiển thị kết quả phân cụm lên bản đồ T7.04.

**Đầu việc:**
- Gọi `getClusters()`; nếu 404 → `getClustersOptional()` rồi fallback `clustering_summary` của `getPatterns()` qua `normalizeClusters()` (`lib/transforms/map-data.ts`, chấp nhận alias `id/lat/lon/events_count/avg_mag`).
- Vẽ tâm cụm `center_latitude`/`center_longitude`, vòng bán kính (`radius_km` hoặc `parameters.eps_km`), popup `event_count`, `avg_magnitude`, `max_magnitude`, `dominant_place`.
- Công tắc "Hiển thị cụm DBSCAN"; thiếu `max_magnitude`/`radius_km` → "—" / `eps_km`, **không bịa số** (`contracts/README.md` §3.4).

**Tệp dự kiến:** `src/components/map/ClusterLayer.tsx`, `src/features/monitoring/MonitoringMapPage.tsx`, `tests/map-data.test.ts`.

**DoD:** Cluster sample `contracts/examples/clusters_sample.json` hiển thị đúng tâm + số lượng; fallback legacy hoạt động khi `/clusters` 404.

**Kiểm chứng:** `pnpm build`; test `normalizeClusters` với cả 2 shape.

**Phụ thuộc:** T7.04; T4 đã merge (notes `2026-11-12-...` của `van`).

---

## Nhóm C — Trực quan hóa 6 Patterns (T3 / T5)

### Task T7.06 — Pattern 1: Line / Scatter / Histogram theo Ngày–Tuần–Tháng

**Terminal liên quan:** T3 (Analysis 5 phút), T6 (`GET /api/v1/analysis/temporal`).

**Mô tả:** Dựng 3 biểu đồ Pattern 1 trong `src/components/charts/` và nhúng vào trang `/statistics`.

**Đầu việc:**
- Gọi `getTemporalAnalysis({ interval, start_time, end_time })`; nút chuyển `day | week | month`.
- Line: `line_chart[]` (`date`, `event_count`, `max_magnitude`, `avg_magnitude`); Scatter: `scatter_plot[]` (`magnitude` vs `depth_km`, timestamp UTC `Z`); Histogram: `histogram.magnitude_bins[]`.
- Dùng các hàm thuần có sẵn: `buildLineSeriesFromScatter`, `buildHistogramBins`, `asTemporal` (`lib/transforms/chart-data.ts`); thiếu số liệu → `null`/`"—"`, **không** giá trị dự phòng.
- Zoom/Brush và filter thời gian (điểm cộng `yeucaubatbuoc.md` §3.1).

**Tệp dự kiến:** `src/components/charts/TemporalPatternCharts.tsx`, `src/features/statistics/StatisticsPage.tsx`, `tests/chart-data.test.ts`.

**DoD:** 3 biểu đồ hiển thị từ API thật; đổi interval refetch đúng; `status = insufficient_data` → Empty State kèm thông điệp BE.

**Kiểm chứng:** `pnpm build`; test transform offline với `contracts/examples/analysis_sample.json`.

**Phụ thuộc:** T7.01, T7.02.

---

### Task T7.07 — Pattern 2 & 3: Trend sau Re-sampling + Seasonality

**Terminal liên quan:** T3, T6 (`/analysis/trend`, `/analysis/seasonality`).

**Mô tả:** Hai biểu đồ so sánh thực tế/đường xu hướng và chu kỳ mùa vụ.

**Đầu việc:**
- Trend: `getTrendAnalysis({ resample_freq: 'W'|'M', metric })`; vẽ `series[].actual_value` vs `trend_value`; hiển thị `slope`, `trend_direction`, `r_squared`; Brush zoom.
- Seasonality: `getSeasonalityAnalysis()`; vẽ `components.seasonal_line[]` (`cycle_index`, `period_label`, `seasonal_factor`), hiển thị `seasonality_strength`, `interpretation`.
- Dùng `buildTrendSeries`, `buildSeasonalSeries`, `asTrend`, `asSeasonality` từ `lib/transforms/chart-data.ts`.
- Dữ liệu thiếu/`PENDING` → Empty State, không tự suy diễn mùa vụ (SAD §4.3).

**Tệp dự kiến:** `src/components/charts/TrendPatternChart.tsx`, `SeasonalityPatternChart.tsx`, `StatisticsPage.tsx`, `tests/chart-data.test.ts`.

**DoD:** 2 biểu đồ khớp payload mẫu; ghi chú diễn giải của BE được hiển thị nguyên vẹn.

**Kiểm chứng:** `pnpm build`; test transform.

**Phụ thuộc:** T7.06.

---

### Task T7.08 — Pattern 4: Correlation Heatmap

**Terminal liên quan:** T3, T6 (`/analysis/correlation`).

**Mô tả:** Ma trận tương quan 5 biến trên nền Dark Mode.

**Đầu việc:**
- Gọi `getCorrelationAnalysis()`; vẽ heatmap từ `variables[]` + `matrix[][]` (5×5), thang màu tương phản, tooltip hệ số Pearson.
- 5 biến: `magnitude`, `depth_km`, `latitude`, `longitude`, `daily_event_count` (SAD §5).
- `status = insufficient_data` hoặc ma trận rỗng/null → Empty State + `note` của BE; **không** suy diễn nhân quả.

**Tệp dự kiến:** `src/components/charts/CorrelationHeatmap.tsx`, `StatisticsPage.tsx`, `tests/chart-data.test.ts`.

**DoD:** Heatmap đối xứng, path màu đúng; tooltip đúng giá trị `[-1, 1]`.

**Kiểm chứng:** `pnpm build`; test transform `asCorrelation`.

**Phụ thuộc:** T7.06.

---

### Task T7.09 — Pattern 5 & 6: Dự báo định lượng và Phân loại rủi ro t+1

**Terminal liên quan:** T5 (Prediction 5 phút), T6 (`/predictions`, `/classifications`).

**Mô tả:** Hiển thị dự báo ngày kế tiếp, phân biệt rõ dữ liệu quan sát và dự báo.

**Đầu việc:**
- Pattern 5: `getPredictions()` → `target_date`, `predicted_value`, `confidence_interval.lower/upper` (hoặc alias `lower_bound`/`upper_bound`), `model_name`, `mae`/`rmse`; vẽ dải tin cậy 95%.
- Pattern 6: `getClassifications()` → `predicted_label`, `probabilities` (hoặc `probability_scores`); chuẩn hóa nhãn dài ("Normal Activity") sang `RiskLevel` qua `normalizeRiskLabel`/`buildRiskBars`; ghi chú "chỉ báo thống kê thử nghiệm".
- Thiếu `mae`/`rmse` → "chưa có dữ liệu kiểm định" (không bịa số — `contracts/README.md` §3.7).

**Tệp dự kiến:** `src/components/charts/ForecastPatternChart.tsx`, `ClassificationPatternChart.tsx`, `StatisticsPage.tsx`, `tests/chart-data.test.ts`.

**DoD:** 2 panel hiển thị từ API thật; confidence interval hợp lệ; nhãn risk đúng 4 mức.

**Kiểm chứng:** `pnpm build`; test transform `asPrediction`, `asClassification`.

**Phụ thuộc:** T7.06; T5 đã merge (notes `2026-11-12-seismic-prediction-worker-tai`).

---

## Nhóm D — Giám sát realtime & cấu hình (T6)

### Task T7.10 — Shell realtime: trạng thái SSE, badge và toast

**Terminal liên quan:** T6 (`/api/v1/stream/earthquakes`, `/api/v1/events/stream`), T2.

**Mô tả:** Đưa hạ tầng SSE (`lib/sse.ts`, `useSSE`) lên giao diện layout đơn nhất.

**Đầu việc:**
- Dùng `useSSE()` trong `DashboardLayout`: hiển thị trạng thái `connecting/open/reconnecting/disconnected` qua `sseStatusLabel` (`SSE LIVE`, `Đang kết nối lại…`, `Mất kết nối`).
- Lắng nghe hợp 6 tên sự kiện (`SSE_EVENT_NAMES`): `earthquake_detected`/`earthquake_alert`, `heartbeat`, `ingestion_cycle_completed`, `database_cleared`.
- Toast khi ingestion xong / phát hiện địa chấn mới; nhận `database_cleared` → chuyển Empty State toàn trang, không fallback mock (Demo Bước 2–3).
- Không tạo `EventSource` rải rác trong component; giữ một kết nối tại shell.

**Tệp dự kiến:** `src/layouts/DashboardLayout.tsx`, `src/hooks/useSSE.ts`, `src/lib/sse.ts`, `tests/sse-machine.test.ts`, `tests/lib-redesign.test.ts`.

**DoD:** Mất kết nối → trạng thái Reconnecting/Disconnected hiển thị rõ; backoff 1s→30s, tối đa 8 lần; payload hỏng không crash.

**Kiểm chứng:** `pnpm test` (test thuần parse/backoff); thử tắt T6 để quan sát badge.

**Phụ thuộc:** T7.01 (xong).

---

### Task T7.11 — Trang Cài đặt: giám sát 7 Terminals & dữ liệu cũ

**Terminal liên quan:** T1–T6 (trạng thái chạy), T7.

**Mô tả:** Xây trang `/settings` (route `APP_ROUTES.SETTINGS`) từ `GET /api/v1/system/status` + `GET /api/v1/health`.

**Đầu việc:**
- Hiển thị 7 service từ `SystemStatusResponse.data.services` (`SERVICE_LABELS` đủ 7 key): postgres, ingestion, analysis, clustering, prediction, api, frontend.
- Dùng `evaluateServiceFreshness`/`TERMINAL_SPECS` (`lib/transforms/settings-data.ts`): chu kỳ 5 phút → `stale` > 15 phút, `interrupted` > 60 phút; chu kỳ 1 ngày → `stale` > 26 giờ; thiếu `last_run` → `unknown` (architecture §9.4, contracts/README.md §3.5).
- Chuyển đổi chế độ múi giờ UTC / UTC+7 qua `utils/timezone.ts` (`getStoredTimezone`/`setStoredTimezone`).
- Khu vực hướng dẫn kiểm chứng nhanh Demo 6 bước.

**Tệp dự kiến:** `src/features/settings/SettingsPage.tsx`, `tests/settings-data.test.ts`.

**DoD:** Không bịa trạng thái "đang chạy" khi thiếu `last_run`; 7 terminal hiển thị đúng nhãn; đổi timezone áp dụng toàn trang.

**Kiểm chứng:** `pnpm build`; test freshness offline.

**Phụ thuộc:** T7.02, T7.10.

---

## Nhóm E — Báo cáo & Kịch bản Demo (T1–T6)

### Task T7.12 — Trang Báo cáo: tổng hợp số liệu thật & xuất bản

**Terminal liên quan:** T3, T4, T5, T6 (`/statistics/earthquakes`, `/patterns`, `/clusters`, `/system/status`).

**Mô tả:** Xây lại trang `/reports` (route `APP_ROUTES.REPORTS`) hoàn toàn bằng dữ liệu API.

**Đầu việc:**
- Thay mọi số tĩnh bằng `getEarthquakeStatistics()`, `getPatterns()`, `getClusters()`, `getSystemStatus()`.
- Dùng đúng tên 6 Patterns của `yeucaubatbuoc.md` §2: Temporal, Trend, Seasonality, Correlation, Forecast t+1, Classification t+1 (không dùng Cyclic/Swarm/Quiet/Burst/Aftershock/Foreshock).
- Giữ định dạng in ấn gọn (`print:*`) để xuất PDF/phục vụ báo cáo đồ án.

**Tệp dự kiến:** `src/features/reports/ReportsPage.tsx`, `src/app/routes.tsx` (nếu chỉnh route).

**DoD:** Không còn const số liệu cứng; F12 Network xác nhận 4 nguồn API; bản in không vỡ layout.

**Kiểm chứng:** `pnpm build`; soát grep không còn số hardcode.

**Phụ thuộc:** T7.03, T7.06–T7.09.

---

### Task T7.13 — Kiểm chứng Kịch bản Demo 6 bước trên Frontend

**Terminal liên quan:** T1 (xóa/phục hồi DB), T2–T5 (re-run worker), T6 (API/SSE), T7.

**Mô tả:** Chứng minh FE phụ thuộc 100% vào DB thật và tự phục hồi theo `yeucaubatbuoc.md` §4.

**Đầu việc:**
1. `docker compose up`, mở Web → đủ biểu đồ; F12 Network chứng minh dữ liệu từ API.
2. Xóa rỗng bảng kết quả (do `van` hỗ trợ script) → F5 Web → Empty State rõ ràng.
3. Quan sát sự kiện `database_cleared` qua SSE (T7.10) → chuyển trạng thái ngay.
4. Chạy runner T2/T3/T4/T5 với cờ `--once` (model pre-trained, không train lại).
5. Kiểm tra DB đã có dữ liệu mới.
6. Mở lại Web → biểu đồ tự cập nhật (SSE/re-fetch), không cần reload thủ công.

**Tệp dự kiến:** `docs/` ghi nhận kết quả; không đổi code trừ khi phát hiện lỗi (khi đó ghi `.agents/notes/bugs/`).

**DoD:** 6 bước chạy thông suốt; không có bước nào hiển thị dữ liệu mock.

**Kiểm chứng:** Ghi log demo + ảnh màn hình cho báo cáo (yeucaubatbuoc §6.1).

**Phụ thuộc:** Tất cả task T7.03–T7.12; các worker của `son`/`van`/`tai`.

---

## Nhóm F — Chất lượng & bàn giao

### Task T7.14 — Bộ unit/integration test FE offline cho UI mới

**Terminal liên quan:** T7 (liên kết T2–T6 qua mock).

**Mô tả:** Duy trì I7 khi xây dựng các component/page mới.

**Đầu việc:**
- Dùng `write-testcase` tạo `.agents/notes/testcase/<id>.md` cho từng batch UI.
- Mock `fetchApi` và `EventSource` (dùng `dev-mock.ts` + cờ opt-in có sẵn; **không** import mock vào runtime view).
- Test 3 trạng thái Loading/Error/Empty cho mỗi page; kiểm chứng timestamp UTC `Z`, tọa độ WGS84, `RiskLevel` 4 mức, `SSE_EVENT_NAMES` 6 tên.
- Chạy `pnpm build` + `pnpm test` sạch trước mỗi PR.

**Tệp dự kiến:** `apps/web/tests/*.test.ts`, `.agents/notes/testcase/*.md`.

**DoD:** Mọi logic mới có test tương ứng; tổng số test không giảm so với 56 test hiện tại; 100% offline.

**Kiểm chứng:** `cd apps/web && pnpm build && pnpm test`.

**Phụ thuộc:** Liên tục theo từng task T7.02–T7.13.

---

## Thứ tự ưu tiên đề xuất

1. **T7.02** (chốt hợp đồng) → **T7.10** (SSE shell) → **T7.03** (danh mục).
2. **T7.04 → T7.05** (bản đồ + cụm) song song với **T7.06 → T7.09** (6 patterns).
3. **T7.11** (settings) → **T7.12** (reports) → **T7.13** (demo) → **T7.14** (test bổ sung).

> Mỗi task nên đi qua quy trình `write-proposal → build-implementation → review-pr` với 2 checkpoint, trừ task sửa ≤ 1 file theo Fast-Track.
