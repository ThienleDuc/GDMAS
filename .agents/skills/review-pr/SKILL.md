---
name: review-pr
description: >-
  Skill Git tự động duy nhất của GDMAS (docs/git-workflow.md) — tự lo toàn bộ vòng đời nhánh,
  scope check, gọi project-review, tổng hợp Conventional Commit tiếng Việt (kèm bảng Type/Scope),
  merge-forward develop, push, kiểm tra không xung đột và merge PR qua ./scripts/git-ship.sh và .githooks/.
  Phục vụ Spec-Driven, Fast-Track (<= 1 file) và kiểm thử 1 file (test/<id>).
  Không bắt buộc riêng ThienleDuc để merge — chỉ cần kiểm tra 0 conflict và checks đạt chuẩn là được merge.
---

# review-pr

Thành viên (`thien`, `son`, `van`, `tai`) không cần nhớ lệnh Git. Skill này hợp nhất toàn bộ tự động hóa nhánh/commit/PR/merge
qua `./scripts/git-ship.sh` và `.githooks/`.

- **Remote:** GitHub `https://github.com/ThienleDuc/GDMAS.git`
- **Nhánh tích hợp:** `develop` (PR luôn nhắm vào `develop`; `main` dành cho release / `hotfix/*`)
- **Điều kiện Merge (Conflict-Free Gate):** **Không bắt buộc riêng `ThienleDuc`** — bất kỳ thành viên nào (hoặc `./scripts/git-ship.sh merge` khi được yêu cầu) đều được phép merge PR khi **đã kiểm tra không có xung đột (`0 conflicts`)**, `notes_index.py --check` và validation đạt chuẩn!

## Khi nào chạy: tự động theo trạng thái công việc

**A. Bắt đầu việc có sửa file (Spec-Driven, kiểm thử 1 file `test/*`, hoặc sửa nhỏ Fast-Track):**
Ngay khi nhận việc sửa code/test/docs/config (trước khi chỉnh sửa tệp đầu tiên), chạy bước 1–2 (`start`).
*(Nếu chỉ đọc/hỏi đáp hoặc chạy `write-proposal` chưa sửa code thì chưa cần rẽ nhánh.)*

**B. Kết thúc việc (tự động ngay sau khi qua validation):**
- Tự động thực hiện liền mạch toàn bộ thao tác **sửa/thêm file, commit, push PR** mà **không hỏi xác nhận lặp lại từng bước** để người dùng không phải bấm submit nhiều lần.
- **Luồng Spec-Driven:** Chạy bước 3–11 ngay khi `build-implementation` + `write-testcase` đã tạo đủ `implemented/<id>/`, `testcase/<id>.md`, unit test offline, pass validation và đặt `status.md` → `Status: validation`.
- **Luồng kiểm thử 1 file (`write-testcase` nhánh `test/<id>`):** Chạy bước 3–11 ngay sau khi chạy xong unit test và (nếu có lỗi) đã ghi nhận vào `.agents/notes/bugs/`.
- **Luồng sửa nhỏ / tài liệu (≤ 1 dòng hoặc ≤ 1 file không cần proposal):** Chạy bước 3–11 ngay khi sửa xong và kiểm tra xong.
- Nếu người dùng chủ động bảo *"giữ lại ở working tree, đừng commit/push"*: dừng ở local. Nếu gặp **xóa file/folder** hoặc **conflict nguy hiểm**, hoàn tất các phần an toàn trước rồi gom hỏi 1 lần ở cuối phiên.

## Các bước

