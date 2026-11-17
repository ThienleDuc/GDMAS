# Proposal: Hợp đồng dữ liệu BE↔FE và hoàn thiện GIS Map, Báo cáo, Cài đặt, Services/SSE (Task 2–4)

## Metadata
- ID: 2026-11-16-fe-contract-gis-reports-thien
- Author: agent | thien
- Created: 2026-11-16
- Type: architecture
- Status: approved
- Priority: high
- Area: `contracts/`, `apps/web/src/components/map/`, `apps/web/src/features/{monitoring,reports,settings}/`, `apps/web/src/services/`, `apps/web/src/hooks/useSSE.ts`
- Architecture Impact: `contracts/` — thêm 6 schema (`health`, `system-status`, `analysis`, `predictions`, `classifications`, `clusters`) + 6 mock example + mục 3.4–3.7 trong `contracts/README.md`, và **mở rộng additive** enum `contracts/schemas/sse-event.json` (thêm `ingestion_cycle_completed`, `database_cleared`). `docs/api/API.md` **không sửa** (vùng khóa) nhưng có **drift** cần BE xử lý — ghi rõ ở §2.4. Không đổi DB, không đổi `apps/api/**`, không đổi migration.
- Related Docs:
  - docs/task/thien.md (Task 2, Task 3, Task 4)
  - docs/yeucaubatbuoc.md (6 Patterns bắt buộc §2, Dark Mode/Zoom/Filter §3.1, Kịch bản Demo 6 bước §4)
  - docs/architecture.md (§7.7 GIS/Leaflet, §9.4 Kiểm soát dữ liệu cũ, §10.4 Luồng dự báo & phân loại, §12 6 Patterns)
  - docs/api/API.md (§3.1 Health/System, §3.3 Analysis/Predictions/Classifications, §3.4 Clusters, §3.5 SSE)
  - contracts/README.md
  - docs/coding-rules.md, docs/quyuocchung.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md (đã completed) — proposal này **mở rộng** lớp hợp đồng của trang Thống kê sang toàn bộ endpoint còn thiếu, không sửa quyết định cũ.
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md (đã completed) — proposal này chỉ **tiêu thụ** `metrics_data` do T3 sinh ra; không sửa T3.
  - Overrides: none
- Related Bugs: none

---

## 1. Vấn đề

### Bối cảnh
GDMAS đang ở trạng thái: 6 Patterns + trang Thống kê đã có biểu đồ thật (proposal `2026-11-16-six-patterns-chart-components-thien`), nhưng 3 mảng Frontend còn lại của Task 2–4 vẫn là khung mô phỏng, và **lớp hợp đồng dữ liệu BE↔FE chỉ phủ được 4 endpoint đang tồn tại**.

- `apps/web/src/features/monitoring/MonitoringMapPage.tsx` (92 dòng) chỉ là lưới SVG + radar giả; `apps/web/src/components/map/` **rỗng**, chưa có component bản đồ thật; toạ độ hiển thị hardcode `Lat: 16.0544° N | Lon: 108.2022° E`.
- `apps/web/src/features/reports/ReportsPage.tsx` (86 dòng) hardcode `1,248` sự kiện / `16` cụm và dùng sai tên 6 patterns (`Cyclic`, `Swarm`, `Quiet`, `Burst`, `Aftershock`, `Foreshock`) — không khớp 6 patterns chuỗi thời gian bắt buộc.
- Route `/settings` (`apps/web/src/app/routes.tsx` có `APP_ROUTES.SETTINGS`) đang trỏ tới `SettingsPlaceholder` khai báo inline trong `apps/web/src/app/App.tsx` (dòng 13–20) — không có màn hình giám sát 7 Terminals.
- `apps/web/src/services/earthquake-api.ts` chỉ có 4 hàm (`getEarthquakes`, `getEarthquakeDetail`, `getEarthquakeStatistics`, `syncUsgsData`, `getPatterns`) và `QueryEarthquakeParams` thiếu `start_time`/`end_time`/bounding box.
- `apps/web/src/hooks/useSSE.ts` không có backoff/reconnect, không phân biệt Reconnecting/Disconnected, không lắng nghe `earthquake_alert` (spec §3.5) và chỉ nhận 6 loại event.
- `apps/web/src/contracts/index.ts` chỉ có 3 interface, trong đó `EarthquakeContract` dùng `time`/`depth` **sai** so với payload thật (`event_time`/`depth_km`), `PredictionContract` dùng camelCase (`predictedCount`) không khớp BE.

