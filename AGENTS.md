# AGENTS.md — Quy tắc vận hành cho mọi AI Agent (GDMAS)

> **GDMAS** (Global Disaster Monitoring & Analysis System) — Hệ thống giám sát, phân tích chuỗi thời gian (6 patterns)
> và dự báo thiên tai địa chấn toàn cầu theo mô hình **7 Terminals độc lập**:
> `T1 PostgreSQL 16` · `T2 Ingestion (5m)` · `T3 Analysis (5m)` · `T4 Clustering (1d)` · `T5 Prediction (5m)` · `T6 FastAPI + SSE (:8000)` · `T7 React + Vite (:3000)`.

## Lệnh thật của repo

```bash
# Backend (apps/api/)
cd apps/api && uv run pytest <path_to_test>                  # test liên quan (nhẹ)
cd apps/api && uv run pytest                                 # toàn bộ test (khi diff rộng)
cd apps/api && uv run ruff check . && uv run ruff format --check .

# Frontend (apps/web/)
cd apps/web && pnpm build                                    # chạy tsc -b && vite build

# Bộ nhớ quyết định (.agents/notes/)
python3 scripts/notes_index.py                               # bảng tổng quan proposal
python3 scripts/notes_index.py --testcases                   # bảng tổng quan testcase
python3 scripts/notes_index.py --bugs                        # bảng tổng quan bug
python3 scripts/notes_index.py --check                       # kiểm tra nhất quán notes

# Git workflow an toàn
./scripts/git-ship.sh me [handle]                            # xem / đặt handle từ .agents/team.md
./scripts/git-ship.sh start <type>/<id>                      # rẽ nhánh từ develop (feat/, fix/, test/...)
./scripts/git-ship.sh scope [id]                             # kiểm tra diff khớp In Scope của plan.md
./scripts/git-ship.sh update                                 # merge-forward origin/develop (không rebase)
./scripts/git-ship.sh push                                   # push nhánh & tạo / in link PR vào develop
./scripts/git-ship.sh merge                                  # kiểm tra không xung đột và merge PR/nhánh vào develop
./scripts/git-ship.sh sync                                   # đồng bộ về develop sau khi đã merge PR
```

## Ngôn ngữ

- Tài liệu `.md` (`docs/`, `.agents/notes/`, `SKILL.md`) và nội dung commit viết **tiếng Việt có dấu**.
- Code (tên file, class, hàm, biến) viết **tiếng Anh**.
- Khóa máy đọc trong notes (`Decision:`, `Status:`, `Mode:`, `Target:`, `Test File:`, `Proposal:`, `Related Bugs:`, `## 9. Human Review`, `Severity:`, `Scope of Rejection:`, `Overrides:`) giữ nguyên **tiếng Anh**.

## 7 Bất biến cứng (I1–I7 — không refactor vượt qua mà không báo)

Bản đầy đủ kèm dấu hiệu vi phạm xem ở [docs/coding-rules.md](docs/coding-rules.md) và [docs/quyuocchung.md](docs/quyuocchung.md).

