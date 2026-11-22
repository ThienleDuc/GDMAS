# Testcase: scripts/test.sh có nội dung và chạy được

## Metadata
- ID: 2026-11-22-empty-test-script-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-empty-test-script-thien.md
- Target: `scripts/test.sh`
- Test File: `scripts/tests/test_test_script.py`
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
- Chặn tình trạng file script rỗng gây smoke test false-positive.
- I7: test offline (chỉ đọc nội dung script); việc chạy script thật là bước validation riêng.

---

## 2. Fixtures
- Đọc `scripts/test.sh` bằng `Path.read_text`.

---

## 3. Ma trận
| TC | Tên | Assertions | Kết quả |
|---|---|---|---|
| TC-01 | Không rỗng | `len(script) > 100` | PASS |
| TC-02 | Fail loud | có `set -euo pipefail` | PASS |
| TC-03 | 3 bước | có `notes_index.py --check`, `uv run pytest`, `pnpm test` | PASS |
| TC-04 | Docs khớp | docs/setup.md không còn câu coverage ≥70% | PASS |
| TC-05 | Smoke thật | `bash scripts/test.sh` exit 0 (validation) | PASS |

---

## 4. Lệnh & Kết quả
```bash
python3 -m unittest scripts/tests/test_test_script.py -v
bash scripts/test.sh
```
- Ngày chạy: 2026-11-22
- Kết quả: 2026-11-22 — `test_test_script.py` 5/5 pass; `bash scripts/test.sh` exit 0 (notes + 322 BE + 228 FE); `unittest discover` 43/43.

---

## 5. Bugs
- none
