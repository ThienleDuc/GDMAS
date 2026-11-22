# Chức năng Sẵn sàng Tích hợp BE → FE — Danh sách Task nhỏ

> **Ngày đối chiếu:** 2026-11-22 · **Người đối chiếu:** `thien` · **Nhánh:** `docs/fe-be-contract-integration-audit-thien`
>
> Đây là file **thứ nhất** trong cặp kết quả audit FE↔BE. File còn lại:
> [`fe-be-integration-gaps.md`](fe-be-integration-gaps.md) — các chức năng **chưa thể** tích hợp (BE thiếu field/endpoint) kèm đầu việc sửa BE.
>
> **Nguồn sự thật để đối chiếu (theo yêu cầu "dựa vào contracts ở FE"):**
>
> | Lớp | Đường dẫn |
> |---|---|
> | Hợp đồng FE | `apps/web/src/contracts/*.ts` (barrel `index.ts`) |
> | Lớp gọi API FE | `apps/web/src/services/earthquake-api.ts`, `apps/web/src/services/sse-api.ts`, `apps/web/src/lib/api-client.ts` |
> | Adapter FE | `apps/web/src/lib/transforms/{chart-data,map-data}.ts` |
> | Đặc tả repo | `contracts/schemas/*.json`, `contracts/README.md`, `docs/api/API.md` |
> | Route BE | `apps/api/src/gdmas/api/router.py`, `apps/api/src/gdmas/api/routes/*.py`, `apps/api/src/gdmas/realtime/sse.py` |

---

## 0. Định nghĩa "sẵn sàng tích hợp"

Một chức năng được xếp vào file này khi **đồng thời** thỏa:

1. FE đã khai báo contract/type tương ứng trong `apps/web/src/contracts/`;
2. BE đã đăng ký route trong `apps/api/src/gdmas/api/router.py` (`/api/v1/...`) và trả payload khớp shape FE tiêu thụ (kể cả alias đã được adapter FE bridge);
3. Không cần migration Alembic, không cần đổi schema `contracts/`, không cần mock để hiển thị (I3, I4, I5).

Endpoint trả `200` + `{success:false, data:null, message}` (DB rỗng / worker chưa chạy) **vẫn là sẵn sàng** — đây là Empty State hợp lệ theo `docs/api/API.md` §2, không phải lỗi tích hợp.

**Chỉ 3 endpoint có wrapper `getOptionalApi()` chịu 404** (`health`, `system/status`, `clusters`); 404 ở endpoint khác vẫn ném `ApiError` và đi vào Error State. Cả 13 route FE gọi hiện đều đã đăng ký → **không có endpoint nào trả 404 trong cấu hình hiện tại**.

---

## 1. Nhóm A — Endpoint đã tích hợp, dữ liệu thật đang chạy

Các task ở nhóm này chỉ mang tính **kiểm chứng / giữ hợp đồng** (không viết BE, không đổi payload). Mỗi task là 1 đầu việc nhỏ có thể đóng độc lập.

