# Proposal: Alias hợp đồng cho /predictions & /classifications (GAP-08)

## Metadata
- ID: 2026-11-22-prediction-contract-aliases-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: bugfix
- Status: approved
- Priority: low
- Area: apps/api/src/gdmas/api/routes/, apps/api/tests/unit/
- Architecture Impact: none
- Related Docs: docs/api/API.md §3.3, docs/task/fe-be-integration-gaps.md (GAP-08)
- Related Proposals: 2026-11-21-api-docs-contract-sync-thien
- Related Bugs: none

---

## 1/2. Vấn đề & Hiện trạng
`predictions.json:30` có `confidence_level` optional, `classifications.json:27-31` có alias `probability_scores` — FE contract đã khai báo nhưng route `predictions.py:42-61,85-96` không trả. User quyết định **bổ sung BE** cho cả 3 gap còn lại.

## 3. Mục tiêu
`/predictions` trả thêm top-level `confidence_level` (từ `evaluation_metrics.confidence_level`, `None` nếu thiếu); `/classifications` trả thêm alias `probability_scores` = `probabilities`. Giữ key cũ, không đổi schema.

## 4. Giải pháp
1. `predictions.py`: thêm key vào dict response; `confidence_level` lấy `(row.evaluation_metrics or {}).get("confidence_level")`.
2. Test bổ sung `test_system_prediction_routes.py`: assert 2 key mới + giữ key cũ + empty state.

## 5/6/7. Cân nhắc/Đánh đổi/Rủi ro
Additive, field đã có trong schema → an toàn. Không số giả (None nếu thiếu).

## 8. Test
`cd apps/api && uv run pytest <file> && uv run pytest`, ruff; FE drift check.

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: User chọn "1, 2, 3 đều bổ sung BE" cho các gap còn lại; GAP-08 thuộc scope.
Scope of Rejection: -

## 10. Next Action
Code + test + validation + merge tự động + nhật ký GAP-08.
