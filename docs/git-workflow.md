# Git Workflow: Tự động hóa tới PR & Merge khi Không Xung Đột

Mục tiêu: mọi thành viên (`thien`, `son`, `van`, `tai`) không cần nhớ lệnh Git hay gõ thủ công commit/nhánh;
AI Agent thực thi trọn vẹn quy trình qua **`review-pr`** (`.agents/skills/review-pr/SKILL.md`), `./scripts/git-ship.sh` và `.githooks/`.
**Không bắt buộc phải là `ThienleDuc` mới được merge PR — chỉ cần kiểm tra không có xung đột (`0 conflicts`) và đạt checks là cho phép merge.**

- Remote: GitHub `https://github.com/ThienleDuc/GDMAS.git`
- Nhánh tích hợp chính: **`develop`** (mọi PR tính năng / test nhắm vào `develop`)
- Nhánh phát hành ổn định: **`main`** (chỉ nhận PR từ `develop` khi release; riêng `hotfix/*` tách từ `main`)
- Đội ngũ & handle: [.agents/team.md](../.agents/team.md)

---

## Luồng tự động hóa (Spec-Driven, Fast-Track & Kiểm thử 1 file `test/<id>`)

```text
Thành viên giao việc                   AI Agent (5 skill cốt lõi)                    GitHub / Merge Không Xung Đột
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
1. Giao task / test 1 file cụ thể  ──► review-pr (Phần A, trước khi tạo/sửa file đầu tiên):
                                         Slug Engine → <type>/<id> (vd. feat/<id> hoặc test/<id>)
                                         ./scripts/git-ship.sh start <type>/<id>  (tách từ origin/develop)
2a. Nếu Proposal Approved          ──► đồng thời tạo implemented/<id>/ + testcase/<id>.md (write-testcase)
                                       implement code + viết unit test offline + validation nhẹ
2b. Nếu test 1 file cụ thể         ──► write-testcase (Mode: single-file-test): viết unit test offline
                                       chạy test → nếu ra lỗi ghi ngay vào .agents/notes/bugs/BUG-<handle>-NNN-*.md
3. Ngay khi hoàn tất validation    ──► review-pr (Phần B):
                                         ./scripts/git-ship.sh scope <id>         (khớp In Scope / test/<id>)
                                         secret guard (gỡ .env, .agents/me, .artifacts/)
                                         project-review (OCP/Churn + I1-I7 + testcase/<id>.md + bugs/)
                                         cập nhật status.md / testcase/<id>.md & notes_index.py --check
                                         tổng hợp Conventional Commit tiếng Việt theo bảng Type/Scope
                                         ./scripts/git-ship.sh update             (merge-forward develop, không rebase)
                                         ./scripts/git-ship.sh push               (đẩy nhánh / tạo PR)
                                         ./scripts/git-ship.sh merge --dry-run    (kiểm tra 0 conflicts)
Kiểm tra 0 xung đột & merge        ─────────────────────────────────────────────────► Bất kỳ thành viên nào (hoặc ./scripts/git-ship.sh merge)
                                                                                      ├─ CÓ CONFLICT → DỪNG MERGE & giải quyết / gom hỏi cuối phiên
                                                                                      └─ 0 CONFLICT + checks OK → Cho phép Merge vào develop
Sau khi đã merge                   ──► ./scripts/git-ship.sh sync (về develop mới, dọn nhánh local đã merge)
```

---

## Quy ước đặt tên nhánh & Slug Engine tự động (hợp nhất từ `propose-branch` / `git-branch-push`)

1. **Định dạng nhánh chuẩn:**
   - Luồng Spec-Driven: `<type>/yyyy-mm-dd-<slug>-<handle>` (vd. `feat/2026-11-11-trend-resample-api-son`).
   - Luồng kiểm thử riêng 1 file (`single-file-test`): `test/yyyy-mm-dd-<slug>-<handle>` (vd. `test/2026-11-11-prediction-runner-tai`).
   - Sửa nhỏ Fast-Track (≤ 1 file, không cần proposal): `<type>/yyyy-mm-dd-<slug>-<handle>` hoặc `<type>/<scope>-<slug>`.
   - `<type>` ∈ `feat | feature | fix | bugfix | hotfix | docs | refactor | test | chore`.
   - `<handle>` lấy từ `./scripts/git-ship.sh me` (khớp `.agents/team.md`).
2. **Slug Engine tự động:**
   - Chuyển chữ thường, loại toàn bộ dấu tiếng Việt (`áàảãạâ...đ` → `a...d`), bỏ ký tự đặc biệt.
   - Lọc từ dừng (`la, va, cho, cua, tai, trong, tu, cac, nhung, mot, de, voi, the, a, an, for, to, in, on, of, and, khi, do`).
   - Cô đọng còn 2–4 từ khóa kỹ thuật nối bằng dấu `-`.