| Task | Chức năng | Hợp đồng FE | Route BE | FE consumer thực tế | Tiêu chí đóng task |
|---|---|---|---|---|---|
| **RD-01** | Danh sách động đất + lọc thời gian/độ lớn/độ sâu/bbox + phân trang + sort | `earthquake.ts:44-54` `EarthquakeListResponse`, `:86-102` `QueryEarthquakeParams` | `GET /api/v1/earthquakes` (`routes/earthquakes.py:55`) | `earthquake-view.ts:126-141`; `monitoring-view.ts:47-73`; `useOverviewData.ts:80` | FE đọc đủ `id/event_time/place/magnitude/depth_km/latitude/longitude/source_event_id/source` + `metadata.{total,page,total_pages}`; empty envelope `success:false` → `data:[]` (`earthquake-api.ts:103-110`); `limit ≤ 100` |
| **RD-02** | KPI dashboard (tổng số trận, mạnh/trung bình/yếu, 24h, magnitude TB/lớn nhất, chuỗi 24h) | `earthquake.ts:62-75` `StatisticsResponse` | `GET /api/v1/statistics/earthquakes` (`routes/statistics.py:59`) | `overview-view.ts:116-172`; `EarthquakeInsights.tsx:61-64` | Các field `total_events`, `strong/moderate/minor_events_count`, `recent_24h_count`, `avg/max_magnitude`, `time_series_preview` có giá trị thật; DB rỗng → số 0 + chuỗi `[]`, không mock `1248` |
| **RD-03** | Pattern 1 — Temporal (line/scatter/histogram) | `analysis.ts:9-45` `TemporalResponse` | `GET /api/v1/analysis/temporal` (`routes/analysis.py:96`) | `statistics-data.tsx:79-83`; `ai-insights.ts:79-116`; `chart-data.ts:141-187` | `line_chart[]`, `scatter_plot[]`, `histogram.magnitude_bins[]` đúng tên; FE tự re-bucket scatter → line (`chart-data.ts:141-178`) |
| **RD-04** | Pattern 2 — Trend (series thực tế vs đường xu hướng) | `analysis.ts:47-70` `TrendResponse` | `GET /api/v1/analysis/trend` (`routes/analysis.py:142`) | `useOverviewData.ts:76` (`D`, 14 ngày); `statistics-data.tsx:84-87` (`W`); `overview-view.ts:256-269` | `series[].{period,actual_value,trend_value,is_complete}`, `slope`, `trend_direction` có thật; `r_squared` đang **thiếu** → xếp ở GAP-02 (không chặn RD-04) |
| **RD-05** | Pattern 3 — Seasonality (đường mùa vụ + diễn giải) | `analysis.ts:72-94` `SeasonalityResponse` | `GET /api/v1/analysis/seasonality` (`routes/analysis.py:195`) | `overview-view.ts:273-282`; `ai-insights.ts:155-187` | `components.seasonal_line[]`, `seasonality_strength`, `interpretation` hiển thị nguyên văn BE; `status = insufficient_data` → Empty State có thông điệp |
| **RD-06** | Pattern 4 — Correlation matrix | `analysis.ts:96-115` `CorrelationResponse` | `GET /api/v1/analysis/correlation` (`routes/analysis.py:228`) | `statistics-view.ts:101-124`; `ai-insights.ts:189-235` | `variables[]`, `matrix[][]` đối xứng, `method` đúng; `sample_size`/`note` đang thiếu → GAP-03 |
| **RD-07** | Pattern 5 — Dự báo $t+1$ (2 shape đã được bridge) | `predictions.ts:9-43` `PredictionContract` / `PredictionsResponse` | `GET /api/v1/predictions` (`routes/predictions.py:23`) | `useOverviewData.ts:78`; `overview-view.ts:301-324`; `chart-data.ts:429-437` (`asPrediction`) | FE chấp nhận `confidence_interval{lower,upper}` (route riêng) lẫn `lower_bound/upper_bound` (payload `/patterns`); `target_date`, `predicted_value` có thật |
| **RD-08** | Pattern 6 — Phân loại $t+1$ (nhãn + xác suất) | `classifications.ts:9-22` | `GET /api/v1/classifications` (`routes/predictions.py:64`) | `useOverviewData.ts:79`; `chart-data.ts:319-369,439-444` (`normalizeRiskLabel`, `asClassification`) | `probabilities` → `probability_scores` qua adapter; nhãn dài `"Normal Activity"` → `MEDIUM`; 4 mức canonical hiển thị đúng |
| **RD-09** | Lớp cụm DBSCAN trên bản đồ + bảng xếp hạng | `clusters.ts:7-43` `ClustersResponse` | `GET /api/v1/clusters` (`routes/clusters.py:32`) | `useEarthquakeInsights.ts:41`; `map-data.ts:103-175` (`normalizeClusters`); `overview-view.ts:214-253` | `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude/max_magnitude` có thật; alias legacy `id/lat/lon/events_count/avg_mag` vẫn đọc được; `radius_km/dominant_place` đang thiếu → GAP-01 |
| **RD-10** | Real-time SSE — marker động đất & sự kiện hệ thống | `sse.ts:8-32` `SSEEventPayload`, `contracts/schemas/sse-event.json` | `GET /api/v1/stream/earthquakes` (`routes/stream.py:47`) + `GET /api/v1/events/stream` (`routes/events.py:9`) | `DashboardLayout.tsx:30` → `useSSE.ts` → `lib/sse.ts:85-104` → `sse-context.ts` → `monitoring-view.ts:107-141` | 1 kết nối duy nhất tại shell; 6 tên event đăng ký; parse bọc `{event,data,timestamp}`; `database_cleared` → xoá marker + Empty State. **Shape `data.new_events[]` chưa khớp FE đọc phẳng** → GAP-06 |
| **RD-11** | Envelope & mã lỗi chuẩn | `common.ts:8-124` (`ApiEnvelope`, `ErrorEnvelope`, `isApiEmptyEnvelope`, 6 mã lỗi) | `routes/errors.py`, mọi route | `lib/api-client.ts:66-109`, `isNotFound()` trong hooks | 200-rỗng (`success:false,data:null,message`) ≠ 404 (`unavailable`); 400 `VALIDATION_ERROR` khi `min_magnitude > max_magnitude`; 500 `DATABASE_ERROR` không trả mock |
| **RD-12** | UTC & WGS84 | `common.ts:127-156` (`isUtcTimestamp`, `isWgs84Bounds`) | mọi route | `lib/formatters.ts`, `lib/transforms/map-data.ts:42-55` | Timestamp ISO 8601 `Z`, toạ độ `latitude`/`longitude` chuẩn WGS84; quy đổi giờ chỉ ở tầng hiển thị (UTC / UTC+7) |

