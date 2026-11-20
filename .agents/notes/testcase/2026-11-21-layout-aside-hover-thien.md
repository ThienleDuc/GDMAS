# Testcase: Tái tạo layout — breadcrumb, aside rail + hover card, nội dung rộng

## Metadata
- ID: 2026-11-21-layout-aside-hover-thien
- Mode: proposal-paired   <!-- proposal-paired | single-file-test -->
- Proposal: .agents/notes/proposed/2026-11-21-layout-aside-hover-thien.md
- Target: `apps/web/src/layouts/navigation.ts`, `apps/web/src/layouts/DashboardLayout.tsx`, `apps/web/src/layouts/layout.css`
- Test File: `apps/web/tests/layout-navigation.test.ts` (mới) + bổ sung `apps/web/tests/layout-styles.test.ts`
- Author: agent | thien
- Created: 2026-11-21
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** `routeLabel`/`navMetaFor` thuần; cấu trúc shell (breadcrumb, aside rail, popover) và CSS layout.
- **Ràng buộc GDMAS liên quan:**
  - [x] Không đổi endpoint/schema/payload (I3) — breadcrumb chỉ đổi nhãn hiển thị.
  - [x] Giữ 1 layout + CSS entry point tập trung (I5 / proposal restructure 2026-11-20).
  - [x] Không xóa test cũ đang pass; test offline 100% (I7).
  - [x] RULE-03: giữ file/module cũ, chỉ bổ sung module + class mới.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node --test` + type stripping; đọc source bằng `node:fs`, không DOM/mạng.
```json
{
  "routes": [
    { "path": "/", "label": "Tổng quan" },
    { "path": "/monitoring", "label": "Bản đồ Giám sát" },
    { "path": "/earthquakes", "label": "Danh mục Động đất" },
    { "path": "/statistics", "label": "6 Patterns Phân tích" },
    { "path": "/reports", "label": "Báo cáo & Xuất bản" },
    { "path": "/settings", "label": "Cấu hình Hệ thống" },
    { "path": "/khong-ton-tai", "label": "Trang" }
  ]
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | routeLabel 6 route + fallback | Functional | Gọi `routeLabel` cho 7 path mẫu | Trả đúng nhãn tiếng Việt; route lạ → `"Trang"`; route con vẫn khớp | PASS |
| `TC-02` | navMetaFor đủ mô tả | Functional | `navMetaFor("/monitoring")` | Có `label`, `description`, `badge: "Live"`; path lạ → `null` | PASS |
| `TC-03` | Breadcrumb không dùng slug | Resilience | Đọc source `DashboardLayout.tsx` | Có `routeLabel(`, không còn `pathname.replace("/", "")` | PASS |
| `TC-04` | Bỏ toggle/tự thu aside | Functional | Đọc source layout + CSS | Không còn `sidebarOpen`, `setSidebarOpen`, `Menu`, `X`, `APP_ROUTES`; aside class tĩnh; CSS hết `is-collapsed` | PASS |
| `TC-05` | Hover card nhãn + badge, khít nav-link | Functional | Đọc source component + CSS | Có `layout__nav-popover-head` gồm label + badge "Live" cùng một hàng, không còn `layout__nav-popover-desc`; card `position:absolute`, `left: calc(100% + var(--space-1))`, `width: max-content` (co theo nội dung, không cố định), hiện qua `:hover`/`:focus-visible` | PASS |
| `TC-06` | Nội dung full-width | Functional | Đọc `layout.css` | `.layout__content` có `width:100%`, không còn `--content-max-width` / `margin-inline:auto` | PASS |
| `TC-07` | Giữ test cũ + 1 layout | Resilience | Chạy toàn bộ suite | 5 test cũ trong `layout-styles.test.ts` vẫn pass; vẫn 1 `DashboardLayout`, index.css import tập trung | PASS |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/layout-navigation.test.ts
cd apps/web && pnpm test
cd apps/web && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-21`
- **Kết quả quan sát thật:** `node --test tests/layout-navigation.test.ts` → 2/2 pass (TC-01/TC-02). Bổ sung 4 test vào `layout-styles.test.ts` (TC-03…TC-06) → 9/9 pass; 5 test cũ giữ nguyên. `cd apps/web && pnpm test` → **116/116 pass, 0 fail**. `pnpm build` → sạch (2149 modules). `python3 scripts/notes_index.py --check` → OK. Không phát sinh lỗi, không tạo bug log.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
