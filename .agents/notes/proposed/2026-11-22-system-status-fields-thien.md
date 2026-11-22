# Proposal: Bổ sung field `/system/status` & `/health` (GAP-12)

## Metadata
- ID: 2026-11-22-system-status-fields-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: low
- Area: apps/api/src/gdmas/api/routes/, apps/api/tests/unit/
- Architecture Impact: none
- Related Docs: contracts/schemas/system-status.json:40,66-68, health.json, docs/task/fe-be-integration-gaps.md (GAP-12)
- Related Proposals: 2026-11-22-terminal-status-panel-thien (RD-16 — panel đã dùng field hiện có)
- Related Bugs: none

---

## 1/2. Vấn đề & Hiện trạng
`system-status.json` đã định nghĩa `records_processed`, `error_message`, `generated_at`; `health.json` có `uptime_seconds`. BE `system.py` chưa trả (dù `ServiceRun` có đủ dữ liệu). User quyết định bổ sung BE.

## 3. Mục tiêu
`/system/status`: mỗi worker trả thêm `records_processed`/`error_message` (None khi chưa có run), root thêm `generated_at` UTC `Z`. `/health`: thêm `uptime_seconds`. Giữ key/status cũ, không số giả.

## 4. Giải pháp
1. `system.py`: trong vòng lặp worker thêm 2 key từ `run`; root response thêm `generated_at: _iso(now)`; `/health` thêm `uptime_seconds`.
2. Test bổ sung `test_system_prediction_routes.py`: assert field mới + missing-run → None, empty/DB error không đổi.

## 5/6/7. Cân nhắc/Đánh đổi/Rủi ro
Additive, field đã có schema. `degraded/unhealthy` vẫn chỉ xuất hiện qua error envelope 500 khi DB lỗi — không đổi hành vi.

## 8. Test
`cd apps/api && uv run pytest <file> && uv run pytest`, ruff; FE drift check.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: User chọn bổ sung BE cho GAP-12.
Scope of Rejection: -

## 10. Next Action
Code + test + merge tự động + nhật ký GAP-12.