---

## 2. Nhóm B — BE đã sẵn sàng nhưng FE chưa nạp (task tích hợp nhỏ)

Các route này **đã có trên BE và khớp contract FE**, nhưng service FE chỉ mới định nghĩa, chưa có consumer trong `apps/web/src/`. Đây là những task tích hợp nhỏ, không cần sửa BE.

| Task | Chức năng | Điểm xuất phát FE | Việc cần làm (phạm vi FE) | Ghi chú |
|---|---|---|---|---|
| **RD-13** | Chi tiết 1 sự kiện động đất | `earthquake-api.ts:117-122` `getEarthquakeDetail()` | Gắn vào popup/bảng chi tiết trên `/monitoring` hoặc `/earthquakes`; dùng `raw_data` (GeoJSON gốc) khi có | BE `routes/earthquakes.py:157` đã trả đủ field theo `earthquake.ts:27-42` |
| **RD-14** | Đồng bộ USGS theo yêu cầu | `earthquake-api.ts:136-140` `syncUsgsData()` — `POST /api/v1/earthquakes/sync` | Thêm nút "Đồng bộ ngay" có xác nhận + disable khi chạy; refresh danh sách sau khi xong | Cân nhắc chỉ cho vai trò vận hành; không đặt ở view công khai nếu không có phân quyền |
| **RD-15** | Tổng hợp 6 Patterns (`/patterns`) làm nguồn dự phòng | `earthquake-api.ts:145-147` `getPatterns()` | Dùng làm fallback thật cho lớp cụm khi `/clusters`不可用, theo `contracts/README.md` §3.8.3 | **Drift hiện tại:** comment `earthquake-api.ts:279-281` hứa fallback nhưng `useEarthquakeInsights.ts:70-77` & `GlobalCountryFilter.tsx:23-24` không thực hiện. Đây là task đóng drift, không thêm mock |
| **RD-16** | Sức khoẻ & trạng thái 7 Terminals | `earthquake-api.ts:173-196` `getHealth`/`getSystemStatus` (+Optional) | Nạp vào một panel trạng thái nhỏ (có thể đặt lại trong header/shell) thay vì metadata tĩnh `settings-data.ts:126-182`; `last_run` thiếu → `unknown`, không suy diễn đang chạy | Route `/settings` đã bị gỡ; không khôi phục route cũ |
| **RD-17** | Kênh SSE chuẩn `/api/v1/events/stream` | `services/sse-api.ts:11,22-35` `connectEventsStream()` | Đổi default `useSSE` từ route legacy `/stream/earthquakes` sang route chuẩn (giữ legacy làm fallback theo RULE-03) | Cả 2 route BE đều chạy chung generator (`realtime/sse.py:178`) |

