# Proposal: Tái tạo layout — breadcrumb tiếng Việt, aside dạng rail + hover card, mở rộng vùng nội dung

## Metadata
- ID: 2026-11-21-layout-aside-hover-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: refactor
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: `apps/web/src/layouts/DashboardLayout.tsx`, `apps/web/src/layouts/layout.css`, `apps/web/src/layouts/navigation.ts` (mới), `apps/web/tests/layout-styles.test.ts`
- Architecture Impact: none
  <!-- Chỉ đổi shell FE: nhãn breadcrumb, hành vi aside, độ rộng vùng nội dung. Không đổi endpoint, schema, payload, docs/api/API.md hay contracts/. Cây thư mục FE đã có layouts/ từ PR #26 nên không phát sinh drift. -->
- Related Docs:
  - docs/task/thien.md — T7.01 (nền tảng FE), §0.4 quy ước I2/I5
  - docs/architecture.md §12 (cấu trúc FE), docs/quyuocchung.md, docs/coding-rules.md
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — nền layout đơn nhất hiện tại
  - .agents/notes/proposed/2026-11-21-monitoring-leaflet-map-markers-thien.md — có useEffect tự thu aside trên `/monitoring` sẽ bị gỡ ở proposal này
- Related Proposals:
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — đã chuẩn hóa 1 layout + globals.css; proposal này chỉ chỉnh lại **hành vi** shell (không đụng contracts/lib/services).
  - .agents/notes/proposed/2026-11-17-ui-component-styles-thien.md — đã bị override bởi restructure 2026-11-20; Scope of Rejection `-`, không cấm chỉnh layout.
  - Overrides: 2026-11-20-fe-restructure-globals-css-thien — **chỉ riêng quyết định về shell** (aside có thể thu/mở, breadcrumb, độ rộng nội dung); giữ nguyên mọi quyết định khác (1 layout, CSS tập trung, contracts/lib).
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Shell FE hiện là một `DashboardLayout` duy nhất: aside có nút toggle `Menu`/`X` (`sidebarOpen`), tự thu khi vào `/monitoring` (Revision T7.04), breadcrumb lấy trực tiếp `location.pathname.replace("/", "")`, và vùng nội dung bị giới hạn bởi `width: min(100%, var(--content-max-width))` + `margin-inline: auto`.

### Vấn đề
1. Breadcrumb hiển thị slug tiếng Anh (`monitoring`, `earthquakes`, `statistics`, `reports`, `settings`) thay vì nhãn tiếng Việt đã có trong `NAV_ITEMS`.
2. Aside chiếm chỗ ngay cả khi thu gọn và nút toggle gây thao tác thừa; nội dung hover bị ẩn nên người dùng không biết mục điều hướng khi rail chỉ còn icon.
3. Vùng nội dung bị ép bởi `--content-max-width`, lãng phí không gian ngang — đặc biệt trên màn hình rộng và với trang bản đồ/panel lọc.

### Ảnh hưởng
Shell là khung của cả 6 route; chỉnh đúng giúp nhất quán ngôn ngữ (I3/I5), giảm thao tác điều hướng và tối đa không gian hiển thị cho bản đồ, bảng và biểu đồ.

---

## 2. Hiện trạng
- `DashboardLayout.tsx:36–45`: `sidebarOpen` + `useEffect` tự thu trên `APP_ROUTES.MONITORING`.
- `DashboardLayout.tsx:68–75`: nút toggle `X`/`Menu`, title "Thu gọn/Mở rộng sidebar".
- `DashboardLayout.tsx:92–106`: `title`/label/badge chỉ render khi `sidebarOpen`.
- `DashboardLayout.tsx:120–126`: breadcrumb `"GDMAS / " + location.pathname.replace("/", "")`.
- `layout.css:63–82`: `.layout__sidebar` dùng `--sidebar-width`; `.is-collapsed` → `--sidebar-width-collapsed` (72px).
- `layout.css:288–296`: `.layout__content { width: min(100%, var(--content-max-width)); margin-inline: auto; }`.
- `layout.css:298–322`: media query chỉ đổi padding + rail trên mobile.
- `layout-styles.test.ts`: 5 test kiểm tra cấu trúc shell/CSS entry point — đã pass, phải giữ nguyên (I7).

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Breadcrumb dùng nhãn **tiếng Việt** lấy từ cấu hình điều hướng dùng chung (`"/" → "Tổng quan"`, `"/monitoring" → "Bản đồ Giám sát"`, …); route lạ → `"Không tìm thấy trang"` hoặc `"Trang"` — không lộ slug tiếng Anh.
  2. Aside **luôn ở trạng thái rail thu gọn** (`--sidebar-width-collapsed`): bỏ nút toggle, bỏ state `sidebarOpen`, bỏ effect tự thu trên `/monitoring`. Mục điều hướng luôn dùng được ở dạng icon.
  3. Khi **hover/focus** một mục rail → hiện **card absolute nổi lên** bên phải (`layout__nav-popover`) chứa tên đầy đủ + mô tả ngắn + badge (nếu có); card nằm ngoài luồng (`position: absolute`, `z-index` cao), không làm giãn layout hay dịch các mục khác. Hỗ trợ cả `focus-visible` (bàn phím).
  4. Vùng nội dung **nới rộng**: bỏ giới hạn `min(100%, var(--content-max-width))` và `margin-inline: auto`, cho `width: 100%`; giữ padding theo token và responsive.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi nội dung 6 route, component/page, services, contracts, `apps/api/**`, migration.
  - Không đổi `globals.css` (dùng token có sẵn), không đổi `App.tsx`/`routes.tsx`, không thêm dependency.
  - Không dựng lại CSS entry point hay thêm layout thứ 2; giữ `styles/index.css` import tập trung.
  - Không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân thủ **RULE-03/I2** (giữ `DashboardLayout`, `layout.css`, barrel; chỉ thêm `navigation.ts` + bổ sung class), **I5** (Dark/Light token, không hardcode màu), **I7** (test thuần offline).

