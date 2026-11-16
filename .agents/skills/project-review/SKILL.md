---
name: project-review
description: >-
  Lớp thẩm định kiến trúc và bảo vệ mã nguồn duy nhất của GDMAS (tích hợp OCP/Churn audit +
  7 Bất biến I1-I7 + kiểm tra file test sau hoàn thành + drift tài liệu + scope creep).
  Chạy sau review chung hoặc được review-pr tự động gọi trước khi commit/push/merge.
  Bảo đảm không xung đột và đạt I1-I7 trước khi bất kỳ thành viên nào merge PR (không bắt buộc riêng @ThienleDuc).
---

# project-review (Thẩm định kiến trúc & Bảo vệ mã nguồn GDMAS)

Chạy review chung trước, sau đó thực hiện đủ 5 lớp kiểm tra trên diff (`origin/develop...HEAD` + working tree).

**Nguồn spec:** `python3 scripts/notes_index.py` (cách dùng tại [.agents/notes/README.md](../../../.agents/notes/README.md)):
`.agents/notes/proposed/<id>.md`, `.agents/notes/implemented/<id>/{plan.md,status.md}` và `.agents/notes/testcase/<id>.md`.

## 5 Kiểm tra bắt buộc

1. **Nhất quán quyết định:**
   - Grep `.agents/notes/proposed/` và `.agents/notes/implemented/` theo module bị đụng.
   - Báo nếu diff mâu thuẫn quyết định đã duyệt mà không có `Overrides:`, hoặc lặp lại phương án bị bác
     **trong đúng `Scope of Rejection`** mà chưa giải trình.

2. **Thanh tra Working Tree, Open-Closed (`RULE-03`) & Churn (tích hợp từ `source-guard`):**
   - **Cấm xóa tệp (`git status: D`):** Phát hiện bất kỳ tệp mã nguồn, docs hoặc test nào bị xóa mà không nằm trong danh sách cho phép rõ ràng → **`VIOLATION`**.
   - **Bảo vệ tệp lõi (`Core Protected Files`):** Kiểm tra `apps/api/src/gdmas/main.py`, `db/connection.py`, `db/base.py`, `alembic/versions/*`, `contracts/`, `AGENTS.md`, `docs/coding-rules.md`, `docs/quyuocchung.md`. Sửa tệp lõi ngoài phạm vi chỉ định hoặc phá vỡ chữ ký hàm cũ → **`VIOLATION` / `WARNING`**.
   - **Tỷ lệ Churn:** Chạy `git diff --shortstat` — nếu `deletions > insertions` trên mã nguồn đang ổn định → cảnh báo **`WARNING`** và yêu cầu giải trình OCP.

3. **7 Bất biến kiến trúc cứng (I1–I7)** ([AGENTS.md](../../../AGENTS.md) + [docs/coding-rules.md](../../../docs/coding-rules.md)):
   - **I1 (7 Terminals):** `main.py` thuần REST/SSE; worker chạy qua `runner.py` độc lập → Vi phạm là **`CRITICAL BUG`**.
   - **I2 (OCP):** Không phá vỡ module/hàm đang dùng.
   - **I3 (Contracts, UTC & WGS84):** Khớp `contracts/` & `docs/api/API.md`; timestamp UTC ISO 8601 (`Z`), tọa độ WGS84 (`latitude`, `longitude`).
   - **I4 (Alembic Migration):** Cấm sửa migration cũ trong `apps/api/alembic/versions/` → Vi phạm là **`CRITICAL BUG`**.
   - **I5 (6 Patterns & Dark Mode):** Chart mới trong `apps/web/src/components/charts/`; không mock tĩnh thay API thật ở view chính; đủ Loading/Error/Empty state (Demo §4).
   - **I6 (Secrets & `.env`):** Cấm `.env`, key, password bị stage, hardcode hoặc log ra ngoài → Vi phạm là **`CRITICAL BUG`**.
   - **I7 (Toàn vẹn & Bắt buộc có testcase + file test):**
     - Không xóa/skip test cũ đang pass.
     - **Kiểm tra hậu triển khai / kiểm thử:** với task có code/logic/API/UI/script (hoặc luồng kiểm thử 1 file `test/*`), xác nhận diff **đã tạo cả đặc tả testcase `.agents/notes/testcase/<id>.md` (từ [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md)) VÀ mã test tự động chạy offline (`apps/api/tests/.../test_*.py`, `scripts/tests/...`, hoặc FE test)**. Nếu test phát hiện bug ở luồng `single-file-test`, xác nhận đã ghi `BUG-<handle>-NNN` vào `.agents/notes/bugs/`. Thiếu testcase/file test → **`VIOLATION`**.

4. **Drift tài liệu / contract:**
   - Đọc `Architecture Impact` của proposal; xác nhận diff đã cập nhật đủ các tài liệu tương ứng.
   - Ghi `none` mà diff thay đổi API route, payload, bảng DB, `.env.example` hoặc cây thư mục → báo **Documentation Drift**.

5. **Lan phạm vi (Scope Creep):**
   - So sánh diff với `plan.md` §2 `In Scope` / `Out of Scope` (và `Deviations From Plan` trong `status.md`).
   - Báo mọi tệp ngoài phạm vi chưa giải trình.

Finding nghiêm trọng cần theo dõi dài hạn: đề xuất ghi `BUG-<handle>-NNN` theo [.agents/notes/bugs/README.md](../../../.agents/notes/bugs/README.md).

## Ranh giới

- Chặn merge nếu còn **xung đột Git (`CONFLICT`)**, vi phạm `CRITICAL BUG` hoặc thiếu testcase/file test; khi mọi kiểm tra sạch và **0 conflict**, bất kỳ thành viên nào cũng có thể merge PR (không bắt buộc riêng `ThienleDuc`).
- Xuất báo cáo finding (bảng 7 Invariants + OCP/Churn + Test Coverage + Scope + Drift); chỉ sửa code khi được yêu cầu hoặc trước bước commit trong `review-pr`.