---

## 3. Tiêu chí chung để đóng nhóm "sẵn sàng"

- [ ] Không sửa `contracts/**`, `docs/api/API.md`, migration Alembic (`I4`) trong các task trên.
- [ ] Không thay dữ liệu thật bằng mock tĩnh ở view chính thức (`I5`). Trường hợp vi phạm hiện tại (`mock-region-clusters.ts`) nằm ở **GAP-05** của file gaps.
- [ ] Mọi timestamp UTC ISO 8601 `Z`, toạ độ WGS84 (`I3`); adapter `asPrediction`/`asClassification`/`normalizeClusters` giữ nguyên chữ ký (`I2`).
- [ ] Test offline 100%, mock fetch/EventSource (`I7`): `cd apps/web && pnpm test && pnpm build`.

> Các chức năng **chưa sẵn sàng** (BE thiếu field / shape SSE / optional payload) được tách thành task riêng tại [`fe-be-integration-gaps.md`](fe-be-integration-gaps.md). Các task GAP-01…GAP-04, GAP-06, GAP-07 trong đó là các đầu việc **sửa BE** theo yêu cầu "thay đổi phía BE để đồng bộ FE".

---

## 4. Nhật ký triển khai (đọc đầu tiên ở phiên tiếp theo)

> Mỗi proposal hoàn thành ghi 1 mục ở đây để phiên sau **không phải phân tích lại từ đầu**.
> Thứ tự proposal đã chia: **(1) RD-15** ✅ · **(2) RD-13** ✅ · **(3) RD-17** ✅ · (4) RD-16 · (5) RD-14.
> RD-01…RD-12 chỉ là kiểm chứng hợp đồng, không cần proposal riêng.

### Proposal 1 — RD-15: Fallback cụm thật từ `/patterns` — ✅ ĐÃ GIẢI QUYẾT (2026-11-22)

- **Nhánh:** `feat/2026-11-22-patterns-cluster-fallback-thien`
- **Proposal:** `.agents/notes/proposed/2026-11-22-patterns-cluster-fallback-thien.md` (§9 Approved)
- **Plan / Testcase:** `.agents/notes/implemented/2026-11-22-patterns-cluster-fallback-thien/`, `.agents/notes/testcase/2026-11-22-patterns-cluster-fallback-thien.md`
- **Vấn đề đã đóng:** `getClustersOptional()` trước đây chỉ gọi `/api/v1/clusters`; khi 404 trả `unavailable: true` dù `/patterns` đang có `clustering_summary` thật → `useEarthquakeInsights` và `GlobalCountryFilter` từ chối dữ liệu. Đây là drift đã ghi tại mục RD-15.
- **Cách làm:**
  - Thêm `apps/web/src/lib/transforms/cluster-fallback.ts` — hàm thuần `clustersFromPatterns()` map alias legacy (`id/lat/lon/events_count/avg_mag`) → `ClusterSummary` canonical; guard WGS84, bỏ cụm sai, không nội suy, không tạo `dominant_place` giả.
  - Sửa `getClustersOptional()` trong `apps/web/src/services/earthquake-api.ts`: **chỉ fallback khi `/clusters` 404 HTTP**; 200 (kể cả empty envelope) giữ nguyên; fallback gọi `/patterns`, map rồi trả `{unavailable:false, status:200, message:"Nguồn: GET /api/v1/patterns → clustering_summary"}`; mọi lỗi từ `/patterns` được nuốt, giữ `unavailable:true` của nguồn chính.
  - **Phát hiện khi implement:** `isApiEnvelope()` (`apps/web/src/contracts/common.ts`) bắt buộc khóa `data`, nhưng `/patterns` theo `contracts/schemas/patterns.json` trả `{success,total_patterns,patterns,clustering_summary}` **không có `data`** → `getPatterns()` ném ApiError dù BE trả 200. Đã sửa guard chấp nhận thêm shape aggregate. Không đổi `contracts/**`.
  - **Không đổi:** `useEarthquakeInsights.ts`, `GlobalCountryFilter.tsx`, `header-data.ts`, `map-data.ts`, `country-clusters.ts`, `apps/api/**`.