1. **I1 — Tách biệt 7 Terminals:** `apps/api/src/gdmas/main.py` chỉ chạy FastAPI REST & SSE (T6). Cấm nhúng vòng lặp/cron/worker vào `main.py`; mỗi worker chạy qua `runner.py` độc lập.
2. **I2 — Open-Closed Principle (`RULE-03`):** Không xóa tệp cũ đang tồn tại, không phá vỡ chữ ký hàm cũ đang được module khác gọi; mở rộng bằng cách bổ sung tệp/route/component/hàm mới.
3. **I3 — Hợp đồng dữ liệu, UTC & WGS84:** Payload giữa API và Web khớp `contracts/` & `docs/api/API.md`; mọi timestamp dùng **UTC** (`TIMESTAMPTZ` / ISO 8601 `Z`); tọa độ dùng **WGS84** (`latitude`, `longitude`).
4. **I4 — Bất biến Alembic Migration:** Không sửa các file migration đã tồn tại trong `apps/api/alembic/versions/`; đổi schema phải tạo migration mới.
5. **I5 — 6 Patterns & Dark Mode UI:** Component biểu đồ mới đặt tại `apps/web/src/components/charts/` phục vụ đúng 6 patterns Time-Series, không phá layout Dark Mode và không hardcode mock thay thế API thật ở các view chính thức.
6. **I6 — Secrets & `.env`:** Không commit/stage `.env`, key, password hay log thông tin nhạy cảm; mẫu rỗng nằm ở `.env.example`.
7. **I7 — Toàn vẹn bộ kiểm thử & Bắt buộc testcase (`write-testcase`):** Không xóa/tắt test cũ đang pass; unit test chạy **offline 100%** không gọi mạng/USGS thật khi không mock. Khi proposal §9 `Approved`, phải tạo **đồng thời** `implemented/<id>/` và tài liệu kiểm thử [`.agents/notes/testcase/<id>.md`](.agents/notes/testcase/_TEMPLATE.md) kèm file test tự động (`apps/api/tests/.../test_*.py`, `scripts/tests/test_*.py` hoặc FE test). Khi kiểm thử riêng 1 file theo yêu cầu người dùng (`test/<id>`), test fail bắt buộc ghi lỗi vào [`.agents/notes/bugs/`](.agents/notes/bugs/_TEMPLATE.md).

## Bộ nhớ quyết định: `.agents/notes/`

Quy trình đầy đủ: [docs/agent-workflow.md](docs/agent-workflow.md). Điểm vào: [.agents/notes/README.md](.agents/notes/README.md). Đội ngũ: [.agents/team.md](.agents/team.md).

Thư mục `.agents/notes/` chỉ duy trì 4 thư mục con chuẩn (`proposed/`, `implemented/`, `testcase/`, `bugs/`) và `.claude/notes/` chỉ giữ 1 file [README.md](.claude/notes/README.md) tham chiếu sang `.agents/`.

- **`proposed/<id>.md`:** mọi proposal không-tầm-thường (lớn hơn sửa 1 dòng / 1 file), bất kể kết quả. File không bao giờ di chuyển.
  Trạng thái nằm ở `## 9. Human Review` → `Decision: Pending | Changes Requested | Approved | Rejected`.
- **Tiêu chí proposal THẢ LỎNG:**
  **Không cần `ThienleDuc` (`thien`) phải đồng ý ở bước proposal.** Bất kỳ thành viên nào trong `.agents/team.md` (`thien`, `son`, `van`, `tai`) — kể cả **tác giả tự duyệt** hoặc đồng đội — đều có thể duyệt §9 (`Decision: Approved`). Nếu người dùng đang làm việc xác nhận đồng ý rõ ràng trong chat, agent được ghi nhận `Decision: Approved` và `Reviewer: <handle>` vào §9 kèm chỉ thị trong `Comments:`.
- **`implemented/<id>/plan.md` + `status.md` & `testcase/<id>.md` (Sinh đồng thời khi §9 `Approved`):**
  Ngay khi §9 là `Approved`, agent **đồng thời** khởi tạo `.agents/notes/implemented/<id>/{plan.md,status.md}` (từ `_TEMPLATE/`) VÀ `.agents/notes/testcase/<id>.md` (từ [`.agents/notes/testcase/_TEMPLATE.md`](.agents/notes/testcase/_TEMPLATE.md), `Mode: proposal-paired`). `status.md` cập nhật liên tục (`planned → in_progress ⇄ blocked → validation → completed`). `In Scope` trong `plan.md` phải khai báo kèm tệp test sẽ tạo/chạy.
- **`testcase/<id>.md` cho luồng kiểm thử 1 file cụ thể (`Mode: single-file-test`):**
  Khi người dùng yêu cầu viết unit test cho 1 file cụ thể: **checkout sang nhánh mới `test/<id>` trước** (`./scripts/git-ship.sh start test/<id>`) → gọi `write-testcase` tạo `testcase/<id>.md` + file unit test offline → chạy test → nếu phát hiện lỗi, ghi nhận `BUG-<handle>-NNN-<slug>.md` vào `.agents/notes/bugs/`, cập nhật `Status: failed_with_bugs` + `Related Bugs:` → đẩy PR qua `review-pr`.
