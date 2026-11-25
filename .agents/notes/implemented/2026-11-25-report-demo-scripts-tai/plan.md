# Implementation Plan: Báo cáo phương pháp và demo

## Metadata
- ID: 2026-11-25-report-demo-scripts-tai
- Proposal: .agents/notes/proposed/2026-11-25-report-demo-scripts-tai.md
- Approved By: tai
- Approved At: 2026-11-25
- Implementer: agent | tai
- Status: in_progress

---

## 1. Mục tiêu
Cập nhật công thức và lý giải T3–T5, tạo demo có thể lặp lại và kiểm thử offline.

---

## 2. Phạm vi
### In Scope
- `docs/BAO_CAO_FINAL_PROJECT.md` §4.3–4.5
- `demo_scripts/demo_queries.sql`, `demo_scripts/run_demo.sh`, `demo_scripts/README_DEMO.md`
- `.agents/notes/testcase/2026-11-25-report-demo-scripts-tai.md`
- `scripts/tests/test_demo_scripts.py`
### Out of Scope
- Mã worker, contract, migration, nội dung báo cáo ngoài §4.3–4.5.

---

## 3. Các bước
### Step 1 — Đối chiếu và cập nhật báo cáo
Đối chiếu source và ghi rõ các giả định, hạn chế của tham số.
### Step 2 — Demo và kiểm thử
Tạo script, SQL, hướng dẫn và kiểm thử offline, kiểm tra cú pháp và notes.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có thay đổi schema, API hay cấu hình. Script demo vận hành dịch vụ và ghi dữ liệu theo worker sẵn có.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [ ] Đặc tả testcase và test offline.
- [ ] `uv run --project apps/api python -m unittest discover -s scripts/tests -v`.
- [ ] Kiểm tra cú pháp script và đối chiếu SQL / API.
- [ ] `uv run --project apps/api python scripts/notes_index.py --check`.
- [ ] Xác minh tích hợp nếu môi trường cho phép, báo rõ nếu không chạy.

---

## 6. Rủi ro khi làm
USGS, DB, artifact không sẵn sàng; worker có thể chạy vòng lặp. Cần thông báo, kiểm tra lỗi và không giả lập dữ liệu.

---

## 7. Rollback
Khôi phục bằng revert sau khi commit, nếu được người dùng cho phép; không xóa file tự ý.

---

## 8. Ghi chú
Giữ nhánh làm việc hiện tại theo yêu cầu người dùng, không chuyển nhánh khi đang có file chưa theo dõi.
