# MODERN ENTERPRISE SAAS DASHBOARD
## GLOBAL STYLE GUIDE & DESIGN SYSTEM

**Version:** 1.0.0  
**Design Style:** Modern Enterprise SaaS + Minimalist + Bento Grid  
**Theme:** Light First, Dark Mode Supported  
**Font:** Inter  
**Framework:** React + Tailwind CSS v4 + shadcn/ui  
**Primary Color:** `#4F46E5`

---

# 1. DESIGN PHILOSOPHY

## 1.1. Định hướng thiết kế

Hệ thống sử dụng phong cách Modern Enterprise SaaS Dashboard, tập trung vào tính chuyên nghiệp, khả năng đọc, hiệu quả thao tác và sự nhất quán.

### Nguyên tắc cốt lõi

1. **Clarity First:** Thông tin phải rõ ràng, dễ đọc và dễ nhận biết.
2. **Minimalism:** Hạn chế các thành phần trang trí không cần thiết.
3. **Consistency:** Các thành phần cùng chức năng phải có thiết kế thống nhất.
4. **Hierarchy:** Phân cấp thông tin thông qua kích thước, màu sắc, khoảng cách và độ đậm.
5. **Accessibility:** Đảm bảo khả năng sử dụng bằng chuột, bàn phím và thiết bị cảm ứng.
6. **Responsive:** Giao diện thích ứng với nhiều kích thước màn hình.
7. **Scalability:** Có thể mở rộng thành phần mà không phá vỡ hệ thống thiết kế.
8. **Token First:** Ưu tiên sử dụng Design Tokens thay vì giá trị CSS cố định.

## 1.2. Đặc trưng thị giác

| Thuộc tính | Quy chuẩn |
|---|---|
| Phong cách | Clean, Modern, Professional |
| Background | Neutral Light |
| Surface | White |
| Accent | Indigo |
| Typography | Inter |
| Border | Thin, Subtle |
| Border Radius | Medium |
| Shadow | Soft, Minimal |
| Layout | Sidebar + Header + Content |
| Grid | CSS Grid / Flexbox |
| Animation | Subtle, Functional |
| Density | Comfortable |

### Quy tắc

- Không sử dụng gradient mạnh làm nền chính.
- Không sử dụng Glassmorphism đại trà.
- Không sử dụng quá nhiều màu nhấn.
- Không lạm dụng shadow.
- Không sử dụng animation gây phân tâm.
- Không hardcode màu sắc trong từng component.
- Không sử dụng quá ba cấp độ phân cấp thị giác trong một nhóm nội dung.

---

# 2. COLOR SYSTEM

## 2.1. Primary Palette

Màu chủ đạo là Indigo.

| Token | HEX | Công dụng |
|---|---|---|
| primary-50 | `#EEF2FF` | Nền nhấn rất nhạt |
| primary-100 | `#E0E7FF` | Hover background |
| primary-200 | `#C7D2FE` | Border nhấn |
| primary-300 | `#A5B4FC` | Decorative |
| primary-400 | `#818CF8` | Secondary accent |
| primary-500 | `#6366F1` | Accent |
| primary-600 | `#4F46E5` | Primary |
| primary-700 | `#4338CA` | Hover |
| primary-800 | `#3730A3` | Active |
| primary-900 | `#312E81` | Dark accent |
| primary-950 | `#1E1B4B` | Deep accent |

### Quy tắc

- Primary Button sử dụng primary-600.
- Primary Button Hover sử dụng primary-700.
- Active Navigation sử dụng primary-50 và primary-700.
- Focus Ring sử dụng primary-500.
- Không sử dụng Primary làm màu nền toàn bộ Dashboard.

## 2.2. Neutral Palette

| Token | HEX |
|---|---|
| neutral-0 | `#FFFFFF` |
| neutral-50 | `#F8FAFC` |
| neutral-100 | `#F1F5F9` |
| neutral-200 | `#E2E8F0` |
| neutral-300 | `#CBD5E1` |
| neutral-400 | `#94A3B8` |
| neutral-500 | `#64748B` |
| neutral-600 | `#475569` |
| neutral-700 | `#334155` |
| neutral-800 | `#1E293B` |
| neutral-900 | `#0F172A` |
| neutral-950 | `#020617` |