3. **Mang theo thay đổi chưa commit:** Khi đang đứng ở `develop` có file sửa dở, `./scripts/git-ship.sh start <branch>` tự động chuyển sang nhánh mới và mang toàn bộ thay đổi theo, không làm mất code.

---

## Quy chuẩn Conventional Commit tiếng Việt tự động (hợp nhất từ `generate-commit` / `git-commit-push`)

Hook `.githooks/commit-msg` bắt buộc mọi commit tuân thủ định dạng:

```text
<type>(<scope>): <động từ tiếng Việt chữ thường <= 72 ký tự, không chấm cuối> (<id>)

- <Gạch đầu dòng 1: thay đổi kỹ thuật chính>
- <Gạch đầu dòng 2: tệp test & testcase đã bổ sung, kết quả chạy (hoặc BUG đã ghi)>
- <Gạch đầu dòng 3: tuân thủ OCP / 7 Invariants>
```
*(Thêm `BUG-<handle>-NNN` nếu phát hiện hoặc sửa bug; bỏ `(<id>)` nếu là commit sửa nhỏ không có ID.)*

### Bảng ánh xạ đường dẫn → `type` & `scope`

| Đường dẫn tệp thay đổi | `type` | `scope` | Ý nghĩa tiếng Việt mẫu |
|---|---|---|---|
| `apps/web/src/components/charts/*` | `feat` / `fix` | `web` | trực quan hóa biểu đồ chuỗi thời gian địa chấn |
| `apps/web/*` | `feat` / `fix` | `web` | cập nhật giao diện người dùng và tương tác frontend |
| `apps/api/src/gdmas/services/ingestion/*` | `feat` / `fix` | `ingestion` | cập nhật tiến trình nạp dữ liệu usgs |
| `apps/api/src/gdmas/services/analysis/*` | `feat` / `fix` | `analysis` | cập nhật thuật toán phân tích chuỗi thời gian |
| `apps/api/src/gdmas/services/clustering/*` | `feat` / `fix` | `clustering` | cập nhật thuật toán gom cụm không gian |
| `apps/api/src/gdmas/services/prediction/*` | `feat` / `fix` | `prediction` | cập nhật mô hình dự báo địa chấn |
| `apps/api/src/gdmas/realtime/*`, `routes/stream.py` | `feat` / `fix` | `realtime` | cập nhật dịch vụ streaming dữ liệu sse |
| `apps/api/src/gdmas/api/routes/patterns.py` | `feat` / `fix` | `patterns` | cập nhật endpoint truy vấn 6 patterns |
| `apps/api/src/gdmas/db/*`, `alembic/*` | `feat` / `fix` | `db` | cập nhật cấu trúc cơ sở dữ liệu và migration |
| `apps/api/*` tổng quát | `feat` / `fix` | `api` | cập nhật dịch vụ backend và endpoint rest/sse |
| `contracts/*` | `chore` | `contracts` | chuẩn hóa hợp đồng dữ liệu dùng chung api-web |
| `apps/api/tests/*`, `scripts/tests/*`, `.agents/notes/testcase/*` | `test` | `testing` | bổ sung mã kiểm thử offline và biên bản testcase |
| `.agents/notes/bugs/*` | `docs` / `test` | `bugs` | ghi nhận lỗi phát hiện từ kiểm thử đơn vị |
| `docs/*` | `docs` | `core` / `architecture` / `setup` | cập nhật tài liệu kỹ thuật dự án |
| `.agents/*`, `.claude/*`, `AGENTS.md`, `CLAUDE.md` | `chore` | `agents` | chuẩn hóa quy trình và bộ nhớ quyết định agent |
| `scripts/*`, `.githooks/*`, `.github/*` | `chore` | `scripts` | cập nhật kịch bản tự động hóa và git hooks |

### Bảo vệ Staging & Chống lộ Secret

- Stage tường minh theo đường dẫn cần commit (`git add <paths...>`), **cấm `git add .` / `git add -A`**.
- Tự động chạy `git restore --staged .env apps/web/.env apps/api/.env .agents/me .claude/me .artifacts/ 2>/dev/null || true` trước khi commit.

---

## Ba lớp chốt chặn an toàn (từ mềm tới cứng)

