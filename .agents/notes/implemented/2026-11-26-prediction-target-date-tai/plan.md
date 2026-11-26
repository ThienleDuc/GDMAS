# Implementation Plan: Thống nhất ngày dự báo

## Metadata
- ID: 2026-11-26-prediction-target-date-tai
- Proposal: .agents/notes/proposed/2026-11-26-prediction-target-date-tai.md
- Approved By: tai
- Approved At: 2026-11-26
- Implementer: agent | tai
- Status: planned

## 1. Mục tiêu
Dự báo và phân loại t+1 theo ngày UTC cuối trong DB của từng phạm vi.

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/prediction/service.py`
- `apps/api/src/gdmas/services/prediction/errors.py`
- `apps/api/tests/unit/test_prediction_service.py`
- `apps/api/src/gdmas/services/analysis/filtered.py`
- `apps/api/tests/unit/test_prediction_target_date.py`
- `.agents/notes/testcase/2026-11-26-prediction-target-date-tai.md`
### Out of Scope
- Migration, schema, frontend.

## 3. Các bước
Truy vấn dữ liệu DB, khớp mốc chuỗi và ngày đích, kiểm thử offline, build API.

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi schema; ngày đích phản ánh dữ liệu DB thực tế.

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
Chạy pytest, ruff, notes check và build Docker API.

## 6. Rủi ro khi làm
Ngày cuối có thể chưa hoàn tất; đây là yêu cầu rõ của người dùng.

## 7. Rollback
Revert commit sau khi được tạo.

## 8. Ghi chú
Không dùng artifact lịch sử làm căn cứ cho ngày cuối DB.
