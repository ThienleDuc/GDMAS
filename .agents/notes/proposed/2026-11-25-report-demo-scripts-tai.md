# Proposal: Bổ sung phương pháp luận báo cáo và kịch bản demo

## Metadata
- ID: 2026-11-25-report-demo-scripts-tai
- Author: agent | tai
- Created: 2026-11-25
- Type: feature
- Status: approved
- Priority: medium
- Area: docs/BAO_CAO_FINAL_PROJECT.md, demo_scripts/
- Architecture Impact: none
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
- Related Proposals:
  - none
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Báo cáo cần trình bày rõ phương pháp của T3, T4, T5 và cần một kịch bản trình diễn các terminal.
### Vấn đề
Cần công thức, lý giải tham số có căn cứ và công cụ demo phù hợp cấu hình, lược đồ, lệnh chạy thực tế.
### Ảnh hưởng
Người đọc cần tái hiện demo và phân biệt thiết kế, giả định nghiệp vụ với kết quả đã được kiểm chứng.

---

## 2. Hiện trạng
Báo cáo gốc tại `docs/BAO_CAO_FINAL_PROJECT.md`; các worker, migration, API và cấu hình CSDL nằm trong `apps/api/` và cấu hình triển khai của dự án. Cần đối chiếu source trước khi mô tả hoặc viết lệnh.

---

## 3. Mục tiêu
- **Mục tiêu:** Cập nhật §4.3–4.5 với công thức LaTeX và lý giải trung thực; tạo SQL truy vấn, script demo và hướng dẫn.
- **Không nằm trong mục tiêu (Out of Scope):** Thay đổi thuật toán production, schema, contract, migration cũ hoặc tài liệu ngoài phạm vi đã nêu.

---

## 4. Giải pháp đề xuất
- Sửa duy nhất các phần T3–T5 của báo cáo; đối chiếu hằng số với mã, không khẳng định giả thuyết là kết quả thực nghiệm.
- Tạo `demo_scripts/demo_queries.sql`, `demo_scripts/run_demo.sh` hoặc `run_demo.ps1`, `demo_scripts/README_DEMO.md`; dùng các entrypoint và bảng thực tế, giải thích điều kiện dữ liệu và kết nối.
- Bổ sung test offline cho kịch bản, dùng mock thay các dịch vụ ngoài; không nhúng worker vào T6, không sửa contract hoặc migration cũ.
- Khi được duyệt, đồng thời tạo plan, status, testcase theo template và bổ sung test vào phạm vi.

---

## 5. Phương án đã cân nhắc
### Phương án A: Lệnh demo thủ công
Ít mã nhưng khó lặp lại và khó ghi nhận tiến trình; không đáp ứng yêu cầu tự động.
### Phương án B: Script điều phối bên ngoài
Dùng entrypoint hiện có, dễ lặp lại và giữ 7 terminal độc lập; cần xử lý chờ và lỗi rõ ràng.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Tăng vừa phải | Cần quản lý tiến trình và điều kiện sẵn sàng. |
| Hiệu năng | Không thay đổi production | Chỉ thêm công cụ demo. |
| Bảo trì / Open-Closed | Cần cập nhật khi entrypoint đổi | Tận dụng thay vì sửa worker hiện hữu. |
| Độ tin cậy | Phụ thuộc dữ liệu, mạng và môi trường | Thông báo điều kiện và lỗi; kiểm thử offline bằng mock. |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Tham số báo cáo khác source hoặc không có cơ sở thực nghiệm | Trung bình | Cao | Đối chiếu mã, ghi rõ giả định và giới hạn. |
| USGS, PostgreSQL hoặc artifact không sẵn sàng | Trung bình | Cao | Kiểm tra điều kiện, dừng với thông báo, không giả lập dữ liệu thật. |
| Worker chạy liên tục khiến demo bị treo | Trung bình | Trung bình | Thiết kế cơ chế chờ/thoát an toàn theo entrypoint thực tế. |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-25-report-demo-scripts-tai.md` từ template.
- **Code test tự động (offline):** `scripts/tests/test_demo_scripts.py`, mock các tiến trình và dịch vụ ngoài.
- **Cách kiểm chứng:** Chạy test liên quan offline, kiểm tra cú pháp script, đối chiếu SQL và endpoint với mã, chạy `notes_index.py --check`; chỉ chạy demo tích hợp nếu môi trường và mạng sẵn sàng, báo rõ nếu chưa chạy.

---

## 9. Human Review
Decision: Approved
Reviewer: tai
Review Date: 2026-11-25
Comments: Người dùng xác nhận trong chat: “Duyệt proposal, tiến hành đi”.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 để bắt đầu `build-implementation`.
