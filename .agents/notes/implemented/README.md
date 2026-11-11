# Thư Mục Triển Khai & Tiến Độ Sống (`.agents/notes/implemented/`)

Thư mục này chứa thư mục triển khai `yyyy-mm-dd-<slug>-<handle>/` (gồm `plan.md` và `status.md`) cho các proposal đã có `Decision: Approved` ở §9.

## Quy tắc

1. **Điều kiện tạo:** Proposal tương ứng trong `.agents/notes/proposed/<id>.md` phải ở trạng thái `Decision: Approved` (được duyệt bởi bất kỳ thành viên nào trong `.agents/team.md`, không cần `ThienleDuc`).
2. **Khuôn mẫu chuẩn:** Copy từ [`_TEMPLATE/plan.md`](_TEMPLATE/plan.md) và [`_TEMPLATE/status.md`](_TEMPLATE/status.md).
3. **Vòng đời `status.md`:** `planned → in_progress ⇄ blocked → validation → completed`.
   - Agent đẩy PR lên ở trạng thái `Status: validation`.
   - `Status: completed` cập nhật sau khi PR đã kiểm tra không xung đột và được **merge vào `develop`**.
4. **Kiểm tra:** `python3 scripts/notes_index.py` và `python3 scripts/notes_index.py --check`.
