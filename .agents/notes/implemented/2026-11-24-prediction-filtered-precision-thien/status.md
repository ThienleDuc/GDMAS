<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — vòng đời planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Chuẩn hóa độ chính xác dự báo ở BE

## Metadata
- ID: 2026-11-24-prediction-filtered-precision-thien
- Status: validation
- Started: 2026-11-24
- Last Updated: 2026-11-24
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 5 — CHECKPOINT 1

Completed:
- Proposal §9 Approved; notes sinh đồng thời; `notes_index.py --check` OK
- Nhánh `fix/2026-11-24-prediction-filtered-precision-thien` (từ HEAD, giữ working tree trước)
- `rounded_forecast` trong `filtered.py` — làm tròn predicted/lower/upper về **3 chữ số**, dùng trong `build_filtered_forecast`
- `service.py` snapshot đổi `round(..., 1)` → `round(..., 3)` cho 3 field
- Test `test_prediction_filtered_precision.py` + `test_prediction_service.py`: **22 passed**; ruff check/format PASS

In Progress:
- CHECKPOINT 1 — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + `test_prediction_filtered_precision.py` |
| `uv run python -m pytest` | PASS | 22 passed (binary `pytest` không có trong PATH) |
| `ruff check/format` | PASS | All checks passed; 85 files formatted |
| Notes check | PASS | OK |

---

## Known Issues
- none

---

## Deviations From Plan
- Nhánh tạo bằng `git switch -c` từ HEAD thay vì `git-ship.sh start` (bị chặn bởi dirty tree của proposal trước) — giữ nguyên working tree.

---

## Decisions Made During Implementation
- Revision: chuẩn về **3 chữ số thật** ở cả 2 đường BE (không đệm `000`) theo chỉ thị người dùng; không đổi FE/contract.
- `Overrides:` chỉ áp cho cách trả float thô, không override cơ chế on-the-fly.

---

## Next Actions
- Step 2 → Step 4: implement, test, validation
- Step 5: `Status: validation`, dừng CHECKPOINT 1

---

## Last Update
2026-11-24 — Revision: chuẩn 3 chữ số thật ở cả 2 đường BE; 22 tests pass, ruff sạch; dừng CHECKPOINT 1.
