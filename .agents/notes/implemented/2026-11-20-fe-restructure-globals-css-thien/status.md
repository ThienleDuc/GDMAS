# Implementation Status: Tái cấu trúc Frontend — nền globals.css, layout thống nhất, tái thiết lib/contracts

## Metadata
- ID: 2026-11-20-fe-restructure-globals-css-thien
- Status: completed
- Started: 2026-11-20
- Last Updated: 2026-11-20
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: completed — đã merge PR #26 vào develop (SHA 5e0cb75)

Completed:
- Step 1 — Dọn nền: xóa `components/`(27) + `features/`(11); `index.css` chỉ import; `App.tsx` placeholder; nhánh mới từ `origin/develop`
- Step 2 — Layout đơn nhất: giữ `DashboardLayout`; xóa 2 layout; gộp 6 route; CSS 544 → 334 dòng
- Step 3 — Contracts: 10 module theo schema + barrel; giữ alias; service re-export kiểu
- Step 4 — Lib: API client/SSE/formatters/transforms; `useSSE` nối `createSseSource`
- Step 5 — Test: `lib-redesign.test.ts` (7 TC) + cập nhật 5 test; build/test/notes check xanh

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test (`.agents/notes/testcase/` + `test_*.py`) | DONE | `testcase/2026-11-20-fe-restructure-globals-css-thien.md` + `apps/web/tests/lib-redesign.test.ts` (7 TC) |
| Test liên quan (`pytest`) | NOT_RUN | Không đụng `apps/api`; FE dùng `pnpm test` ở dòng dưới |
| Lint / Build (`ruff` / `pnpm build`) | PASS | `cd apps/web && pnpm build` — tsc -b + vite build OK |
| Frontend test | PASS | `cd apps/web && pnpm test` — 56/56 pass |
| Notes check (`notes_index.py --check`) | PASS | OK |
| Tài liệu cập nhật | DONE | `docs/architecture.md` §12 — cây thư mục FE theo cấu trúc mới |

---

## Known Issues
- none

---

## Deviations From Plan
- Dự kiến: Architecture Impact `none`, không đụng `docs/**`. Thực tế: project-review phát hiện drift cây thư mục FE tại `docs/architecture.md` §12 (xóa `components/`/`features/`, tách contracts/lib). Lý do: diff làm thay đổi cây thư mục FE. Quyết định: cập nhật đúng §12, đồng thời bổ sung `Overrides: 2026-11-17-ui-component-styles-thien` vào proposal để giải trình việc thay thế thiết kế 3 layout cũ. Không đổi API/schema/payload.

---

## Decisions Made During Implementation
- Giữ tên `DashboardLayout` làm layout duy nhất thay vì đổi thành `AppLayout` — bảo toàn export API (I2). Nếu người dùng muốn đổi tên, thực hiện ở task riêng.
- Dời 3 module data + 2 file types vào `lib/transforms/` theo phương án "API client + SSE + transforms" đã được xác nhận.
- Giữ toàn bộ alias legacy trong contracts theo phương án "giữ alias tương thích" đã được xác nhận.

---

## Next Actions
- none — CHECKPOINT 1 và CHECKPOINT 2 đều đã được xác nhận; PR #26 đã merge vào `develop`, `git-ship.sh sync` hoàn tất.

---

## Last Update
2026-11-20 — Đã commit `f5dfdeb`, push nhánh, mở PR #26, merge vào `develop` (SHA merge `5e0cb75`), sync xong; `status.md` → `completed`.
