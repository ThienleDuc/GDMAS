# Proposal: Cài đặt lại style UI theo Design System — mỗi page một CSS, component dùng chung CSS riêng, layout dùng chung 1 file

## Metadata
- ID: 2026-11-17-ui-component-styles-thien
- Author: agent | thien
- Created: 2026-11-17
- Type: refactor
- Status: approved
- Priority: medium
- Area: `apps/web/src/` (styles/, layouts/, components/{ui,charts,map}/, features/*/) + `docs/guides/design/style-guide.md`
- Architecture Impact: none
- Related Docs:
  - docs/guides/design/style-guide.md  *(nguồn chân lý thiết kế — đã được cung cấp)*
  - docs/agent-workflow.md
  - docs/coding-rules.md (I2 OCP, I5 Dark Mode & 6 Patterns, I7)
  - AGENTS.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md (completed — chỉ đọc)
  - .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md (completed — giữ nguyên 12/12 chart-data test)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 7 (React + Vite) hiện có hai nguồn style:
- `apps/web/src/styles/index.css` (~40 dòng): theme cyan, nền tối cố định (`color-scheme: dark`), reset + scrollbar — đang được `main.tsx` import.
- **Mới được cung cấp:** `docs/guides/design/style-guide.md` (bộ quy chuẩn Modern Enterprise SaaS, Indigo, Light-first + Dark Mode) và `apps/web/src/styles/globals.css` (toàn bộ token, base, component classes `ds-*`/`dashboard-*`/`app-*`, responsive, print) — **chưa được import vào ứng dụng**.

Style/layout của ~22 component/layout/page nằm rời rạc trong chuỗi utility Tailwind `className` dài dằng dặc, lặp lại ở nhiều nơi.

### Vấn đề
- Design system mới có sẵn nhưng chưa được áp dụng; giao diện hiện tại vẫn là dark-only, accent cyan — lệch hoàn toàn khỏi chuẩn Indigo/light-first đã chốt trong `style-guide.md`.
- Cần **đập đi xây lại hoàn toàn** phần style: không vá từng chỗ trên nền `index.css` cũ mà thay thế toàn bộ bằng design system mới.
- Không có ranh giới style theo **page**: muốn đổi giao diện một trang phải sửa nhiều file TSX lẫn với logic.
- Component dùng chung (AsyncState, ChartPanel, MapLegend…) không có file style riêng → khó tái sử dụng và kế thừa (I2/RULE-03).
- Layout được tách rời ở 3 file (`DashboardLayout`, `FullscreenMapLayout`, `ReportLayout`) → trùng lặp, rối mắt khi bảo trì.

### Ảnh hưởng
Đụng trực tiếp đến I5 (6 Patterns & Dark Mode UI) và khả năng mở rộng T7. Đây là **xây lại toàn bộ lớp style** (xóa `index.css`, thay bằng `globals.css` + CSS theo page/component/layout), **không đổi logic, contract hay API**.

---

## 2. Hiện trạng
- `main.tsx`: `import "./styles/index.css"` (chưa import `globals.css`).
- `globals.css`: hoàn chỉnh nhưng **chưa có import trong source**; cần lưu ý `@import "tw-animate-css"` chưa có trong `package.json` (phải bổ sung dependency khi triển khai).
- 6 page, ~17 component dùng chung, 3 layout — toàn bộ dùng Tailwind utility inline, không có file `.css` cạnh mã nguồn.
- `index.html`, `main.tsx` sẽ đổi ở phần import/style; `contracts/`, `apps/api/**` giữ nguyên.
- **`index.css` sẽ bị xóa** theo yêu cầu "đập đi xây lại" — xem xét ngoại lệ I2 ở §7.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Dùng `apps/web/src/styles/index.css` làm **CSS entry point duy nhất** để gọi Tailwind, design system `globals.css`, `tw-animate-css`, rồi các file style layout/page/component. Dùng `docs/guides/design/style-guide.md` + `globals.css` làm nền tảng token/design system (Indigo, spacing 4px, radius, shadow, light-first + `.dark`, responsive, print). Đập bỏ lớp style cũ, xây lại từ đầu bằng token.
  2. **Mỗi page một file CSS riêng** đặt cạnh page (`features/<name>/<Name>Page.css`) — chứa toàn bộ style/layout đặc thù của trang đó.
  3. **Component dùng chung**: mỗi component được tách ra dùng chung có **một file CSS riêng** cạnh component (`components/<group>/<Component>.css`), dùng token từ `globals.css`, không hardcode màu.
  4. **Layout dùng chung đúng 1 file** `apps/web/src/layouts/layout.css` cho cả 3 layout (Dashboard / Fullscreen Map / Report) — không tách thành 3 file; chứa phần shell chung + biến thể (`.layout--fullscreen`, `.layout--report`).
  5. Viết lại toàn bộ `className` trong TSX sang class ngữ nghĩa của design system; giữ nguyên props/hàm/public signature (I2). `main.tsx` chỉ import `index.css`; `index.css` gọi tập trung các stylesheet.
  6. Bổ sung test offline kiểm tra cấu trúc style + `pnpm build` pass; giữ nguyên 6 file test cũ (I7).
  7. **Lộ trình:** Giai đoạn 1 làm riêng phần layout (xem §4.4) theo chỉ thị hiện tại; 6 page cụ thể và component CSS sẽ sắp xếp ở giai đoạn sau.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi logic, state, SSE, service, hook, `src/contracts/`, `src/types/`, props/public signature (I2).
  - Không đụng `apps/api/**`, `contracts/**`, migration, `.env`, `AGENTS.md`, `.githooks/`.
  - Không xóa/sửa 6 file test cũ trong `apps/web/tests/`.
  - Không tự sửa `style-guide.md` hay nội dung thiết kế đã chốt trong `globals.css` (chỉ bổ sung dependency/import nếu cần).
  - Không đổi nguồn dữ liệu API/mock, 6 Patterns hay cấu trúc 7 Terminals (I5).

---

## 4. Giải pháp đề xuất

### 4.1. Cấu trúc file style (đập đi xây lại — xóa `index.css`)
```text
apps/web/src/
├── main.tsx                       (chỉ import ./styles/index.css)
├── styles/
│   ├── index.css                  (ENTRY POINT: tailwind + tw-animate-css + globals.css + mọi style)
│   └── globals.css                (FOUNDATION: token/base/ds-*/app-*/dashboard-* — đã có)
├── layouts/
│   └── layout.css                 (DUY NHẤT 1 file cho 3 layout: dashboard/fullscreen/report; import tập trung từ index.css)
├── components/
│   ├── ui/
│   │   ├── AsyncState.css
│   │   ├── ConnectionStatusBadge.css
│   │   └── IngestionToast.css
│   ├── charts/
│   │   ├── ChartPanel.css
│   │   ├── EmptyChartState.css
│   │   ├── TemporalPatternCharts.css
│   │   ├── TrendPatternChart.css
│   │   ├── SeasonalityPatternChart.css
│   │   ├── ForecastPatternChart.css
│   │   ├── ClassificationPatternChart.css
│   │   └── CorrelationHeatmap.css
│   └── map/
│       ├── SeismicMap.css
│       ├── MapFilterPanel.css
│       ├── MapLegend.css
│       ├── MapPopupCard.css
│       ├── ClusterLayer.css
│       └── EarthquakeMarkerLayer.css
└── features/
    ├── dashboard/DashboardOverviewPage.css
    ├── earthquakes/EarthquakesPage.css
    ├── statistics/StatisticsPage.css
    ├── monitoring/MonitoringMapPage.css
    ├── reports/ReportsPage.css
    └── settings/SettingsPage.css
