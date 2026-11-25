# Testcase: `/clusters` trả đủ field contract (GAP-01)

## Metadata
- ID: 2026-11-22-cluster-contract-fields-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/api/routes/clusters.py (`_cluster`)
- Test File: apps/api/tests/unit/test_cluster_contract_fields.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** `_cluster()` trả canonical + alias legacy, field thiếu → `None`.
- **Ràng buộc:**
  - [x] I1 — chỉ route T6, không worker.
  - [x] I2 — giữ chữ ký `_cluster()`, giữ 6 key cũ.
  - [x] I3 — không nội suy số giả.
  - [x] I4 — không migration.
  - [x] I7 — test offline (fixture `db` SQLite in-memory).

---

## 2. Dữ liệu mẫu (Fixtures)
- Canonical: `{cluster_id:1, center_latitude:38.2, center_longitude:142.4, event_count:48, avg_magnitude:4.6, max_magnitude:6.1, radius_km:152.4, dominant_place:"Honshu, Japan", name:"Honshu"}`
- Legacy: `{id:2, lat:-6.2, lon:106.8, events_count:7, avg_mag:4.9, place:"Java, Indonesia"}`

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Canonical đủ field | Functional | payload canonical | Trả `dominant_place`, `radius_km`, `max_magnitude`, `name` đúng giá trị | `PASS` |
| `TC-02` | Legacy alias | Resilience | payload `id/lat/lon/events_count/avg_mag/place` | Map canonical; `dominant_place` từ `place`; field mới thiếu → `None` | `PASS` |
| `TC-03` | Missing field | Boundary | chỉ 6 field cơ bản | `max_magnitude/radius_km/name/dominant_place = None`, không 0 | `PASS` |
| `TC-04` | Empty state | Resilience | bảng rỗng | `{success:false,data:null,message}` HTTP 200 | `PASS` |
| `TC-05` | Chữ ký cũ | Regression | assert 6 key cũ vẫn có | `cluster_id/center_latitude/center_longitude/event_count/avg_magnitude/max_magnitude` | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/api && uv run pytest tests/unit/test_cluster_contract_fields.py -v
cd apps/api && uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 3/3 test mới PASS; full BE 299/299; ruff sạch; FE 209/209 + build PASS.

---

## 5. Lỗi phát hiện & Bug Logs
- `none`
