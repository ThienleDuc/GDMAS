# Implementation Plan: Hợp đồng dữ liệu BE↔FE + GIS Map, Báo cáo, Cài đặt, Services/SSE (Task 2–4)

## Metadata
- ID: 2026-11-16-fe-contract-gis-reports-thien
- Proposal: .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md
- Approved By: thien
- Approved At: 2026-11-16
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Chốt hợp đồng dữ liệu BE↔FE trong `contracts/` cho 9 endpoint còn thiếu (`/health`, `/system/status`, 4 × `/analysis/*`, `/predictions`, `/classifications`, `/clusters`) + mở rộng additive `sse-event.json`; trên cơ sở đó hoàn thiện Task 2 (bản đồ Leaflet + lớp cụm DBSCAN), Task 3 (Reports dữ liệu thật, SettingsPage 7 Terminals, rà soát Loading/Error/Empty + `database_cleared`), Task 4 (services/types chặt, `useSSE` reconnect, bộ test offline). **Không thay đổi mã nguồn BE.**

---

## 2. Phạm vi
### In Scope
- `contracts/schemas/health.json`
- `contracts/schemas/system-status.json`
- `contracts/schemas/analysis.json`
- `contracts/schemas/predictions.json`
- `contracts/schemas/classifications.json`
- `contracts/schemas/clusters.json`
- `contracts/schemas/sse-event.json`
- `contracts/examples/health_sample.json`
- `contracts/examples/system_status_sample.json`
- `contracts/examples/analysis_sample.json`
- `contracts/examples/predictions_sample.json`
- `contracts/examples/classifications_sample.json`
- `contracts/examples/clusters_sample.json`
- `contracts/README.md`
- `apps/web/src/contracts/index.ts`
- `apps/web/src/types/index.ts`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/services/earthquake-api.ts`
- `apps/web/src/hooks/useSSE.ts`
- `apps/web/src/hooks/sse-machine.ts`
- `apps/web/src/hooks/useDatabaseReset.ts`
- `apps/web/src/components/ui/AsyncState.tsx`
- `apps/web/src/components/ui/ConnectionStatusBadge.tsx`
- `apps/web/src/components/map/types.ts`
- `apps/web/src/components/map/map-data.ts`
- `apps/web/src/components/map/SeismicMap.tsx`
- `apps/web/src/components/map/EarthquakeMarkerLayer.tsx`
- `apps/web/src/components/map/ClusterLayer.tsx`
- `apps/web/src/components/map/MapFilterPanel.tsx`
- `apps/web/src/components/map/MapLegend.tsx`
- `apps/web/src/components/map/MapPopupCard.tsx`
- `apps/web/src/components/map/index.ts`
- `apps/web/src/components/map/README.md`
- `apps/web/src/features/monitoring/MonitoringMapPage.tsx`
- `apps/web/src/features/reports/ReportsPage.tsx`
- `apps/web/src/features/settings/SettingsPage.tsx`
- `apps/web/src/features/settings/settings-data.ts`
- `apps/web/src/features/settings/README.md`
- `apps/web/src/app/App.tsx`
- `apps/web/src/layouts/DashboardLayout.tsx`
- `apps/web/src/layouts/FullscreenMapLayout.tsx`
- `apps/web/src/main.tsx`
- `apps/web/index.html`
- `apps/web/tests/services.test.ts`
- `apps/web/tests/map-data.test.ts`
- `apps/web/tests/sse-machine.test.ts`
- `apps/web/tests/settings-data.test.ts`
- `apps/web/tests/geo-format.test.ts`
- `.agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md`
- `.agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md`
- `.agents/notes/implemented/2026-11-16-fe-contract-gis-reports-thien/plan.md`
- `.agents/notes/implemented/2026-11-16-fe-contract-gis-reports-thien/status.md`

### Out of Scope
- Toàn bộ `apps/api/**` (route, service, worker, model, migration, test backend) — 9 endpoint BE sẽ là proposal riêng.
- `docs/api/API.md`, `AGENTS.md`, `docs/quyuocchung.md`, `.githooks/`, `docker-compose.yml`, `.env.example` — vùng khóa.
- `apps/api/alembic/**` — không migration mới.
- `apps/web/src/components/charts/**` *(đã hoàn thiện ở proposal trước; chỉ đọc)*
- `apps/web/tests/chart-data.test.ts` *(giữ nguyên 12/12 pass — I7)*
- Worker T4 (DBSCAN thật) và T5 (Prediction thật) — chỉ tiêu thụ dữ liệu.

---

## 3. Các bước
### Step 1 — Hợp đồng dữ liệu (`contracts/`)
- 6 JSON Schema draft 2020-12: canonical snake_case, mọi timestamp UTC ISO 8601 `Z`, toạ độ WGS84; trường chưa chắc có khai báo optional.
- `clusters.json` khai báo `$defs.legacyCluster` (alias `id/lat/lon/events_count/avg_mag`) để FE chấp nhận payload `clustering_summary` hiện tại.
- `sse-event.json`: mở rộng `enum` thêm `ingestion_cycle_completed`, `database_cleared`, `earthquake_alert` (**không xoá/đổi giá trị cũ**), thêm optional `id`, `retry`.
- 6 mock example (có biến thể PENDING/rỗng để test Empty State).
- `contracts/README.md`: §3.4 Clusters, §3.5 System/Health, §3.6 Analysis, §3.7 Predictions/Classifications + bảng alias → canonical + quy tắc "FE phải chịu được 404 → Adaptation Empty State, không mock".

### Step 2 — Services & types (Task 4)
- `src/contracts/index.ts`: giữ `SSEEventPayload` (mở rộng union), giữ `EarthquakeContract`/`PredictionContract` và bổ sung trường thật optional; thêm `HealthResponse`, `SystemStatusResponse`, `TemporalResponse`, `TrendResponse`, `SeasonalityResponse`, `CorrelationResponse`, `PredictionsResponse`, `ClassificationsResponse`, `ClustersResponse`, `ClusterSummary`, `ServiceStatus`, `EarthquakeQuery`, `TimeRange`, `GeoBoundingBox`.
- `services/earthquake-api.ts`: thêm `getHealth`, `getSystemStatus`, `getTemporalAnalysis`, `getTrendAnalysis`, `getSeasonalityAnalysis`, `getCorrelationAnalysis`, `getPredictions`, `getClassifications`, `getClusters`; mở rộng `QueryEarthquakeParams` (`start_time`, `end_time`, `min_lat`, `max_lat`, `min_lon`, `max_lon`); mọi hàm nhận `signal?: AbortSignal`; helper `getOptionalApi<T>()` trả `{ data, unavailable }` khi 404.
- Bỏ `any` khỏi `PatternItem.metrics` bằng `PatternMetrics = Record<string, unknown>` + getter typed.

### Step 3 — SSE reconnect (Task 4)
- `useSSE`: state machine `connecting → open → reconnecting → disconnected`, backoff 1→2→4…→30 s + jitter, tạo `EventSource` mới mỗi lần retry, cleanup khi unmount; nghe hợp 2 bộ tên event; hỗ trợ `/api/v1/stream/earthquakes` (mặc định) và `/api/v1/events/stream` qua tham số/`VITE_SSE_ENDPOINT`; trả thêm `status`, `reconnectAttempt` **mà không phá chữ ký** `useSSE(endpoint?)`.
- `ConnectionStatusBadge` hiển thị `LIVE / Reconnecting… / Disconnected` trong `DashboardLayout` và `FullscreenMapLayout`.

### Step 4 — Bản đồ Leaflet (Task 2)
- `map-data.ts` hàm thuần: `magnitudeToRadius`, `magnitudeToColor`, `depthToOpacity`, `normalizeClusters`, `haversineKm`, `viewportToBbox`, `shouldShowMarker`, `formatCoordinate`, `clusterRadiusKm`.
- `SeismicMap.tsx`: CARTO Dark tiles + attribution, `preferCanvas`, `ZoomControl` góc phải, `moveend/zoomend` → `onViewportChange`, overlay cảnh báo `tileerror`.
- `EarthquakeMarkerLayer.tsx`: `CircleMarker` bán kính/màu theo magnitude, viền theo depth; `Popup` chi tiết (`place`, `source_event_id`, UTC + giờ địa phương, `depth_km`, `magnitude`, link USGS).
- `ClusterLayer.tsx`: `Circle` tâm cụm + `Marker` số sự kiện + popup tổng hợp; prop `visible`.
- `MapFilterPanel.tsx`: slider magnitude (debounce 400 ms + `AbortController`), chọn khoảng thời gian (24h/7d/30d/tuỳ chọn), công tắc "Hiển thị cụm DBSCAN", nút đặt lại.
- `MapLegend.tsx`, `MapPopupCard.tsx`, `index.ts`, `README.md`.
- `MonitoringMapPage.tsx`: nạp `/earthquakes` (bbox/limit) + `getClusters()` (fallback `patterns.clustering_summary`), HUD toạ độ/zoom thật, Loading/Error/Empty + banner `database_cleared`.
- `main.tsx` import `leaflet/dist/leaflet.css`; bỏ link unpkg ở `index.html`.

### Step 5 — Reports & Settings (Task 3)
- `ReportsPage.tsx`: 4 nguồn thật (`statistics`, `patterns`, `clusters`, `system/status`), bảng đúng 6 patterns (`Temporal`, `Trend`, `Seasonality`, `Correlation`, `Dự báo t+1`, `Phân loại t+1`), giữ `print:*`, banner Empty State, nhãn "BE chưa triển khai endpoint" khi 404.
- `features/settings/settings-data.ts`: `evaluateServiceFreshness(service, now)` (§9.4: 5m → stale >15m, interrupted >60m; 1d → stale >26h), `normalizeServices`, `formatDuration`.
- `SettingsPage.tsx`: 7 Terminals + `last_run`, poll 30 s, chuyển UTC ↔ Giờ địa phương qua `utils/timezone.ts`, khu vực Demo 6 bước + nút kiểm tra `/health`.
- `App.tsx`: thay `SettingsPlaceholder` nội bộ.

### Step 6 — Rà soát trạng thái (Task 3c)
- `AsyncState.tsx` (`LoadingState`, `ErrorState`, `EmptyState`) + `useDatabaseReset.ts` (`resetVersion`, `lastResetAt`, refetch khi `ingestion_cycle_completed`).
- Áp dụng additive cho 5 trang + Settings: DB rỗng → Empty State (không mock), `database_cleared` → banner, phục hồi → refetch.
- `grep -rn "MOCK\|1,248\|fallback" apps/web/src` xác nhận không còn dữ liệu giả.

### Step 7 — Test offline (Task 4)
- Giữ `apps/web/tests/chart-data.test.ts` (12/12).
- `node:test`: `services.test.ts` (URL/params/bbox/404), `map-data.test.ts` (bán kính/màu/alias/haversine/bbox), `sse-machine.test.ts` (backoff/state/event names), `settings-data.test.ts` (freshness), `geo-format.test.ts` (UTC/WGS84).
- Vitest + jsdom + RTL: `tests/ui/{empty-state,reports,settings,map-panel}.test.tsx` (mock `fetch` + `EventSource`).
- `pnpm-lock.yaml` cập nhật qua `pnpm install`.

### Step 8 — Validation
- `cd apps/web && pnpm test` → `pnpm test:ui` → `pnpm build`
- JSON contract parse check; `python3 scripts/notes_index.py --check`
- Cập nhật `testcase/<id>.md` + `status.md` → `Status: validation`, rồi chuyển giao `review-pr` Phần B.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Không migration, không đổi schema DB, không đổi endpoint BE.
- `contracts/`: +6 schema, +6 mock example, sửa additive `sse-event.json`, cập nhật README.
- `apps/web/package.json`: thêm devDependencies (Vitest/jsdom/RTL) + script `test:ui`; `pnpm-lock.yaml` đổi theo.
- Biến môi trường FE: `VITE_SSE_ENDPOINT` (optional, đọc trong code; **không** sửa `.env.example`).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [ ] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-16-fe-contract-gis-reports-thien.md`
- [ ] **Đã tạo và chạy pass file unit/integration test offline** (`apps/web/tests/*.test.ts`, `apps/web/tests/ui/*.test.tsx`)
- [ ] Frontend typecheck & build: `cd apps/web && pnpm build`
- [ ] Frontend test cũ giữ nguyên: `cd apps/web && pnpm test` (12/12 cũ + mới)
- [ ] Frontend test component: `cd apps/web && pnpm test:ui`
- [ ] JSON contract parse: 6 schema + 6 example mới
- [ ] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check`
- [ ] Tài liệu bị ảnh hưởng: `contracts/README.md`, `components/map/README.md`, `features/settings/README.md`
- [ ] Kiểm chức năng: DB rỗng → Empty State 5 trang + banner `database_cleared`; có dữ liệu → marker/popup/cụm đúng WGS84; Settings cảnh báo stale; Reports đúng 6 patterns
- [ ] Không chạy `uv run pytest`/`ruff` (không đụng `apps/api`)

---

## 6. Rủi ro khi làm
- **`pnpm install` cần mạng** cho devDeps Vitest/jsdom: nếu fail → ghi `NOT_RUN`, báo người dùng, vẫn giữ `pnpm test` (node:test) chạy được.
- **Leaflet không render trong jsdom**: test gián tiếp qua `map-data.ts` + mock `react-leaflet`, ghi rõ trong testcase.
- **`react-leaflet` v5 + React 19 + TS strict**: `MapContainer` props (`center` tuple) dễ sai type → build sớm sau Step 4.
- **Legacy `clustering_summary`** (`lat/lon`): adapter phải nhận cả 2 shape, test với fixture legacy.
- **Sửa `sse-event.json`** bị coi là vùng khóa → chỉ additive, ghi rõ trong `status.md`.
- **Không phá 4 trang đang dùng `useSSE(endpoint)`** — giữ nguyên chữ ký, chỉ thêm trường trả về.

---

## 7. Rollback
- Revert commit/PR là đủ; không có migration, không đổi DB.
- Nếu Vitest/jsdom gây nhiễu: gỡ devDeps + `vitest.config.ts` + `tests/ui/**`, giữ `node:test` (12 test cũ không ảnh hưởng).

---

## 8. Ghi chú
- Mock payload chỉ dùng cho test (`contracts/examples/`), **không** import vào runtime.
- `apps/web/tests/**` nằm ngoài `tsconfig include: ["src"]` nên không bị `tsc -b` kiểm tra; Vitest tự transpile.
- Toàn bộ timestamp hiển thị qua `utils/timezone.ts`; toạ độ định dạng WGS84 qua `formatCoordinate`.
