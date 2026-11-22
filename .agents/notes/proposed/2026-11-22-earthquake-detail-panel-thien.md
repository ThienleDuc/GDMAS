# Proposal: Panel chi tiết sự kiện động đất từ `GET /earthquakes/{id}` (RD-13)

## Metadata
- ID: 2026-11-22-earthquake-detail-panel-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: feature
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: apps/web/src/features/earthquakes/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi contracts/ repo-level, docs/api/API.md, payload BE hay route. Chỉ gắn consumer FE
       vào endpoint BE đã có (getEarthquakeDetail đã định nghĩa từ T7.02). -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/api/API.md §3.2 (`GET /api/v1/earthquakes/{id}`)
  - docs/task/fe-be-integration-ready.md (RD-13)
- Related Proposals:
  - 2026-11-20-fe-t6-contract-services-audit-thien (`getEarthquakeDetail()` đã được kiểm chứng)
  - 2026-11-21-monitoring-leaflet-map-markers-thien (bổ sung `raw_data` vào FE contract)
  - 2026-11-22-patterns-cluster-fallback-thien (proposal 1, đã merge — mẫu nhật ký tiến độ)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
BE đã có `GET /api/v1/earthquakes/{event_id}` (`routes/earthquakes.py:235-262`) trả object `EarthquakeResponse` đầy đủ: canonical fields + `magnitude_type`, `source_url`, `ingested_at`, **`raw_data`** (GeoJSON gốc). FE đã khai báo service `getEarthquakeDetail()` (`earthquake-api.ts:118-123`) và type `EarthquakeItem.raw_data?` (`earthquake.ts:41`).

### Vấn đề
`getEarthquakeDetail()` **chỉ có định nghĩa, không có consumer** trong `apps/web/src/`. Bảng `/earthquakes` (`EarthquakeTable.tsx:24-37`) chỉ hiển thị 6 cột từ `EventRow`; người dùng không xem được mã nguồn đầy đủ, loại độ lớn, link USGS, thời điểm nạp hay GeoJSON gốc dù BE có thật.

### Ảnh hưởng
RD-13 trong file task đang mở — dữ liệu thật có sẵn nhưng FE không dùng, đúng loại drift "BE sẵn → FE chưa nạp" mà file `ready.md` liệt kê.

---

## 2. Hiện trạng
- `earthquake-api.ts:118-123` — `getEarthquakeDetail(eventId, signal?): Promise<EarthquakeItem>`, gọi `/api/v1/earthquakes/${eventId}` qua `fetchApi` (BE trả object thuần, không envelope; 404 → `ApiError`).
- `EarthquakesPage.tsx:127` — `rows = visibleItems.map(formatEventRow)`; `:183` render `<EarthquakeTable rows timezone />`.
- `EarthquakeTable.tsx:4-42` — component thuần, prop `{rows, timezone}`, không có sự kiện click.
- `earthquake-view.ts:92-113` — `EventRow` có `id: number` → đủ để gọi detail.
- `lib/formatters.ts` — `formatEventTime(mode)`, `formatWgs84Point` đã có; `getStoredTimezone/setStoredTimezone` đang dùng ở trang.
- Test FE là `node:test` thuần (`apps/web/tests/*.test.ts`), **không có React Testing Library/jsdom** → phải tách logic thuần để test offline.

---

## 3. Mục tiêu
- **Mục tiêu:** Click 1 dòng trong bảng `/earthquakes` → nạp chi tiết qua `getEarthquakeDetail(id)` và hiển thị panel với các field BE trả thật (kể cả `raw_data` khi có); đủ 3 trạng thái loading / error(404) / loaded; không sửa BE.
- **Không nằm trong mục tiêu (Out of Scope):** sửa `apps/api/**`, `contracts/**` repo-level, `docs/api/API.md`; đổi popup bản đồ `/monitoring`; đổi luồng lọc/phân trang của bảng; dùng mock thay API thật; RD-14 (nút đồng bộ USGS).

---