### Vấn đề
1. **Thiếu hợp đồng cho 9 endpoint** mà Task 4 yêu cầu (`/health`, `/system/status`, 4 × `/analysis/*`, `/predictions`, `/classifications`, `/clusters`): hiện **chưa tồn tại route nào** trong `apps/api/src/gdmas/api/routes/` (chỉ có `earthquakes.py`, `statistics.py`, `patterns.py`, `stream.py`, `events.py`). Nếu FE gọi thẳng các endpoint này mà không có hợp đồng, hai bên sẽ tự suy diễn field name khác nhau → mất định hướng khi BE triển khai sau.
2. **Dữ liệu cụm (DBSCAN) không có shape thống nhất**: `GET /api/v1/patterns` trả `clustering_summary = {"clusters":[{ "id","name","lat","lon","events_count","avg_mag" }]}` (theo `apps/api/src/gdmas/services/demo_seeder.py:300–335`), trong khi `docs/api/API.md` §3.4 quy định `{"cluster_id","center_latitude","center_longitude","event_count","avg_magnitude","max_magnitude"}` và T4 (`apps/api/src/gdmas/services/clustering/runner.py`) hiện chỉ là placeholder `time.sleep(86400)`.
3. **Trang Báo cáo/Cài đặt/Bản đồ không thể hoàn thiện** nếu không chốt trước: tên trường, đơn vị, quy ước thời gian (UTC), ngưỡng cảnh báo dữ liệu cũ (§9.4), và hành vi khi endpoint 404.

### Ảnh hưởng
- Task 2, 3, 4 là 3/4 khối lượng Frontend còn lại của đồ án; bản đồ GIS và trang Báo cáo là hạng mục trình diễn trực tiếp trong buổi Demo 6 bước.
- Không có hợp đồng thống nhất: khi BE bổ sung endpoint (`/clusters`, `/system/status`, `/analysis/*`), FE sẽ phải sửa cả tầng types lẫn UI; ngược lại BE không biết FE cần field nào → dễ sinh payload thiếu (`mae`/`rmse` của Pattern 5 là tiền lệ: đã phải khai báo optional ở proposal trước).
- Không xử lý `database_cleared` đồng bộ ở cả 5 trang → nguy cơ fallback mock, vi phạm Demo §4 và I5.

---

## 2. Hiện trạng

### 2.1. Frontend
| Tệp | Hiện trạng |
|---|---|
| `apps/web/src/features/monitoring/MonitoringMapPage.tsx` | Khung SVG + radar giả, không có Leaflet; filter `minMagnitude` chỉ đổi state, không gọi API |
| `apps/web/src/components/map/` | Thư mục rỗng (chưa có file nào) |
| `apps/web/src/features/reports/ReportsPage.tsx` | Hardcode `1,248` / `16`; bảng 6 patterns sai tên; chỉ có `print:*` ở mức cơ bản |
| `apps/web/src/app/App.tsx` | `SettingsPlaceholder` inline (dòng 13–20) cho route `/settings` |
| `apps/web/src/services/earthquake-api.ts` | 5 hàm; `QueryEarthquakeParams` thiếu `start_time`/`end_time`/`min_lat`/`max_lat`/`min_lon`/`max_lon`; `PatternItem.metrics: Record<string, any>` |
| `apps/web/src/contracts/index.ts` | 3 interface lệch payload thật; không có type cho clusters/system/analysis |
| `apps/web/src/hooks/useSSE.ts` | Không reconnect/backoff; `isConnected` boolean thô; không nghe `earthquake_alert`/`ingestion_cycle_completed` fail-safe |
| `apps/web/src/components/ui/IngestionToast.tsx` | Tốt, tự tắt sau 5s; chưa phân biệt trạng thái mất kết nối |
| `apps/web/index.html:18` | Nạp `leaflet.css` từ `unpkg.com` (phụ thuộc mạng ngoài, không chạy offline) |
| `apps/web/src/utils/timezone.ts` | Có `formatEventTime(mode)` và `getRelativeTime`; chưa có format toạ độ WGS84 |

### 2.2. Backend (đọc để xác định hợp đồng — **không sửa**)
| Route hiện có | Payload thật |
|---|---|
| `GET /api/v1/earthquakes` | `{success,data[],metadata{total,page,limit,total_pages,last_updated?}}`, item có `event_time`/`latitude`/`longitude`/`depth_km`/`magnitude`/`place`/`source_event_id`/`ingested_at` |
| `GET /api/v1/earthquakes/{id}` | item đầy đủ |
| `POST /api/v1/earthquakes/sync` | `{success,message,synced_count,source,timestamp}` |
| `GET /api/v1/statistics/earthquakes` | `{success,data{total_events,strong_events_count,moderate_events_count,minor_events_count?,recent_24h_count,avg_magnitude,max_magnitude,latest_event_time?,time_series_preview?}}` |
| `GET /api/v1/patterns` | 6 pattern + `clustering_summary` (shape legacy ở §2.1) |
| `GET /api/v1/stream/earthquakes` | SSE: `heartbeat`, `earthquake_detected`, `alert`, `ingestion_cycle_completed`, `database_cleared` |
| `POST /api/v1/stream/broadcast-cleared` | Phát `database_cleared` (Demo Bước 2) |

