# Testcase: Kiểm tra API.md khớp payload/query thật

## Metadata
- ID: 2026-11-22-api-md-params-status-drift-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-api-md-params-status-drift-thien.md
- Target: `docs/api/API.md` §3.1, §3.2
- Test File: `scripts/tests/test_api_docs_contracts.py`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** docs/api/API.md phải mô tả đúng enum trạng thái service (có `running`) và tham số `search` của `/earthquakes`.
- **Ràng buộc GDMAS liên quan:**
  - [x] I3 — API.md là nguồn sự thật hợp đồng FE↔BE
  - [x] I7 — test đọc file docs, offline 100%, không gọi mạng

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Python `unittest`, đọc `docs/api/API.md` bằng `Path.read_text`.
- **Dữ liệu mẫu:** none (chỉ đọc text).

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Enum có `running` | Functional | Đọc API.md | Có cụm `"active", "idle", "error", "unknown", "running"` | PASS |
| `TC-02` | Param `search` được ghi nhận | Functional | Đọc API.md | Bảng `/earthquakes` có dòng `` `search` `` và mô tả `source_event_id` | PASS |
| `TC-03` | Hồi quy test docs cũ | Regression | Chạy toàn bộ `test_api_docs_contracts.py` | Không giảm số test, 0 fail | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
python3 -m unittest scripts/tests/test_api_docs_contracts.py -v
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 2026-11-22 — `python3 -m unittest scripts/tests/test_api_docs_contracts.py -v` → 12/12 pass (10 cũ + 2 mới); `python3 -m unittest discover -s scripts/tests` → 30/30 pass; `notes_index --check` OK; hồi quy FE 228/228, BE 318/318.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