- **`bugs/`:** mỗi lỗi một file `BUG-<handle>-NNN-slug.md` (tạo từ `_TEMPLATE.md`). Bảng tổng hợp sinh tự động bằng `python3 scripts/notes_index.py --bugs`. **Bug `critical`**: dừng việc khác, báo dòng đầu `CRITICAL BUG: BUG-<handle>-NNN — <tiêu đề>`.
- **Copy `_TEMPLATE`, không viết khuôn theo trí nhớ.** ID chuẩn: `yyyy-mm-dd-<slug>-<handle>`. Bảng index sinh tự động (`python3 scripts/notes_index.py`), không thêm dòng tay vào README.

**Kiểm xung đột trước proposal:** chạy `python3 scripts/notes_index.py` và grep `.agents/notes/proposed/` + `implemented/` (kể cả proposal `Rejected`). Mâu thuẫn với quyết định đã chốt hoặc nằm trong `Scope of Rejection` thì dừng báo **`CONFLICT DETECTED`**, đề xuất proposal mới ghi `Overrides: <id>`.

## Quy tắc tương tác & Gom câu hỏi cuối phiên (Anti-Interrupt)

Mục tiêu: **Người dùng không cần bấm xác nhận/submit nhiều lần cho các thao tác an toàn.**

- **Tự động thực thi (KHÔNG hỏi xin phép từng file):** Mọi thao tác **thêm mới** hoặc **sửa đổi** file/folder thông thường (code, `.md`, file test, `.agents/notes/...`) được agent thực hiện thẳng theo workflow/scope đã chốt mà **không dừng hỏi xác nhận**.
- **Hành động nguy hiểm (KHÔNG cắt ngang giữa phiên — gom cuối phiên):** Khi gặp trường hợp nguy hiểm gồm:
  1. **Xóa file / xóa thư mục** (trừ tệp nháp do chính agent vừa tạo trong lượt đó nếu cần thu hồi);
  2. **Xung đột (Conflict):** `CONFLICT DETECTED` với proposal/quyết định cũ, hoặc merge conflict Git;
  3. **Sửa đổi vùng khóa:** tác động tới `AGENTS.md`, `contracts/`, migration Alembic cũ ngoài phạm vi được giao;
  agent **tạm bỏ qua (không thực hiện phần nguy hiểm đó)**, hoàn thành trọn vẹn toàn bộ công việc an toàn trước, rồi **tổng hợp TẤT CẢ câu hỏi quyết định vào 1 danh sách đánh số duy nhất ở cuối phiên** để người dùng trả lời 1 lần.

## Ranh giới quyền hạn (không thương lượng)

| Agent **ĐƯỢC** | Agent **KHÔNG ĐƯỢC** |
|---|---|
| Thêm mới / sửa file code, tạo file test offline & `testcase/<id>.md`, cập nhật docs | **Merge PR khi đang còn xung đột (`CONFLICT`)** hoặc chưa qua kiểm tra conflict / `notes_index --check` |
| Soạn proposal; sửa proposal sau `Changes Requested` | Tự ý điền §9 `Approved` khi người dùng chưa xác nhận (im lặng không phải duyệt) |
| Ghi §9 `Approved` theo xác nhận rõ trong chat của thành viên đang thao tác (`thien`/`son`/`van`/`tai`, không cần `ThienleDuc`) | Implement tác vụ không-tầm-thường khi §9 chưa `Approved` |
| Tạo đồng thời `implemented/<id>/` + `testcase/<id>.md` khi §9 là `Approved`; chạy luồng `test/<id>` ghi `.agents/notes/bugs/` | Tự ý xóa file/thư mục hoặc ép ghi đè conflict mà không gom hỏi người dùng ở cuối phiên |
| Tự chạy `review-pr`: `start`, commit tiếng Việt, `update`, `push` nhánh, tạo PR và **merge khi đã kiểm tra không xung đột** (không bắt buộc riêng `ThienleDuc`) | Push raw thẳng lên `develop` hoặc `main` bỏ qua PR/conflict-check, `--force`, `--no-verify`, tắt `.githooks/`, `git reset --hard`, `git clean -f`, `git branch -D` |
| Đề xuất sửa `AGENTS.md`, `contracts/`, `docs/quyuocchung.md` (qua danh sách câu hỏi cuối phiên nếu ngoài scope) | Tự ý sửa `AGENTS.md`, `contracts/`, migration cũ như tác dụng phụ |

