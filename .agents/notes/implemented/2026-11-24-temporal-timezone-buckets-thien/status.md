<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — vòng đời planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Temporal bucket theo timezone

## Metadata
- ID: 2026-11-24-temporal-timezone-buckets-thien
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
- Nhánh `fix/2026-11-24-temporal-timezone-buckets-thien` (giữ working tree 3 task trước)
- BE: `compute_temporal(..., tz)` convert local trước resample; `/analysis/temporal` query `timezone` optional; FE gửi timezone từ context
- Vòng 2: `formatStatDate` chỉ giữ ngày (bỏ giờ), vẫn có hậu tố mode
- Test: BE 382 pass + ruff sạch (snapshot OpenAPI cập nhật); FE 368 pass + build

In Progress:
- CHECKPOINT 1 — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | BE/FE test bổ sung |
| BE pytest/ruff | PASS | 382 passed; ruff sạch |
| FE build/test | PASS | 368 tests / 0 fail; build OK |
| Notes check | PASS | OK |

---

## Known Issues
- none

---

## Deviations From Plan
- Nhánh rẽ từ HEAD có working tree 3 task trước — giữ nguyên.

---

## Decisions Made During Implementation
- Default `UTC` cho caller cũ (T3 snapshot); chỉ đổi khi FE gửi `UTC%2B7`.

---

## Next Actions
- Step 2 → Step 4: implement, test, validation
- Step 5: `Status: validation`, dừng CHECKPOINT 1

---

## Last Update
2026-11-24 — Implement xong: bucket theo timezone + nhãn chỉ ngày; BE 382 / FE 368 pass; dừng CHECKPOINT 1.
