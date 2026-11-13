<!-- Template cho .agents/notes/implemented/2026-11-13-backend-lint-validation-son/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9.
     Tầng thực thi, không chép lại lý lẽ của proposal. Luật: docs/agent-workflow.md. -->

# Implementation Plan: Chất lượng backend theo hai đợt

## Metadata
- ID: 2026-11-13-backend-lint-validation-son
- Proposal: .agents/notes/proposed/2026-11-13-backend-lint-validation-son.md
- Approved By: son
- Approved At: 2026-11-13
- Implementer: agent | son
- Status: in_progress

---

## 1. Mục tiêu
Hoàn tất Task 4 theo hai PR: bảo trì hình thức trước, xử lý ngoại lệ sau. Giữ nguyên API/ORM/config và lịch sử migration; toàn bộ test offline và lint/format xanh ở cuối đợt 2.

---

## 2. Phạm vi
### In Scope
- `apps/api/pyproject.toml`
- `apps/api/alembic/env.py`
- `apps/api/src/gdmas/api/dependencies.py`
- `apps/api/src/gdmas/api/router.py`
- `apps/api/src/gdmas/api/routes/earthquakes.py`
- `apps/api/src/gdmas/api/routes/patterns.py`
- `apps/api/src/gdmas/api/routes/statistics.py`
- `apps/api/src/gdmas/api/routes/stream.py`
- `apps/api/src/gdmas/core/config.py`
- `apps/api/src/gdmas/db/base.py`
- `apps/api/src/gdmas/db/connection.py`
- `apps/api/src/gdmas/main.py`
- `apps/api/src/gdmas/models/__init__.py`
- `apps/api/src/gdmas/models/analysis.py`
- `apps/api/src/gdmas/models/clustering.py`
- `apps/api/src/gdmas/models/earthquake.py`
- `apps/api/src/gdmas/models/prediction.py`
- `apps/api/src/gdmas/models/service_run.py`
- `apps/api/src/gdmas/schemas/__init__.py`
- `apps/api/src/gdmas/schemas/earthquake.py`
- `apps/api/src/gdmas/services/__init__.py`
- `apps/api/src/gdmas/services/analysis/__init__.py`
- `apps/api/src/gdmas/services/clustering/__init__.py`
- `apps/api/src/gdmas/services/clustering/runner.py`
- `apps/api/src/gdmas/services/demo_seeder.py`
- `apps/api/src/gdmas/services/ingestion/__init__.py`
- `apps/api/src/gdmas/services/ingestion/runner.py`
- `apps/api/src/gdmas/services/prediction/__init__.py`
- `apps/api/src/gdmas/services/prediction/runner.py`
- `apps/api/tests/integration/__init__.py`
- `apps/api/tests/unit/__init__.py`
- `apps/api/tests/fixtures/quality_contracts.json`
- `apps/api/tests/unit/test_quality_boundaries.py`
- `apps/api/tests/unit/test_worker_error_boundaries.py`
- `docs/workflow.md`
- `docs/task/son.md`
- `.agents/notes/proposed/2026-11-13-backend-lint-validation-son.md`
- `.agents/notes/implemented/2026-11-13-backend-lint-validation-son/plan.md`
- `.agents/notes/implemented/2026-11-13-backend-lint-validation-son/status.md`
- `.agents/notes/testcase/2026-11-13-backend-lint-validation-son.md`
### Out of Scope
- `AGENTS.md`, `contracts/`, `docs/coding-rules.md`, `docs/quyuocchung.md`, `apps/api/alembic/versions/**`, frontend.
- Thay thuật toán upsert/4 patterns, dữ liệu demo, schema, giá trị cấu hình runtime, lifecycle API/worker.

---

## 3. Các bước
### Step 1 — Đợt 1: hợp đồng và bảo trì hình thức
Chụp OpenAPI/ORM/default config và hash migration; tạo test bảo vệ. Ruff fix có chọn lọc I/UP/RUF022, rà soát F401 có side effect, format. Cấu hình ngoại lệ chính xác migration cũ và Depends. Kiểm AST nhánh except giữ nguyên; không xử lý ngoại lệ/biến thừa ở đợt này.
### Step 2 — Review/merge đợt 1
Full pytest, kiểm hợp đồng, format toàn backend, lint nhóm hình thức xanh; full lint còn nhóm lỗi đã phân loại cho đợt 2 được ghi nguyên số/rule, không ignore. Scope/project-review/conflict/checks trước merge.
### Step 3 — Đợt 2: ranh giới lỗi
Rẽ fix/2026-11-13-backend-lint-validation-son từ develop sau merge đợt 1; thêm test worker retry/dừng và API error/logging trước sửa. Giữ tương thích; không ghi credential vào log; bỏ biến thừa nhưng giữ side effect.
### Step 4 — Validation/merge/completed
Full pytest offline, Ruff check/format toàn backend xanh, notes/scope và I1–I7 đạt. Merge PR đợt 2 khi 0 conflict; sau đó ghi completed và Task 4 hoàn tất qua PR tài liệu nếu cần.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi schema/endpoint/biến môi trường. Thêm cấu hình Ruff chỉ miễn đúng migration cũ `alembic/versions/001_initial_gdmas_schema.py`; migration mới vẫn kiểm tra. B008 chỉ cấu hình nhận diện FastAPI Depends an toàn.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Tạo đồng thời implemented và testcase từ template.
- [ ] Test bảo vệ OpenAPI/ORM/default config/migration trước và sau đợt 1.
- [ ] Full pytest offline, giữ 126 test cũ và test mới.
- [ ] Đợt 1: format toàn backend xanh; lint hình thức xanh; ghi rõ lỗi để đợt 2.
- [ ] Đợt 2: Ruff check/format toàn backend xanh và test ranh giới lỗi đạt.
- [ ] Notes check, scope, project-review, 0 conflict/checks trước mỗi merge.
- [ ] Task list và workflow đồng bộ; migration cũ không đổi.

---

## 6. Rủi ro khi làm
Import có side effect hoặc typing có thể đổi hợp đồng: chụp snapshot và test trước/sau. Nhánh except/logging được kiểm riêng ở đợt 2. Không unsafe-fix, không sửa migration; core chỉ bảo trì tương thích đã duyệt.

---

## 7. Rollback
Revert PR của đúng đợt nếu regression; không reset/force-push hay sửa lịch sử migration.

---

## 8. Ghi chú
Approved bởi son theo xác nhận chia hai đợt trong chat. Mỗi đợt một PR; không ghi hoàn tất toàn bộ trước khi đợt 2 merge. Các nhóm lỗi đợt 2 không bị tắt để làm xanh đợt 1.

---