```

### 4.2. Nguyên tắc triển khai
- **Page CSS** (`features/**/*.css`): chứa bố cục riêng của từng trang (page heading, toolbar, KPI/Bento grid cho Dashboard; bảng danh mục cho Earthquakes; lưới 6 chart cho Statistics; HUD map cho Monitoring; layout tài liệu in cho Reports; form/cấu hình cho Settings). Dùng class từ `globals.css` (`page-heading`, `dashboard-grid`, `dashboard-card`, `ds-table`, `ds-button`, …) làm nền, chỉ thêm phần đặc thù.
- **Component CSS** (`components/**/*.css`): mỗi component dùng chung tự sở hữu style, import trực tiếp trong TSX (`import "./X.css"`). Class đặt namespace theo component (`ui-badge--open`, `chart-metric`, `map-legend`, …) để tránh va chạm. Màu/số đo lấy từ token (`var(--primary)`, `var(--radius-lg)`, `var(--space-4)`, …) — **không hardcode**.
- **Layout CSS** (`layouts/layout.css`): một file duy nhất, import ở cả 3 layout. Dùng class chung `.app-layout` / `.app-sidebar` / `.app-header` / `.app-content` từ `globals.css` cộng modifier `.layout--fullscreen`, `.layout--report` cho 2 biến thể. Không tạo `DashboardLayout.css`, `FullscreenMapLayout.css`, `ReportLayout.css`.
- **CSS entry point**: `main.tsx` import duy nhất `styles/index.css`; file này quản lý import `tailwindcss`, `tw-animate-css`, `globals.css`, `layouts/layout.css` và khi được duyệt sẽ thêm page/component styles. Tránh stylesheet rải import ở nhiều entry.
- **Tailwind v4**: file có `@apply` sử dụng `@reference` phù hợp; giữ `@layer components` cho class ngữ nghĩa.
- **Dark Mode**: tuân `style-guide.md` — class `.dark` trên `<html>`, semantic token tự đổi; không hardcode màu sáng/tối trong page/component CSS.

### 4.3. Tiền đề kỹ thuật (khi triển khai — không làm ở bước proposal)
- Thêm dependency `tw-animate-css` vào `apps/web/package.json` (import tại CSS entry point `index.css`) và quản lý bằng pnpm/Corepack version khớp pnpm store của máy.
- Giữ `apps/web/src/styles/index.css` làm **CSS entry point duy nhất**: import Tailwind, `tw-animate-css`, `globals.css`, `layouts/layout.css` và về sau các page/component CSS.
- `main.tsx` import `./styles/index.css`; các TSX layout/page/component không tự import stylesheet lẻ nếu stylesheet đã được đăng ký tập trung trong entry point.
- `globals.css` chỉ giữ design tokens/base/shared primitives, không lặp import Tailwind/animate; `layout.css` chứa cả ba layout trong một file.
- Dùng Corepack pnpm version khớp workspace/store v11 để quản lý dependency thay vì ép pnpm 10 cài lại store.

### 4.4. Layout — rà soát & phương án chi tiết (LÀM TRƯỚC)

> Theo chỉ thị hiện tại: **chỉ triển khai phần layout trước**, 6 page cụ thể sẽ sắp xếp sau. Mục này là phương án thiết kế, chưa code.

#### 4.4.1. Hiện trạng 3 layout

| Layout | Cấu trúc hiện tại | Điểm cần đổi theo design system |
|---|---|---|
| `DashboardLayout` | Root `flex h-screen … bg-slate-950`; sidebar `w-64 / w-20` (256/80px) nền cyan; brand + nav + footer status; header `h-16` backdrop-blur; main `overflow-y-auto p-6`; toast cố định | Sidebar thu gọn phải dùng token `--sidebar-width-collapsed` (**72px**, hiện đang 80px); active nav dùng `--sidebar-accent` thay cyan; mọi màu `slate-*/cyan-*` → token; mobile hiện chỉ collapse, chưa phải Drawer (globals.css ghi chú cần Drawer) |
| `FullscreenMapLayout` | Root `relative h-screen`; floating header `absolute top-4 … z-[1000] pointer-events-none`; chip glassmorphism; main `h-full` | Style-guide cấm "glassmorphism đại trà" → dùng `var(--card)` + `var(--border)` + `var(--shadow-sm)`; `z-[1000]` → token `--z-sticky` / `--z-toast`; chip cyan/rose hardcode → token semantic |
| `ReportLayout` | Root `min-h-screen`; toolbar `sticky … print:hidden`; report header; main `pb-12` | Tái dùng rule print có sẵn trong `globals.css` (`.app-sidebar`, `.app-header` ẩn; `.app-content` bỏ padding); thay `print:hidden` bằng class `.layout__no-print` tự định nghĩa trong `layout.css` |

#### 4.4.2. File duy nhất: `apps/web/src/layouts/layout.css`

Dùng `@reference "../styles/globals.css"`, gộp cả 3 biến thể trong **1 file** (không tạo 3 file riêng):

```text
layout.css
├── A. Shell dùng chung (3 layout đều import)
│   .layout            → kế thừa .app-layout (globals.css)
│   .layout__sidebar   → .app-sidebar + .sidebar-nav; modifier .is-collapsed (72px)
│   .layout__brand / .layout__nav-link / .layout__nav-badge / .layout__status
│   .layout__header    → .app-header (64px); .layout__breadcrumb / .layout__actions
│   .layout__content   → .app-content (max 1600px, padding 32/24/16)
│   .layout__no-print  → ẩn khi @media print
├── B. Biến thể .layout--fullscreen
│   .layout--fullscreen .layout__overlay  → absolute, z-index var(--z-sticky)
│   .layout--fullscreen .layout__overlay-chip → surface + border + shadow-xs
│   .layout--fullscreen .layout__viewport → full viewport cho <Outlet/>
└── C. Biến thể .layout--report
    .layout--report .layout__report-toolbar / .layout__report-head / .layout__report-body
    (tái dùng rule print của globals.css, không tự viết lại @media print)
