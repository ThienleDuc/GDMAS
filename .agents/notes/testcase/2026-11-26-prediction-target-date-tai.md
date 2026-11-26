# Testcase: Ngày dự báo theo dữ liệu cuối

## Metadata
- ID: 2026-11-26-prediction-target-date-tai
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-26-prediction-target-date-tai.md
- Target: apps/api/src/gdmas/services/prediction/service.py và analysis/filtered.py
- Test File: apps/api/tests/unit/test_prediction_target_date.py
- Author: agent | tai
- Created: 2026-11-26
- Status: passed
- Related Bugs: none

## 1. Mục tiêu & Ràng buộc kiểm thử
Xác minh ngày UTC t+1 và chuỗi đầu vào; kiểm thử offline, không giả dữ liệu khi DB rỗng.

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
Session giả và SQLite in-memory, mô hình mock offline.

## 3. Ma trận Kịch bản Test Cases
| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Toàn cầu | Functional | Sự kiện DB cũ | Chuỗi kết thúc ngày DB cuối, target t+1 | `PASS` |
| `TC-02` | Lọc địa lý | Functional | Quốc gia có ngày cuối riêng | Ngày đích t+1 theo phạm vi | `PASS` |
| `TC-03` | DB rỗng | Negative | Không sự kiện | Báo thiếu dữ liệu | `PASS` |
| `TC-04` | Ranh giới UTC | Boundary | Sự kiện cuối ngày | Ngày UTC chính xác | `PASS` |

## 4. Lệnh thực thi & Kết quả thực tế
- `uv run pytest tests/unit/test_prediction_target_date.py tests/unit/test_analysis_filtered.py -q`: 13 pass.
- Toàn bộ backend: 398 pass; đã cập nhật test cũ cho dữ liệu DB hợp lệ.

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
