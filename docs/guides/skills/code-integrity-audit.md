# Thẩm Định An Toàn Mã Nguồn & Kiểm Soát Kiến Trúc (`project-review`)

Trong mô hình **5 skill cốt lõi** (`.agents/skills/`), mọi lớp kiểm soát an toàn working tree (`OCP`, cấm xóa tệp trái phép, bảo vệ tệp lõi, kiểm soát Churn) và thẩm định kiến trúc chuyên sâu (**7 Bất biến I1–I7**, kiểm tra **`.agents/notes/testcase/` & mã test offline**, log bug vào **`.agents/notes/bugs/`**, phát hiện **Drift** và **Scope Creep**) đã được hợp nhất vào kỹ năng duy nhất: **[`project-review`](../../../.agents/skills/project-review/SKILL.md)**.

---

## 🛡️ 1. Kiểm Soát Working Tree & Nguyên Tắc Open-Closed (OCP)

Khi chạy `project-review`, Agent tự động quét:
1. **Cấm tự ý xóa tệp (`git status: D`):** Không cho phép xóa tệp code, test hay tài liệu hiện có trừ khi được phép rõ ràng trong `plan.md` hoặc người dùng xác nhận từ **danh sách câu hỏi cuối phiên**.
2. **Bảo vệ tệp lõi (`Core Protected Files`):**
   - `apps/api/src/gdmas/main.py` (cấm nhúng worker ngầm — I1)
   - `apps/api/src/gdmas/db/connection.py` & `base.py`
   - `apps/api/alembic/versions/*` (cấm sửa migration cũ — I4)
   - `contracts/` (hợp đồng API–Web — I3)
   - `AGENTS.md`, `docs/coding-rules.md`, `docs/quyuocchung.md`
3. **Tỷ lệ Churn (`git diff --shortstat`):** Nếu `deletions > insertions` trên mã nguồn đang ổn định → cảnh báo `WARNING` và rà soát lý do OCP.

---

## 🏛️ 2. Thẩm Định 7 Bất Biến Kiến Trúc (Invariants I1–I7)

Bản đầy đủ kèm dấu hiệu vi phạm xem tại [docs/coding-rules.md](../../coding-rules.md):

| Mã | Tên Bất Biến | Trọng tâm kiểm tra |
|---|---|---|
| **I1** | Tách biệt 7 Terminals | `main.py` chỉ phục vụ REST/SSE; worker chạy qua `runner.py` riêng (`CRITICAL BUG` nếu vi phạm) |
| **I2** | Open-Closed (`RULE-03`) | Không xóa file, không phá chữ ký hàm cũ |
| **I3** | Hợp đồng, UTC & WGS84 | Khớp `contracts/` & `docs/api/API.md`; UTC ISO 8601 (`Z`), tọa độ WGS84 |
| **I4** | Bất biến Alembic Migration | Cấm sửa file migration đã có (`CRITICAL BUG` nếu vi phạm) |
| **I5** | 6 Patterns & Dark Mode UI | Chart mới đặt tại `components/charts/`, không mock tĩnh, đủ Loading/Error/Empty state |
| **I6** | Bảo mật & Secrets | Cấm stage/log `.env`, key, password (`CRITICAL BUG` nếu vi phạm) |
| **I7** | Toàn vẹn & Tạo testcase + unit test bắt buộc | Bảo toàn test cũ; **bắt buộc có `.agents/notes/testcase/<id>.md` (từ `.agents/notes/testcase/_TEMPLATE.md`) + file unit test offline**; nếu `single-file-test` phát hiện lỗi, bắt buộc có `BUG-<handle>-NNN` trong `.agents/notes/bugs/` |

---

## 🔍 3. Kiểm Tra Quyết Định Cũ, Drift & Scope Creep

1. **Nhất quán quyết định:** Chạy `python3 scripts/notes_index.py --check` (`--testcases`, `--bugs`) và grep `.agents/notes/proposed/` + `implemented/` để không lặp lại phương án bị bác trong `Scope of Rejection`.
2. **Độ lệch tài liệu (`Drift`):** Đối chiếu mục `Architecture Impact` trong proposal với các tệp docs/contract đã cập nhật trong diff.
3. **Lan phạm vi (`Scope Creep`):** Đối chiếu diff thực tế với `plan.md` §2 `In Scope` / `Out of Scope` (hoặc `Test File:` + `.agents/notes/bugs/` khi ở nhánh `test/<id>`) qua `./scripts/git-ship.sh scope`.

---

## 🚫 Ranh Giới & Gom Câu Hỏi Cuối Phiên

`project-review` xuất báo cáo thẩm định (`PASS` / `WARNING` / `VIOLATION`), chặn merge nếu còn **xung đột (`CONFLICT`)** hoặc vi phạm `CRITICAL BUG` / thiếu testcase, và đề xuất tạo `BUG-<handle>-NNN` nếu phát hiện lỗi nặng. Khi mọi kiểm tra sạch và **0 conflict**, bất kỳ thành viên nào cũng có thể merge PR (không bắt buộc riêng `ThienleDuc`). Khi gặp vi phạm liên quan đến **xóa file/folder** hoặc **conflict**, `project-review` ghi nhận vào mục câu hỏi để tổng hợp **1 lần duy nhất cuối phiên** cho người dùng quyết định.