```

#### 4.4.3. Ánh xạ class (DashboardLayout — vi dụ)

| Hiện tại | Sau khi refactor |
|---|---|
| `flex h-screen … bg-slate-950 text-slate-100` | `layout app-layout` |
| `… w-64 / w-20 (bg-slate-900/95 border-slate-800)` | `layout__sidebar app-sidebar` + `is-collapsed` |
| `NavLink … bg-cyan-500/15 text-cyan-300 …` | `layout__nav-link sidebar-nav-item` + modifier `active` |
| `flex h-16 … bg-slate-900/70 px-6` | `layout__header app-header` |
| `flex-1 overflow-y-auto p-6 bg-slate-950` | `layout__content app-content` |
| `hidden sm:flex … bg-slate-800/80 …` | `.layout__clock` (trong `layout.css`, dùng token) |
| `fixed top-5 right-5 z-50 …` (Toast) | giữ nguyên ở component CSS riêng của `IngestionToast` (không đưa vào layout) |

#### 4.4.4. Quyết định & rủi riêng của layout

- **Dark mode:** vì đập đi xây lại theo `style-guide.md`, mặc định là **light-first**; dark mode dùng class `.dark` trên `<html>` và token tự đổi. Cơ chế chuyển đổi theme (toggle) để ở giai đoạn sau — giai đoạn 1 chỉ đảm bảo class ngữ nghĩa không hardcode màu sáng/tối. Không ép `<html class="dark">` như cũ.
- **Mobile:** với breakpoint `< 768px`, `globals.css` ẩn `.app-sidebar`; nav mobile cần Drawer/Sheet — để ở giai đoạn sau (không thuộc phạm vi layout trước mắt).
- **Không đụng** SSE, toast, clock, breadcrumb logic — chỉ đổi `className` + 1 dòng `import "./layout.css"` trong 3 file layout.

#### 4.4.5. Phạm vi giai đoạn 1 (layout trước)

- Tạo mới: `apps/web/src/layouts/layout.css`
- Sửa: `styles/index.css` (entry point trung tâm), `styles/globals.css` (token/base), `main.tsx` (import index), `DashboardLayout.tsx`, `FullscreenMapLayout.tsx`, `ReportLayout.tsx`. Layout TSX không import CSS riêng.
- **Chưa làm:** 6 page CSS, ~17 component CSS, implement/testcase, chạy build
- Kiểm chứng khi làm: import đúng 1 file layout ở cả 3 nơi; build pass; so sánh light/dark

---

## 5. Phương án đã cân nhắc
### Phương án A: 3 file CSS riêng cho 3 layout + CSS Modules cho mọi component
Ưu: scoped tuyệt đối. Nhược: nhiều file layout gây rối mắt (đúng điều bạn muốn tránh), churn cực lớn khi đổi `styles.xxx` trên 8.000 LOC, rủi ro sai tên class cao. **Không chọn.**

### Phương án B: Page CSS riêng + component CSS riêng + 1 layout CSS chung + globals.css làm nền
Ưu: đúng yêu cầu (mỗi page một style, component dùng chung tự sở hữu CSS, layout chỉ 1 file), tận dụng design system có sẵn, class namespace + `@reference` giữ an toàn thị giác, dễ review. Nhược: vẫn cần đổi `className` trên TSX. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Cao | Xóa `index.css`, xây lại ~28 file CSS mới (6 page + ~17 component + 1 layout), viết lại className |
| Số lượng file layout | Giảm | Gộp 3 → 1, dễ nhìn |
| Hiệu năng | Không đổi | Vite gộp CSS; token dùng `var()` compile-time |
| Bảo trì / Open-Closed | Tốt (có ngoại lệ) | Mỗi page/component tự sở hữu style; đổi trang không đụng logic. Ngoại lệ: xóa `index.css` theo yêu cầu (I2) |
| Độ tin cậy | Cao | Token tập trung, light/dark theo chuẩn; build + test chặn lỗi |
| Tương thích ngược (I2) | Có điều chỉnh | Người dùng ủy quyền rõ xóa file style cũ; không đụng API/logic/contract |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Thiếu `tw-animate-css` → build fail | Cao nếu bỏ qua | Trung bình | Bổ sung dependency + cài đặt trước khi build |
| `@reference` sai đường dẫn | Trung bình | Thấp | Dùng đường dẫn tương đối đúng từng thư mục; build bắt lỗi |
| Chuyển light-first làm sai lệch giao diện cũ | Trung bình | Trung bình | Dùng token có sẵn; kiểm tra trực quan light + `.dark` |
| Va chạm class toàn cục | Thấp | Trung bình | Namespace theo component; ưu tiên class `ds-*`/`dashboard-*` từ globals |
| Đụng logic khi sửa className | Thấp | Cao | Chỉ thay `className` + thêm import; không sửa props/hàm |
| Xóa `index.css` vi phạm I2 | — | Thấp | Người dùng yêu cầu rõ "bỏ luôn css trước đó, đập đi xây lại"; ghi thành ngoại lệ có ủy quyền trong `status.md`, không đụng file lõi/contract |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-17-ui-component-styles-thien.md` *(copy từ `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):** `apps/web/tests/component-styles.test.ts` — đọc filesystem, kiểm tra:
  - 6 page có file CSS riêng + import đúng;
  - mỗi component dùng chung có CSS riêng + import đúng;
  - chỉ có **1** file layout CSS (`layouts/layout.css`) được 3 layout import;
  - `globals.css` là nền tảng (chứa `--primary`, `.dark`, `ds-*`…), `main.tsx` import `globals.css`;
  - `index.css` là entry point duy nhất, import Tailwind, animate, globals, layout; `main.tsx` import index;
  - không hardcode mã màu trong page/component CSS (chỉ dùng `var(--…)`).
- **Cách kiểm chứng:** `cd apps/web && pnpm test` (node --test) + `pnpm build` + `python3 scripts/notes_index.py --check`. Giữ nguyên 6 file test cũ pass.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-17
Comments: Người dùng xác nhận rõ triển khai và yêu cầu dừng sau build/test. Cập nhật cấu trúc theo chỉ thị mới: giữ `index.css` làm CSS entry point trung tâm (import Tailwind, animate, globals, layout); `main.tsx` import index; không xóa index. Dừng sau validation, không chạy review-pr/push/merge.
Scope of Rejection: -

---

## 10. Next Action
Chờ thành viên xác nhận §9 (bất kỳ thành viên nào trong `.agents/team.md` cũng duyệt được, không cần `ThienleDuc`). Sau khi `Approved` mới chuyển `build-implementation`: rẽ nhánh, tạo đồng thời `implemented/<id>/` + `testcase/<id>.md`, quản lý dependency qua pnpm version khớp workspace, rồi **triển khai giai đoạn 1 trước: layout theo §4.4** (1 file `layout.css` + 3 layout TSX), đăng ký stylesheet qua `index.css` entry point. 6 page và component CSS để ở giai đoạn 2 theo chỉ thị người dùng. Mặc định light-first theo `style-guide.md`; theme toggle tính sau.
