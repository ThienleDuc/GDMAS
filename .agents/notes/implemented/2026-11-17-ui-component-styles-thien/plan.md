# Implementation Plan: Xây lại style cho 3 layout dùng chung một stylesheet

## Metadata
- ID: 2026-11-17-ui-component-styles-thien
- Proposal: .agents/notes/proposed/2026-11-17-ui-component-styles-thien.md
- Approved By: thien
- Approved At: 2026-11-17
- Implementer: agent | thien
- Status: in_progress

---

## 1. Mục tiêu
Thay lớp style cũ bằng design system `globals.css`; giai đoạn này chỉ tái thiết kế 3 layout qua đúng một `layouts/layout.css`. Xóa `styles/index.css` theo yêu cầu rõ của người dùng (ngoại lệ I2 được ủy quyền). Giữ nguyên logic, props, data flow và page con. Chưa chỉnh page-specific styles.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/main.tsx` — import `globals.css`.
- `apps/web/src/styles/index.css` — CSS entry point trung tâm; import Tailwind, `tw-animate-css`, `globals.css`, `layouts/layout.css`.
- `apps/web/src/styles/globals.css` — design tokens/base; imported from index.
- `apps/web/src/layouts/layout.css` — stylesheet duy nhất cho cả 3 layout; imported centrally from index (không import lẻ trong TSX).
- `apps/web/src/layouts/DashboardLayout.tsx` — class ngữ nghĩa, giữ logic.
- `apps/web/src/layouts/FullscreenMapLayout.tsx` — class ngữ nghĩa, giữ logic.
- `apps/web/src/layouts/ReportLayout.tsx` — class ngữ nghĩa, giữ logic/print.
- `apps/web/index.html` — bỏ body class Tailwind cũ, chuyển về semantic app root, Light-first.
- `apps/web/package.json`, `apps/web/pnpm-lock.yaml` — thêm `tw-animate-css` đang được globals.css import.
- `apps/web/tests/layout-styles.test.ts` — test cấu trúc offline.
- `docs/guides/design/style-guide.md` — tài liệu thiết kế do người dùng cung cấp, là nguồn quy chuẩn của design system (đã có sẵn, được đưa vào để đồng hành cùng thay đổi).
- `.agents/notes/testcase/2026-11-17-ui-component-styles-thien.md`.
- `.agents/notes/proposed/2026-11-17-ui-component-styles-thien.md`.
- `.agents/notes/implemented/2026-11-17-ui-component-styles-thien/{plan,status}.md`.

### Out of Scope
- 6 page CSS/markup; sẽ làm ở giai đoạn sau.
- CSS riêng cho component dùng chung (`components/ui`, `charts`, `map`) — giữ nguyên hiện trạng ở giai đoạn layout.
- `apps/api/**`, `contracts/**`, migrations, `.env`, `AGENTS.md`, docs khác.
- Logic, props, hooks, SSE, APIs, data payload, chart-data tests.

---

## 3. Các bước
### Step 1 — Nền tảng design system
Dùng `index.css` làm CSS entry point; import Tailwind, `tw-animate-css`, `globals.css` và `layouts/layout.css` tại đây. `main.tsx` import duy nhất `index.css`. `index.css` không xóa; giữ `.dark` capability và cấu hình Light-first.

### Step 2 — Layout stylesheet duy nhất
Tạo `layouts/layout.css`, được import tập trung từ `styles/index.css`. Khai báo shell, sidebar/nav/brand/header/content, fullscreen map overlay/viewport, report toolbar/document/print trong cùng file. Sử dụng CSS variables và class từ `globals.css`, không màu hardcode.

### Step 3 — Refactor ba layout
Mỗi layout import cùng `./layout.css`, áp dụng `.layout--dashboard`, `.layout--fullscreen`, `.layout--report` và class con. Không thay logic, handlers, route, SSE hay toast.

### Step 4 — Test & validation
Chạy `node --test tests/layout-styles.test.ts`, `pnpm test`, `pnpm build`, `python3 scripts/notes_index.py --check`. Cập nhật testcase/status, sau đó dừng theo chỉ thị người dùng (không review-pr/push/merge).

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi API/schema/migration/env. Chỉ thêm CSS dependency `tw-animate-css` vì `globals.css` tham chiếu package này.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đặc tả testcase tại `.agents/notes/testcase/2026-11-17-ui-component-styles-thien.md`.
- [x] File unit test offline `apps/web/tests/layout-styles.test.ts`.
- [ ] `cd apps/web && node --test tests/layout-styles.test.ts`.
- [ ] `cd apps/web && pnpm test`.
- [ ] `cd apps/web && pnpm build`.
- [ ] `python3 scripts/notes_index.py --check`.
- [ ] Test đảm bảo cả 3 layout import một stylesheet duy nhất, theme nền light-first, không còn `index.css`, print hook giữ nguyên.

---

## 6. Rủi ro khi làm
- Dependency `tw-animate-css` được cài bằng Corepack pnpm 11 để khớp store v11 của workspace.
- Giai đoạn layout chưa restyle component/page, nên utility cũ trong page/component có thể còn màu tối; ghi nhận là phạm vi tách riêng, không mở rộng ngoài scope.

---

## 7. Rollback
Khôi phục `index.css` và revert import/dependency/CSS/layout class edits nếu build/test thất bại; không có migration hay dữ liệu cần rollback.

---

## 8. Ghi chú
- Ghi nhận ngoại lệ I2: xóa `apps/web/src/styles/index.css` theo chỉ thị rõ "bỏ luôn css trước đó".
- Dừng sau validation như người dùng yêu cầu; không gọi review-pr Phần B.
