# Testcase: Ghi chú GAP-10/11

## Metadata
- ID: 2026-11-22-contract-notes-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/contracts/earthquake.ts, docs/api/API.md
- Test File: apps/web/tests/api-contract-notes.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Kiểm tra comment FE xác định `time` là nhãn `HH:MM` (không parse ISO) và prose API.md mô tả đúng empty `/patterns` không có `data`.
- I3 (UTC ở tầng hiển thị), I4/I6 (không schema/secret), I7 (test source offline).

## 2/3. Fixtures & Ma trận
| TC | Tên | Kết quả | Status |
|---|---|---|---|
| TC-01 | Comment `HourlyTimeSeriesPoint.time` | Có cụm "HH:MM", "không parse ISO" | PASS |
| TC-02 | Prose `/patterns` empty | API.md có "không có khóa `data`" | PASS |

## 4. Lệnh
`cd apps/web && node --test tests/api-contract-notes.test.ts && pnpm test && pnpm build`; `notes_index.py --check`.
Kết quả: 2/2 source test PASS; `pnpm test` 217/217 + build PASS; scripts docs test 10/10.

## 5. Bug Logs
- none
