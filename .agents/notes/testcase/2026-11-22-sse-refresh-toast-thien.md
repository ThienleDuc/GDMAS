# Testcase: Toast theo SSE (GAP-13)

## Metadata
- ID: 2026-11-22-sse-refresh-toast-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/layouts/header/{header-data,DataRefreshLabel,HeaderActions}.tsx, DashboardLayout.tsx
- Test File: apps/web/tests/header-sse-refresh.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Helper `dataRefreshKey` chỉ nhận event `ingestion_cycle_completed`; wiring đưa key xuống DataRefreshLabel; toast bắn theo key, không theo countdown.
- Ràng buộc: I1 (1 SSE tại shell), I2 (prop tùy chọn), I5 (không toast giả), I7 (test offline).

---

## 2. Fixtures
- `SSEEventPayload{ event:"ingestion_cycle_completed", data:{}, timestamp:"2026-11-22T03:00:00Z" }`.

---

## 3. Ma trận
| TC | Tên | Đầu vào | Kết quả | Kết quả |
|---|---|---|---|---|
| TC-01 | Key từ SSE cycle | payload cycle | `"2026-11-22T03:00:00Z:"` | PASS |
| TC-02 | Event khác | heartbeat | `null` | PASS |
| TC-03 | Key đổi | 2 timestamp | 2 key khác nhau | PASS |
| TC-04 | Hook dùng service | source useSSE | có `getEventsStreamUrl` | PASS |
| TC-05 | Wiring shell | source DashboardLayout/DataRefreshLabel | có `dataRefreshKey`, countdown không `setToastOpen` | PASS |

---

## 4. Lệnh
`cd apps/web && node --test tests/header-sse-refresh.test.ts && pnpm test && pnpm build`; `notes_index.py --check`.
Kết quả: 3/3 test chuyên biệt PASS; `pnpm test` 215/215 + build PASS.

---

## 5. Bug Logs
- none
