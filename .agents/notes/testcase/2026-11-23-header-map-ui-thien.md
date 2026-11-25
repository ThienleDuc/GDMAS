# Testcase: Chỉnh UI dropdown quốc gia, header, map preset, trang Danh mục

## Metadata
- ID: 2026-11-23-header-map-ui-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/layouts/header/GlobalCountryFilter.tsx, SystemStatusPanel.tsx, apps/web/src/components/map/MapControlsPanel.tsx, apps/web/src/features/earthquakes/EarthquakesPage.tsx (+ CSS)
- Test File: apps/web/tests/header-map-ui.test.ts
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** 4 chỉnh UI theo yêu cầu người dùng 2026-11-23.
- **Ràng buộc:** I2 (giữ id/aria, không xoá helper hay type cũ — `TimeRangePreset` vẫn có `"all"`), I5 (dùng token Dark Mode, không hardcode màu; không mock thay API), I7 (offline 100%, không xoá/skip test cũ).

| TC ID | Tên Test Case | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|
| `TC-01` | Dropdown có tìm kiếm | Đọc `GlobalCountryFilter.tsx` | `id="global-country-select"`, `type="search"`, `role="listbox"`, `aria-expanded` | `PASS` |
| `TC-02` | CSS độ cao + dropdown | Đọc `layout.css` | `height: var(--button-height-sm)`, `.layout__country-dropdown`, `.layout__country-search input` | `PASS` |
| `TC-03` | Bỏ `layout__system` | Đọc `SystemStatusPanel.tsx` | Không còn `className="layout__system"`; summary/list vẫn dùng class riêng | `PASS` |
| `TC-04` | Preset tối đa 30 ngày | Đọc `MapControlsPanel.tsx` + `monitoring.css` | `["24h","7d","30d"]`, grid 3 cột, không còn `"all"` | `PASS` |
| `TC-05` | Bỏ `eq-page__actions` | Đọc `EarthquakesPage.tsx/.css` | Không còn khối actions (kèm CSS chết) | `PASS` |

---

## 2. Lệnh thực thi & Kết quả thực tế
```bash
cd apps/web && node --test tests/header-map-ui.test.ts
cd apps/web && pnpm test && pnpm build
```
- **Ngày chạy cuối:** 2026-11-23
- **Kết quả:** test mới **5/5 PASS**; toàn bộ `pnpm test` **250/250 PASS** (sau khi cập nhật TC-07 của `usgs-sync.test.ts` theo UI mới — không xoá test); `pnpm build` OK.

---

## 3. Ghi chú
- TC-07 (`usgs-sync.test.ts`) trước đây khẳng định `<UsgsSyncButton onSynced={handleSynced} />` trong `eq-page__actions`; đã đổi thành khẳng định khối actions **không còn** + vẫn giữ assertion cấm `<table>` thô. Không test nào bị xoá/skip.
- `TimeRangePreset` vẫn giữ `"all"` để tương thích payload/URL cũ (I2) — chỉ không render nút.
