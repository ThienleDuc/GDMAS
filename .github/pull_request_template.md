## Implementation Report

- **Proposal / Plan:** `.agents/notes/implemented/<id>/plan.md` *(ghi "Fast-Track (không có proposal)" hoặc "Single-File Test (`test/<id>`)" nếu không có proposal)*
- **Changed:** <danh sách tệp đã tạo/sửa>
- **Scope:** khớp In Scope | <ngoại lệ nếu có>
- **Behavior:** <tóm tắt ngắn gọn thay đổi nghiệp vụ/kỹ thuật hoặc phạm vi kiểm thử>
- **Tests:** <lệnh đã chạy thật + kết quả pass/fail>
- **Test Files Created:** <`apps/api/tests/.../test_*.py` / `scripts/tests/test_*.py` + `.agents/notes/testcase/<id>.md` tạo từ `.agents/notes/testcase/_TEMPLATE.md`, hoặc `N/A (docs-only)`>
- **Contracts:** không drift | <doc>: đã cập nhật | <doc>: cần người xem
- **Bugs:** <BUG-<handle>-NNN trong `.agents/notes/bugs/`> | none
- **Risks:** <phần chưa kiểm đủ hoặc rủi ro còn lại>
- **Decision:** Theo `.agents/notes/implemented/<id>/plan.md` | Theo `.agents/notes/testcase/<id>.md`
- **Not changed:** <thành phần liền kề cố ý không đụng>
- **Status:** READY_FOR_REVIEW

---

## Checklist GDMAS trước khi Merge PR

- [ ] Tuân thủ **RULE-03 (Open-Closed)**: không xóa tệp cũ, không làm vỡ chữ ký hàm cũ đang dùng.
- [ ] Tuân thủ **7 Bất biến (I1–I7)**: không nhúng worker vào `main.py`, giữ chuẩn UTC/WGS84, không sửa migration Alembic cũ.
- [ ] Không chứa secret / `.env` / `.agents/me` / `.artifacts/`.
- [ ] Đã tạo tài liệu `.agents/notes/testcase/<id>.md` (từ `../.agents/notes/testcase/_TEMPLATE.md` → [mẫu _TEMPLATE.md](../.agents/notes/testcase/_TEMPLATE.md)) + file unit test offline và chạy kiểm chứng.
- [ ] Nếu test phát hiện lỗi, đã ghi đầy đủ vào `.agents/notes/bugs/BUG-<handle>-NNN-<slug>.md` và liên kết tại `Related Bugs:`.
- [ ] Đã chạy `python3 scripts/notes_index.py --check` (PASS) và validation cục bộ tương ứng phạm vi thay đổi.
- [ ] Đã kiểm tra **không có xung đột (`./scripts/git-ship.sh update` / `merge --dry-run`)** — khi không xung đột, bất kỳ thành viên nào đều có thể merge PR (không bắt buộc riêng `@ThienleDuc`).
