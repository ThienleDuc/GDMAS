# Proposal: Bổ sung Dark Mode với nút SVG chuyển đổi ở header (bên phải đồng hồ realtime)

## Metadata
- ID: 2026-11-21-darkmode-toggle-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: feature
- Status: approved   <!-- khớp Decision ở §9 -->
- Priority: medium
- Area: `apps/web/src/styles/globals.css`, `apps/web/src/layouts/header/ThemeToggle.tsx` (mới), `apps/web/src/layouts/header/HeaderActions.tsx`, `apps/web/src/layouts/layout.css`, `apps/web/tests/theme-toggle.test.ts` (mới)
- Architecture Impact: none
  <!-- Chỉ đổi FE: token CSS + 1 component toggle. Không đổi contracts/, docs/api/API.md, endpoint, payload hay config. Không drift: docs/guides/design/style-guide.md đã quy định ".dark trên <html> + semantic token tự đổi", proposal này hiện thực hóa đúng quy ước đó. -->
- Related Docs:
  - docs/guides/design/style-guide.md — Light-first + Dark Mode, class `.dark` trên `<html>`
  - docs/yeucaubatbuoc.md §3.1 — Dark Mode/Zoom/Filter
  - docs/coding-rules.md — I2 (OCP), I5 (Dark Mode UI), I7 (test offline)
- Related Proposals:
  - .agents/notes/proposed/2026-11-17-ui-component-styles-thien.md — thiết lập light-first; ghi rõ "theme toggle tính sau" (không có Scope of Rejection) → proposal này là giai đoạn đó, **không override** quyết định style guide.
  - .agents/notes/proposed/2026-11-17-ui-component-styles-thien.md — bảng màu chart Dark Mode (`chart-theme.ts`) giữ nguyên, không đụng.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
`lib/theme.ts` + `hooks/useTheme.ts` đã có đầy đủ cơ chế: `ThemeMode = "light" | "dark"`, lưu `localStorage` (`gdmas_theme_mode`), theo dõi `prefers-color-scheme`, `applyTheme()` thêm/xóa class `.dark` và đặt `color-scheme` trên `<html>`. Tuy nhiên `useTheme()` **không được gọi ở đâu**, `globals.css` khai báo "LIGHT MODE ONLY" và **không có định nghĩa token cho `.dark`** → class `.dark` nếu có cũng không đổi giao diện.

### Vấn đề
Light mode đang dùng vẫn giữ nguyên, nhưng chưa có Dark Mode hoạt động thật và chưa có nút chuyển đổi trực quan trên shell.

### Ảnh hưởng
I5 yêu cầu Dark Mode UI; style guide đã quy định cơ chế từ trước nhưng chưa hiện thực. Đây là phần còn lại của hạng mục đã được thiết kế.

---

## 2. Hiện trạng
| Tệp | Hiện trạng |
|---|---|
| `src/lib/theme.ts` | Đủ hàm thuần `resolveInitialTheme`, `nextTheme`, `applyTheme`, `persistTheme` — giữ nguyên (I2). |
| `src/hooks/useTheme.ts` | Hook `useTheme()` trả `{ mode, toggle }` — chưa được shell dùng. |
| `src/styles/globals.css` | `:root` có ~60 semantic token (light); comment "LIGHT MODE ONLY"; **không có selector `.dark`**. |
| `src/layouts/header/HeaderActions.tsx` | Xếp chip lọc, lọc quốc gia, countdown, `RealtimeClock` — chưa có toggle. |
| `tests/theme.test.ts` | TC-07 asserts shell không có toggle trên `DashboardLayout.tsx` — assertions vẫn đúng nếu toggle nằm riêng trong `header/ThemeToggle.tsx`. |

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Giữ nguyên Light mode mặc định hiện tại (light-first); bổ sung bộ token Dark Mode đầy đủ cho `.dark` (background, foreground, card, primary, muted, accent, border, surface, sidebar, chart, shadow) trong `globals.css`.
  2. Thêm nút SVG toggle (Sun/Moon) ở **header bên phải, ngay sau đồng hồ realtime**, dùng `useTheme()` có sẵn; có `aria-label`, `aria-pressed`, tooltip, lưu lựa chọn vào localStorage.
  3. CSS toggle dùng design token, đồng bộ Dark Mode, có focus-visible và reduced-motion.
