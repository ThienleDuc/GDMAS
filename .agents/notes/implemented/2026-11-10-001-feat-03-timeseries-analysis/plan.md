# KẾ HOẠCH TRIỂN KHAI FEAT-03

- **Proposal ID:** 2026-11-10-001
- **Người duyệt:** Lê Trung Sơn, phê duyệt trong hội thoại ngày 2026-11-10.
- **Nhánh:** feature/feat-03-timeseries-analysis
- **Proposal:** ../../proposed/2026-11-10-001-feat-03-timeseries-analysis.md

## 1. Phạm vi

Thêm preprocessing, statistical, decomposition, correlation, repository, pipeline và worker trong apps/api/src/gdmas/services/analysis/; schema analysis_metrics.py; bốn tệp unit test và một tệp integration test như proposal. Thêm hợp đồng JSON, ví dụ payload và hướng dẫn vận hành.
Không sửa mã nguồn, router, models, migration, frontend, dependency hay runner hiện có. Ghi nhận phê duyệt và cập nhật hồ sơ là thay đổi tài liệu được người dùng cho phép.

## 2. Các bước

1. Khởi tạo nhánh từ develop; ghi nhận quyết định và môi trường chạy kiểm thử.
2. Chốt schema và metadata, chuẩn hóa UTC, tạo dữ liệu ba interval với biên tường minh.
3. Tính thống kê, trend, seasonality và Pearson thực, null khi chưa xác định.
4. Pipeline khóa một worker, công bố snapshot T3 nguyên tử, ServiceRun và recovery.
5. Worker --once/--lookback-days và lịch monotonic 300 giây, dừng an toàn.
6. Unit/integration tests trên DB test riêng, Ruff, kiểm tra hợp đồng và hiệu năng.
7. Source-guard; giữ working tree ở trạng thái validation, không commit/push.

## 3. Validation

Chạy pytest cho các tệp mới, Ruff trên mã và test mới, kiểm thử PostgreSQL với DB/schema test cô lập. Kiểm tra route /api/v1/patterns giữ dữ liệu T4/T5, rollback, khóa, nguồn rỗng/nạp lại, mùa vụ ngắn/dài, JSON hữu hạn. Đo pipeline với 100 và 10.000 sự kiện. Không build frontend vì không sửa FE.
## 4. QA tự động bổ sung theo yêu cầu người dùng

Người dùng yêu cầu agent tự kiểm thử và sửa lỗi, không cần chuyển kiểm thử thủ công về người dùng. Thêm test_analysis_robustness.py, 150 tổ hợp Hypothesis, kiểm tra lỗi/mất kết nối DB thực, SIGINT giữa publish, worker nhiều chu kỳ và HTTP qua Uvicorn thật. Chạy cả Python 3.11/3.12 với dependency tối thiểu và image hiện hữu, coi cảnh báo là lỗi. Không mở rộng code T6/FE để ép đạt benchmark; ghi rõ giới hạn API lớn trong báo cáo trước khi người dùng quyết định PR.