## 2.3. Semantic Colors

### Success

| Token | HEX |
|---|---|
| success-light | `#DCFCE7` |
| success | `#16A34A` |
| success-dark | `#166534` |

### Warning

| Token | HEX |
|---|---|
| warning-light | `#FEF3C7` |
| warning | `#D97706` |
| warning-dark | `#92400E` |

### Error

| Token | HEX |
|---|---|
| error-light | `#FEE2E2` |
| error | `#DC2626` |
| error-dark | `#991B1B` |

### Info

| Token | HEX |
|---|---|
| info-light | `#DBEAFE` |
| info | `#2563EB` |
| info-dark | `#1E40AF` |

## 2.4. Semantic Surface Tokens

| Token | Light Mode | Dark Mode |
|---|---|---|
| background | `#F8FAFC` | `#0B1220` |
| foreground | `#0F172A` | `#F8FAFC` |
| surface | `#FFFFFF` | `#111827` |
| surface-secondary | `#F1F5F9` | `#1E293B` |
| muted | `#F1F5F9` | `#1E293B` |
| muted-foreground | `#64748B` | `#94A3B8` |
| border | `#E2E8F0` | `#334155` |
| input | `#E2E8F0` | `#334155` |

## 2.5. Text Colors

### Light Mode

- Primary Text: `#0F172A`
- Secondary Text: `#475569`
- Muted Text: `#64748B`
- Disabled Text: `#94A3B8`
- Link Text: `#4338CA`
- Inverse Text: `#FFFFFF`

### Dark Mode

- Primary Text: `#F8FAFC`
- Secondary Text: `#CBD5E1`
- Muted Text: `#94A3B8`
- Disabled Text: `#64748B`
- Link Text: `#A5B4FC`
- Inverse Text: `#0F172A`

### Quy tắc

- Không dùng màu nhạt cho nội dung quan trọng.
- Văn bản thông thường cần đạt tỷ lệ tương phản WCAG AA tối thiểu 4.5:1.
- Văn bản lớn cần đạt tối thiểu 3:1.
- Các thành phần điều khiển quan trọng cần có tương phản tối thiểu 3:1 với vùng liền kề.

---

# 3. TYPOGRAPHY SYSTEM

## 3.1. Font Family

**Primary Font:** Inter

```css
font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
```

**Monospace Font:**

```css
font-family: "JetBrains Mono", monospace;
```

### Quy tắc

- Inter dùng cho toàn bộ giao diện.
- Monospace dùng cho mã nguồn, ID kỹ thuật và dữ liệu dạng code.
- Không sử dụng quá hai font family.
- Không sử dụng font trang trí cho nội dung nghiệp vụ.

## 3.2. Font Size Scale

| Token | Size | Line Height |
|---|---|---|
| xs | 12px | 18px |
| sm | 14px | 20px |
| base | 16px | 24px |
| lg | 18px | 28px |
| xl | 20px | 28px |
| 2xl | 24px | 32px |
| 3xl | 30px | 38px |
| 4xl | 36px | 44px |

## 3.3. Font Weight

| Token | Weight |
|---|---|
| regular | 400 |
| medium | 500 |
| semibold | 600 |
| bold | 700 |

## 3.4. Typography Hierarchy

### Page Title

- Font Size: 24–30px
- Font Weight: 700
- Line Height: 1.25
- Letter Spacing: -0.025em

### Section Title

- Font Size: 18–20px
- Font Weight: 600
- Line Height: 1.4

### Card Title

- Font Size: 16px
- Font Weight: 600
- Line Height: 1.5

### Body Text

- Font Size: 14px
- Font Weight: 400
- Line Height: 1.5

### Label

- Font Size: 14px
- Font Weight: 500
- Line Height: 1.4

### Caption

- Font Size: 12px
- Font Weight: 400
- Line Height: 1.5

### KPI Value

- Font Size: 30–36px
- Font Weight: 700
- Letter Spacing: -0.03em

### Quy tắc

