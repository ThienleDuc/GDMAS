# KẾ HOẠCH TRIỂN KHAI — ALIAS P2/P3

- **Proposal ID:** 2026-11-11-001
- **Người duyệt:** Lê Trung Sơn, ngày 2026-11-11 trong hội thoại.
- **Proposal:** [bản đã duyệt](../../proposed/2026-11-11-001-analysis-legacy-alias-compatibility.md).
- **Nhánh:** bugfix/analysis-legacy-alias-compatibility; base 0224c80 chứa FEAT-03 chưa merge develop.

## 1. Phạm vi thực hiện (Scope)

Chỉ thêm các tệp sau theo §3 proposal:

- apps/api/src/gdmas/services/analysis/legacy_aliases.py
- apps/api/src/gdmas/schemas/analysis_alias_metrics.py
- apps/api/src/gdmas/services/analysis/alias_pipeline.py
- apps/api/src/gdmas/services/analysis/alias_worker.py
- apps/api/tests/unit/test_analysis_legacy_aliases.py
- apps/api/tests/integration/test_analysis_alias_pipeline.py
- contracts/schemas/analysis-patterns-aliases-v1.1.json
- contracts/examples/analysis_patterns_aliases_sample.json
- docs/guides/backend/feat-03-legacy-alias-compatibility.md

Hồ sơ: proposal §9 theo lời duyệt của người dùng; index; plan/status/qa-report của ID này. Source-guard cập nhật báo cáo và context memory cục bộ.

Ngoài phạm vi: mọi source, test, schema 1.0, router, DB models/migrations, dependency, frontend và cấu hình cũ; không chạy worker lên DB dự án. Không commit/push/PR/merge.

## 2. Các bước

1. Ghi nhận Approved, tạo nhánh từ FEAT-03, giữ nguyên tài liệu chưa commit của phiên lập kế hoạch.
2. Model mới và adapter: ghép bucket theo ngày, bổ sung trường legacy, không mutation; P2/P3 version 1.1, P1/P4 không đổi.
3. Repository/pipeline mở rộng: validation trước mutation, kế thừa khóa/transaction/ServiceRun; CLI tái sử dụng worker.run.
4. Unit và integration trên PostgreSQL test riêng, fixture xác định, JSON schema/example mới, hướng dẫn vận hành/rollback.
5. Chạy suite mới và 52 test cũ, Ruff/formatter, schema format checker; đo pipeline/HTTP/payload trên cùng fixture 100/10.000 sự kiện.
6. Source-guard, project-review theo I1–I7/scope/drift, ghi QA và dừng validation.

## 3. Validation

Đối chiếu AC-01–AC-11 tại proposal. Đặc biệt: alias đúng số liệu thật, rounding .5 lên, zero/null, partial, biên UTC, duplicate/missing bucket, phiên bản không hỗ trợ, idempotence, phép chiếu về 1.0 và rollback khi adapter lỗi. Chạy CLI thật --once/lookback/lịch/SIGINT, kiểm tra lock giữa worker cũ/mới và bảo toàn T4/T5. Kiểm thử trong Docker với mã nguồn chỉ đọc hoặc bản sao; dependency QA cài trong container, không sửa manifest host. DB riêng tên *_test, schema UUID, không xuất cổng host. Không build frontend vì không sửa FE.