1. **Hiện trạng:** `./scripts/git-ship.sh status`.
2. **Tạo / chuyển nhánh an toàn (Phần A):**
   - Xác định `<type>`: `feat | fix | docs | refactor | test | chore | hotfix`.
   - Xác định `<id>`: lấy từ proposal/plan (`yyyy-mm-dd-<slug>-<handle>`). Nếu là sửa nhỏ không có proposal, tự sinh `<slug>` bằng Slug Engine (tiếng Việt không dấu chữ thường, bỏ stop-words, 2–4 từ khóa) + `<handle>` từ `./scripts/git-ship.sh me` → `yyyy-mm-dd-<slug>-<handle>`.
   - Nhánh cơ sở: `develop` (riêng `hotfix/*` tách từ `main`).
   - Nếu đang ở `develop`/`main`, chạy `./scripts/git-ship.sh start <type>/<id>` (thay đổi chưa commit được mang theo sang nhánh mới). Không bao giờ commit lên `develop`/`main`.
   *(Hết Phần A — Phần B bắt đầu từ bước 3.)*

3. **Scope check & Secret Guard:**
   - Chạy `./scripts/git-ship.sh scope <id>` đối chiếu `plan.md` §2 `In Scope` (dừng cứng `SCOPE MISMATCH` nếu lệch).
   - Loại bỏ mọi tệp nhạy cảm/cục bộ khỏi staging nếu lỡ chạm:
     ```bash
     git restore --staged .env apps/web/.env apps/api/.env .agents/me .claude/me .artifacts/ 2>/dev/null || true
     ```

4. **Kiểm tra testcase & validation:**
   - Với task có code/logic hoặc luồng kiểm thử 1 file: xác nhận đã có đặc tả `.agents/notes/testcase/<id>.md` (từ [.agents/notes/testcase/_TEMPLATE.md](../../../.agents/notes/testcase/_TEMPLATE.md)) + tệp unit/integration test tự động (offline); nếu ở luồng kiểm thử 1 file và test phát hiện lỗi, xác nhận đã ghi `BUG-<handle>-NNN` vào `.agents/notes/bugs/`.
   - Xác nhận `python3 scripts/notes_index.py --check` pass (`exit 0`).

5. **Tự thẩm định (`project-review`):**
   - Chạy toàn bộ 5 kiểm tra của skill `project-review` (Quyết định cũ, OCP/Churn, 7 Invariants I1–I7 + Test File, Drift, Scope) trên base `origin/develop`. Xử lý finding `CRITICAL` / `VIOLATION` trước khi commit.

6. **Cập nhật `status.md` & kiểm tra notes:**
   - Trong `status.md`: giữ `Status: validation` (chưa đặt `completed`), cập nhật bảng Validation và `## Last Update`.
   - Chạy `python3 scripts/notes_index.py --check`.

7. **Tổng hợp Conventional Commit tiếng Việt & Stage tường minh:**
   - Ánh xạ tệp thay đổi theo bảng chuẩn GDMAS để chọn `<type>(<scope>)`:

     | Đường dẫn tệp thay đổi | `type` | `scope` |
     |---|---|---|
     | `apps/web/src/components/charts/*` hoặc `apps/web/*` | `feat` / `fix` | `web` |
     | `apps/api/src/gdmas/services/ingestion/*` | `feat` / `fix` | `ingestion` |
     | `apps/api/src/gdmas/services/analysis/*` | `feat` / `fix` | `analysis` |
     | `apps/api/src/gdmas/services/clustering/*` | `feat` / `fix` | `clustering` |
     | `apps/api/src/gdmas/services/prediction/*` | `feat` / `fix` | `prediction` |
     | `apps/api/src/gdmas/realtime/*` hoặc `routes/stream.py` | `feat` / `fix` | `realtime` |
     | `apps/api/src/gdmas/api/routes/patterns.py` | `feat` / `fix` | `patterns` |
     | `apps/api/src/gdmas/db/*` hoặc `alembic/*` | `feat` / `fix` | `db` |
     | `apps/api/*` tổng quát | `feat` / `fix` | `api` |
     | `contracts/*` | `chore` | `contracts` |
     | `apps/api/tests/*` hoặc `scripts/tests/*` | `test` | `testing` |
     | `.agents/notes/testcase/*` | `test` | `testing` |
     | `docs/*` | `docs` | `core` / `architecture` / `setup` |
     | `.agents/*`, `.claude/*`, `AGENTS.md`, `CLAUDE.md` | `chore` | `agents` |
     | `scripts/*`, `.githooks/*`, `.github/*` | `chore` | `scripts` |

   - Định dạng bắt buộc (ép bởi `.githooks/commit-msg`):
     ```text
     <type>(<scope>): <động từ tiếng Việt chữ thường <= 72 ký tự, không chấm cuối> (<id>)

     - <Gạch đầu dòng 1: thay đổi kỹ thuật chính>
     - <Gạch đầu dòng 2: tệp test đã bổ sung & kết quả chạy>
     - <Gạch đầu dòng 3: tuân thủ OCP / 7 Invariants>
     ```
     *(Thêm `BUG-<handle>-NNN` nếu sửa bug. Không truyền `<id>` nếu commit sửa nhỏ Fast-Track không có proposal.)*
   - Stage tường minh từng đường dẫn (`git add <paths...>`, **không `git add .` / `git add -A`**, không stage `template/` nếu chỉ là thư mục tham khảo). Nếu hook báo lỗi, sửa gốc — **không `--no-verify`**.