- Dashboard ưu tiên body 14px cho nội dung nghiệp vụ.
- Nội dung dài nên sử dụng 16px.
- Không sử dụng font dưới 12px.
- Không dùng font bold cho toàn bộ nội dung.
- Số liệu quan trọng nên sử dụng tabular numbers.

---

# 4. SPACING SYSTEM

## 4.1. Base Unit

Hệ thống sử dụng đơn vị cơ sở 4px.

| Token | Value |
|---|---|
| space-0 | 0px |
| space-1 | 4px |
| space-2 | 8px |
| space-3 | 12px |
| space-4 | 16px |
| space-5 | 20px |
| space-6 | 24px |
| space-8 | 32px |
| space-10 | 40px |
| space-12 | 48px |
| space-16 | 64px |
| space-20 | 80px |
| space-24 | 96px |

## 4.2. Component Spacing

| Component | Spacing |
|---|---|
| Button Padding X | 16px |
| Button Padding Y | 8px |
| Input Padding X | 12px |
| Card Padding | 24px |
| Dialog Padding | 24px |
| Table Cell Padding X | 16px |
| Table Cell Padding Y | 12px |
| Sidebar Item Gap | 12px |
| Form Field Gap | 8px |
| Form Group Gap | 20px |
| Section Gap | 24px |
| Page Padding | 24–32px |

### Quy tắc

- Sử dụng spacing token thay vì giá trị ngẫu nhiên.
- Khoảng cách giữa các section lớn hơn khoảng cách giữa các component.
- Thành phần có quan hệ gần nhau phải được đặt gần nhau.
- Không dùng margin âm để sửa lỗi bố cục nếu có thể giải quyết bằng Grid hoặc Flexbox.

---

# 5. BORDER SYSTEM

## 5.1. Border Width

| Token | Value |
|---|---|
| border-none | 0 |
| border-thin | 1px |
| border-medium | 2px |

## 5.2. Border Colors

- Default Border: `var(--border)`
- Input Border: `var(--input)`
- Hover Border: `var(--border-strong)`
- Focus Border: `var(--ring)`
- Error Border: `var(--destructive)`

### Quy tắc

- Border mặc định 1px.
- Không sử dụng border đen đậm trong Light Mode.
- Card ưu tiên border mỏng thay vì shadow lớn.
- Focus cần có chỉ báo rõ ràng.

---

# 6. BORDER RADIUS SYSTEM

| Token | Value |
|---|---|
| radius-xs | 4px |
| radius-sm | 6px |
| radius-md | 8px |
| radius-lg | 12px |
| radius-xl | 16px |
| radius-2xl | 20px |
| radius-full | 9999px |

## Component Radius

| Component | Radius |
|---|---|
| Button | 8px |
| Input | 8px |
| Select | 8px |
| Card | 12px |
| Dialog | 16px |
| Dropdown | 8px |
| Badge | 6px |
| Avatar | Full |
| Tooltip | 6px |

### Quy tắc

- Không sử dụng quá nhiều mức radius trong cùng một khu vực.
- Các component lồng nhau cần có radius tương thích.
- Dashboard ưu tiên bo góc vừa phải, không quá tròn.

---

# 7. SHADOW SYSTEM

## 7.1. Shadow Tokens

### XS

```css
0 1px 2px 0 rgb(15 23 42 / 0.04)
```

### SM

```css
0 1px 3px 0 rgb(15 23 42 / 0.06),
0 1px 2px -1px rgb(15 23 42 / 0.04)
```

### MD

```css
0 4px 12px -2px rgb(15 23 42 / 0.08),
0 2px 6px -2px rgb(15 23 42 / 0.04)
```

### LG

```css
0 12px 24px -6px rgb(15 23 42 / 0.12)
```

## 7.2. Quy tắc

- Card thông thường: Shadow XS hoặc không shadow.
- Dropdown: Shadow MD.
- Dialog: Shadow LG.
- Button: Không bắt buộc shadow.
- Không sử dụng shadow quá tối hoặc quá rộng.

---

# 8. LAYOUT SYSTEM

## 8.1. Desktop Layout

Cấu trúc:

```text
Application
├── Sidebar
│   ├── Logo
│   ├── Navigation
│   └── User Menu
│
└── Main Area
    ├── Header
    │   ├── Breadcrumb
    │   ├── Search
    │   └── Actions
    │
    └── Content
        ├── Page Heading
        ├── Toolbar
        ├── Dashboard Grid
        └── Data Section
```

## 8.2. Layout Dimensions

| Element | Value |
|---|---|
| Sidebar Width | 256px |
| Sidebar Collapsed | 72px |
| Header Height | 64px |
| Main Max Width | 1600px |
| Page Padding Desktop | 32px |
| Page Padding Tablet | 24px |
| Page Padding Mobile | 16px |
| Card Gap | 16–24px |

## 8.3. Sidebar

- Background: Surface.
- Width: 256px.
- Border Right: 1px.
- Navigation Item Height: 40px.
- Item Radius: 8px.
- Icon Size: 18–20px.
- Active Background: Primary 50.
- Active Text: Primary 700.
- Hover Background: Muted.

## 8.4. Header

- Height: 64px.
- Background: Surface.
- Border Bottom: 1px.
- Horizontal Padding: 24px.
- Icon Button Size: 36px.
- Avatar Size: 32px.

## 8.5. Content

- Background: Background.
- Padding: 24–32px.
- Section Gap: 24px.
- Max Width: 1600px.
- Minimum Width: 0 để tránh tràn nội dung trong Flex/Grid.

---

# 9. GRID SYSTEM

## 9.1. Dashboard Grid

Desktop:

- 12-column grid.
- Gap: 24px.

Tablet:

- 6-column grid.
- Gap: 16px.

Mobile:

- 1-column grid.
- Gap: 16px.

## 9.2. KPI Grid

- Desktop: 4 columns.
- Tablet: 2 columns.
- Mobile: 1 column.

## 9.3. Bento Grid

Các Card có thể chiếm:

- 3/12 columns.
- 4/12 columns.
- 6/12 columns.
- 8/12 columns.
- 12/12 columns.

### Quy tắc

- Không dùng Bento Grid cho tất cả các trang.
- Ưu tiên Bento Grid cho Dashboard Overview.
- Trang quản lý dữ liệu nên sử dụng Data Table.
- Card không được làm mất khả năng đọc khi thu nhỏ.

---

# 10. BUTTON SYSTEM

## 10.1. Variants

### Primary

- Background: Primary.
- Text: White.
- Hover: Primary 700.
- Active: Primary 800.

### Secondary

- Background: Secondary.
- Text: Secondary Foreground.
- Hover: Accent.

### Outline

- Background: Transparent.
- Border: 1px.
- Text: Foreground.
- Hover: Muted.

### Ghost

- Background: Transparent.
- Border: None.
- Hover: Accent.

### Destructive

- Background: Destructive.
- Text: White.
- Hover: Darker Red.

### Link

- Background: Transparent.
- Text: Primary.
- Underline on Hover.

## 10.2. Button Sizes

| Size | Height | Padding X |
|---|---|---|
| XS | 28px | 10px |
| SM | 32px | 12px |
| MD | 36px | 16px |
| LG | 40px | 20px |
| XL | 44px | 24px |

## 10.3. Button States

- Default.
- Hover.
- Active.
- Focus Visible.
- Disabled.
- Loading.

### Quy tắc

- Một khu vực chỉ nên có một Primary Action nổi bật.
- Disabled Button cần có trạng thái rõ ràng.
- Loading Button phải giữ nguyên kích thước.
- Icon Button cần có accessible label.
- Kích thước vùng chạm trên mobile nên đạt tối thiểu 44px khi khả thi.

---

# 11. FORM SYSTEM

## 11.1. Input

- Height: 40px.
- Background: Surface.
- Border: 1px.
- Radius: 8px.
- Padding X: 12px.
- Font Size: 14px.
- Focus Ring: Primary.
- Disabled Background: Muted.

## 11.2. Textarea

- Minimum Height: 96px.
- Padding: 12px.
- Resize: Vertical.

## 11.3. Select

- Height: 40px.
- Radius: 8px.
- Icon: Chevron Down.
- Icon Size: 16px.

## 11.4. Checkbox

- Size: 16px.
- Radius: 4px.
- Checked Background: Primary.

## 11.5. Switch

