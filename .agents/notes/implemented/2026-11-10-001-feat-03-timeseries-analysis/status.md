# TRẠNG THÁI TRIỂN KHAI FEAT-03

- **Trạng thái:** validation
- **Nhánh:** feature/feat-03-timeseries-analysis
- **Proposal:** 2026-11-10-001 — Approved bởi Lê Trung Sơn.
- **Kiểm thử:** Agent đã tự kiểm thử, không yêu cầu người dùng test thủ công.
- **Git:** Người dùng yêu cầu đóng gói commit và push nhánh ngày 2026-11-11 qua skill git-commit-push. Chưa mở PR hoặc merge vào develop; hash và trạng thái đồng bộ được ghi ở Git/context-memory sau khi thực hiện.

## Tác vụ

- [x] Thuật toán P1–P4, schema, snapshot, pipeline, worker, contract và hướng dẫn.
- [x] Sửa lỗi ID BIGINT do iterrows ép float, thêm regression test.
- [x] Sửa aggregate rỗng trên Pandas 2.2, thêm regression tests cho ba interval.
- [x] 52/52 test qua cả ba môi trường, -W error, không skip/cảnh báo.
- [x] 150 tổ hợp Hypothesis mỗi môi trường; worker và HTTP thật.
- [x] Mất kết nối DB thực giữa transaction, Ctrl+C giữa publish, rollback, khóa và phục hồi.
- [x] Coverage mã mới 99%; Ruff/Formatter/JSON Schema đạt; source-guard/project-review hoàn tất.
- [x] API HTTP thật dưới 100 ms trên fixture chuẩn 100 sự kiện.
- [ ] API dưới 100 ms với toàn bộ 10.000 sự kiện: còn mở (p95 179–253 ms); thuộc tối ưu T6/FE riêng.

## Bằng chứng

Xem [qa-report.md](qa-report.md) để biết lệnh, phiên bản, các test và số đo đầy đủ.

| Môi trường | Kết quả |
| --- | --- |
| Python 3.12.16 + thư viện image hiện có | 52 passed, 59,92 s |
| Python 3.12.16 + dependency tối thiểu | 52 passed, 45,94 s |
| Python 3.11.18 + dependency tối thiểu | 52 passed, 38,40 s |

Coverage: 420 statements, 4 chưa phủ, 99%. Không còn lỗi chức năng phát hiện trong bộ kiểm thử cuối. Thay TestClient deprecated trong test bằng HTTPX ASGITransport; không filter bỏ cảnh báo.

## Hiệu năng HTTP thật, p95 của 10 request sau warm-up

| Môi trường | 100 sự kiện / 180 ngày | 10.000 sự kiện / 730 ngày |
| --- | --- | --- |
| Python 3.12 + image | 56,6 ms | 178,7 ms |
| Python 3.12 + dependency tối thiểu | 36,6 ms | 253,4 ms |
| Python 3.11 + dependency tối thiểu | 27,3 ms | 222,2 ms |

Pipeline 10.000 sự kiện 0,45–0,61 giây ở lượt cuối; dữ liệu trả đủ, không sampling. API lớn chưa đạt 100 ms, không đánh dấu toàn bộ mục tiêu hiệu năng là hoàn thành. Các số đo TestClient trước đây được thay bằng phép đo socket/Uvicorn thật có warm-up, chi tiết lưu ở qa-report.

## Quyết định và phạm vi

- Người dùng yêu cầu tự chạy QA đến khi sạch; không còn hạng mục chuyển kiểm thử thủ công về người dùng.
- Bổ sung test_analysis_robustness.py và test tiến trình/fault injection trong tệp integration mới; không sửa test cũ trong HEAD.
- Kiểm thử Docker/virtualenv riêng; không cài công cụ lên host, không sửa pyproject/uv.lock, không dùng DB dự án.
- Duy trì worker.py, /api/v1/patterns, một snapshot mỗi loại, transaction-scoped lock, ServiceRun, null khi thiếu dữ liệu và bảo toàn đầy đủ scatter.
- Không sửa code cũ; giữ nguyên main/router/models/connection/migrations/frontend/Compose.

## Giới hạn còn ghi nhận

API 10.000 sự kiện có payload 1,44 MB và p95 179–253 ms; không tự thay router hoặc cắt dữ liệu, cần phạm vi T6/FE riêng để tối ưu. Entrypoint runner/Compose cũ vẫn là placeholder theo kế hoạch đã duyệt; dùng analysis.worker. Backfill dữ liệu thật và xây View 03 thuộc thành viên khác.

## Cập nhật

- 2026-11-10: Hoàn tất đợt lập trình đầu (39 test, 98% coverage).
- 2026-11-10: Theo yêu cầu QA tự động bổ sung, bắt/sửa hai lỗi, hoàn tất 52 test trên ba môi trường, coverage 99%; sẵn sàng để người dùng đánh giá quyết định PR trong phạm vi đã duyệt và giới hạn hiệu năng đã nêu.

- 2026-11-11: Người dùng chủ động gọi git-commit-push; đóng gói toàn bộ FEAT-03 cùng báo cáo QA và giới hạn hiệu năng đã nêu. Giữ trạng thái validation; không mở PR/merge.