## 4. Giải pháp đề xuất
1. **File thuần mới** `apps/web/src/features/earthquakes/earthquake-detail.ts`:
   - `DetailField { label, value }`; `detailFields(item: EarthquakeItem, timezone: TimezoneMode): DetailField[]` — chỉ đưa field có giá trị; `event_time`/`ingested_at` qua `formatEventTime`, toạ độ qua `formatWgs84Point`; `magnitude_type`, `source_url`, `source_event_id` hiển thị khi có; **không thay thế bằng số giả**.
   - `rawDataSummary(item): string | null` — `"GeoJSON gốc (USGS)"` khi `raw_data` là object có nội dung, `null` khi thiếu.
   - `isNotFound(error: unknown): boolean` — `ApiError.status === 404`.
2. **Component mới** `apps/web/src/features/earthquakes/components/EarthquakeDetailPanel.tsx` — nhận `{state, item, onClose}`; render loading (`role="status"`), 404 ("Không tìm thấy sự kiện"), error khác (`role="alert"`), loaded (danh sách `detailFields` + `<details>` chứa `JSON.stringify(raw_data, null, 2)` khi có). Dùng class CSS có sẵn (`eq-table-card`, `text-caption`, `ds-badge`).
3. **Sửa `EarthquakeTable.tsx`**: thêm prop tùy chọn `onSelect?: (id: number) => void` (I2 — không đổi chữ ký cũ), mỗi `<tr>` có `onClick` + `role="button"`/`tabIndex` khi `onSelect` được truyền.
4. **Sửa `EarthquakesPage.tsx`**: state `selectedId: number | null`, `detail: EarthquakeItem | null`, `detailState: "idle"|"loading"|"error"|"not_found"|"ready"`; effect gọi `getEarthquakeDetail(selectedId, controller.signal)` (abort khi đổi dòng/unmount); render `<EarthquakeDetailPanel>` cạnh bảng.
5. **Không đổi** service, contract, hook, BE.

---

## 5. Phương án đã cân nhắc
### Phương án A: Panel chi tiết trên `/earthquakes` (chọn)
Ưu: bảng đã có `id`, ít file nhất; test thuần dễ; không đụng Leaflet/SSE. Nhược: thêm 1 bước click so với popup bản đồ.

### Phương án B: Gắn vào popup marker `/monitoring`
Ưu: trực quan trên bản đồ. Nhược: đụng Leaflet + `sse-context` + popupFields; khó test offline (không có jsdom); rủi ro I5 nếu lẫn marker SSE.

### Phương án C: Mở trang riêng `/earthquakes/:id`
Ưu: URL chia sẻ được. Nhược: đổi router + breadcrumb; vượt phạm vi RD-13.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 helper thuần + 1 component + 2 file hiện có |
| Hiệu năng | 1 request khi click (có abort) | Không tải detail cho cả bảng |
| Bảo trì / Open-Closed | Tốt | Thêm prop tùy chọn, không đổi chữ ký/behavior cũ |
| Độ tin cậy | Tăng | Dùng `raw_data` thật; 404 rõ ràng, không mock |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| BE trả object thuần (không envelope) | Chắc chắn | Thấp | `fetchApi` cho phép raw entity; `getEarthquakeDetail` đã trả `EarthquakeItem` |
| Click nhanh nhiều dòng → race | Trung bình | Trung bình | `AbortController` + chỉ setState khi chưa aborted |
| `raw_data` lớn / chứa ký tự lạ | Trung bình | Thấp | `JSON.stringify` trong `<details>` đóng mặc định; text content an toàn |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-earthquake-detail-panel-thien.md`
- **Code test tự động (offline):** `apps/web/tests/earthquake-detail.test.ts` *(mới — test `detailFields`, `rawDataSummary`, `isNotFound` với fixture `EarthquakeItem` có/không `raw_data`)* + bổ sung `apps/web/tests/earthquakes-page.test.ts` *(assert page wiring: có `getEarthquakeDetail`, `EarthquakeDetailPanel`, `onSelect`)*.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`, đang thao tác) yêu cầu "bắt đầu ngay" sau khi proposal 1 (RD-15) đã merge — xác nhận rõ để triển khai proposal tiếp theo theo thứ tự đã ghi trong `docs/task/fe-be-integration-ready.md` mục 4. Giới hạn đúng §3, chỉ FE, không sửa BE/contracts.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, code FE, validation, dừng CHECKPOINT 1, sau đó ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md` mục 4.