- **Out of Scope:**
  - Không đổi `lib/theme.ts`, `hooks/useTheme.ts`, `chart-theme.ts` (đã đúng — I2).
  - Không đổi contracts, API, BE, docs, migration, `.env*`, aside nav, 6 patterns, header widgets khác.
  - Không thêm dependency (lucide-react đã có sẵn).

---

## 4. Giải pháp đề xuất
### 4.1. Dark token
- Cập nhật comment mục 2 của `globals.css` ("LIGHT MODE ONLY" → Light-first + Dark Mode).
- Thêm khối `.dark { color-scheme: dark; ... }` ngay sau `:root`, override các token ngữ nghĩa bằng palette tối (slate/indigo), giữ nguyên tên token → mọi component/page dùng `var(--...)` tự đổi màu, không cần sửa từng file (I5).
- Giữ `--sidebar-*`, `--chart-*`, `--shadow-*` theo đúng ngữ cảnh tối.

### 4.2. Toggle
- Tệp mới `layouts/header/ThemeToggle.tsx`: `useTheme()` → `<button>` chứa icon SVG (`Sun` / `Moon` từ lucide-react), `onClick={toggle}`, `aria-label`, `aria-pressed={mode === "dark"}`, `title`.
- `HeaderActions.tsx`: render `<ThemeToggle />` **sau `<RealtimeClock />`** (tay phải).
- `layout.css`: `.header-theme-toggle` — pill bo tròn, nền `accent`, hover `primary`, focus ring `ring`, transition; tôn trọng `prefers-reduced-motion`.

### 4.3. I1–I7
FE shell (T7), không worker (I1) · giữ chữ ký hàm cũ, chỉ thêm (I2) · không đổi payload/UTC/WGS84 (I3) · không migration (I4) · Dark Mode bằng token, không hardcode, không mock (I5) · không secret (I6) · test offline (I7).

---

## 5. Phương án đã cân nhắc
### A: Sửa từng component CSS theo `.dark`
Ưu: kiểm soát chi tiết; nhược: sửa nhiều file, dễ sót, vi phạm I5 (hardcode màu). **Không chọn.**
### B: Override token ngữ nghĩa trong `.dark` + toggle dùng hook có sẵn
Ưu: 1 khối CSS đổi toàn app, tận dụng theme.ts/useTheme.ts đã test, 0 dependency mới. **Chọn.**
### C: Dùng thư viện next-themes / thêm dependency
Ưu: có sẵn; nhược: không cần thiết, tăng bundle, ra khỏi scope. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp — 1 khối CSS + 1 component nhỏ | Tái dùng hook/hàm đã có |
| Hiệu năng | Không đáng kể | Chỉ đổi class trên `<html>` |
| Bảo trì | Tốt — token tập trung, component không hardcode màu | I5 |
| Độ tin cậy | Tốt — localStorage + system preference đã có test | I7 |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Thiếu token `.dark` → một số vùng vẫn sáng | Trung bình | Trung bình | Liệt kê đủ token ngữ nghĩa + test so sánh bộ token light/dark |
| `theme.test.ts` TC-07 kỳ vọng "không có toggle" | Thấp | Thấp | Toggle nằm trong `header/ThemeToggle.tsx`, `DashboardLayout.tsx` không đổi nội dung kiểm tra |
| Leaflet/Recharts không tự đổi màu theo token | Trung bình | Thấp | Không đụng map/chart theme có sẵn; chỉ đổi shell token |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-21-darkmode-toggle-thien.md` *(copy `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Test offline:** `apps/web/tests/theme-toggle.test.ts` *(mới — kiểm `.dark` override đủ token, cấu trúc component toggle dùng `useTheme`/`aria-pressed`/SVG, `HeaderActions` đặt toggle sau clock, theme.test.ts cũ vẫn pass)*
- **Lệnh:** `cd apps/web && pnpm test`, `pnpm build`, `python3 scripts/notes_index.py --check`

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-21
Comments: Xác nhận rõ trong chat 2026-11-21: "checkout sang nhánh mới để giải quyết vấn đề: thêm chức năng darkmode, light mode hiện tại vẫn dùng, darkmode. nút svg chuyển đổi chế độ nằm ở header bên phải đồng hồ realtime". Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chạy `build-implementation`: tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md` (đã rẽ nhánh `feat/2026-11-21-darkmode-toggle-thien`), triển khai, validation xanh rồi dừng **CHECKPOINT 1**.