| Lớp | Ở đâu | Bảo vệ gì | Chế độ merge |
|---|---|---|---|
| **1. Luật cho agent** | `AGENTS.md`, `review-pr`, `.claude/settings.json` | Tự động skip hỏi khi thêm/sửa file an toàn; **gom cuối phiên** xóa file/folder & conflict; chặn `--force`, `--no-verify`, `reset --hard`, `branch -D`, push raw `develop`/`main` | Cho phép `gh pr merge` / `./scripts/git-ship.sh merge` **khi kiểm tra 0 conflict** |
| **2. Hook local + `git-ship merge`** | `.githooks/` (`pre-commit`, `commit-msg`, `pre-push`) + `scripts/git-ship.sh` | Chặn commit trực tiếp trên `develop`/`main`, stage `.env`/key, secret, conflict marker, sai Conventional Commit, push raw `develop`/`main`, `notes_index.py --check` lỗi | `./scripts/git-ship.sh merge` chạy `git merge-tree --write-tree` + kiểm PR `CONFLICTING`; **0 conflict → cho merge** |
| **3. GitHub Branch Protection / Ruleset** | Cài trên GitHub Settings (bên dưới) | Chặn force-push, chặn xóa nhánh, **bắt buộc status checks & không xung đột (Up to date / no merge conflicts)** trước khi merge | **Không khóa Code Owners cho riêng `ThienleDuc`** — mọi thành viên có quyền ghi đều merge được khi không xung đột |

---

## Cài đặt GitHub Repository Settings (Cho phép Merge Khi Không Xung Đột)

Để bảo đảm an toàn ở tầng server mà không cần chờ duy nhất một người:

1. Vào **GitHub → `ThienleDuc/GDMAS` → Settings → Rules → Rulesets** (hoặc **Branches → Branch protection rules**) cho **`develop`** và **`main`**:
   - Bật **Restrict deletions** & **Block force pushes**.
   - Khuyến nghị bật **Require status checks to pass before merging** / **Require branches to be up to date before merging** để chặn merge khi có xung đột.
   - **Tắt** (hoặc đặt Required approvals = **0**, tắt **Require review from Code Owners**) trên `develop` để không bắt buộc riêng `ThienleDuc` mới merge được PR — bất kỳ thành viên nào cũng có thể bấm Merge hoặc chạy `./scripts/git-ship.sh merge` khi GitHub báo **No conflicts with base branch**.
2. Vào **Settings → General → Pull Requests**:
   - Bật **Automatically delete head branches** sau khi merge.

---

## Khi PR bị conflict: Merge-forward (KHÔNG Rebase sau khi push)

- **Dùng `./scripts/git-ship.sh update`** (`git merge --no-edit origin/develop`, **không rebase**).
- Lý do: không cần `--force` / `--force-with-lease`, giữ nguyên vị trí comment review trên GitHub PR, an toàn cho thành viên.
- Nếu gặp conflict:
  1. File code/docs thông thường khác dòng nhau rõ ràng: agent giải conflict nếu an toàn, chạy lại test/validation cho phần bị ảnh hưởng, commit merge và push.
  2. Xung đột đụng `contracts/`, `AGENTS.md`, `apps/api/alembic/versions/`, `docs/quyuocchung.md`, hoặc hai bên đổi cùng logic ngữ nghĩa: **không tự ép ghi đè và KHÔNG merge — tạm bỏ qua phần conflict, hoàn tất các bước an toàn khác rồi gom thành câu hỏi ở cuối phiên cho nhóm quyết định**.

---

## Cách kiểm tra và merge PR

1. Đọc **Implementation Report** trong mô tả PR (`Changed`, `Scope`, `Tests`, `Test Files Created`, `Bugs`, `Contracts`, `Risks`).
2. Kiểm tra nhanh bằng `project-review` và lệnh kiểm tra xung đột:
   - Tuân thủ **7 Bất biến I1–I7** & **RULE-03 Open-Closed**.
   - Đã tạo đủ [`.agents/notes/testcase/<id>.md`](../.agents/notes/testcase/_TEMPLATE.md) + mã unit test offline (và bug log trong `.agents/notes/bugs/` nếu test phát hiện lỗi).
   - `python3 scripts/notes_index.py --check` đã xanh.
   - `./scripts/git-ship.sh merge --dry-run` (hoặc GitHub `mergeable`) báo **không xung đột**.
3. Nếu còn xung đột → chạy `./scripts/git-ship.sh update`, giải quyết bằng **commit mới** rồi push lại.
4. Khi đã **0 conflict** → chạy `./scripts/git-ship.sh merge` hoặc bấm **Merge pull request** trên GitHub (không bắt buộc riêng `ThienleDuc`).
5. Chạy `./scripts/git-ship.sh sync` để đồng bộ `develop` mới nhất và dọn nhánh local.
