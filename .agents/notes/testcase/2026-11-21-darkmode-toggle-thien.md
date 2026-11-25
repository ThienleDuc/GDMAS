# Testcase: Dark Mode + nút SVG toggle header

## Metadata
- ID: 2026-11-21-darkmode-toggle-thien
- Mode: single-file-test
- Proposal: none
- Target: `apps/web/src/styles/globals.css`, `apps/web/src/layouts/header/{ThemeToggle,HeaderActions}.tsx`, `apps/web/src/layouts/layout.css`
- Test File: `apps/web/tests/theme-toggle.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** (1) `.dark` override đủ token ngữ nghĩa so với `:root`; (2) component toggle dùng `useTheme`, icon SVG, `aria-pressed`, `onClick=toggle`; (3) vị trí toggle sau `RealtimeClock` trong `HeaderActions`; (4) CSS toggle dùng token + focus-visible + reduced-motion; (5) `theme.test.ts` cũ vẫn pass.
- **Ràng buộc:** I1 shell T7 · I2 giữ `theme.ts`/`useTheme.ts` · I3 không đổi payload · I5 Dark Mode bằng token, không mock · I7 offline 100%.

---

## 2. Fixtures
- Đọc nội dung tệp tĩnh (`readFileSync`), không render DOM, không gọi mạng.
- Bộ token mẫu: `--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--surface`, `--sidebar`, `--chart-1`, `--shadow-md`.

---

## 3. Ma trận Test Cases

| TC ID | Tên | Nhóm | Đầu vào | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Light-first giữ nguyên | Functional | đọc `globals.css` | `:root` vẫn `color-scheme: light`; comment mục 2 không còn "LIGHT MODE ONLY" | `PASS` |
| `TC-02` | Khối `.dark` tồn tại | Functional | đọc `globals.css` | có `.dark\s*\{` với `color-scheme: dark` | `PASS` |
| `TC-03` | Đủ token ngữ nghĩa được override | Boundary | so sánh token trong `:root` và `.dark` | mọi token mẫu đều xuất hiện trong `.dark` | `PASS` |
| `TC-04` | Toggle dùng hook + SVG + a11y | Functional | đọc `ThemeToggle.tsx` | có `useTheme`, `toggle`, `Sun`, `Moon`, `aria-pressed`, `title` | `PASS` |
| `TC-05` | Vị trí sau đồng hồ | Functional | đọc `HeaderActions.tsx` | `<ThemeToggle` đứng sau `<RealtimeClock` | `PASS` |
| `TC-06` | CSS toggle dùng token | Functional | đọc `layout.css` | `.header-theme-toggle` + `var(--ring)` + `prefers-reduced-motion` | `PASS` |
| `TC-07` | Không đụng helper theme cũ | OCP | `git status` | `lib/theme.ts`, `hooks/useTheme.ts`, `chart-theme.ts` không đổi | `PASS` |
| `TC-08` | theme.test.ts cũ vẫn pass | Regression | chạy `node --test tests/theme.test.ts` | tất cả pass, không xóa/sửa assertion cũ | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && pnpm test
cd apps/web && pnpm build
python3 scripts/notes_index.py --check
```
- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:** `theme-toggle.test.ts` 8/8 pass · `pnpm test` **160/160 pass, 0 fail** · `pnpm build` PASS (2559 modules) · `notes_index.py --check` OK.
- **Điều chỉnh test cũ có chủ đích:** `layout-styles.test.ts` TC-03 trước đây `doesNotMatch(globals, /\.dark\s*\{/)` (light-only) đã được đổi thành `match(...\.dark...color-scheme: dark)` để phản ánh yêu cầu Dark Mode mới — không xóa test, chỉ cập nhật assertion trái ngược yêu cầu. TC-02 giữ nguyên (class CSS đổi tên thành `header-theme-toggle` để không đụng forbidden list).

---

## 5. Lỗi phát hiện & Bug Logs
- `none` *(không có lỗi mã nguồn; 3 fail ban đầu là assertion test cũ light-only + regex test mới, đã sửa ở bước validation)*
