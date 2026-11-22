# Proposal: Fallback cụm thật từ `/api/v1/patterns` khi `/clusters` trả 404 (RD-15)

## Metadata
- ID: 2026-11-22-patterns-cluster-fallback-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: high
- Area: apps/web/src/services/, apps/web/src/lib/transforms/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi contracts/, docs/api/API.md, payload BE, route hay schema. Chỉ bổ sung adapter FE
       để thực hiện đúng quy tắc đã có tại contracts/README.md §3.8.3. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - contracts/README.md (§3.8.3 — ưu tiên `/clusters`, 404 → fallback `/patterns.clustering_summary`)
  - docs/task/fe-be-integration-ready.md (RD-15)
- Related Proposals:
  - 2026-11-16-fe-contract-gis-reports-thien (đã định nghĩa adapter alias legacy + fallback)
  - 2026-11-20-fe-t6-contract-services-audit-thien (kiểm chứng services, chưa nối fallback)
  - 2026-11-21-header-country-clock-refresh-thien (GlobalCountryFilter dùng `getClustersOptional()`)
  - 2026-11-21-monitoring-leaflet-map-markers-thien (`normalizeClusters()` chấp nhận cả 2 shape)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`contracts/README.md` §3.8.3 quy định: ưu tiên `GET /api/v1/clusters`; nếu 404 thì fallback sang `GET /api/v1/patterns` → `clustering_summary` (**dữ liệu thật đang có**) qua adapter alias. Comment trong `apps/web/src/services/earthquake-api.ts:278-282` cũng hứa điều này. FE đã có sẵn `normalizeClusters()` chấp nhận shape legacy (`id/lat/lon/events_count/avg_mag`).

### Vấn đề
`getClustersOptional()` (`earthquake-api.ts:283-287`) thực tế **chỉ gọi `/api/v1/clusters`** rồi trả `unavailable: true` khi 404. Không có bước fallback. Hệ quả:
- `useEarthquakeInsights.ts:70-77` → `clusters: null`, đẩy `"GET /api/v1/clusters"` vào `unavailable[]` dù `/patterns` đang có cụm thật.
- `GlobalCountryFilter.tsx:20-25` → disable select + "Chưa có dữ liệu cụm" dù có thể lấy danh sách quốc gia từ cụm.

### Ảnh hưởng
Đây là drift tài liệu↔code được ghi rõ trong `docs/task/fe-be-integration-ready.md` RD-15. FE đang **từ chối dữ liệu thật** — khác với nguyên tắc "không mock nhưng phải dùng nguồn thật đang có" (I5).

---

## 2. Hiện trạng
- `earthquake-api.ts:157-170` `getOptionalApi()` — 404 → `{data:null, unavailable:true}`; lỗi khác ném `ApiError`.
- `earthquake-api.ts:145-147` `getPatterns()` — đã có, trả `PatternsResponse`.
- `earthquake-api.ts:283-287` `getClustersOptional()` — chỉ `getOptionalApi("/api/v1/clusters")`.
- `lib/transforms/map-data.ts:103-175` `normalizeCluster`/`normalizeClusters` — đọc được cả `clustering_summary.clusters` (alias legacy) lẫn `data.clusters` (canonical).
- `hooks/useEarthquakeInsights.ts:38-79`, `layouts/header/GlobalCountryFilter.tsx:17-31` — tiêu thụ `getClustersOptional()`; **không cần sửa** nếu service trả đúng `ClustersResponse`.
- `contracts/schemas/patterns.json` / `contracts/examples/patterns_sample.json` có `clustering_summary` dạng legacy.

---

## 3. Mục tiêu
- **Mục tiêu:** Khi `/clusters` trả 404, `getClustersOptional()` thử `/patterns` và trả cụm legacy đã map sang shape `ClustersResponse`; giữ `unavailable: true` nếu cả hai đều không có dữ liệu. Không consumer nào phải đổi.
- **Không nằm trong mục tiêu (Out of Scope):** sửa BE (`apps/api/**`), đổi `contracts/**`, `docs/api/API.md`, migration; bỏ mock `mock-region-clusters.ts` (GAP-05, task riêng); đổi SSE; đổi UI của hook/header.

---

## 4. Giải pháp đề xuất
1. **File mới thuần** `apps/web/src/lib/transforms/cluster-fallback.ts`:
   - `clustersFromPatterns(payload: PatternsResponse | null | undefined): ClustersResponse | null`
   - Đọc `payload.clustering_summary?.clusters`; map từng item legacy → canonical `ClusterSummary`: `id→cluster_id`, `lat→center_latitude`, `lon→center_longitude`, `events_count→event_count`, `avg_mag→avg_magnitude`, `max_magnitude = null`, `name` giữ nguyên (để `groupClustersByCountry` còn đọc được địa danh).
   - Trả `null` khi không có mảng hoặc mảng rỗng — **không tạo cụm giả, không nội suy số** (I3/I5).
   - Không đụng chữ ký `normalizeClusters()` (I2).
