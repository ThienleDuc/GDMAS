# Proposal: Toast cập nhật bắn theo SSE `ingestion_cycle_completed` (GAP-13)

## Metadata
- ID: 2026-11-22-sse-refresh-toast-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: medium
- Area: apps/web/src/layouts/, apps/web/tests/
- Architecture Impact: none
- Related Docs: docs/task/fe-be-integration-gaps.md (GAP-13), docs/api/API.md §3.5
- Related Proposals: 2026-11-21-header-country-clock-refresh-thien, 2026-11-22-sse-standard-endpoint-thien (đã merge)
- Related Bugs: none

---

## 1. Vấn đề
Toast "Dữ liệu đã được cập nhật" hiện bắn theo đồng hồ đếm ngược cục bộ (`DataRefreshLabel.tsx:24-30`), trong khi BE phát `ingestion_cycle_completed` mỗi chu kỳ T2 5 phút (`sse.py:256-266`) và event thật không bắn toast → báo cập nhật giả.

---

## 2. Hiện trạng
- `DashboardLayout.tsx:31` có `sse` (1 kết nối tại shell), chưa truyền xuống header.
- `HeaderActions.tsx:18` truyền `onRefresh` cho `DataRefreshLabel`.
- `DataRefreshLabel.tsx`: countdown → `onRefresh()` + `setToastOpen(true)`.

---

## 3. Mục tiêu
Giữ nguyên toast/CSS; đổi nguồn kích hoạt sang SSE event thật. Countdown vẫn `onRefresh()` để lấy event mới. Không CSS lại, không đổi BE.

---

## 4. Giải pháp
1. `header-data.ts`: hàm thuần `dataRefreshKey(event)` → `timestamp:id` nếu `event === "ingestion_cycle_completed"`, ngược lại `null`.
2. `DashboardLayout.tsx`: derive key từ `sse.data`, truyền `dataRefreshKey` qua `HeaderActions`.
3. `HeaderActions.tsx`: truyền tiếp cho `DataRefreshLabel`.
4. `DataRefreshLabel.tsx`: prop tùy chọn `dataRefreshKey?`; effect mở toast khi key đổi; bỏ `setToastOpen` khỏi countdown.
5. Test `header-sse-refresh.test.ts`: helper + source assertions.

---

## 5/6/7. Cân nhắc / Đánh đổi / Rủi ro
Ưu: 1 nguồn sự thật (SSE), không CSS lại. Nhược: nếu SSE mất kết nối thì không có toast (đúng — không có cập nhật thật). Race: key đổi nhanh → effect vẫn mở toast, tự đóng sau 5s.

---

## 8. Cách kiểm chứng
`cd apps/web && pnpm test && pnpm build`; `notes_index --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: User cho phép chạy tự động các task trong scope, dừng hỏi khi ngoài scope. GAP-13 thuộc scope (FE, giữ toast cũ).
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` → code + test → validation → merge tự động → nhật ký GAP-13.