- Width: 36px.
- Height: 20px.
- Thumb: 16px.
- Active Background: Primary.

## 11.6. Form Validation

### Error

- Border: Destructive.
- Message: Destructive.
- Icon: Alert Circle.

### Success

- Border: Success.
- Message: Success.

### Quy tắc

- Label phải liên kết với Input.
- Không dùng placeholder thay thế label.
- Error Message hiển thị gần trường dữ liệu.
- Không chỉ sử dụng màu sắc để thể hiện lỗi.
- Form phải hỗ trợ keyboard navigation.

---

# 12. CARD SYSTEM

## 12.1. Default Card

- Background: Surface.
- Border: 1px.
- Radius: 12px.
- Padding: 24px.
- Shadow: XS.

## 12.2. KPI Card

Cấu trúc:

```text
KPI Card
├── Label
├── Value
├── Trend Indicator
└── Supporting Information
```

### Style

- Label: 14px / Medium.
- Value: 30px / Bold.
- Trend: 12px / Medium.
- Padding: 24px.

## 12.3. Interactive Card

- Hover Border: Stronger Border.
- Hover Shadow: SM.
- Cursor: Pointer nếu toàn bộ Card có thể click.
- Transition: 150ms.

### Quy tắc

- Không dùng hover animation cho Card không tương tác.
- Không đặt quá nhiều action trong KPI Card.
- Card phải có cấu trúc nội dung rõ ràng.

---

# 13. DATA TABLE SYSTEM

## 13.1. Table Header

- Background: Muted hoặc Surface.
- Font Size: 12px.
- Font Weight: 600.
- Text Color: Muted Foreground.
- Height: 44px.

## 13.2. Table Row

- Minimum Height: 48px.
- Border Bottom: 1px.
- Hover Background: Muted.
- Selected Background: Primary 50.

## 13.3. Table Cell

- Padding X: 16px.
- Padding Y: 12px.
- Font Size: 14px.
- Text Align: Left.

## 13.4. Table Features

- Sorting.
- Filtering.
- Searching.
- Pagination.
- Row Selection.
- Empty State.
- Loading State.

### Quy tắc

- Dữ liệu số nên căn phải.
- Text dài cần có truncation hoặc wrap phù hợp.
- Header phải phân biệt rõ với Body.
- Bảng rộng cần có horizontal scroll.
- Không thu nhỏ font để cố hiển thị quá nhiều cột.
- Pagination phải có trạng thái trang hiện tại.

---

# 14. BADGE & STATUS SYSTEM

## 14.1. Badge

- Font Size: 12px.
- Font Weight: 500.
- Padding: 4px 8px.
- Radius: 6px.

## 14.2. Status Mapping

| Status | Color |
|---|---|
| Active | Success |
| Pending | Warning |
| Failed | Destructive |
| Processing | Info |
| Inactive | Neutral |

### Quy tắc

- Badge phải có nhãn văn bản.
- Không chỉ sử dụng màu để phân biệt trạng thái.
- Tránh sử dụng quá nhiều trạng thái màu sắc trong cùng một bảng.

---

# 15. NAVIGATION SYSTEM

## 15.1. Sidebar Navigation

- Item Height: 40px.
- Padding X: 12px.
- Gap: 12px.
- Icon Size: 18px.
- Radius: 8px.

### States

- Default: Foreground.
- Hover: Muted Background.
- Active: Primary Light Background.
- Disabled: Muted Foreground.

## 15.2. Tabs

- Font Size: 14px.
- Font Weight: 500.
- Active Border: Primary.
- Inactive Text: Muted Foreground.

## 15.3. Breadcrumb

- Font Size: 14px.
- Separator: Chevron Right.
- Current Page: Foreground.
- Previous Pages: Muted Foreground.

---

# 16. ICON SYSTEM

## 16.1. Icon Library

**Recommended:** Lucide React.

## 16.2. Icon Sizes

| Context | Size |
|---|---|
| Inline | 14px |
| Button | 16px |
| Navigation | 18px |
| Standard | 20px |
| Feature | 24px |
| Empty State | 40px |

## 16.3. Icon Rules