**Chưa tồn tại (Task 4 yêu cầu):** `/api/v1/health`, `/api/v1/system/status`, `/api/v1/analysis/{temporal,trend,seasonality,correlation}`, `/api/v1/predictions`, `/api/v1/classifications`, `/api/v1/clusters`, `/api/v1/events/stream`.

### 2.3. Dữ liệu nguồn sẵn có cho `/clusters` và `/system/status`
- `clustering_results`: `algorithm`, `parameters` (JSONB: `eps_degrees`/`min_samples`/`metric` hoặc `eps_km`), `total_clusters`, `noise_count`, `summary_clusters` (JSONB `{"clusters":[...]}`), `calculated_at`, `service_run_id`.
- `clustering_event_mapping`: `cluster_result_id`, `event_id`, `cluster_label` → cho phép tính `event_count`, `avg_magnitude`, `max_magnitude`, `center_latitude/longitude` thật khi T4 hoàn thiện.
- `service_runs`: `service_name`, `started_at`, `finished_at`, `status`, `records_processed`, `error_message` → nguồn `last_run` cho `/system/status`.

### 2.4. Drift đã phát hiện (ghi nhận, **không tự sửa** `docs/api/API.md`)
| # | `docs/api/API.md` nói | Thực tế BE/FE | Hướng xử lý trong proposal này |
|---|---|---|---|
| D1 | `GET /statistics/earthquakes` → `summary_24h/summary_7d/magnitude_distribution` | Trả `total_events/strong_events_count/.../time_series_preview` | Hợp đồng mới **canonical theo payload thật**; FE đọc được cả 2 shape; ghi chú BE cần đồng bộ `API.md` ở proposal BE riêng |
| D2 | `GET /clusters` → `cluster_id/center_latitude/...` | `clustering_summary` dùng `id/lat/lon/events_count/avg_mag`; route `/clusters` chưa có | Hợp đồng `clusters.json` chốt canonical `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude/max_magnitude/radius_km`; FE có **adapter chấp nhận alias legacy** |
| D3 | SSE event `earthquake_alert`, header `Accept: text/event-stream` | BE phát `earthquake_detected` + 4 event khác | `sse-event.json` mở rộng enum additive; FE nghe **hợp của 2 bộ tên** |
| D4 | `/api/v1/events/stream` | Chỉ có `/api/v1/stream/earthquakes` | Service cho phép cấu hình endpoint qua `VITE_SSE_ENDPOINT`; mặc định dùng route đang chạy, ghi chú BE |
| D5 | Pattern 5 `confidence_interval{lower,upper}`, `evaluation_metrics` | `/patterns` trả `lower_bound/upper_bound` và **không có** `mae/rmse` | Đã khai báo optional từ proposal trước; proposal này bổ sung route `/predictions` canonical theo spec |

---

## 3. Mục tiêu

- **Mục tiêu:**
  1. Tạo **lớp hợp đồng dữ liệu** cho 9 endpoint còn thiếu trong `contracts/` (JSON Schema + mock offline + mục README + bảng alias), làm căn cứ BE triển khai và FE tiêu thụ — không cần đọc lại code để đoán field.
  2. Task 2: bản đồ Leaflet thật (Dark Mode) với marker theo WGS84 (kích thước/màu theo `magnitude`/`depth_km`), popup chi tiết, lớp cụm DBSCAN bật/tắt, filter `magnitude` có debounce + lọc khoảng thời gian + toạ độ/zoom tâm bản đồ thật.
  3. Task 3: `ReportsPage` lấy dữ liệu thật và đúng 6 patterns chuỗi thời gian, giữ `print:*`; tạo `SettingsPage` cho `/settings` giám sát 7 Terminals + cảnh báo dữ liệu cũ (§9.4) + chuyển UTC/giờ địa phương; rà soát Loading/Error/Empty + `database_cleared` cho 5 trang.
  4. Task 4: services/types chặt chẽ (không `any`), bổ sung 9 hàm + mở rộng `QueryEarthquakeParams`, `useSSE` có trạng thái Reconnecting/Disconnected + backoff, và bộ test offline cho services/SSE/format + component quan trọng.
