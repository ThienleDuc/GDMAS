# Testcase: SSE marker field (GAP-06)

## Metadata
- ID: 2026-11-22-sse-marker-fields-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/realtime/sse.py
- Test File: apps/api/tests/unit/test_sse_stream.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** inner `data` của `earthquake_detected`/`earthquake_alert` có field phẳng; mảng gốc còn nguyên; outer packet đúng bọc.
- **Ràng buộc:** I1 (chỉ generator T6), I2 (giữ field/mảng cũ), I3 (UTC `Z`, WGS84), I7 (test offline `FakeRequest`, mock state).

---

## 2. Dữ liệu mẫu (Fixtures)
- `new_events = [{"id":11,"source_event_id":"us_test_001","event_time":"2026-11-22T03:00:00Z","latitude":-6.2,"longitude":106.8,"depth_km":24.5,"magnitude":4.0,"place":"Java, Indonesia"}]`.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | earthquake_detected field phẳng | Functional | state có `new_events[0]` | inner data có `latitude/magnitude/event_time/source_event_id`; `new_events` vẫn có | `PASS` |
| `TC-02` | earthquake_alert field phẳng | Functional | alert events | inner data có field phẳng; `alert_events` vẫn có | `PASS` |
| `TC-03` | Mảng rỗng | Resilience | `new_events: []` | Không emit field phẳng; không crash | `PASS` |
| `TC-04` | Outer packet | Regression | bất kỳ packet | `set(packet)=={"event","data","timestamp"}`, timestamp `Z` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_sse_stream.py -v
cd apps/api && uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** targeted 14/14 PASS; full BE 310/310; ruff sạch; FE 209/209 + build PASS.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