### 4.1. `apps/web/src/layouts/navigation.ts` (mới, thuần)
- Xuất `NavItemMeta` gồm `path`, `label`, `description`, `badge?` (không chứa React component — icon vẫn nằm trong `DashboardLayout`).
- `NAV_META`: 6 mục, ví dụ `/monitoring` → `{ label: "Bản đồ Giám sát", description: "Marker địa chấn realtime theo quốc gia và khu vực", badge: "Live" }`.
- `routeLabel(pathname): string` — khớp exact cho `/`, `startsWith` cho các route con; mặc định `"Trang"` (không trả slug tiếng Anh). Dùng cho breadcrumb.
- `navMetaFor(pathname)` — trả meta của mục active để breadcrumb/popover dùng chung nguồn.

### 4.2. `DashboardLayout.tsx`
- Bỏ `useState`/`useEffect`/import `Menu`, `X`, `APP_ROUTES` liên quan đến toggle & tự thu aside; giữ `useLocation`, `useSSE`, `SseMarkersProvider`.
- `<aside className="layout__sidebar app-sidebar">` — **không còn** `is-collapsed` do state; CSS mặc định rail.
- Brand: chỉ giữ `layout__brand-mark` (icon Globe); bỏ `layout__brand-copy` và nút toggle.
- Mỗi `NavLink`: `className` gồm `group`, `aria-label={label}`, `aria-current` khi active; bỏ render `label`/`badge` nội bộ; thêm phần tử popover (xem 4.3).
- Breadcrumb: `<span>GDMAS</span> <ChevronRight/> <span>{routeLabel(location.pathname)}</span>` — `routeLabel` từ `navigation.ts`.

### 4.3. Card nổi khi hover — `layout__nav-popover`
```tsx
<NavLink ... className="layout__nav-link group">
  <Icon ... />
  <span className="layout__nav-popover" role="tooltip">
    <strong>{meta.label}</strong>
    <span>{meta.description}</span>
    {meta.badge && <em>{meta.badge}</em>}
  </span>
</NavLink>
```
- CSS: `.layout__nav-popover { position:absolute; left: calc(100% + var(--space-3)); top:50%; transform: translateY(-50%); width: 240px; padding: var(--space-3); border:1px solid var(--border); border-radius: var(--radius-lg); background: var(--card); color: var(--card-foreground); box-shadow: var(--shadow-md); opacity:0; visibility:hidden; pointer-events:none; z-index: var(--z-tooltip); }`
- Hiện khi `.layout__nav-link:hover .layout__nav-popover, .layout__nav-link:focus-visible .layout__nav-popover { opacity:1; visibility:visible; }`.
- `.layout__nav-link { position: relative; }` — card là con của link nên không cần JS hover state.
- Với `overflow-y:auto` trên `.layout__nav`, đặt popover tránh bị cắt: cho phép overflow x hoặc dùng `position: fixed` qua portal nếu cần — nhưng ưu tiên giữ absolute + `overflow: visible` trên trục ngang (`overflow-x: visible; overflow-y: auto` không áp dụng được song song trong CSS → sẽ đánh giá và nới `padding`/`overflow` phù hợp trong lúc implement; ghi rõ tại §7).