- **Test:** `apps/web/tests/cluster-fallback.test.ts` (mới) + bổ sung `apps/web/tests/services.test.ts` (TC-12…TC-16); `cd apps/web && pnpm test` → **183/183 pass**, `pnpm build` PASS; `notes_index.py --check` OK; `git-ship.sh scope` OK.
- **Kết luận cho các consumer:** không cần sửa — tự nhận cụm thật; `unavailable` chỉ còn đúng khi cả 2 nguồn đều rỗng/404.
- **Còn lại cho phiên sau:** RD-13, RD-14, RD-16, RD-17 chưa làm (xem bảng §2 ở trên). Bắt đầu proposal 2 = **RD-13** (gắn chi tiết sự kiện từ `getEarthquakeDetail()` vào popup/bảng), rẽ nhánh mới từ `develop`. Không cần đọc lại audit FE↔BE — dùng trực tiếp bảng §1/§2 + nhật ký này.
- **Lưu ý:** `clustering_summary` legacy từ `demo_seeder` có `name` tiếng Việt ("Vành đai Thái Bình Dương - Nhật Bản") → `countryFromPlace()` có thể không map được sang "Japan"; đây là dữ liệu thật, **không được bịa `dominant_place`** (thuộc GAP-01 phía BE).

### Proposal 2 — RD-13: Panel chi tiết sự kiện — ✅ ĐÃ GIẢI QUYẾT (2026-11-22)

- **Nhánh:** `feat/2026-11-22-earthquake-detail-panel-thien`
- **Proposal:** `.agents/notes/proposed/2026-11-22-earthquake-detail-panel-thien.md` (§9 Approved)
- **Plan / Testcase:** `.agents/notes/implemented/2026-11-22-earthquake-detail-panel-thien/`, `.agents/notes/testcase/2026-11-22-earthquake-detail-panel-thien.md`
- **Vấn đề đã đóng:** `getEarthquakeDetail()` (`earthquake-api.ts:118-123`) chỉ có định nghĩa, không consumer — bảng `/earthquakes` không hiển thị được `magnitude_type`, `source_url`, `ingested_at`, `raw_data` dù BE `GET /earthquakes/{id}` đã trả thật.
- **Cách làm:**
  - Thêm helper thuần `apps/web/src/features/earthquakes/earthquake-detail.ts`: `detailFields(item, timezone)`, `rawDataSummary(item)`, `isNotFound(error)` — chỉ field có giá trị, UTC/WGS84 đúng, không số giả.
  - Thêm `components/EarthquakeDetailPanel.tsx` — 4 trạng thái `loading / not_found / error / ready`; `<details>` chứa `JSON.stringify(raw_data)` khi có; `role="status"/"alert"`.
  - `components/EarthquakeTable.tsx`: thêm prop **tùy chọn** `onSelect?: (id:number)=>void` (I2 — giữ nguyên props cũ), `<tr>` có click/Enter/Space + `role="button"`/`tabIndex`.
  - `EarthquakesPage.tsx`: state `selectedId/detail/detailState/detailMessage/detailRetryKey`; effect gọi `getEarthquakeDetail(selectedId, signal)` với `AbortController` (tránh race), clear selection khi đổi filter/trang/quốc gia/retry; render panel dưới bảng. CSS mới trong `EarthquakesPage.css` chỉ dùng token, không hardcode màu.
  - **Không đổi:** `apps/api/**`, `contracts/**` repo-level, `services/earthquake-api.ts`, `/monitoring`, Leaflet/SSE, `useCatalogSelection`.
