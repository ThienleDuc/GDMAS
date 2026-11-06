# Thư Mục Bộ Nhớ Ngữ Cảnh Tinh Gọn (Context Window Memory)

Thư mục này lưu trữ tệp bộ nhớ cửa sổ ngữ cảnh `context-memory.md` cho AI Agent trong dự án **GDMAS**.

---

## Mục Đích
1. **Tiết kiệm Token:** Giúp AI Agent không phải quét và đọc toàn bộ 30+ tệp tài liệu trong `docs/` hay quét toàn bộ mã nguồn mỗi khi bắt đầu phiên làm việc mới.
2. **On-Demand Skill Activation:** Chứa chỉ mục tra cứu nhanh các kỹ năng sẵn có trong `.agents/skills/`. Agent chỉ tải chi tiết kỹ năng khi được người dùng chỉ định hoặc tác vụ yêu cầu đích danh.
3. **Bảo tồn Bối Cảnh Lõi:** Lưu giữ các nguyên tắc bất biến (Open-Closed Principle, 7 Terminals, 6 Patterns) và trạng thái làm việc gần nhất.

