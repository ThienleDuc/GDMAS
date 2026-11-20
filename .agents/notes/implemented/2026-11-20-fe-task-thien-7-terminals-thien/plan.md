# Implementation Plan: Viết lại danh sách task Frontend (thien) theo mô hình 7 Terminals

## Metadata
- ID: 2026-11-20-fe-task-thien-7-terminals-thien
- Proposal: .agents/notes/proposed/2026-11-20-fe-task-thien-7-terminals-thien.md
- Approved By: thien
- Approved At: 2026-11-20
- Implementer: agent | thien
- Status: validation

---

## 1. Mục tiêu
Thay `docs/task/thien.md` bằng danh sách task nhỏ, gắn từng task với 7 Terminals, đối chiếu API/architecture/ERD/requirements.

---

## 2. Phạm vi
### In Scope
- `docs/task/thien.md` — viết lại toàn bộ.
- `.agents/notes/proposed/2026-11-20-fe-task-thien-7-terminals-thien.md` — proposal.
- `.agents/notes/implemented/2026-11-20-fe-task-thien-7-terminals-thien/` — plan/status.
- `.agents/notes/testcase/2026-11-20-fe-task-thien-7-terminals-thien.md` — đặc tả kiểm chứng.

### Out of Scope
- Mã nguồn `apps/web/**`, `apps/api/**`.
- `docs/api/**`, `docs/architecture*`, `docs/yeucaubatbuoc.md`, `docs/task/{son,van,tai}.md`.
- `contracts/**`, migration, `.env`, secrets.

---

## 3. Các bước
### Step 1 — Đối chiếu nguồn
Đọc `docs/api/API.md`, `docs/architecture/SAD.md`, `docs/architecture/ERD.md`, `docs/architecture.md`, `docs/yeucaubatbuoc.md` và 3 task đồng đội; kiểm tra notes index để xác định task nào đã xong. Bỏ qua `docs/guides/` theo chỉ thị.

### Step 2 — Khung tài liệu
Thêm phần 0: nguồn đối chiếu, ma trận 7 Terminals ↔ T7, bảng tiến độ, quy ước chung.

### Step 3 — Chia task nhỏ
14 task T7.01–T7.14 theo 6 nhóm: nền tảng/hợp đồng, bản đồ/dữ liệu, 6 patterns, SSE/settings, báo cáo/demo, kiểm thử. Mỗi task có terminal liên quan, endpoint, file dự kiến, DoD, kiểm chứng, phụ thuộc.

### Step 4 — Kiểm chứng
Grep cấu trúc tài liệu, `notes_index.py --check`, dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Tài liệu phân công, không đổi giao thức hay schema.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** `.agents/notes/testcase/2026-11-20-fe-task-thien-7-terminals-thien.md`
- [x] **Docs-only** — không yêu cầu file unit test (`N/A (docs-only)` theo PR template); kiểm chứng bằng grep cấu trúc.
- [ ] Backend test/lint — không đụng `apps/api`.
- [ ] Frontend build — không đụng `apps/web` (không bắt buộc; đã xanh ở PR #26).
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] Kiểm tra nội dung: đủ 7 terminal, 6 pattern, 6 bước demo, 14 task, không còn tên component đã xóa.

---

## 6. Rủi ro khi làm
- Ghi sai trạng thái task cũ → đối chiếu notes index + PR #26.
- Chồng chéo với task đồng đội → ma trận terminals nêu rõ T7 chỉ tiêu thụ T6.

---

## 7. Rollback
Revert working tree về `HEAD`; chưa có commit nào trước CHECKPOINT 1.

---

## 8. Ghi chú
Chỉ thị người dùng: "không đọc guide" — đã bỏ qua toàn bộ `docs/guides/**` khi khảo sát.
