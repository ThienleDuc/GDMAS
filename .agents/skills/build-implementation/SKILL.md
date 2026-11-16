---
name: build-implementation
description: >-
  Pha 4 của agent workflow GDMAS (docs/agent-workflow.md) — kiểm tra proposal §9 Decision: Approved
  (bất kỳ thành viên nào trong .agents/team.md duyệt đều hợp lệ, không cần ThienleDuc), gọi review-pr
  Phần A rẽ nhánh, ĐỒNG THỜI sinh cả .agents/notes/implemented/<id>/{plan.md,status.md} VÀ
  .agents/notes/testcase/<id>.md (phối hợp skill write-testcase), code theo RULE-03 & I1-I7,
  hoàn thiện unit/integration test offline, chạy validation nhẹ, đặt `Status: validation` rồi
  TỰ ĐỘNG chuyển giao sang review-pr Phần B đẩy PR (cho phép merge khi kiểm tra không xung đột, không bắt buộc riêng ThienleDuc).
---

# build-implementation

Nối giữa `write-proposal` (chờ thành viên xác nhận §9), `write-testcase` (sinh đồng thời đặc tả & unit test) và `review-pr` (nhánh/commit/push/PR).

## Điều kiện tiên quyết (kiểm trước mọi thứ)

1. Tìm proposal `.agents/notes/proposed/<id>.md`.
2. Đọc `## 9. Human Review`:
   - Phải có `Decision: Approved`, `Reviewer:` (bất kỳ handle hợp lệ nào trong [.agents/team.md](../../../.agents/team.md) — **không cần `ThienleDuc`**) và `Review Date:`.
   - Nếu đang là `Pending`, `Changes Requested`, `Rejected` hoặc thiếu `Reviewer:`: **DỪNG và hỏi xác nhận**.
   - Nếu người dùng vừa xác nhận rõ ràng trong chat cho đúng proposal này ("duyệt", "approved", "làm đi"), cập nhật `Status: approved` và §9 (`Decision: Approved`, `Reviewer: <handle>`, `Review Date: <hôm nay>`, ghi chỉ thị vào `Comments:`).
3. Nếu `.agents/notes/implemented/<id>/` đã có: đang **làm tiếp** — đọc `plan.md`, `status.md` và `.agents/notes/testcase/<id>.md` (nếu có), tiếp tục từ trạng thái hiện có, không ghi đè.
4. Grep `.agents/notes/bugs/` theo vùng đụng tới; có bug `critical` đang mở thì dừng báo người dùng ngay.

## Quy tắc tương tác khi thực thi

- **Tự động bỏ qua câu hỏi đồng ý đối với file/folder sửa đổi hoặc thêm mới:** Khi proposal đã `Approved` (§9), tự động tạo/sửa `plan.md`, `status.md`, `testcase/<id>.md`, mã nguồn và bộ file test bắt buộc liền mạch, **không dừng hỏi xác nhận từng file/folder**.
- **Gom hỏi cuối phiên cho trường hợp nguy hiểm:** Nếu một bước đòi hỏi **xóa file, xóa folder (`rm` / `git status: D`)** hoặc phát sinh **conflict** ngoài kế hoạch, **không tự ý xóa** — bỏ qua thao tác nguy hiểm đó, hoàn thành các phần thêm/sửa an toàn trước rồi **tổng hợp mọi câu hỏi nguy hiểm thành 1 danh sách duy nhất ở cuối phiên**.

## Các bước

1. **ĐỒNG THỜI sinh Implement (`plan.md`, `status.md`) VÀ Testcase (`.agents/notes/testcase/<id>.md`):**
   - Trong `.agents/notes/implemented/<id>/`, tạo từ [.agents/notes/implemented/_TEMPLATE/](../../../.agents/notes/implemented/_TEMPLATE/plan.md):
     - `plan.md`: `Approved By`/`Approved At` lấy từ §9; `In Scope` **phải liệt kê cả tệp code nguồn, `.agents/notes/testcase/<id>.md` VÀ tệp test tự động** (`apps/api/tests/.../test_*.py` / `scripts/tests/...` / FE test).
     - `status.md`: `Status: planned`, `Started: <hôm nay>`, `Owner: <handle>`.
   - Đồng thời kích hoạt **Luồng 1 của [`write-testcase`](../write-testcase/SKILL.md)**: tạo `.agents/notes/testcase/<id>.md` từ [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md) (`Mode: proposal-paired`, `Proposal: .agents/notes/proposed/<id>.md`) chứa sẵn ma trận kịch bản test.
   - Chạy `python3 scripts/notes_index.py --check`.