- **Không nằm trong mục tiêu (Out of Scope):**
  - **Không** sửa bất kỳ tệp nào trong `apps/api/**` (route/service/model/migration/test) — việc triển khai BE cho 9 endpoint sẽ là proposal BE riêng (đề xuất tách `2026-11-16-pattern-endpoints-son` hoặc tương đương).
  - Không sửa `docs/api/API.md`, `AGENTS.md`, `docs/quyuocchung.md`, migration Alembic.
  - Không đổi database schema, không đổi `docker-compose.yml`, không đổi `.env.example` (chỉ thêm biến FE `VITE_SSE_ENDPOINT` dạng optional trong code + ghi chú).
  - Không làm lại 6 biểu đồ Recharts (đã xong ở proposal trước) — chỉ **đọc** `components/charts/` nếu cần.
  - Không dựng clustering worker thật (T4) hay prediction worker (T5).

---

## 4. Giải pháp đề xuất

### 4.1. Lớp hợp đồng `contracts/` (nguồn sự thật duy nhất)
Nguyên tắc: **canonical snake_case theo payload thật**, mọi alias legacy khai báo tường minh trong `$defs` + bảng ánh xạ ở README, mọi timestamp UTC ISO 8601 `Z`, toạ độ WGS84 (`latitude`/`longitude`), mọi trường BE chưa chắc có đều **optional** và FE phải hiển thị "chưa có dữ liệu" thay vì bịa số (kế thừa quyết định của proposal Pattern 5).

| Tệp mới | Nội dung chính |
|---|---|
| `contracts/schemas/health.json` | `{success, data{status: healthy|degraded|unhealthy, database: connected|disconnected, version, timestamp}}` |
| `contracts/schemas/system-status.json` | `{success, data{services{postgres,data_ingestion,data_analysis,clustering,prediction,api,frontend}, data_feed{source,total_events,latest_event_time}}, generated_at}`; mỗi service `{status, last_run?, cycle?, uptime_seconds?, error_message?}` |
| `contracts/schemas/analysis.json` | Một file, `$defs`: `temporal` (line_chart/scatter_plot/histogram/`stats`), `trend` (series/slope/intercept/r_squared/p_value/`trend_direction`), `seasonality` (components.seasonal_line/strength/interpretation), `correlation` (variables/matrix/method/sample_size) — dùng `$ref` `analysis.json#/$defs/<name>` để map 1:1 với 4 route |
| `contracts/schemas/predictions.json` | Pattern 5 route riêng: `target_date, forecasted_metric, predicted_value, confidence_interval{lower,upper}, model_name, model_version, evaluation_metrics{mae,rmse,baseline_mae}, generated_at` (chấp nhận thêm alias `lower_bound`/`upper_bound` phẳng) |
| `contracts/schemas/classifications.json` | `target_date, predicted_label, probabilities{<label>: number}, model_name, model_version, evaluation_metrics{f1_macro,accuracy,classes}, generated_at`; nhãn canonical `LOW|MEDIUM|HIGH|CRITICAL` + alias dài (`Normal Activity`…) |
| `contracts/schemas/clusters.json` | `{success, data{algorithm, parameters{eps_km?,eps_degrees?,min_samples,metric?}, clusters_count, noise_count, calculated_at, clusters[{cluster_id, center_latitude, center_longitude, event_count, avg_magnitude, max_magnitude, radius_km?, name?, dominant_place?}]}}`; **`$defs.legacyCluster`** khai báo alias `id/lat/lon/events_count/avg_mag` để FE chấp nhận payload cũ |
| `contracts/schemas/sse-event.json` *(sửa additive)* | Mở rộng `enum` thêm `ingestion_cycle_completed`, `database_cleared`, `earthquake_alert`; thêm optional `id`, `retry`; mô tả `data` theo từng event. **Không xoá/đổi giá trị cũ** |
| `contracts/examples/{health,system_status,analysis,predictions,classifications,clusters}_sample.json` | Mock offline đầy đủ để FE test; thêm biến thể `PENDING`/rỗng cho Empty State (dùng bằng cách clone trong test) |
| `contracts/README.md` | Cập nhật §2 cây thư mục + thêm §3.4 Clusters, §3.5 System/Health, §3.6 Analysis endpoints, §3.7 Predictions/Classifications, kèm **bảng ánh xạ alias → canonical** và quy tắc: "FE phải chịu được 404 → Empty State 'BE chưa triển khai endpoint'" |