8. **Merge-forward `develop`:** `./scripts/git-ship.sh update` (`git merge --no-edit origin/develop`, không rebase).
   - Conflict ở file thường: giải, chạy lại test/validation cho phần ảnh hưởng, `git add`, `git commit --no-edit`.
   - Conflict chạm `contracts/`, `AGENTS.md`, `apps/api/alembic/versions/`, `docs/quyuocchung.md` hoặc đổi cùng logic ngữ nghĩa: **DỪNG và đưa vào danh sách câu hỏi cuối phiên để nhóm quyết định**.

9. **Soạn mô tả PR:** lấy mẫu từ [.github/pull_request_template.md](../../../.github/pull_request_template.md), điền đầy đủ `Implementation Report` + `Test Files Created` + checklist, lưu vào `.artifacts/mr/<nhánh-thay-/-bằng-->.md` (gitignored).

10. **Push & Kiểm tra sẵn sàng Merge:** `./scripts/git-ship.sh push` và chạy `./scripts/git-ship.sh merge --dry-run` để xác nhận **0 conflict**.
    *(Nếu người dùng yêu cầu merge luôn hoặc luồng cho phép auto-merge khi không xung đột: chạy `./scripts/git-ship.sh merge` — không bắt buộc riêng `ThienleDuc`.)*

11. **Báo cáo ngắn gọn:**
    ```text
    Đã đẩy nhánh <nhánh> (<N> commit).
    PR nhắm vào `develop` (đã kiểm tra không xung đột — bất kỳ thành viên nào đều có thể merge): <link PR hoặc link tạo PR>
    <Implementation Report>
    ```

## Đồng bộ sau Merge

- **Khi có góp ý sửa trên PR:** Người dùng dán comment → sửa bằng **commit mới** (không amend/rebase commit đã push) → `./scripts/git-ship.sh update` → `./scripts/git-ship.sh push`.
- **Khi cần kiểm tra không xung đột & merge:** chạy `./scripts/git-ship.sh merge` (tự chạy `notes_index.py --check` + `git merge-tree --write-tree` / PR `mergeable` check — nếu `CONFLICT` thì chặn cứng; nếu **0 conflict** thì thực hiện merge).
- **Sau khi đã merge:** chạy `./scripts/git-ship.sh sync` quay về `develop` mới nhất và dọn nhánh local đã merge. Đánh dấu `status.md` → `completed` qua nhánh nhỏ `chore/<id>-completed` nếu cần ghi SHA merge.

## Dừng cứng: KHÔNG BAO GIỜ

- **KHÔNG merge khi còn xung đột (`CONFLICT`)**, hoặc bỏ qua kiểm tra `git merge-tree` / `notes_index.py --check`.
- Không `git push --force` / `--force-with-lease`, không push raw trực tiếp lên `develop`/`main` bỏ qua PR/conflict-check, không `--no-verify`, không tắt `core.hooksPath`, không `git reset --hard` / `clean -f` / `branch -D`.
- Không sửa `AGENTS.md`, `contracts/`, migration Alembic cũ như tác dụng phụ.
