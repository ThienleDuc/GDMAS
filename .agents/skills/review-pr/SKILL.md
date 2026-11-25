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

## Khi nào chạy: theo trạng thái công việc + 2 checkpoint

**A. Bắt đầu việc có sửa file (Spec-Driven, kiểm thử 1 file `test/*`, hoặc sửa nhỏ Fast-Track):**
Ngay khi nhận việc sửa code/test/docs/config (trước khi chỉnh sửa tệp đầu tiên), chạy bước 1–2 (`start`).
*(Nếu chỉ đọc/hỏi đáp hoặc chạy `write-proposal` chưa sửa code thì chưa cần rẽ nhánh.)*

**B1. Sau validation — chỉ khi CHECKPOINT 1 đã được xác nhận:**
- `build-implementation` đã đặt `Status: validation` và **dừng CHECKPOINT 1**. Agent chỉ chạy bước 3–10 khi người dùng chọn `tiếp tục workflow` (commit + push + tạo PR). Chưa xác nhận → giữ working tree, không commit/push.
- Áp dụng cho cả 3 luồng: Spec-Driven, `test/<id>`, Fast-Track (sửa xong + kiểm tra xong thì dừng CHECKPOINT 1 rồi mới vào B1).
- Trong B1 tự động làm liền mạch các thao tác kỹ thuật (scope, project-review, commit, update, push, PR, dry-run) mà không hỏi từng lệnh.

**CHECKPOINT 2 — sau bước 10, trước merge:**
- Dừng lại, báo link PR + kết quả `merge --dry-run` (0 conflict) + **1 câu hỏi duy nhất**: (a) `tiếp tục workflow` → gửi yêu cầu merge / merge PR vào `develop` + `sync` + `completed`; (b) `dừng lại` → giữ PR mở, chưa merge.
- Lý do: mỗi commit là một thay đổi nhỏ, người dùng chưa chắc công việc hoàn thành. Không merge khi chưa có xác nhận ở checkpoint này.
- In rõ tên checkpoint + cụm khởi động **`tiếp tục workflow`** (chấp nhận `continue workflow`) để người dùng copy.

**B2. Sau CHECKPOINT 2 được xác nhận:** chạy bước 11 (merge → `sync` → `status.md` completed, kể cả nhánh `chore/<id>-completed` nếu cần ghi SHA).

- Conflict/Xóa file: nếu gặp **xóa file/folder** hoặc **conflict nguy hiểm**, hoàn tất phần an toàn trước rồi gom hỏi 1 lần ở cuối phiên. Dừng cứng Conflict-Free Gate vẫn áp dụng trước khi merge.

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

10. **Push & Kiểm tra sẵn sàng Merge (kết thúc B1):** `./scripts/git-ship.sh push` và chạy `./scripts/git-ship.sh merge --dry-run` để xác nhận **0 conflict**.

10b. **CHECKPOINT 2 — DỪNG trước merge:**
    - Báo: nhánh đã push, link PR, kết quả dry-run (0 conflict), Implementation Report.
    - Hỏi 1 câu duy nhất: (a) `tiếp tục workflow` → gửi yêu cầu merge / merge PR vào `develop`; (b) `dừng lại` → giữ PR mở.
    - In rõ cụm khởi động **`tiếp tục workflow`**. **Không** gọi `./scripts/git-ship.sh merge` / `gh pr merge` khi chưa có xác nhận.

11. **Báo cáo ngắn gọn (sau khi CHECKPOINT 2 xác nhận — B2):**
    ```text
    CHECKPOINT 2 — đã xác nhận. Đang merge PR vào develop.
    Đã push nhánh <nhánh> (<N> commit). PR: <link PR>.
    Sau merge: ./scripts/git-ship.sh sync → status.md completed (<SHA merge>).
    <Implementation Report>
    ```

## Đồng bộ sau Merge

- **Khi có góp ý sửa trên PR:** Người dùng dán comment → sửa bằng **commit mới** (không amend/rebase commit đã push) → `./scripts/git-ship.sh update` → `./scripts/git-ship.sh push`.
- **Khi cần kiểm tra không xung đột & merge (chỉ sau CHECKPOINT 2 xác nhận):** chạy `./scripts/git-ship.sh merge` (tự chạy `notes_index.py --check` + `git merge-tree --write-tree` / PR `mergeable` check — nếu `CONFLICT` thì chặn cứng; nếu **0 conflict** thì thực hiện merge). Trước checkpoint này chỉ chạy `merge --dry-run`.
- **Sau khi đã merge:** chạy `./scripts/git-ship.sh sync` quay về `develop` mới nhất và dọn nhánh local đã merge. Đánh dấu `status.md` → `completed` qua nhánh nhỏ `chore/<id>-completed` nếu cần ghi SHA merge.

## Dừng cứng: KHÔNG BAO GIỜ

- **KHÔNG merge khi còn xung đột (`CONFLICT`)**, hoặc bỏ qua kiểm tra `git merge-tree` / `notes_index.py --check`.
- Không `git push --force` / `--force-with-lease`, không push raw trực tiếp lên `develop`/`main` bỏ qua PR/conflict-check, không `--no-verify`, không tắt `core.hooksPath`, không `git reset --hard` / `clean -f` / `branch -D`.
- Không sửa `AGENTS.md`, `contracts/`, migration Alembic cũ như tác dụng phụ.
