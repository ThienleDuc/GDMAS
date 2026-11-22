# Proposal: Nút "Đồng bộ ngay" từ USGS qua API (RD-14)

## Metadata
- ID: 2026-11-22-usgs-sync-button-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: feature
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: apps/web/src/features/earthquakes/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi contracts/, docs/api/API.md, route/payload BE. Chỉ gắn consumer FE cho
       POST /api/v1/earthquakes/sync đã có; endpoint vẫn do T6 gọi USGS. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/api/API.md §3.2 (`POST /api/v1/earthquakes/sync` — route tồn tại, chưa được docs mô tả chi tiết)
  - docs/task/fe-be-integration-ready.md (RD-14)
- Related Proposals:
  - 2026-11-20-fe-t6-contract-services-audit-thien (`syncUsgsData()` đã được kiểm chứng)
  - 2026-11-12-api-empty-db-sse-tai (BE `/sync`: 503 khi USGS lỗi, 500 khi DB lỗi)
  - Proposal 1–4 ngày 2026-11-22 (chuỗi task `ready.md`, đã merge)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
FE đã định nghĩa `syncUsgsData()` (`services/earthquake-api.ts:137-141`) gọi `POST /api/v1/earthquakes/sync`; BE route `routes/earthquakes.py:157-232` kéo USGS thật, ghi DB, trả `SyncResponse{success,message,synced_count,source,timestamp}`, 503 khi USGS lỗi, 500 khi DB lỗi.

### Vấn đề
`syncUsgsData()` **chưa có consumer runtime** — người dùng không thể kích hoạt đồng bộ thủ công, dù worker T2 chạy định kỳ 5 phút.

### Ảnh hưởng
RD-14 cuối cùng trong file `ready.md`. POST có **tác dụng phụ ghi DB** → phải xác nhận rõ trước khi gọi; test phải mock fetch, không gọi USGS thật (I7).

---

## 2. Hiện trạng
- `services/earthquake-api.ts:137-141` — `syncUsgsData(): Promise<SyncResponse>`, không nhận `AbortSignal`.
- `contracts/earthquake.ts:77-83` — `SyncResponse` gồm `success`, `message`, `synced_count`, `source`, `timestamp` (UTC).
- `EarthquakesPage.tsx:44-55` state, `:143` `handleRetry` tăng `refreshKey`, `:155-162` nút "Tải lại" trong `eq-page__actions`; `:80-106` effect fetch lại danh sách theo `refreshKey`.
- BE `routes/earthquakes.py:157-232` — **không có auth/role dependency**; FE cũng không có khái niệm phân quyền (grep `role/admin/operator` → không có). Task doc ghi chú "cân nhắc chỉ cho vai trò vận hành, không đặt ở view công khai nếu không có phân quyền".

---

## 3. Mục tiêu
- **Mục tiêu:** Thêm nút "Đồng bộ ngay" trên `/earthquakes` với luồng **2 bước xác nhận** (click → "Xác nhận / Hủy"), disable khi đang gọi, message kết quả thật (`synced_count`), refresh danh sách sau khi thành công.
- **Không nằm trong mục tiêu (Out of Scope):** thêm auth/phân quyền (repo chưa có — ghi nhận như rủi ro), sửa BE, đổi `contracts/**`, docs API, route, luồng lọc/phân trang, RD-01…RD-13.

---

## 4. Giải pháp đề xuất
1. **Helper thuần mới** `apps/web/src/features/earthquakes/usgs-sync.ts`:
   - `formatSyncResult(result: SyncResponse): string` — `"Đã đồng bộ {synced_count} sự kiện từ USGS."` (dùng số thật, không bịa).
   - `formatSyncError(error: unknown): string` — `ApiError.status === 503` → "Nguồn USGS chưa sẵn sàng (503)"; 500 → "Lỗi cơ sở dữ liệu (500)"; lỗi mạng/0 → "Không thể kết nối API"; các lỗi khác → message an toàn.
