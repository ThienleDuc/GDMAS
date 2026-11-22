# Implementation Plan: Alias /predictions & /classifications (GAP-08)

## Metadata
- ID: 2026-11-22-prediction-contract-aliases-thien
- Proposal: .agents/notes/proposed/2026-11-22-prediction-contract-aliases-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thêm `confidence_level` và `probability_scores` theo contract, không đổi key cũ.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/predictions.py`
- `apps/api/tests/unit/test_system_prediction_routes.py`
- `docs/task/fe-be-integration-gaps.md` (nhật ký)
- `.agents/notes/testcase/2026-11-22-prediction-contract-aliases-thien.md`

### Out of Scope
`contracts/**`, docs API, migration, FE, GAP-09/12.

---

## 3–8
1. Sửa 2 dict response; 2. test; 3. validation + nhật ký + merge tự động.
Không migration/schema/env. Rủi ro thấp (field đã có trong schema).

---

## 8. Rollback
Revert route + test + nhật ký; giữ notes.
