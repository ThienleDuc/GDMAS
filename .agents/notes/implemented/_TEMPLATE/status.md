<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục.
     Vòng đời: planned → in_progress ⇄ blocked → validation → completed. -->

# Implementation Status: <Tên>

## Metadata
- ID: yyyy-mm-dd-<slug>-<handle>
- Status: planned   <!-- planned | in_progress | blocked | validation | completed -->
- Started: yyyy-mm-dd
- Last Updated: yyyy-mm-dd
- Owner: agent | <handle>

---

## Tiến độ
Progress: 0%
Current Phase: <bước đang làm trong plan>

Completed:
- ...
In Progress:
- ...
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE / NOT_DONE | đường dẫn `testcase/<id>.md` + file test |
| Test liên quan (`pytest`) | PASS / FAIL / NOT_RUN | lệnh + số pass/fail |
| Lint / Build (`ruff` / `pnpm build`) | PASS / FAIL / NOT_RUN | |
| Notes check (`notes_index.py --check`) | PASS / FAIL / NOT_RUN | |
| Tài liệu cập nhật | DONE / N/A | |

---

## Known Issues
- none   <!-- hoặc <vấn đề> — BUG-<handle>-NNN -->

---

## Deviations From Plan
- none   <!-- nếu lệch plan.md, ghi rõ Dự kiến / Thực tế / Lý do / Quyết định -->

---

## Decisions Made During Implementation
- ...

---

## Next Actions
- ...

---

## Last Update
yyyy-mm-dd — Khởi tạo kế hoạch thực thi.

