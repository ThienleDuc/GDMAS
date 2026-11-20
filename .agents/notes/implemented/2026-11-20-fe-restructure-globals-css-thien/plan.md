# Implementation Plan: Tái cấu trúc Frontend — nền globals.css, layout thống nhất, tái thiết lib/contracts

## Metadata
- ID: 2026-11-20-fe-restructure-globals-css-thien
- Proposal: .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md
- Approved By: thien
- Approved At: 2026-11-20
- Implementer: agent | thien
- Status: validation

---

## 1. Mục tiêu
Dọn mặt bằng FE: 1 layout (aside + content), `index.css` chỉ import, contracts tách theo schema, lib gồm API client/SSE/formatters/transforms. Không đổi wire format, không build UI mới.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/styles/index.css` — chỉ còn import.
- `apps/web/src/app/App.tsx` — một nhóm route + PlaceholderPage.
- `apps/web/src/layouts/` — layout duy nhất; xóa 2 layout legacy; cắt CSS.
- `apps/web/src/components/` — xóa toàn bộ.
- `apps/web/src/features/` — xóa toàn bộ.
- `apps/web/src/contracts/` — tách theo schema + barrel.
- `apps/web/src/lib/` — API client, SSE, formatters, transforms.
- `apps/web/src/services/earthquake-api.ts` — giữ hàm gọi endpoint, re-export kiểu.
- `apps/web/src/hooks/useSSE.ts` — dùng factory SSE mới.
- `apps/web/src/hooks/sse-machine.ts` — lớp re-export tương thích.
- `apps/web/tests/` — test mới và cập nhật đường dẫn import.
- `docs/architecture.md` — cập nhật cây thư mục FE tại §12 theo cấu trúc mới.

### Out of Scope
- `contracts/schemas/`, `contracts/examples/`, `contracts/README.md`, `docs/**` (trừ `docs/architecture.md` §12), `AGENTS.md`.
- `apps/api/**`, alembic migration, `apps/api/src/gdmas/main.py`.
- `.env`, secrets, `.githooks/`, cấu hình CI.
- Commit/push/merge — dừng CHECKPOINT 1.

---

## 3. Các bước
### Step 1 — Dọn nền UI
Discard WIP chưa commit; `develop` pull lên `d275cbf`; xóa nhánh cũ; tạo nhánh mới. Xóa `components/`+`features/`; viết lại `index.css`; `App.tsx` dùng `PlaceholderPage`.

### Step 2 — Layout đơn nhất
Giữ `DashboardLayout` (aside + `Outlet`); xóa 2 layout legacy; gộp 6 route; cắt CSS fullscreen/report (544 → 334 dòng); cập nhật `layout-styles.test.ts`.

### Step 3 — Contracts theo schema
Tách 10 module + barrel; chuyển kiểu từ service vào contracts; giữ alias legacy; re-export trong `services/earthquake-api.ts` để import cũ không vỡ.

### Step 4 — Lib theo architecture
Dời 5 transform vào `lib/transforms/`; tạo `lib/sse.ts`, `lib/formatters.ts`, `lib/index.ts`; `hooks/sse-machine.ts` re-export; `useSSE` dùng `createSseSource`.

### Step 5 — Test & validation
Thêm `lib-redesign.test.ts` (7 TC); cập nhật import path của 4 test; chạy build/test/notes check; sinh testcase; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không đổi endpoint, envelope, schema JSON hay biến môi trường — chỉ tổ chức lại kiểu TypeScript và module FE theo tài liệu hiện hành.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-20-fe-restructure-globals-css-thien.md`
- [x] **Đã tạo và chạy pass file test offline** `apps/web/tests/lib-redesign.test.ts` (7/7) + 49 test hiện hữu
- [ ] Backend test/lint — không đụng `apps/api`, bỏ qua
- [x] Frontend: `cd apps/web && pnpm build` — OK (tsc -b + vite build)
- [x] `cd apps/web && pnpm test` — 56/56 pass
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] Tài liệu bị ảnh hưởng: `Architecture Impact: none` — không có drift cần cập nhật
- [x] Kiểm tra chức năng: GraphQL/Không có; kiểm tra bằng test layout + test contract barrel + build sạch

---

## 6. Rủi ro khi làm
- **Import vỡ sau dời file:** giảm bằng barrel + re-export; `pnpm build` là gate.
- **Hook SSE đổi hành vi:** giữ chữ ký `useSSE(endpoint?)`; factory được test qua helper thuần; build xanh.
- **Alias legacy mất:** giữ optional fields và re-export; test services cũ vẫn pass.

---

## 7. Rollback
Revert working tree về `HEAD` (`d275cbf`) trên nhánh `refactor/2026-11-20-fe-restructure-globals-css-thien` (chưa có commit nào). Nếu đã commit: revert commit bằng `git revert`, không force-push.

---

## 8. Ghi chú
Người dùng đã xác nhận CHECKPOINT 1 (`tiếp tục workflow`). Project-review bổ sung: `Overrides: 2026-11-17-ui-component-styles-thien` và cập nhật `docs/architecture.md` §12 — đã phản ánh vào proposal/plan/status trước khi commit.
