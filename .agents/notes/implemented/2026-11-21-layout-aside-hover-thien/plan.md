# Implementation Plan: Tái tạo layout — breadcrumb tiếng Việt, aside rail + hover card, nội dung rộng (T7.01 cải tiến)

## Metadata
- ID: 2026-11-21-layout-aside-hover-thien
- Proposal: .agents/notes/proposed/2026-11-21-layout-aside-hover-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Đổi shell FE: breadcrumb dùng nhãn tiếng Việt; aside luôn ở dạng rail (bỏ toggle/tự thu), hover/focus hiện card mô tả absolute; vùng nội dung dùng toàn bộ chiều rộng. Giữ 1 layout, CSS tập trung, không đụng page/service/contracts.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/layouts/navigation.ts` — module thuần: `NAV_META`, `routeLabel`, `navMetaFor` (nhãn/mô tả/badge 6 route + fallback).
- `apps/web/src/layouts/DashboardLayout.tsx` — bỏ `sidebarOpen`/toggle/effect tự thu; breadcrumb qua `routeLabel`; NavLink `group` + `aria-label` + popover; giữ SSE context.
- `apps/web/src/layouts/layout.css` — rail mặc định, `layout__nav-popover` absolute + hover/focus-visible, `.layout__content` full-width, responsive.
- `apps/web/tests/layout-navigation.test.ts` — unit test offline mới.
- `apps/web/tests/layout-styles.test.ts` — bổ sung additive (giữ 5 test cũ).
- `.agents/notes/testcase/2026-11-21-layout-aside-hover-thien.md` — đặc tả testcase sinh đồng thời.

### Out of Scope
- `apps/web/src/styles/globals.css`, `styles/index.css`, `app/App.tsx`, `app/routes.tsx`.
- Mọi page/component feature, services, contracts FE, repo `contracts/`, `apps/api/**`, migration, `docs/api/API.md`.
- Dependency mới, commit/push/merge.

---

## 3. Các bước
### Step 1 — Module điều hướng thuần
`navigation.ts`: định nghĩa `NAV_META` (path/label/description/badge?), `routeLabel(pathname)` (exact `/`, startsWith route khác, fallback `"Trang"`), `navMetaFor(pathname)`.

### Step 2 — Component shell
`DashboardLayout.tsx`: xóa state/effect/toggle (`Menu`, `X`, `APP_ROUTES` nếu hết dùng); aside class tĩnh; brand chỉ icon; NavLink có `group`, `aria-label`, popover con; breadcrumb dùng `routeLabel`; giữ `useSSE` + `SseMarkersProvider`.

### Step 3 — CSS
`layout.css`: sidebar rail mặc định (`--sidebar-width-collapsed`), bỏ/rplace `.is-collapsed`; popover absolute + z-tooltip + transition; `.layout__content { width:100%; max-width:none; margin-inline:0 }`; giữ media query, xử lý overflow nav để card không bị cắt.

### Step 4 — Test & validation
Chạy `layout-navigation.test.ts`, bổ sung `layout-styles.test.ts`; `pnpm build && pnpm test`; `notes_index.py --check`; kiểm tra OCP (0 deletion, 0 core file). Dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Chỉ dùng token CSS có sẵn; không đổi endpoint/schema/env/dependency.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo testcase `.agents/notes/testcase/2026-11-21-layout-aside-hover-thien.md`
- [x] Đã tạo/chạy test offline `apps/web/tests/layout-navigation.test.ts`
- [x] `cd apps/web && pnpm build`
- [x] `cd apps/web && pnpm test` (không giảm số test)
- [x] `python3 scripts/notes_index.py --check`
- [x] Kiểm tra OCP: `git status --porcelain` không có `D`, không đụng core protected
- [x] Kiểm chức năng: breadcrumb 6 route tiếng Việt; rail không toggle; hover/focus hiện card; content full-width

---

## 6. Rủi ro khi làm
- Popover bị cắt bởi `overflow` nav → thử overflow-x visible; nếu không được dùng `position:fixed` tính rect trong effect nhỏ.
- Test cũ kỳ vọng toggle/is-collapsed → chỉ bổ sung/cập nhật có giải trình, không xóa test đang pass.
- Touch screen không hover → aria-label + focus; ghi deviation nếu cần.

---

## 7. Rollback
Revert commit/PR; layout quay về dạng có toggle + breadcrumb slug. Không có DB/schema thay đổi.

---

## 8. Ghi chú
Repo FE dùng `node --test` (không DOM lib) nên mọi logic (routeLabel/navMetaFor) tách thuần để test offline; component chỉ render + CSS lớp.