- Stroke Width: 1.75–2.
- Không trộn nhiều thư viện icon.
- Icon phải có phong cách thống nhất.
- Icon trang trí cần được ẩn khỏi screen reader.
- Icon tương tác cần có accessible label.

---

# 17. DIALOG, DROPDOWN & POPOVER

## 17.1. Dialog

- Width: 480–640px.
- Max Width: calc(100vw - 32px).
- Background: Surface.
- Radius: 16px.
- Padding: 24px.
- Shadow: LG.

## 17.2. Dropdown

- Min Width: 180px.
- Background: Popover.
- Radius: 8px.
- Padding: 4px.
- Shadow: MD.
- Item Height: 36px.

## 17.3. Tooltip

- Font Size: 12px.
- Padding: 6px 10px.
- Radius: 6px.
- Background: Foreground.
- Text: Background.

## 17.4. Overlay

- Background: Black.
- Opacity: 50%.
- Blur: Optional.

---

# 18. INTERACTION SYSTEM

## 18.1. Interaction States

Mỗi component tương tác cần xem xét:

1. Default.
2. Hover.
3. Focus Visible.
4. Active.
5. Disabled.
6. Loading.
7. Error.
8. Success.

## 18.2. Focus

- Focus Ring Width: 2px.
- Focus Ring Color: Primary.
- Focus Offset: 2px.

## 18.3. Cursor

- Button: Pointer.
- Link: Pointer.
- Disabled: Not Allowed.
- Text Input: Text.
- Non-interactive Card: Default.

---

# 19. ANIMATION SYSTEM

## 19.1. Duration

| Token | Duration |
|---|---|
| fast | 100ms |
| normal | 150ms |
| moderate | 200ms |
| slow | 300ms |

## 19.2. Easing

- Standard: ease.
- Entrance: ease-out.
- Exit: ease-in.
- Smooth: cubic-bezier(0.4, 0, 0.2, 1).

## 19.3. Quy tắc

- Animation phải phục vụ phản hồi tương tác.
- Không sử dụng animation liên tục không cần thiết.
- Không sử dụng hiệu ứng bounce cho Dashboard nghiệp vụ.
- Hỗ trợ `prefers-reduced-motion`.

---

# 20. RESPONSIVE SYSTEM

## 20.1. Breakpoints

| Device | Width |
|---|---|
| Mobile | < 640px |
| Small Tablet | ≥ 640px |
| Tablet | ≥ 768px |
| Laptop | ≥ 1024px |
| Desktop | ≥ 1280px |
| Large Desktop | ≥ 1536px |

## 20.2. Mobile

- Sidebar chuyển thành Drawer.
- Page Padding: 16px.
- KPI Grid: 1 column.
- Table hỗ trợ horizontal scroll.
- Header giảm số lượng action hiển thị.

## 20.3. Tablet

- Sidebar có thể thu gọn.
- Page Padding: 24px.
- KPI Grid: 2 columns.

## 20.4. Desktop

- Sidebar cố định.
- Page Padding: 32px.
- KPI Grid: 4 columns.

---

# 21. ACCESSIBILITY

## 21.1. Contrast

- Normal Text: ≥ 4.5:1.
- Large Text: ≥ 3:1.
- UI Component Boundaries: ≥ 3:1 khi cần để nhận biết thành phần.

## 21.2. Keyboard

- Hỗ trợ Tab Navigation.
- Focus Visible rõ ràng.
- Dialog cần quản lý focus.
- Escape đóng Dialog khi phù hợp.
- Không tạo keyboard trap ngoài các thành phần modal được quản lý đúng cách.

## 21.3. Screen Reader

- Button có accessible name.
- Input có label.
- Icon trang trí dùng `aria-hidden`.
- Trạng thái động quan trọng cần được thông báo phù hợp.

## 21.4. Motion

- Tôn trọng `prefers-reduced-motion`.
- Không sử dụng animation gây mất tập trung.

---

# 22. DARK MODE

## 22.1. Nguyên tắc

- Dark Mode không đơn giản là đảo màu.
- Background tối hơn Surface.
- Border cần đủ phân biệt.
- Text phải duy trì contrast.
- Shadow giảm vai trò, border tăng vai trò.