### 4.4. Nới rộng nội dung — `layout.css`
- `.layout__content { width: 100%; max-width: none; margin-inline: 0; }` (bỏ `min(100%, var(--content-max-width))`); giữ `padding: var(--page-padding)` + media query hiện có.
- `.layout--dashboard .layout__sidebar` mặc định `flex-basis/width = var(--sidebar-width-collapsed)`; bỏ rule `.is-collapsed` riêng (không còn class) hoặc giữ làm alias tương thích nếu module khác còn dùng (grep trước khi bỏ).

### 4.5. Test strategy
- `apps/web/tests/layout-navigation.test.ts` (mới) — thuần, `node --test`: `routeLabel` cho 6 route + route lạ, `navMetaFor` trả đủ label/description.
- `apps/web/tests/layout-styles.test.ts` (bổ sung additive, giữ 5 test cũ): kiểm breadcrumb dùng `routeLabel` (không `.replace("/","")`), không còn nút toggle/`sidebarOpen`/`is-collapsed`, có `layout__nav-popover` trong component + CSS có `position:absolute`, `.layout__content` không còn `--content-max-width`.
- Chạy `cd apps/web && pnpm build && pnpm test`, `python3 scripts/notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### Phương án A: Giữ toggle, chỉ dịch breadcrumb
Ưu: diff nhỏ. Nhược: không đáp ứng yêu cầu bỏ đóng/mở aside và mở rộng nội dung. **Không chọn.**
### Phương án B: Mở rộng aside mặc định rồi hover card
Ưu: nhãn luôn hiện. Nhược: chiếm lại không gian vừa muốn mở rộng. **Không chọn.**
### Phương án C (chọn): Rail cố định + hover card + nội dung full-width
Ưu: nhất quán, tối đa không gian, vẫn dễ nhận mục điều hướng. Nhược: cần xử lý card không bị cắt bởi `overflow` của nav. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | +1 file thuần (`navigation.ts`) + 1 file test; sửa 2 file shell | Tách nhãn để test offline, component chỉ render |
| Không gian | Nội dung rộng hơn ~184px so với sidebar mở (256px → 72px) + bỏ max-width | Yêu cầu "nới rộng phần chứa nội dung" |
| Tương tác | Không còn toggle; hover/focus để xem mô tả | Bỏ thao tác thừa, rail luôn dùng được |
| Bảo trì / OCP | Tốt: giữ layout/CSS entry point, không đụng page/service | RULE-03 |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Popover bị cắt bởi `overflow-y:auto` của `.layout__nav` | Trung bình | Trung bình | Thử `overflow: visible` + scroll ở aside; nếu không được, chuyển card sang `position: fixed` tính theo `getBoundingClientRect()` trong effect nhỏ (vẫn không thêm state toggle) |
| Test cũ `layout-styles.test.ts` kỳ vọng `is-collapsed`/toggle | Cao | Thấp | Chỉ bổ sung case mới; nếu test cũ assert nút toggle thì cập nhật additive có giải trình trong testcase (I7: không xóa test đang pass) |
| Breadcrumb route lạ trả slug | Thấp | Thấp | `routeLabel` fallback `"Trang"`, test route lạ |
| Mất khả năng xem nhãn trên touch screen (không hover) | Trung bình | Thấp | `aria-label` + mô tả trong popover; cân nhắc `:active`/`:focus` trên touch — đánh giá khi implement, ghi deviation nếu cần |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-layout-aside-hover-thien.md` *(từ `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/layout-navigation.test.ts` *(mới — 6 route + route lạ + navMetaFor)*
  - `apps/web/tests/layout-styles.test.ts` *(bổ sung additive — breadcrumb tiếng Việt, không toggle, popover absolute, content full-width)*
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test`; `python3 scripts/notes_index.py --check`; kiểm chức năng: breadcrumb tiếng Việt trên 6 route, rail luôn thu, hover/focus hiện card, nội dung rộng toàn vùng.

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: Người dùng đang thao tác (`thien`) xác nhận rõ trong chat: "Approved" (2026-11-21). Duyệt toàn bộ §4: breadcrumb tiếng Việt, aside rail cố định bỏ toggle, hover/focus card absolute, nội dung full-width; kèm test thuần offline. Nhánh `refactor/2026-11-21-layout-aside-hover-thien` đã rẽ sẵn. Không đụng page/service/contracts.
Scope of Rejection: -   <!-- bắt buộc khi Rejected -->

---

## 10. Next Action
Chờ xác nhận §9 (bất kỳ `thien|son|van|tai`, không cần `ThienleDuc`). Nhánh `refactor/2026-11-21-layout-aside-hover-thien` đã rẽ sẵn theo yêu cầu người dùng. Sau `Approved`: chạy `build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, implement §4, validation, dừng CHECKPOINT 1 (cụm `tiếp tục workflow`).