2. **Tạo nhánh trước khi sửa file mã nguồn (Phần A của `review-pr`):**
   - Chạy `./scripts/git-ship.sh start <type>/<id>` (vd. `feat/2026-11-11-trend-resample-api-son`).
   - Không bao giờ sửa code trực tiếp trên `develop` hay `main`.

3. **Triển khai mã nguồn** theo `plan.md`, tuân thủ [AGENTS.md](../../../AGENTS.md), [docs/coding-rules.md](../../../docs/coding-rules.md) (I1–I7) và [docs/quyuocchung.md](../../../docs/quyuocchung.md) (**RULE-03 Open-Closed**):
   - **I1 (7 Terminals):** Worker chạy qua `apps/api/src/gdmas/services/<service>/runner.py`, cấm nhúng vòng lặp vào `main.py`.
   - **I2 (OCP):** Không xóa tệp cũ, không làm vỡ chữ ký hàm cũ đang dùng; mở rộng bằng file/route/component mới.
   - **I3 (Contracts, UTC & WGS84):** Kiểm tra `contracts/` & `docs/api/API.md`; mọi timestamp UTC ISO 8601 (`Z`), tọa độ WGS84.
   - **I4 (Migrations):** Thay đổi schema DB phải tạo Alembic migration mới, không sửa migration cũ.
   - **I5 (6 Patterns & UI):** Biểu đồ mới đặt trong `apps/web/src/components/charts/`, giữ Dark Mode và Loading/Error/Empty state.

4. **Giữ `status.md` sống:**
   - Cập nhật `planned → in_progress ⇄ blocked → validation`.
   - Ghi ngay `Deviations From Plan` và `Decisions Made During Implementation` khi phát sinh sai lệch.

5. **Hoàn thiện mã test thực thi & cập nhật `.agents/notes/testcase/<id>.md`:**
   - Với mọi task có code/logic/API/UI/script *(trừ task chỉ sửa chữ trong docs không có logic)*:
     - Hoàn thiện tệp test tự động chạy **offline 100% (I7)**: `apps/api/tests/unit|integration/test_<slug>.py` (hoặc `scripts/tests/test_<slug>.py`, FE test) theo kịch bản đã thiết kế ở `.agents/notes/testcase/<id>.md`.
     - Chạy test thật và ghi kết quả quan sát thật vào `.agents/notes/testcase/<id>.md` (`Status: passed`, hoặc `failed_with_bugs` + log vào `.agents/notes/bugs/` nếu phát hiện lỗi chưa xử lý).

6. **Validation nhẹ & Kiểm tra an toàn OCP:**
   - Backend (nếu đụng `apps/api/`): `cd apps/api && uv run pytest <tệp_test_liên_quan_và_mới_tạo>` (chạy toàn bộ `uv run pytest` nếu diff rộng đụng `contracts/**`, `alembic/**`, `core/**`, `db/**`, `main.py`, `docker-compose.yml`, `.env.example`) + `uv run ruff check . && uv run ruff format --check .`.
   - Frontend (nếu đụng `apps/web/`): `cd apps/web && pnpm build`.
   - Scripts/Workflow: `python3 -m unittest discover -s scripts/tests -v`.
   - Notes: `python3 scripts/notes_index.py --check`.
   - Kiểm nhanh OCP working tree: `git status --porcelain` xác nhận không có xóa file (`D`) ngoài ý muốn và không sửa trái phép tệp lõi.
   - Cập nhật tài liệu trong `Architecture Impact`.

7. **Đặt `Status: validation` và TỰ ĐỘNG chuyển giao sang `review-pr` (Phần B):**
   - Đặt `Status: validation` trong `status.md` (chỉ đặt `completed` sau khi đã kiểm tra không xung đột và merge PR vào `develop`).
   - Xuất báo cáo theo Agent Output Contract ([docs/agent-workflow.md](../../../docs/agent-workflow.md) §6, gồm mục `Test Files Created`).
   - Chạy ngay **Phần B của skill `review-pr`** (`scope` → `project-review` → commit → `update` → `push` → tạo PR; khi người dùng yêu cầu merge hoặc nhánh không xung đột thì có thể gọi `./scripts/git-ship.sh merge`), trừ khi người dùng chủ động bảo dừng giữ ở working tree.

## Skill này không làm

Không tự viết proposal mới thay `write-proposal`, không tự ý xóa/di chuyển note, không merge khi còn xung đột (`CONFLICT`).