- **Test:** `apps/web/tests/earthquake-detail.test.ts` (mới, 5 case) + bổ sung `apps/web/tests/earthquakes-page.test.ts` TC-12; `pnpm test` → **189/189 pass**, `pnpm build` PASS; `notes_index.py --check` OK.
- **Lưu ý cho phiên sau:** BE trả object thuần (không envelope) → `fetchApi` chấp nhận; 404 → `ApiError(404)` → panel "Không tìm thấy sự kiện"; `contracts/examples/earthquake_sample.json` có `raw_data:null` nên test phải tự dựng GeoJSON. Tiếp theo = proposal 3 **RD-17** (đổi default SSE sang `/api/v1/events/stream`, giữ legacy fallback) — rẽ nhánh mới từ `develop`, không cần đọc lại audit.

### Proposal 3 — RD-17: Endpoint SSE chuẩn làm default — ✅ ĐÃ GIẢI QUYẾT (2026-11-22)

- **Nhánh:** `feat/2026-11-22-sse-standard-endpoint-thien`
- **Proposal:** `.agents/notes/proposed/2026-11-22-sse-standard-endpoint-thien.md` (§9 Approved)
- **Plan / Testcase:** `.agents/notes/implemented/2026-11-22-sse-standard-endpoint-thien/`, `.agents/notes/testcase/2026-11-22-sse-standard-endpoint-thien.md`
- **Vấn đề đã đóng:** `useSSE()` giữ hằng riêng `DEFAULT_ENDPOINT = "/api/v1/stream/earthquakes"` và `DashboardLayout` truyền tường minh route legacy, trong khi `services/sse-api.ts` đã có `getEventsStreamUrl()` trả route chuẩn → hai nguồn cấu hình (drift RD-17).
- **Cách làm:**
  - `hooks/useSSE.ts`: bỏ 3 hằng cục bộ + import `resolveSseUrl`; ủy quyền cho `getEventsStreamUrl(endpoint)`; giữ nguyên chữ ký `useSSE(endpoint?: string)`; re-export `LEGACY_STREAM_ENDPOINT` để consumer cũ truyền tường minh (I2/RULE-03).
  - `layouts/DashboardLayout.tsx`: `useSSE()` — dùng default chuẩn; vẫn 1 kết nối tại shell + `SseMarkersProvider` + `sse.reconnect` (I1).
  - **Không đổi:** `services/sse-api.ts`, `lib/sse.ts` (kể cả fallback legacy của `resolveSseUrl`), BE, event names, packet, backoff, `/monitoring`, `.env*`, `dev-mock.ts`.
- **Test:** `apps/web/tests/sse-default.test.ts` (mới, 6 case: default chuẩn, override legacy, connectEventsStream legacy, source assertions hook/shell); `pnpm test` → **194/194 pass**, `pnpm build` PASS; `notes_index.py --check` OK; `scope` OK.
- **Legacy vẫn dùng được qua 3 đường:** (a) `useSSE(LEGACY_STREAM_ENDPOINT)` (constant được re-export), (b) `VITE_SSE_ENDPOINT=/api/v1/stream/earthquakes`, (c) BE giữ cả 2 route dùng chung generator.
- **Bổ sung theo duyệt user:** `.env.example` đổi `VITE_SSE_ENDPOINT` sang `/api/v1/events/stream` (comment nhắc legacy override); `dev-mock.ts` phục vụ thêm `/api/v1/events/stream` nhưng vẫn giữ nhánh legacy; `dev-mock.test.ts` thêm case route chuẩn. Không đụng file `.env` local hay BE.
- **Tiếp theo:** proposal 4 = **RD-16** (nạp `getHealth`/`getSystemStatus` vào panel trạng thái 7 Terminals). Proposal 5 = RD-14 (nút đồng bộ USGS). Rẽ nhánh mới từ `develop`; dùng nhật ký này, không phân tích lại audit.
