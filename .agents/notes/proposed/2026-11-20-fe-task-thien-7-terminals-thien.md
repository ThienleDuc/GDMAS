# Proposal: Viết lại danh sách task Frontend (thien) theo mô hình 7 Terminals

## Metadata
- ID: 2026-11-20-fe-task-thien-7-terminals-thien
- Author: agent | thien
- Created: 2026-11-20
- Type: docs
- Status: approved
- Priority: medium
- Area: `docs/task/thien.md`
- Architecture Impact: none
  <!-- Chỉ là tài liệu phân công; không đổi mã, endpoint, schema hay envelope. -->
- Related Docs:
  - docs/api/API.md
  - docs/architecture/SAD.md
  - docs/architecture/ERD.md
  - docs/architecture.md
  - docs/yeucaubatbuoc.md
  - docs/task/{son,van,tai}.md (đối chiếu ranh giới 7 terminals)
- Related Proposals:
  - Overrides: 2026-11-16-fe-contract-gis-reports-thien — các feature page/chart/map của proposal đó đã bị gỡ trong đợt tái cấu trúc `2026-11-20-fe-restructure-globals-css-thien`, nên task phải viết lại trên nền mới.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`docs/task/thien.md` vẫn mô tả 4 task lớn của giai đoạn cũ (charts, GIS, reports/settings, services/contracts/SSE), trong khi các component/page đó đã bị xóa khi tái cấu trúc FE (PR #26). File task hiện không phản ánh nền tảng mới (layout đơn nhất, `globals.css`, contracts tách theo schema, lib gồm API client/SSE/formatters).

### Vấn đề
Cần một danh sách task mới, tách nhỏ, gắn từng task với đúng terminal trong mô hình 7 Terminals để phân công và kiểm chứng được.

### Ảnh hưởng
Task doc là căn cứ phân công và đối chiếu khi demo; nếu lạc hậu sẽ dẫn trùng việc với `son`/`van`/`tai` hoặc tưởng rằng UI cũ còn tồn tại.

---

## 2. Hiện trạng
- `docs/task/thien.md`: 4 task lớn, không có bảng tiến độ, không ánh xạ terminal, còn nhắc component đã xóa.
- `docs/task/son.md`: đã có bảng tiến độ + 4 task; `van.md`, `tai.md`: 4 task mỗi file.
- FE sau PR #26: chỉ còn shell/layout, contracts, lib, services, hooks, test; page đang là `PlaceholderPage`.

---

## 3. Mục tiêu
- Viết lại `docs/task/thien.md` với: bảng đối chiếu 7 Terminals ↔ FE, bảng tiến độ, và các task nhỏ (mỗi task có terminal liên quan, endpoint/contract, file dự kiến, DoD, kiểm chứng, phụ thuộc).
- **Out of Scope:** không sửa code FE, không sửa `docs/api/**`, `docs/architecture*`, `docs/yeucaubatbuoc.md`, không sửa task của đồng đội.

---

## 4. Giải pháp đề xuất
Giữ cấu trúc giống `docs/task/son.md` (bảng tiến độ + task chi tiết), bổ sung ma trận 7 Terminals và chia task theo nhóm: nền tảng (T6/T7), dữ liệu bản đồ (T1/T2/T4), 6 patterns (T3/T5), giám sát SSE (T6), báo cáo/demo (T1–T6), kiểm thử.

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ sửa vài dòng cho khớp tên file
Ưu: ít công. Nhược: vẫn giữ task lớn, không phản ánh 7 terminals. **Không chọn.**
### Phương án B: Viết lại thành nhiều task nhỏ + ma trận terminals
Ưu: phân công rõ, dễ đối chiếu demo, khớp yêu cầu người dùng. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ dài tài liệu | Tăng | Cần DoD + kiểm chứng cho từng task nhỏ |
| Ranh giới phân công | Rõ hơn | Mỗi task gắn 1 terminal nguồn dữ liệu |
| Code | Không đổi | Đây là task docs-only |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Ghi sai trạng thái task cũ | Trung bình | Thấp | Đối chiếu notes index + lịch sử PR (#26) trước khi ghi |
| Chồng chéo với task đồng đội | Thấp | Trung bình | Ma trận 7 Terminals nêu rõ FE chỉ tiêu thụ T6, không làm việc T2–T5 |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase:** `.agents/notes/testcase/2026-11-20-fe-task-thien-7-terminals-thien.md`
- **Kiểm chứng:** grep cấu trúc tài liệu (7 terminal, 6 pattern, 6 bước demo), `python3 scripts/notes_index.py --check`. Docs-only → không yêu cầu file unit test (PR template: `N/A (docs-only)`).

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-20
Comments: Người dùng chỉ thị trực tiếp trong chat: checkout nhánh mới và cập nhật lại `docs/task/thien.md`, đối chiếu các docs và chia thành nhiều task nhỏ theo mô hình 7 terminal. Ghi nhận §9 Approved theo chỉ thị đó; phạm vi đúng file task, không mở rộng sang code hay docs khác.
Scope of Rejection: -

---

## 10. Next Action
Pha 4: viết lại `docs/task/thien.md`, cập nhật plan/status, validation rồi dừng CHECKPOINT 1.
