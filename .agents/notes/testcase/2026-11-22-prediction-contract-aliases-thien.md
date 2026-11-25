# Testcase: Alias /predictions & /classifications (GAP-08)

## Metadata
- ID: 2026-11-22-prediction-contract-aliases-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/api/src/gdmas/api/routes/predictions.py
- Test File: apps/api/tests/unit/test_system_prediction_routes.py
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- `/predictions` có `confidence_level`; `/classifications` có `probability_scores`; giữ key cũ, empty state không đổi.
- I1/I2/I3/I4/I7: route T6, additive, không số giả, không migration, test offline.

## 2/3. Fixtures & Ma trận
| TC | Tên | Kết quả | Status |
|---|---|---|---|
| TC-01 | confidence_level từ evaluation_metrics | Có giá trị thật | PASS |
| TC-02 | confidence_level thiếu | `None` | PASS |
| TC-03 | probability_scores alias | Bằng probabilities, giữ probabilities | PASS |
| TC-04 | Empty state | Không đổi | PASS |

## 4. Lệnh
`cd apps/api && uv run pytest tests/unit/test_system_prediction_routes.py && uv run pytest`, ruff; `notes_index`.
Kết quả: targeted 35/35 PASS; full BE 315/315; ruff sạch; FE 217/217 + build PASS.

## 5. Bug Logs
- none
