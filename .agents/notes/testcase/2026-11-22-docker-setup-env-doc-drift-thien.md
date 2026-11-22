# Testcase: Tính đúng đắn của docs/setup.md

## Metadata
- ID: 2026-11-22-docker-setup-env-doc-drift-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-docker-setup-env-doc-drift-thien.md
- Target: `docs/setup.md`
- Test File: `scripts/tests/test_setup_docs.py`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Kiểm chứng docs hướng dẫn đúng tên biến FE, cú pháp tạo `.env`, shape health, tên bảng và biến USGS.
- I7: test offline 100%, chỉ đọc file text.

---

## 2. Fixtures
- Đọc `docs/setup.md` bằng `Path.read_text`.

---

## 3. Ma trận
| TC | Tên | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| TC-01 | Biến FE đúng | docs | có `VITE_API_BASE_URL`, `VITE_SSE_ENDPOINT`, `VITE_API_MOCKING` | PASS |
| TC-02 | Biến cũ biến mất | docs | không còn `VITE_API_URL`, `VITE_SSE_URL`, `USGS_API_BASE_URL` | PASS |
| TC-03 | printf thay echo \n | docs | có `printf`, không có `\n` trong lệnh echo tạo .env | PASS |
| TC-04 | Health envelope | docs | mẫu health có `"success": true` và `"data"` | PASS |
| TC-05 | Tên bảng thật | docs | có `earthquake_events`, không còn `daily_aggregates` | PASS |
| TC-06 | Hồi quy test docs cũ | unittest discover | không fail | PASS |

---

## 4. Lệnh & Kết quả
```bash
python3 -m unittest scripts/tests/test_setup_docs.py -v
```
- Ngày chạy: 2026-11-22
- Kết quả: 2026-11-22 — `test_setup_docs.py` 8/8 pass; `docs/setup.md` sửa 6 điểm; `docker compose config --quiet` OK; smoke Docker chạy thật (Postgres healthy, 8 sự kiện USGS thật qua API/SSE); `notes_index --check` OK.

---

## 5. Bugs
- none
