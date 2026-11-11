# Luồng Sửa Nhỏ / Tài Liệu Nhanh (Fast-Track via `review-pr`)

Tài liệu này mô tả cách xử lý các tác vụ **thật sự nhỏ** (sửa ≤ 1 dòng hoặc ≤ 1 tệp: chỉnh lỗi hiển thị nhỏ, sửa chính tả docs, chỉnh config nhỏ) mà **không cần tạo proposal** — toàn bộ thao tác Git và thẩm định vẫn đi qua **`project-review`** và **`review-pr`** trong `.agents/skills/`.

*(Lưu ý: Nếu yêu cầu là **kiểm thử chuyên sâu 1 file cụ thể**, hãy dùng luồng **`single-file-test`** trong [`write-testcase`](../../../.agents/skills/write-testcase/SKILL.md) để checkout nhánh `test/<id>`, tạo `.agents/notes/testcase/<id>.md` và ghi lỗi vào `.agents/notes/bugs/` nếu test fail.)*

---

## 🎯 Khi Nào Được Dùng Fast-Track?

Chỉ dùng khi đáp ứng **đồng thời** các điều kiện:
- Chỉ đụng **≤ 1 tệp** (hoặc sửa thuần tài liệu/chính tả không đổi kiến trúc, DB, API contract).
- Không thêm service worker mới, không tạo migration Alembic, không đổi payload `contracts/`.
- Người dùng xác nhận đồng ý bỏ qua bước proposal (`write-proposal`).

> Nếu chạm ≥ 2 tệp hoặc đổi logic nghiệp vụ, bắt buộc đi theo [spec-driven-workflow.md](spec-driven-workflow.md) (với tiêu chí duyệt proposal §9 thả lỏng — tác giả tự duyệt được).

---

## 🧭 Quy Trình 4 Bước Tối Giản

1. **Rẽ nhánh tự động (`review-pr` Phần A):**
   - Trước khi sửa tệp đầu tiên, chạy `./scripts/git-ship.sh start <type>/<id>` từ `develop` (sinh `<id>` = `yyyy-mm-dd-<slug>-<handle>` qua Slug Engine).
2. **Thực hiện sửa đổi & bổ sung testcase (nếu chạm logic):**
   - Tự động thêm/sửa file an toàn theo scope không cần hỏi xác nhận từng bước.
   - Tuân thủ **RULE-03 Open-Closed** và **I1–I7**. Nếu có sửa logic/bug nhỏ, bổ sung test offline và ghi nhận bằng [`.agents/notes/testcase/_TEMPLATE.md`](../../../.agents/notes/testcase/_TEMPLATE.md) (chỉ thuần docs/typo thì miễn giảm).
3. **Thẩm định nhanh (`project-review`):**
   - Kiểm tra không tự ý xóa tệp, không đụng tệp lõi trái phép, không lộ secret `.env`, `python3 scripts/notes_index.py --check` sạch, chạy test/lint/build liên quan.
4. **Đẩy PR tự động (`review-pr` Phần B):**
   - Tổng hợp Conventional Commit tiếng Việt theo bảng Type/Scope (ép bởi `.githooks/commit-msg`).
   - Chạy `./scripts/git-ship.sh update` (merge-forward `develop`) → `./scripts/git-ship.sh push` tạo/in link PR.
   - Kiểm tra không xung đột (`./scripts/git-ship.sh merge --dry-run`): **không bắt buộc riêng `ThienleDuc`**, bất kỳ thành viên nào đều có thể merge khi **0 conflict** (qua `./scripts/git-ship.sh merge` hoặc GitHub PR).
   - Nếu gặp thao tác nguy hiểm (xóa file/folder hoặc conflict), bỏ qua phần nguy hiểm và **gom vào 1 danh sách câu hỏi cuối phiên**.