2. **Component mới** `components/UsgsSyncButton.tsx`:
   - State machine `idle → confirm → syncing → done|error → idle` (hàm thuần `nextSyncState` để test).
   - Bước `confirm`: hiện 2 nút "Xác nhận đồng bộ" / "Hủy" — **không gọi API khi chưa xác nhận**.
   - Khi syncing: disable cả 2 nút; chặn double-click.
   - Dùng `mountedRef` để không setState sau unmount (service không có signal).
   - Gọi `onSynced()` sau kết quả `success:true` để trang refresh danh sách.
   - Message `role="status"` (thành công) / `role="alert"` (lỗi).
3. **`EarthquakesPage.tsx`**: thêm `<UsgsSyncButton onSynced={handleSynced} />` cạnh nút "Tải lại" trong `eq-page__actions`; `handleSynced = () => setRefreshKey(k => k + 1)`.
4. **Phát hiện khi triển khai (deviation):** `isApiEnvelope()` (`apps/web/src/contracts/common.ts`) bắt buộc `data` hoặc `total_patterns/patterns` → payload `SyncResponse` `{success:true,message,synced_count,source,timestamp}` bị chặn dù BE trả 200. Mở rộng guard chấp nhận shape aggregate `/sync` (thêm `"synced_count" in value && "timestamp" in value`) — không đổi contracts repo-level.
5. **Mở rộng chữ ký** `syncUsgsData(signal?: AbortSignal)` (tham số tùy chọn — I2) để hủy request khi unmount/hủy xác nhận; vẫn `POST` cùng path/kiểu trả.
6. **Không đổi** contract/BE/CSS file mới (dùng lại `ds-button`, `eq-page__actions`).
5. **Test** `apps/web/tests/usgs-sync.test.ts` (mới): helper thuần + state machine + source assertions (page wiring, confirm trước khi gọi); bổ sung `services.test.ts` mock fetch 200/503 cho `syncUsgsData()`.

---

## 5. Phương án đã cân nhắc
### Phương án A: Nút 2 bước trên `/earthquakes` (chọn)
Ưu: ít file, tận dụng `refreshKey` có sẵn, xác nhận rõ trước POST có tác dụng phụ, test thuần được. Nhược: vẫn nằm ở view công khai (repo chưa có phân quyền) — ghi nhận rủi ro, không tự tạo auth.

### Phương án B: Giấu nút sau env flag (`VITE_*`)
Ưu: không lộ với người dùng thường. Nhược: thêm cấu hình, không giải quyết gốc thiếu auth; dễ quên bật khi Demo.

### Phương án C: Tự động sync lúc tải trang
Ưu: không cần click. Nhược: POST có tác dụng phụ, vi phạm nguyên tắc xác nhận; BE đã có worker 5 phút → thừa.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 helper + 1 component + 1 file trang |
| Hiệu năng | 1 POST khi xác nhận | Không poll/thêm request ngầm |
| Bảo trì / Open-Closed | Tốt | Thêm file/component, không đổi service/contract |
| Độ tin cậy | Tăng | Thông báo đúng `synced_count`/mã lỗi; refresh sau sync |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| POST ghi DB bởi người dùng trái phép | Trung bình | Trung bình | Xác nhận 2 bước; **repo chưa có phân quyền** → đưa vào câu hỏi cuối phiên, không tự tạo auth |
| Double-click / unmount khi đang chạy | Trung bình | Thấp | Disable khi `syncing`, `mountedRef` guard |
| Test gọi USGS thật | Cao nếu quên mock | Cao | Mock `globalThis.fetch` trong mọi test; không test runtime thật |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-usgs-sync-button-thien.md`
- **Code test tự động (offline):** `apps/web/tests/usgs-sync.test.ts` *(mới — helper, state machine, source assertions)* + bổ sung `apps/web/tests/services.test.ts` *(mock fetch: 200 `synced_count`, 503 `ApiError`)*.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) xác nhận "được" để bắt đầu proposal 5 theo thứ tự đã ghi trong `docs/task/fe-be-integration-ready.md` mục 4 — proposal cuối của file. Giới hạn §3: chỉ FE, có xác nhận 2 bước trước POST; không tự tạo hệ phân quyền (đưa vào câu hỏi cuối phiên).
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, code FE, validation, dừng CHECKPOINT 1, ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md` mục 4.

### Revision 2026-11-22
- User quyết định: website mở, ai cũng dùng được → **không làm auth**, `/sync` public. Xác nhận 2 bước chỉ chống click nhầm, không phải bảo mật. Không tách proposal BE.
