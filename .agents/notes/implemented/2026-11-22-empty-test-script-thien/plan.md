# Implementation Plan: Điền nội dung scripts/test.sh

## Metadata
- ID: 2026-11-22-empty-test-script-thien
- Proposal: .agents/notes/proposed/2026-11-22-empty-test-script-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Biến `scripts/test.sh` từ file 0 byte thành smoke test runner chạy notes check + BE pytest + FE test, exit code đúng; sửa docs §5.3 bỏ cam kết coverage giả; test offline chặn file rỗng tái diễn.

---

## 2. Phạm vi
### In Scope
- `scripts/test.sh`
- `docs/setup.md` (§5.3 — một đoạn ngắn)
- `scripts/tests/test_test_script.py` *(mới)*
- `.agents/notes/testcase/2026-11-22-empty-test-script-thien.md`
### Out of Scope
- code ứng dụng, đo coverage, pnpm build trong script

---

## 3. Các bước
1. Viết script `set -euo pipefail` + 3 lệnh có echo tiếng Việt.
2. Sửa docs §5.3.
3. Tạo test assert nội dung script (không thực thi).
4. Chạy `bash scripts/test.sh`, unittest, notes_index.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Architecture Impact: none (docs §5.3 chỉ mô tả lại lệnh hiện có).

---

## 5. Validation
- [x] Testcase sinh đồng thời
- [ ] `bash scripts/test.sh` exit 0 (318 BE + 228 FE)
- [ ] `python3 -m unittest scripts/tests/test_test_script.py -v`
- [ ] `notes_index.py --check`

---

## 6. Rủi ro
`uv`/`pnpm` chưa cài → script fail rõ ràng (không im lặng như trước).

---

## 7. Rollback
Revert script về rỗng + xóa test mới.

---

## 8. Ghi chú
Nhánh `chore/docker-fe-be-connection-thien`.
