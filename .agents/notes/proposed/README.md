# Thư Mục Đề Xuất Kiến Trúc & Tính Năng (`.agents/notes/proposed/`)

Thư mục này lưu **mọi proposal** của dự án **GDMAS**, bất kể kết quả (`Pending`, `Changes Requested`, `Approved`, `Rejected`).
File không bao giờ bị xóa hay di chuyển khỏi đây.

## Quy tắc

1. **Khuôn mẫu chuẩn:** Copy [`_TEMPLATE.md`](_TEMPLATE.md) sang `yyyy-mm-dd-<slug>-<handle>.md` (`<handle>` từ [`.agents/team.md`](../../team.md): `thien`, `son`, `van`, `tai`).
2. **Tiêu chí proposal thả lỏng:** Bất kỳ thành viên nào trong `.agents/team.md` (tác giả tự duyệt hoặc đồng đội) đều có thể ký `Decision: Approved` tại `## 9. Human Review`. **Không yêu cầu `ThienleDuc` phải đồng ý ở bước proposal.**
   *(Lưu ý: khi **merge PR** vào `develop`, không bắt buộc riêng `ThienleDuc` — chỉ cần kiểm tra không xung đột là được phép merge.)*
3. **Bảng tổng hợp:** Không ghi tay bảng danh sách. Chạy lệnh:
   ```bash
   python3 scripts/notes_index.py
   python3 scripts/notes_index.py --check
   ```
