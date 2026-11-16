<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này.
     Luật xung quanh: docs/agent-workflow.md.
     QUY TẮC THẢ LỎNG §9: Bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả tự duyệt hoặc đồng đội)
     đều có thể điền Decision: Approved tại §9 — KHÔNG cần chờ ThienleDuc duyệt proposal.
     Agent chỉ điền §9 khi người dùng đang thao tác xác nhận rõ ràng trong chat (ghi chỉ thị vào Comments). -->

# Proposal: <Tên proposal>

## Metadata
- ID: yyyy-mm-dd-<slug>-<handle>
- Author: agent | <handle>
- Created: yyyy-mm-dd
- Type: architecture | feature | refactor | bugfix | infrastructure | docs
- Status: proposed   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: low | medium | high
- Area: <module / thư mục chính bị đụng, vd. apps/api/src/gdmas/services/analysis/ hoặc apps/web/src/features/statistics/>
- Architecture Impact: none | docs/api/API.md | docs/architecture/ERD.md | docs/architecture/SAD.md | contracts/ | ...
  <!-- Nếu khác `none`: ghi rõ sự thật nào trong tài liệu đó sẽ thay đổi khi xong. Skill project-review dùng trường này để bắt drift. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - none   <!-- hoặc .agents/notes/proposed/<id>.md; thêm `- Overrides: <id>` nếu thay thế quyết định cũ -->
- Related Bugs: none   <!-- hoặc BUG-<handle>-NNN -->

---

## 1. Vấn đề
### Bối cảnh
Hiện tại đang thế nào? (Liên hệ 7 Terminals / 6 Patterns nếu có.)
### Vấn đề
Cần giải quyết điều gì?
### Ảnh hưởng
Vì sao quan trọng?

---

## 2. Hiện trạng
Cách đang cài đặt hiện tại, kèm đường dẫn tệp liên quan.

---

## 3. Mục tiêu
- **Mục tiêu:** ...
- **Không nằm trong mục tiêu (Out of Scope):** ...

---

## 4. Giải pháp đề xuất
Tổng quan kiến trúc, tệp dự kiến tạo mới (tuân thủ **RULE-03 Open-Closed Principle** và **7 Bất biến I1–I7**).

---

## 5. Phương án đã cân nhắc
### Phương án A: <tên>
Ưu / Nhược / Lý do không chọn.
### Phương án B: <tên>
Ưu / Nhược / Lý do chọn (hoặc không chọn).

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | ... | ... |
| Hiệu năng | ... | ... |
| Bảo trì / Open-Closed | ... | ... |
| Độ tin cậy | ... | ... |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| ... | Thấp/Trung bình/Cao | Thấp/Trung bình/Cao | ... |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/api/tests/unit/test_<module>.py` *(hoặc `scripts/tests/test_<module>.py` / FE test)*
- **Cách kiểm chứng:** (`uv run pytest`, `uv run ruff check .`, `pnpm --dir apps/web build`, kiểm tra chức năng). Chi tiết lệnh để ở `plan.md` và `testcase/<id>.md`.

---

## 9. Human Review
Decision: Pending   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: -
Review Date: -
Comments:
Scope of Rejection: -   <!-- bắt buộc khi Rejected: "Rejected for: <use-case cụ thể>, not a ban on <công nghệ/pattern> in general." -->

---

## 10. Next Action
Chờ thành viên thực hiện / đồng đội xác nhận §9 để bắt đầu `build-implementation`.

<!-- Sau "Changes Requested": sửa các mục trên ngay trong file này và thêm bên dưới
### Revision yyyy-mm-dd
- đã sửa gì, trả lời comment nào -->

