# Testcase: Checkpoint workflow (commit/push & merge) và cụm khởi động

## Metadata
- ID: 2026-11-18-workflow-checkpoints-thien
- Mode: single-file-test
- Proposal: none
- Target: 8 tệp định nghĩa workflow (3 SKILL.md, AGENTS.md, CLAUDE.md, .claude/notes/README.md, docs/agent-workflow.md, docs/git-workflow.md)
- Test File: `scripts/tests/test_workflow_checkpoints.py`
- Author: agent | thien
- Created: 2026-11-18
- Status: passed
- Completed At: 2026-11-18 (PR #23 → develop, merge 174e9fa)
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** các tài liệu định nghĩa luồng agent có chứa CHECKPOINT 1/2, cụm khởi động `tiếp tục workflow`, và không còn tự động commit/push/merge ngay sau validation.
- **Ràng buộc GDMAS liên quan:**
  - [x] I1 — không đụng 7 Terminals/worker (chỉ tài liệu).
  - [x] I3 — không đổi contract/UTC/WGS84.
  - [x] I5 — không đụng UI/pattern.
  - [x] I7 — unit test offline 100% (đọc file markdown, không gọi mạng); không xóa test cũ.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `unittest`, `pathlib.Path.read_text` — đọc trực tiếp các tệp markdown trong repo, không mock mạng/DB.
- Fixture: nội dung 8 tệp định nghĩa workflow (dùng làm dữ liệu kiểm chứng).

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | CHECKPOINT 1 hiện diện đủ 8 tệp | Coverage | Đọc 8 tệp định nghĩa workflow | Mỗi tệp chứa `CHECKPOINT 1` | `PASS` |
| `TC-02` | CHECKPOINT 2 hiện diện đủ 8 tệp | Coverage | Đọc 8 tệp định nghĩa workflow | Mỗi tệp chứa `CHECKPOINT 2` | `PASS` |
| `TC-03` | Cụm khởi động `tiếp tục workflow` | Functional | Đọc 8 tệp định nghĩa workflow | Mỗi tệp chứa `tiếp tục workflow`; chấp nhận `continue workflow` | `PASS` |
| `TC-04` | build-implementation không còn auto transfer | Regression | Đọc `build-implementation/SKILL.md` | Không còn cụm "TỰ ĐỘNG chuyển giao"; có dừng CHECKPOINT 1 | `PASS` |
| `TC-05` | review-pr tách B1/B2 quanh CHECKPOINT 2 | Functional | Đọc `review-pr/SKILL.md` | Có `CHECKPOINT 2`, B1/B2, `merge --dry-run` trước merge | `PASS` |
| `TC-06` | Sơ đồ docs có nút dừng | Drift | Đọc `docs/agent-workflow.md`, `docs/git-workflow.md` | Mermaid/sơ đồ có nhánh checkpoint + cụm khởi động | `PASS` |
| `TC-07` | Giữ nguyên gate an toàn | Safety | Đọc `AGENTS.md`, proposal | Vẫn có "0 conflicts", CHECKPOINT 1/2, cụm khởi động; §9 `Decision: Approved` + `Reviewer: thien` | `PASS` |
| `TC-08` | File test chạy offline & notes check | Regression | `python3 -m unittest ...` + `notes_index.py --check` | 7/7 test mới, 18/18 scripts tests, notes OK, `git diff --check` OK | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
python3 -m unittest scripts/tests/test_workflow_checkpoints.py -v
python3 scripts/notes_index.py --check
git diff --check
```

- **Ngày chạy cuối:** 2026-11-18
- **Kết quả quan sát thật:** `python3 -m unittest scripts/tests/test_workflow_checkpoints.py -v` → 7/7 pass; `python3 -m unittest discover -s scripts/tests -v` → 18/18 pass (không hồi quy 11 test cũ); `python3 scripts/notes_index.py --check` → OK; `git diff --check` → OK. Không có lỗi phát hiện.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
