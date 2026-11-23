<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — vòng đời planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: Loại bỏ khu vực trùng lặp

## Metadata
- ID: 2026-11-24-monitoring-region-dedupe-thien
- Status: validation
- Started: 2026-11-24
- Last Updated: 2026-11-24
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 6 — CHECKPOINT 1

Completed:
- Proposal §9 Approved; notes sinh đồng thời; `notes_index.py --check` OK
- Nhánh `fix/2026-11-24-monitoring-region-dedupe-thien` (giữ working tree các task trước)
- BE: `_merge_region_rows`/`_label_rank` gộp biến thể region theo trim+casefold, count cộng, avg trọng số, max; route `/regions` dùng helper
- FE: `regionOptionsFromCatalog` + `regionKey` + `MapRegionPanel` dedupe casefold
- Test: BE 38 pass + ruff sạch; FE 360 pass + build; không xoá test

In Progress:
- CHECKPOINT 1 — chờ xác nhận `tiếp tục workflow` / `dừng lại` / `sửa thêm`

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + test BE/FE bổ sung |
| BE pytest | PASS | 38 passed (`test_earthquakes_routes.py`) |
| FE build/test | PASS | `pnpm build`; 360 tests / 0 fail |
| Notes check | PASS | OK |

---

## Known Issues
- none

---

## Deviations From Plan
- Nhánh tạo bằng `git switch -c` từ HEAD thay vì `git-ship.sh start` (dirty tree của task trước) — giữ nguyên working tree.

---

## Decisions Made During Implementation
- Nhãn đại diện: biến thể có count lớn nhất, tie → alphabetically nhỏ nhất.
- Avg sau gộp tính lại qua `avg*count` để không sai do làm tròn.

---

## Next Actions
- Step 2 → Step 5: implement, test, validation
- Step 6: `Status: validation`, dừng CHECKPOINT 1

---

## Last Update
2026-11-24 — Implement xong: BE 38 pass, FE 360 pass, `Status: validation`; dừng CHECKPOINT 1.
