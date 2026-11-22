# Implementation Plan: SSE marker field (GAP-06)

## Metadata
- ID: 2026-11-22-sse-marker-fields-thien
- Proposal: .agents/notes/proposed/2026-11-22-sse-marker-fields-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Inner `data` của 2 packet earthquake có field phẳng để FE `applySseEvent` thêm marker thật.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/realtime/sse.py` *(helper `_marker_fields` + 2 packet)*
- `apps/api/tests/unit/test_sse_stream.py` *(bổ sung case)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký GAP-06)*
- `.agents/notes/testcase/2026-11-22-sse-marker-fields-thien.md`

### Out of Scope
`contracts/**`, docs API, FE, event names khác, `ingestion_cycle_completed`, `heartbeat`, `database_cleared`.

---

## 3. Các bước
1. Thêm `_EVENT_MARKER_FIELDS` + `_marker_fields(events)` (trả `{}` khi rỗng).
2. Thêm `**_marker_fields(...)` vào `earthquake_detected` và `earthquake_alert`.
3. Test case mới; full BE suite + ruff; FE drift check; ghi nhật ký; CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không migration/schema/env — chỉ bổ sung field vào inner data (additive).

---

## 5. Validation
- [x] Đã tạo testcase
- [ ] Test mới + full BE suite pass
- [ ] Ruff sạch
- [ ] FE test/build (drift check)
- [ ] `notes_index --check`

---

## 6. Rủi ro khi làm
Nhiều event → chỉ lấy event đầu làm field phẳng; giữ mảng gốc.

---

## 7. Rollback
Revert sse.py + test + nhật ký; giữ notes. Không migration.

---

## 8. Ghi chú
Chủ vùng `tai` (T6) — ghi rõ trong PR. Dừng CHECKPOINT 1 sau validation.