## Git & Pull Request

- Remote: GitHub `https://github.com/ThienleDuc/GDMAS.git`. Nhánh tích hợp: **`develop`**. Nhánh phát hành: **`main`** (hạn chế đụng trừ `hotfix/*` hoặc release).
- Agent **tự động chạy `review-pr`** theo trạng thái công việc (cho Spec-Driven, Fast-Track <= 1 file, và kiểm thử 1 file `test/<id>`):
  - **Phần A (bắt đầu việc có sửa file hoặc kiểm thử 1 file):** trước khi sửa/tạo file đầu tiên, chạy `./scripts/git-ship.sh start <type>/<id>`.
  - **Phần B (khi qua validation & đã tạo `testcase/<id>.md` + test):** chạy `scope`, `project-review`, tổng hợp Conventional Commit tiếng Việt, `update` (merge-forward `origin/develop`, không rebase), `push`, xuất PR + Implementation Report.
- **Điều kiện Merge (Conflict-Free Gate):** **Không bắt buộc riêng `ThienleDuc`** — bất kỳ thành viên nào (hoặc `./scripts/git-ship.sh merge` khi được yêu cầu merge) đều được phép merge PR khi **kiểm tra không có xung đột (`0 conflicts`), qua `notes_index.py --check` và validation đạt chuẩn**. Chi tiết: [docs/git-workflow.md](docs/git-workflow.md).
- Hook local `.githooks/` (kích hoạt qua `bash scripts/git-setup.sh` hoặc `SessionStart`) chặn commit trực tiếp lên `develop`/`main`, chặn `.env`/secret, kiểm format commit, chặn push raw `develop`/`main` và chạy `notes_index.py --check`.

## 5 Skill cốt lõi (chỉ lưu tại `.agents/skills/`)

Mọi AI Agent (Antigravity, Claude Code qua [CLAUDE.md](CLAUDE.md), Codex, Cursor…) đọc và gọi trực tiếp 5 skill duy nhất tại `.agents/skills/`:

1. [`write-proposal`](.agents/skills/write-proposal/SKILL.md) — Pha 1+2: đọc bối cảnh (`docs/`, `notes_index.py`), kiểm conflict, sinh ID qua Slug Engine, viết `proposed/<id>.md` (kèm tệp test dự kiến), dừng chờ xác nhận §9 (thả lỏng, không cần `ThienleDuc`).
2. [`build-implementation`](.agents/skills/build-implementation/SKILL.md) — Pha 4: kiểm §9 `Approved`, tạo **đồng thời** `implemented/<id>/{plan.md,status.md}` và gọi `write-testcase` tạo `testcase/<id>.md`, gọi `review-pr` Phần A rẽ nhánh, code theo RULE-03 & I1–I7, validation nhẹ, đặt `Status: validation` rồi chuyển giao `review-pr` Phần B.
3. [`write-testcase`](.agents/skills/write-testcase/SKILL.md) — Tạo biên bản `.agents/notes/testcase/<id>.md` (từ `_TEMPLATE.md`) + viết unit/integration test offline cho **2 luồng**: (1) `proposal-paired` sinh đồng thời với `implemented/<id>/`, và (2) `single-file-test` kiểm thử riêng 1 file trên nhánh `test/<id>` mới và ghi lỗi vào `.agents/notes/bugs/`.
4. [`project-review`](.agents/skills/project-review/SKILL.md) — Lớp thẩm định & bảo vệ mã nguồn (tích hợp OCP/Churn + 7 Invariants I1–I7 + kiểm tra `testcase/<id>.md` & offline test + drift tài liệu + lan phạm vi `plan.md`).
5. [`review-pr`](.agents/skills/review-pr/SKILL.md) — Tự động hóa Git toàn phần (tích hợp Slug Engine, bảng Type/Scope tiếng Việt, `git-ship.sh`, `.githooks/`, nhánh `test/<id>`, merge-forward `develop`, tạo PR, kiểm tra không xung đột & `merge` không bắt buộc riêng `ThienleDuc`, `sync` sau merge).