### 4.2. Task 4 — Services, types, SSE
- `apps/web/src/contracts/index.ts`: thay `any` bằng type chặt, **additive** để không phá hook hiện tại:
  - Giữ `SSEEventPayload`, mở rộng `EventName` union; giữ `EarthquakeContract`/`PredictionContract` nhưng bổ sung trường thật (`event_time`, `depth_km`, `magnitude_type`, `source_url`) dạng optional → không phá ai đang dùng.
  - Thêm: `HealthResponse`, `SystemStatusResponse`, `TemporalResponse`, `TrendResponse`, `SeasonalityResponse`, `CorrelationResponse`, `PredictionsResponse`, `ClassificationsResponse`, `ClustersResponse`, `ClusterSummary`, `ServiceStatus`, `EarthquakeQuery`, `TimeRange`.
- `apps/web/src/services/earthquake-api.ts`: thêm hàm `getHealth`, `getSystemStatus`, `getTemporalAnalysis`, `getTrendAnalysis`, `getSeasonalityAnalysis`, `getCorrelationAnalysis`, `getPredictions`, `getClassifications`, `getClusters`; mở rộng `QueryEarthquakeParams` với `start_time`, `end_time`, `min_lat`, `max_lat`, `min_lon`, `max_lon`; mọi hàm nhận `signal?: AbortSignal` để hủy request khi filter đổi (debounce).
  - **Chịu lỗi 404**: helper `getOptionalApi<T>()` trả `{data, unavailable: true}` thay vì throw, để trang hiển thị nhãn "Endpoint chưa có trên BE" — không dùng mock.
- `apps/web/src/hooks/useSSE.ts`: viết lại theo state machine `connecting → open → reconnecting → disconnected`, backoff 1s→2s→4s→…→30s + jitter, `EventSource` mới mỗi lần retry, cleanup đúng khi unmount; nhận cả `/api/v1/stream/earthquakes` (mặc định) và `/api/v1/events/stream` (qua tham số/`VITE_SSE_ENDPOINT`), nghe hợp `heartbeat, earthquake_detected, earthquake_alert, alert, ingestion_cycle_completed, database_cleared`; trả `{data, status, isConnected, lastEventTime, reconnectAttempt}`; **giữ nguyên chữ ký `useSSE(endpoint?)`** để `DashboardLayout`, `DashboardOverviewPage`, `EarthquakesPage`, `StatisticsPage` không phải sửa (RULE-03).
- Component trạng thái shell: `apps/web/src/components/ui/ConnectionStatusBadge.tsx` — pill `LIVE / Reconnecting… / Disconnected`, hiển thị ở `DashboardLayout` topbar và `FullscreenMapLayout` header (thay chuỗi hardcode "SSE STREAM LIVE").

