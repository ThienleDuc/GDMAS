# Testcase: Kịch bản demo và báo cáo

## Metadata
- ID: 2026-11-25-report-demo-scripts-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-25-report-demo-scripts-tai.md
- Target: demo_scripts/run_demo.sh, demo_scripts/demo_queries.sql
- Test File: scripts/tests/test_demo_scripts.py
- Author: agent | tai
- Created: 2026-11-25
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- Kiểm tra điều phối demo, thông báo lỗi, truy vấn và tính toàn vẹn; test offline với dịch vụ giả lập.
- Giữ các terminal tách biệt; không coi mock là dữ liệu thực, timestamp UTC và tọa độ WGS84 theo schema hiện hữu.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- Môi trường: mock lệnh ngoài, không gọi mạng USGS hoặc DB thật.

---

## 3. Ma trận Kịch bản Test Cases
| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| TC-01 | Luồng chính | Functional | Các lệnh giả lập thành công | Thứ tự T1 đến T6 chính xác | PASS |
| TC-02 | Dữ liệu trống | Resilience | Giả lập bước đếm thất bại | Pipeline dừng, không dựng dữ liệu giả | PASS (mock lệnh) |
| TC-03 | Truy vấn | Boundary | Đối chiếu SQL với migration | Không chạy truy vấn trên PostgreSQL thực | NOT_RUN |
| TC-04 | Lỗi | Negative | Một lệnh phụ thuộc thất bại | Pipeline dừng | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế
- Ngày chạy: 2026-11-25.
- `PYTHONUTF8=1 uv run --project apps/api python -m unittest scripts.tests.test_demo_scripts -v`: 3 test pass. Test mock lệnh ngoài, không kiểm tra nội dung thực thi Python worker hay DB thực.
- Toàn bộ `unittest discover`: 46 test, 5 lỗi từ test workflow có sẵn: 4 lỗi WinError 193 khi chạy trực tiếp shell script trên Windows, 1 lỗi thiếu proposal `2026-11-18-workflow-checkpoints-thien.md`. Chưa chạy demo tích hợp.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
