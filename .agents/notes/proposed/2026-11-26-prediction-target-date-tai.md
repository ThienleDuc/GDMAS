# Proposal: Thống nhất ngày dự báo theo dữ liệu cuối

## Metadata
- ID: 2026-11-26-prediction-target-date-tai
- Author: agent | tai
- Created: 2026-11-26
- Type: bugfix
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/services/prediction/ và analysis/filtered.py
- Architecture Impact: none
- Related Docs:
  - docs/task/tai.md
  - docs/coding-rules.md
- Related Proposals:
  - none
- Related Bugs: none

## 1. Vấn đề
Dự báo toàn cầu và địa lý không thống nhất ngày đích; ngày đích phải là ngày UTC của sự kiện DB cuối cùng cộng một ngày.

## 2. Hiện trạng
PredictionService dùng hôm nay, filtered dùng ngày mai dù chuỗi kết thúc hôm qua.

## 3. Mục tiêu
- Dùng cùng mốc dữ liệu và ngày đích t+1 cho dự báo và phân loại.
- Không đổi schema, hợp đồng hàm hiện hữu hoặc các worker khác.

## 4. Giải pháp đề xuất
Tổng hợp số sự kiện đến ngày UTC có sự kiện cuối trong phạm vi DB tương ứng, kết thúc chuỗi mô hình ở ngày đó, dùng ngày kế tiếp cho kết quả; DB rỗng trả lỗi thiếu dữ liệu.

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ thay nhãn ngày
Không chọn: chuỗi đầu vào không khớp ngày dự báo.
### Phương án B: Đồng bộ chuỗi và ngày đích
Chọn: đảm bảo inference một bước thực sự dự báo t+1.

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Nhỏ | Cần truy vấn mốc DB |
| Hiệu năng | Nhỏ | Truy vấn tổng hợp bổ sung |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký cũ |
| Độ tin cậy | Tăng | Kiểm thử UTC và dữ liệu cũ |

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Ngày hiện tại chưa hoàn tất | Cao | Trung bình | Mô tả rõ dữ liệu đầu vào và kiểm thử |

## 8. Cách kiểm chứng & Tệp test dự kiến
- `.agents/notes/testcase/2026-11-26-prediction-target-date-tai.md`.
- `apps/api/tests/unit/test_prediction_target_date.py` và các test dự báo liên quan, offline.
- Chạy pytest, ruff, notes check và build container API nếu Docker khả dụng.

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-26
Comments: Người dùng xác nhận hướng ngày cuối trong DB + 1, yêu cầu sửa code, test và build API.
Scope of Rejection: -

## 10. Next Action
Triển khai và dừng CHECKPOINT 1 sau validation.