### 4.3. Task 2 — Bản đồ Leaflet + lớp cụm DBSCAN
Tệp mới trong `apps/web/src/components/map/`:
| Tệp | Vai trò |
|---|---|
| `types.ts` | `MapEarthquake`, `MapCluster`, `MapViewport`, `MagnitudeScale` (typed, không `any`) |
| `map-data.ts` | Hàm thuần: `magnitudeToRadius` (4→9 px), `magnitudeToColor` (thang ≥6 / 5–6 / 4–5 / <4), `depthToOpacity`, `normalizeClusters()` (nhận canonical **và** legacy `id/lat/lon/events_count/avg_mag`), `haversineKm`, `viewportToBbox`, `shouldShowMarker` (filter magnitude/time), `formatCoordinate` (WGS84 `16.0544° N, 108.2022° E`), `radiustoCluster` (dùng `radius_km`, fallback `parameters.eps_km`) |
| `SeismicMap.tsx` | `MapContainer` + `TileLayer` CARTO Dark (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`, attribution bắt buộc) + `ZoomControl` góc phải; bắt `moveend/zoomend` → callback `onViewportChange` để HUD hiện toạ độ/zoom thật; `preferCanvas` cho hiệu năng |
| `EarthquakeMarkerLayer.tsx` | `CircleMarker` bán kính/màu theo magnitude, viền theo depth; `Tooltip` nhanh + `Popup` chi tiết (place, `source_event_id`, UTC + giờ địa phương, depth, magnitude, link USGS nếu có `source_url`) |
| `ClusterLayer.tsx` | `Circle` tâm cụm + `Marker` nhãn số sự kiện + `Popup` thông tin cụm (event_count, avg/max magnitude, thuật toán, eps); bật/tắt qua prop `visible` |
| `MapFilterPanel.tsx` | Thanh trượt `magnitude` (0–9, step 0.1) với **debounce 400 ms** trước khi gọi API (`AbortController` huỷ request cũ), chọn khoảng thời gian (24h / 7 ngày / 30 ngày / tùy chọn) → gửi `start_time/end_time`, công tắc "Hiển thị cụm DBSCAN", nút đặt lại |
| `MapLegend.tsx` | Chú giải màu/kích thước magnitude + depth, hiển thị cảnh báo khi thiếu dữ liệu |
| `MapPopupCard.tsx` | Nội dung popup/panel chi tiết (dùng chung popup + side panel trên mobile) |
| `README.md`, `index.ts` | Danh mục component + barrel export |

`MonitoringMapPage.tsx` viết lại: `useEffect` nạp `/earthquakes` (limit tối đa theo viewport/bbox, `sort_by=magnitude&order=desc`) + `getClusters()`; Empty/Error/Loading rõ ràng; HUD toạ độ lấy từ `onViewportChange` (không hardcode); nút chuyển bản đồ toàn màn hình giữ nguyên layout `FullscreenMapLayout`.
- CSS: bỏ `<link>` unpkg trong `apps/web/index.html`, import `leaflet/dist/leaflet.css` trong `apps/web/src/main.tsx` (offline-friendly, khớp version 1.9.4 đã khóa trong `pnpm-lock.yaml`).
- Tile layer là nguồn mạng ngoài duy nhất; khi offline hiển thị overlay "Không tải được tile bản đồ" (bắt `tileerror`), marker vẫn vẽ trên nền tối.

### 4.4. Task 3a — ReportsPage dữ liệu thật
- Nguồn: `getEarthquakeStatistics()`, `getPatterns()`, `getClusters()`, `getSystemStatus()` (nếu 404 → nhãn "BE chưa triển khai `/system/status`" + ẩn số liệu, **không** dùng mock).
- Cấu trúc báo cáo: (1) Tóm tắt điều hành với số liệu thật + mốc thời gian UTC; (2) Bảng **đúng 6 patterns chuỗi thời gian**: `Temporal`, `Trend`, `Seasonality`, `Correlation`, `Dự báo t+1`, `Phân loại t+1` — cột: trạng thái `COMPUTED/PENDING`, chỉ số đặc trưng lấy từ `metrics` (vd. Temporal: `data_points`, `avg_magnitude`; Trend: `slope`, `trend_direction`, `r_squared`; Seasonality: `seasonality_strength`; Correlation: mạnh nhất |r|; Prediction: `predicted_value` + CI; Classification: `predicted_label`); (3) Cụm DBSCAN từ `/clusters`; (4) Kiến nghị vận hành lấy từ trạng thái thật của 7 Terminals.
- Giữ `print:*` (đen/trắng, ẩn nút điều hướng) + bổ sung `@media print` cho bảng rộng và `print-color-adjust: exact` cho badge.
- Empty state: CSDL rỗng → banner "Chưa có dữ liệu để lập báo cáo" đúng Demo Bước 2/3.

### 4.5. Task 3b — SettingsPage (`/settings`)
- Tệp mới: `apps/web/src/features/settings/SettingsPage.tsx`, `settings-data.ts` (hàm thuần đánh giá trạng thái), `README.md`.
- Dữ liệu: `getSystemStatus()` (7 Terminals: PostgreSQL, Ingestion, Analysis, Clustering, Prediction, Database API, Frontend) + `getHealth()`; poll 30 s (không dùng SSE để tránh trùng kết nối).
- Cảnh báo dữ liệu cũ theo `docs/architecture.md` §9.4: chu kỳ 5 phút → cảnh báo khi `last_run` > 15 phút (`STALE`), > 60 phút (`INTERRUPTED`); Clustering chu kỳ 1 ngày → > 26 giờ. Hàm thuần `evaluateServiceFreshness(service, now)` trả `fr: fresh|stale|interrupted|unknown` kèm nhãn tiếng Việt.
- Múi giờ: dùng `getStoredTimezone/setStoredTimezone/formatEventTime` có sẵn; thêm nút chuyển UTC ↔ Giờ địa phương (UTC+7) ở topbar Settings, áp dụng cho mọi mốc thời gian trong trang; không đổi hành vi mặc định của các trang khác.
- Khu vực Demo: hướng dẫn/kiểm chứng nhanh 6 bước (link `docs/yeucaubatbuoc.md`), nút "Kiểm tra kết nối API" (gọi `/health`), hiển thị version + thời điểm server.
- `apps/web/src/app/App.tsx`: thay `SettingsPlaceholder` bằng `<SettingsPage />`; `routes.tsx` giữ nguyên.
- `apps/web/src/app/App.tsx` cần xoá `SettingsPlaceholder` (khai báo nội bộ, không phải module công khai → không vi phạm RULE-03 vì không module nào import).

### 4.6. Task 3c — Rà soát Loading/Error/Empty + `database_cleared`
- Chuẩn hoá 3 trạng thái bằng component dùng chung: `apps/web/src/components/ui/AsyncState.tsx` (`LoadingState`, `ErrorState`, `EmptyState`) — bọc lại `EmptyChartState` hiện có (không sửa nó).
- Áp dụng cho `DashboardOverviewPage`, `EarthquakesPage`, `StatisticsPage`, `MonitoringMapPage`, `ReportsPage`, `SettingsPage`.
- Tạo hook dùng chung `apps/web/src/hooks/useDatabaseReset.ts`: lắng nghe `database_cleared` qua `useSSE`, trả `resetVersion` (tăng mỗi lần reset); mỗi trang dùng `resetVersion` làm dependency để xoá state + hiển thị banner "CSDL đã bị xoá trống (Demo Bước 2)"; khi nhận `ingestion_cycle_completed` sau reset → refetch (Demo Bước 6). Giữ nguyên hành vi hiện có ở `DashboardLayout`/`StatisticsPage` (chỉ **bổ sung**).
- **Tuyệt đối không** giữ/khôi phục mảng mock khi rỗng (rà soát `grep -rn "MOCK\|fallback\|1,248" apps/web/src`).

### 4.7. Test strategy (offline, không gọi mạng)
- **Giữ nguyên** `apps/web/tests/chart-data.test.ts` (12 test `node:test`, I7 — không xoá/đổi runner cũ).
- **Bổ sung suite thứ hai** cho TSX/component: Vitest + jsdom + `@testing-library/react` (**devDependencies**, không thêm runtime dep):
  - `apps/web/vitest.config.ts` (`environment: jsdom`, alias `@`), script `"test:ui": "vitest run --config vitest.config.ts"`; `pnpm test` giữ `node --test tests/*.test.ts` để không phá 12 test đang pass.
  - `apps/web/tests/ui/*.test.tsx`: mock `fetch` (trả fixture `contracts/examples/*.json`) + mock `EventSource` (class giả phát event theo kịch bản) → kiểm: Empty State khi DB rỗng, banner `database_cleared`, Reports hiển thị đúng 6 tên pattern, Settings hiển thị 7 terminals + cảnh báo stale, map panel hiện toạ độ từ `moveend`, popup chứa `place`/`source_event_id`/UTC.
- Test thuần (node:test, không cần DOM): `apps/web/tests/services.test.ts` (URL/params `start_time,end_time,bbox`, xử lý 404 → `unavailable`), `apps/web/tests/sse-machine.test.ts` (backoff/state), `apps/web/tests/map-data.test.ts` (bán kính/màu/cụm alias/haversine/bbox), `apps/web/tests/settings-data.test.ts` (freshness §9.4), `apps/web/tests/geo-format.test.ts` (WGS84 + UTC).
- `leaflet`/`react-leaflet` không render trong jsdom ổn định → `SeismicMap` được test gián tiếp qua `map-data.ts` + mock `react-leaflet` khi cần render trang (ghi rõ trong testcase).

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ làm FE, gọi thẳng endpoint giả định, không tạo contract
- Ưu: nhanh, ít tệp.
- Nhược: BE và FE sẽ lệch field name; mất định hướng đúng như người dùng lo ngại; không có cơ sở kiểm thử offline.
- Lý do không chọn.

### Phương án B: Làm cả BE (thêm 9 route) trong cùng đợt
- Ưu: chạy được end-to-end ngay.
- Nhược: vượt phạm vi Task 2–4 (thuần FE), chạm `apps/api/**` trái chỉ đạo trước đó; route Clusters/Prediction phụ thuộc worker T4/T5 chưa có dữ liệu thật.
- Lý do không chọn (đề xuất tách proposal BE riêng, tham chiếu contract của proposal này).

### Phương án C (chọn): Contract-first — hợp đồng trong `contracts/` + FE tiêu thụ có chịu lỗi 404
- Ưu: BE có đặc tả để triển khai; FE hoàn thiện UI và test offline ngay; khi BE xong chỉ cần bật cờ (không sửa UI); tuân thủ I2/I3/I5/I7.
- Nhược: một số khối UI (Settings/Reports) sẽ hiển thị nhãn "chưa có endpoint" cho tới khi BE triển khai — chấp nhận được và minh bạch hơn số liệu giả.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Tăng: thêm 6 schema + 6 mock + 2 suite test | Contract-first rẻ hơn nhiều so với sửa UI 2 lần khi BE đổi payload |
| Hiệu năng | Bản đồ giới hạn `limit` + bbox theo viewport + `preferCanvas`; debounce 400 ms giảm request | Tránh tải 15k marker và spam API khi kéo slider |
| Bảo trì / Open-Closed | Chỉ thêm tệp mới + 1 chỗ thay placeholder `SettingsPlaceholder` nội bộ `App.tsx`; `useSSE` giữ chữ ký cũ | RULE-03: không phá 4 trang đang dùng `useSSE(endpoint)` |
| Độ tin cậy | Có nhánh dự phòng 404/tile lỗi/SSE mất kết nối; không fallback mock | I5 + Demo §4 |
| Dev dependencies | +`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event` (dev-only) | Task 4 yêu cầu test component; `node:test` không xử lý TSX |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| BE chưa có 9 endpoint → Settings/Reports trống | Cao | Trung bình | Nhãn rõ "BE chưa triển khai endpoint" + dùng `patterns.clustering_summary` cho lớp cụm (đã có dữ liệu thật) |
| Payload `clustering_summary` legacy (`lat/lon`) khác canonical | Cao | Trung bình | `normalizeClusters()` + bảng alias trong README + test với fixture legacy |
| Leaflet lỗi SSR/StrictMode double-init | Trung bình | Trung bình | Chỉ render trong `useEffect`/client component; key theo `mapId`; test qua `map-data.ts` |
| Tile CARTO cần mạng | Trung bình | Thấp | Overlay cảnh báo `tileerror`, marker vẫn hiển thị trên nền tối |
| Cài devDeps cần mạng | Trung bình | Thấp | `pnpm install` một lần, khóa vào `pnpm-lock.yaml`; nếu fail → ghi `NOT_RUN` và báo |
| `notes_index --check` lệch do thêm bug/proposal | Thấp | Thấp | Chạy check trước commit; không sửa tay README index |
| Sửa `sse-event.json` bị coi là phá vùng khóa | Thấp | Trung bình | Chỉ **additive** enum (không xoá/đổi giá trị cũ), ghi rõ trong `status.md` để `project-review` đối chiếu |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/services.test.ts` *(mới — mock `fetch`, URL/params/404)*
  - `apps/web/tests/map-data.test.ts` *(mới — bán kính/màu/cụm alias/haversine/bbox)*
  - `apps/web/tests/sse-machine.test.ts` *(mới — backoff/trạng thái/event names)*
  - `apps/web/tests/settings-data.test.ts` *(mới — freshness §9.4)*
  - `apps/web/tests/geo-format.test.ts` *(mới — UTC + WGS84)*
  - `apps/web/tests/ui/{empty-state,reports,settings,map-panel}.test.tsx` *(mới — Vitest + jsdom + RTL)*
  - *(giữ nguyên)* `apps/web/tests/chart-data.test.ts` — 12 test đang pass
- **Cách kiểm chứng:**
  - `cd apps/web && pnpm test` (node:test, phải giữ 12/12 pass + test mới)
  - `cd apps/web && pnpm test:ui` (Vitest + jsdom)
  - `cd apps/web && pnpm build` (`tsc -b && vite build`) sạch lỗi
  - `python3 scripts/notes_index.py --check`
  - Kiểm chức năng: DB rỗng → cả 5 trang Empty State + banner `database_cleared`; có dữ liệu → marker/popup/cụm đúng toạ độ; Settings cảnh báo stale khi `last_run` cũ; Reports in ra đúng 6 patterns.
  - **Không** chạy `uv run pytest`/`ruff` (không đụng `apps/api`).

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-16
Comments: Người dùng đang thao tác (`thien`) xác nhận rõ trong chat: "Approved — tiến hành build (Recommended)". Duyệt toàn bộ phạm vi §4 (contract 9 endpoint + Task 2 GIS Leaflet + Task 3 Reports/Settings/Empty-State + Task 4 services/SSE/test), gồm cả sửa additive `contracts/schemas/sse-event.json` và thêm devDependencies Vitest/jsdom/@testing-library/react. Không sửa `apps/api/**`, `docs/api/API.md`, `AGENTS.md`, `docs/quyuocchung.md`, migration.
Scope of Rejection: -

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ thành viên `thien|son|van|tai`, không cần `ThienleDuc`). Sau khi `Approved`, agent chạy `build-implementation`: tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, rẽ nhánh `feat/2026-11-16-fe-contract-gis-reports-thien` (Phần A `review-pr`), rồi triển khai theo thứ tự: contract (`contracts/`) → services/types → `useSSE` → map → reports → settings → rà soát trạng thái → test → `pnpm build` → validation.
