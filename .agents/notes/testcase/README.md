# `.agents/notes/testcase/`: Đặc tả & biên bản Testcase

Thư mục này lưu toàn bộ bản đặc tả testcase (`.agents/notes/testcase/<id>.md`) song hành cùng:
1. **Luồng Spec-Driven (khi Proposal được duyệt `§9 Approved`):** đồng thời với việc tạo `.agents/notes/implemented/<id>/`, kỹ năng [`write-testcase`](../../skills/write-testcase/SKILL.md) tạo `.agents/notes/testcase/<id>.md` từ [`_TEMPLATE.md`](_TEMPLATE.md) và mã nguồn unit/integration test chạy offline.
2. **Luồng Kiểm thử 1 file cụ thể theo yêu cầu:** sau khi checkout nhánh mới `test/<id>`, [`write-testcase`](../../skills/write-testcase/SKILL.md) tạo `.agents/notes/testcase/<id>.md`, viết unit test cho file mục tiêu và chạy thử; nếu phát hiện lỗi sẽ ghi nhận vào [`.agents/notes/bugs/`](../bugs/README.md).

## Quy tắc

- **Khuôn mẫu chuẩn:** Copy [`_TEMPLATE.md`](_TEMPLATE.md) sang `<id>.md` (`yyyy-mm-dd-<slug>-<handle>`). Không sửa trực tiếp `_TEMPLATE.md`.
- **Bảng tổng hợp & kiểm tra tự động:**
  ```bash
  python3 scripts/notes_index.py --testcases
  python3 scripts/notes_index.py --check
  ```
- **Chạy offline 100% (I7):** Mọi unit test đi kèm bắt buộc mock dịch vụ ngoài (USGS HTTP, DB ngoài), không gọi mạng thật.

