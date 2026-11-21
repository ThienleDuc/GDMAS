# Implementation Plan: Dark Mode + nút SVG toggle trên header

## Metadata
- ID: 2026-11-21-darkmode-toggle-thien
- Proposal: .agents/notes/proposed/2026-11-21-darkmode-toggle-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Giữ nguyên light mode hiện tại, bổ sung Dark Mode bằng token `.dark` và nút SVG chuyển đổi ở header bên phải đồng hồ realtime.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/styles/globals.css` — comment light-first + khối `.dark` override token ngữ nghĩa
- `apps/web/src/layouts/header/ThemeToggle.tsx` *(mới — nút SVG dùng `useTheme()`)*
- `apps/web/src/layouts/header/HeaderActions.tsx` — render toggle sau `RealtimeClock`
- `apps/web/src/layouts/layout.css` — `.header-theme-toggle` + reduced-motion
- `.agents/notes/testcase/2026-11-21-darkmode-toggle-thien.md` *(đặc tả sinh đồng thời)*
- `apps/web/tests/theme-toggle.test.ts` *(mới — offline)*
- `apps/web/tests/layout-styles.test.ts` *(sửa 1 assertion TC-03: từ "không được có `.dark`" sang "phải có `.dark { color-scheme: dark }`" theo yêu cầu Dark Mode; không xóa test — đã ghi trong `status.md` → Deviations)*

### Out of Scope
- `lib/theme.ts`, `hooks/useTheme.ts`, `components/charts/chart-theme.ts` — giữ nguyên (I2)
- `contracts/**`, `apps/api/**`, `docs/**`, `AGENTS.md`, migration, `.env*`
- Aside nav, 6 patterns, widget header khác, dependency mới

---

## 3. Các bước
### Step 1 — Dark token
Cập nhật comment mục 2 `globals.css`; thêm `.dark { color-scheme: dark; ... }` sau `:root` với đủ token ngữ nghĩa (background/foreground/card/primary/muted/accent/border/surface/sidebar/chart/shadow).
### Step 2 — Toggle
Tạo `ThemeToggle.tsx` (Sun/Moon SVG từ lucide, `useTheme()`, `aria-pressed`, `title`), render sau clock trong `HeaderActions`.
### Step 3 — CSS
`.header-theme-toggle` dùng token, focus-visible, transition, reduced-motion.
### Step 4 — Test & validation
`theme-toggle.test.ts`, `pnpm test`, `pnpm build`, `notes_index.py --check`, `git status --porcelain`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không migration, endpoint, schema hay biến môi trường.

---

## 5. Validation
- [ ] Testcase `.agents/notes/testcase/<id>.md` tồn tại
- [ ] `apps/web/tests/theme-toggle.test.ts` chạy pass offline
- [ ] `cd apps/web && pnpm test` (theme.test.ts cũ vẫn pass)
- [ ] `cd apps/web && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] `git status --porcelain` — không xóa file
- [ ] Kiểm tra: toggle đổi class `.dark` trên `<html>`, lưu `localStorage`, light vẫn mặc định

---

## 6. Rủi ro
Chart/Leaflet có theme riêng; không đụng — chỉ shell đổi token.

## 7. Rollback
Revert commit trên nhánh `feat/2026-11-21-darkmode-toggle-thien`; không có DB/migration.

## 8. Ghi chú
Light-first được giữ nguyên; toggle là bước tiếp theo đã được nhắc trong proposal `2026-11-17-ui-component-styles-thien`. Dừng CHECKPOINT 1 sau validation.