## 22.2. Theme Switching

Sử dụng class `.dark` trên phần tử `html`.

```html
<html class="dark">
```

## 22.3. Theme Persistence

Có thể sử dụng:

- Local Storage.
- System Preference.
- Theme Provider.

Không sử dụng đồng thời nhiều cơ chế thay đổi theme mà không có quy tắc ưu tiên.

---

# 23. CSS ARCHITECTURE

## 23.1. Nguyên tắc tổ chức

```text
styles/
├── globals.css
├── tokens.css
├── typography.css
├── layout.css
└── utilities.css
```

Đối với dự án nhỏ, có thể sử dụng duy nhất `globals.css`.

## 23.2. CSS Layers

Thứ tự ưu tiên:

1. Theme.
2. Base.
3. Components.
4. Utilities.

## 23.3. Design Tokens

Các component phải sử dụng CSS Variables.

Ví dụ:

```css
background: var(--card);
color: var(--card-foreground);
border-color: var(--border);
border-radius: var(--radius-lg);
```

Không nên:

```css
background: #ffffff;
color: #111111;
border-radius: 13px;
```

## 23.4. Naming Convention

- CSS Variables: kebab-case.
- Component Classes: kebab-case.
- Utility Classes: theo Tailwind.
- React Components: PascalCase.

---

# 24. SHADCN/UI INTEGRATION

## 24.1. Nguyên tắc

- Sử dụng semantic tokens tương thích với shadcn/ui.
- Không sửa trực tiếp thư viện UI nếu có thể tùy biến bằng token.
- Không hardcode màu cho Button, Card, Input.
- Không ghi đè toàn cục các component shadcn/ui bằng selector quá rộng.

## 24.2. Semantic Tokens

Các token quan trọng:

```text
background
foreground
card
card-foreground
popover
popover-foreground
primary
primary-foreground
secondary
secondary-foreground
muted
muted-foreground
accent
accent-foreground
destructive
border
input
ring
radius
sidebar
sidebar-foreground
sidebar-primary
sidebar-accent
sidebar-border
chart-1 ... chart-5
```

## 24.3. Component Rules

- Button: Dùng variants của shadcn/ui.
- Input: Dùng semantic border và focus ring.
- Card: Dùng `--card`.
- Dialog: Dùng `--popover` hoặc `--card` tùy ngữ cảnh.
- Sidebar: Dùng hệ sidebar tokens.
- Table: Dùng semantic foreground, muted và border.

---

# 25. GLOBAL DESIGN RULES

## 25.1. Bắt buộc

1. Sử dụng Design Tokens.
2. Sử dụng hệ spacing 4px.
3. Sử dụng typography thống nhất.
4. Sử dụng semantic colors.
5. Hỗ trợ responsive.
6. Hỗ trợ keyboard navigation.
7. Hỗ trợ Light/Dark Mode.
8. Hạn chế CSS specificity.
9. Không sử dụng `!important` trừ trường hợp đặc biệt.
10. Không tạo component style trùng lặp.

## 25.2. Không được thực hiện

- Không dùng màu tùy ý ngoài hệ thống khi không có lý do rõ ràng.
- Không sử dụng nhiều font family.
- Không dùng shadow quá mạnh.
- Không tạo radius không thống nhất.
- Không dùng animation phức tạp cho thao tác cơ bản.
- Không ghi đè CSS toàn cục của các component bên thứ ba một cách tùy tiện.
- Không sử dụng kích thước cố định khiến nội dung bị tràn trên mobile.

---

# 26. IMPLEMENTATION CHECKLIST

Trước khi hoàn thành một trang mới, kiểm tra:

- [ ] Màu sắc sử dụng đúng semantic tokens.
- [ ] Typography đúng hệ thống.
- [ ] Spacing tuân thủ hệ 4px.
- [ ] Border và Radius thống nhất.
- [ ] Button đúng variant.
- [ ] Input có focus state.
- [ ] Card đúng surface.
- [ ] Layout responsive.
- [ ] Dark Mode hoạt động.
- [ ] Không có horizontal overflow ngoài vùng được thiết kế.
- [ ] Keyboard navigation hoạt động.
- [ ] Trạng thái loading, empty