2. **Sửa bên trong `getClustersOptional()`** (giữ nguyên chữ ký):
   - Gọi `/clusters` như cũ. Nếu không `unavailable` → trả nguyên kết quả (đường nhanh, không gọi thêm API).
   - Nếu `unavailable` (404) → gọi `getPatterns(signal)`; nếu có cụm → trả `{ data: clusters, unavailable: false, status: 200 }`.
   - Nếu `/patterns` cũng 404 hoặc payload rỗng → trả lại kết quả `unavailable: true` ban đầu (UI giữ nhãn "BE chưa triển khai"/Empty State như cũ).
   - **Chỉ fallback khi `primary.unavailable` (404 HTTP)** — không fallback khi `/clusters` trả 200 + `{success:false, data:null, message}` (Empty State hợp lệ, hai endpoint cùng đọc bảng `ClusteringResult`).
   - Mọi lỗi từ `/patterns` (404/500/offline) đều được nuốt, trả lại `unavailable: true` của `/clusters`; **không ném lỗi mới** để không đổi Error State của `useEarthquakeInsights.ts`. Ghi nguồn vào `message` để truy vết.
   - Bất biến: `!unavailable ⇒ data !== null && status === 200`.
3. Adapter phải guard số hữu hạn + WGS84 (`[-90,90]`/`[-180,180]`), bỏ cụm sai; **không tạo `dominant_place` giả** — `name` legacy giữ nguyên dù `countryFromPlace()` có thể trả nhãn tiếng Việt.
4. **Sửa guard `isApiEnvelope()`** (`apps/web/src/contracts/common.ts`): chấp nhận cả shape aggregate `{success:true,total_patterns,patterns}` của `/patterns` (không có `data`) theo `contracts/schemas/patterns.json`. Guard cũ bắt buộc `data` → `getPatterns()` ném "Envelope không hợp lệ" dù BE trả 200, khiến fallback không bao giờ chạy. Đây là hệ quả phát hiện khi triển khai, giới hạn đúng 1 hàm guard, không đổi contract repo-level.
5. **Không đổi** `useEarthquakeInsights.ts`, `GlobalCountryFilter.tsx`, `services/earthquake-api.ts` các hàm khác.

---

## 5. Phương án đã cân nhắc
### Phương án A: Fallback trong `getClustersOptional()` (chọn)
Ưu: một chỗ, cả 2 consumer hưởng lợi; chữ ký không đổi; test được ở tầng service. Nhược: service phụ thuộc thêm `getPatterns` (cùng module, không tạo chu trình).

### Phương án B: Fallback ở từng consumer
Ưu: không đụng service. Nhược: nhân đôi logic ở hook + header, dễ lệch; phải đổi 2 file UI.

### Phương án C: Sửa BE `/clusters` trả cụm từ `/patterns`
Ưu: FE không đổi. Nhược: vi phạm Phạm vi (task này là FE), chạm vùng BE; GAP-01 đang xử lý riêng.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | 1 hàm thuần map alias + 1 nhánh fallback |
| Hiệu năng | 1 request thêm **chỉ khi** `/clusters` 404 | Đường nhanh không đổi |
| Bảo trì / Open-Closed | Tốt | Thêm file/hàm mới, không đổi chữ ký cũ |
| Độ tin cậy | Tăng | Dùng dữ liệu thật có sẵn thay vì bỏ trống |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Payload `/patterns` empty-state không có `clustering_summary` | Cao | Thấp | `clustersFromPatterns()` trả `null` → giữ `unavailable: true` |
| Rule `/clusters` 404 nhưng `/patterns` vẫn có cụm cũ (stale) | Trung bình | Trung bình | FE hiển thị kèm nguồn; không giả vờ đây là DBSCAN mới — bám đúng mô tả `contracts/README.md` §3.8.3 |
| Test TC-01 của `services.test.ts` giả fetch 200 cho mọi URL | Thấp | Thấp | Đường nhanh vẫn chỉ gọi `/clusters`; test cũ không đổi |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-patterns-cluster-fallback-thien.md` *(copy từ `_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/web/tests/cluster-fallback.test.ts` *(mới — test hàm thuần map legacy→canonical)* + bổ sung `apps/web/tests/services.test.ts` *(mock fetch: `/clusters` 404 → `/patterns` trả `clustering_summary` → assert `unavailable:false` + field canonical; cả 2 404 → `unavailable:true`)*.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`, đang thao tác) chỉ thị trực tiếp: "checkout sang nhánh mới để giải quyết vấn đề tích hợp FE<->BE được mô tả trong docs/task/fe-be-integration-ready.md ... bắt đầu với proposal thứ nhất". Đây là xác nhận rõ để triển khai proposal đầu tiên (RD-15). Phạm vi giới hạn đúng §3; không sửa BE/contracts.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, code FE, validation, dừng CHECKPOINT 1. Sau khi đóng task, ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md` để phiên sau không phân tích lại.
