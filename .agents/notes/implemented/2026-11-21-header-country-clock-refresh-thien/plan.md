# Implementation Plan: Gọn điều hướng aside và bổ sung Header toàn cục (FE-only)

## Metadata
- ID: 2026-11-21-header-country-clock-refresh-thien
- Proposal: .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md
- Approved By: thien
- Approved At: 2026-11-21
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
FE-only: gỡ 2 mục nav/route placeholder (`/reports`, `/settings`) và đưa vào header dùng chung mọi giao diện FE 3 widget — lọc quốc gia theo cụm từ API, đồng hồ realtime UTC/UTC+7, nhãn chu kỳ cập nhật 5 phút. Không đụng contracts, docs, BE hay API params.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/layouts/navigation.ts` — bỏ 2 entry `/reports`, `/settings` khỏi `NAV_META`
- `apps/web/src/layouts/DashboardLayout.tsx` — bỏ 2 icon, render `<HeaderActions>` vào `layout__header-actions`
- `apps/web/src/layouts/layout.css` — style cho 3 widget header (dùng design token, Dark Mode)
- `apps/web/src/hooks/useSSE.ts` — bổ sung `reconnect()` (additive, mở lại EventSource)
- `apps/web/src/layouts/header/HeaderActions.tsx` *(mới)*
- `apps/web/src/layouts/header/GlobalCountryFilter.tsx` *(mới)*
- `apps/web/src/layouts/header/RealtimeClock.tsx` *(mới)*
- `apps/web/src/layouts/header/DataRefreshLabel.tsx` *(mới)*
- `apps/web/src/layouts/header/RefreshToast.tsx` *(mới — toast góc trên phải tự đóng 5s)*
- `apps/web/src/layouts/header/header-data.ts` *(mới — hàm thuần offline)*
- `apps/web/src/layouts/header/HeaderFilterContext.tsx` *(mới — chip ngữ cảnh quốc gia cho mọi trang)*
- `apps/web/src/utils/timezone.ts` — bổ sung `formatClockTime` (additive)
- `apps/web/src/app/App.tsx` — bỏ 2 route placeholder
- `apps/web/src/app/routes.tsx` — bỏ 2 key `REPORTS`/`SETTINGS`
- `.agents/notes/testcase/2026-11-21-header-country-clock-refresh-thien.md` *(đặc tả testcase sinh đồng thời từ `_TEMPLATE.md`)*
- `apps/web/tests/header-global.test.ts` *(mới — node:test offline)*
- `apps/web/tests/layout-navigation.test.ts` *(sửa TC-01/TC-02)*
- `apps/web/tests/layout-styles.test.ts` *(bổ sung assertion CSS header)*

### Out of Scope
- `contracts/**`, `docs/api/API.md`, `docs/task/thien.md`, `docs/yeucaubatbuoc.md`, `AGENTS.md`, `docs/quyuocchung.md` — **đã kiểm toán: contracts hiện có đủ, không sửa**
- `apps/api/**`, migration Alembic, `.env*`, `package.json` (không thêm dependency)
- Helper lõi `country-clusters.ts`, `region-filter.ts`, `catalog-selection.ts`, `useCatalogSelection.ts` — chỉ tái dùng, không xóa
- 6 patterns, Dark Mode token, hành vi rail/hover/breadcrumb của aside

---

## 3. Các bước
### Step 1 — Gọn aside & route
Sửa `navigation.ts`, `DashboardLayout.tsx` (import/icon), `App.tsx`, `routes.tsx`. Route `*` có sẵn redirect URL cũ về `/`. Chạy test điều hướng.

### Step 2 — Hàm thuần & contract tái dùng
Bổ sung `formatClockTime(now, mode)` vào `utils/timezone.ts`; tạo `header/header-data.ts` với `countriesFromClusters(payload)` (dùng `groupClustersByCountry` + `ClustersResponse`) và bộ đếm ngược `nextCountdownTick` / `countdownLabel` / `REFRESH_CYCLE_SECONDS` (chu kỳ lấy từ `TERMINAL_SPECS.ingestion.cycle`).

### Step 3 — 3 widget header + chip dùng chung
Tạo các component trong `layouts/header/`; `GlobalCountryFilter` gọi `getClustersOptional()` (fallback `/patterns` theo `contracts/README.md` §3.8, 404 → unavailable, không mock) và ghi `?country=` qua `useCatalogSelection`; `RealtimeClock` toggle UTC/UTC+7 lưu localStorage; `DataRefreshLabel` là đồng hồ đếm ngược 5 phút độc lập (mỗi giây giảm 1, về 0 reset 05:00, `aria-live="off"`) — không phụ thuộc trạng thái SSE nên không nhấp nháy; khi về 0 gọi `onRefresh` (= `sse.reconnect()`) để mở lại SSE lấy sự kiện mới và hiện `RefreshToast` 5 giây góc trên bên phải; `HeaderFilterContext` hiển thị chip ngữ cảnh trên mọi trang.

### Step 4 — Style & tích hợp shell
Bổ sung CSS trong `layout.css`: widget bo tròn có shadow/hover, chip gradient `accent`, bộ lọc có chấm chỉ thị + select pill, countdown có thanh tiến trình `--countdown-progress`, clock có chấm "live" nhấp nháy + toggle accent, toast trượt vào + thanh `--toast-progress`; dùng toàn bộ design token (Dark Mode), có `prefers-reduced-motion` và keyframes. Render `<HeaderActions onRefresh={sse.reconnect} />` vào `layout__header-actions`.

### Step 5 — Test offline & validation
Hoàn thiện `header-global.test.ts`, cập nhật 2 test cũ; chạy `cd apps/web && pnpm test`, `pnpm build`, `notes_index.py --check`; cập nhật `testcase/<id>.md` với kết quả thật.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không migration, không endpoint, không schema `contracts/`, không biến môi trường. Danh mục quốc gia suy từ `GET /api/v1/clusters` (contract có sẵn).

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-21-header-country-clock-refresh-thien.md`
- [x] **Đã tạo và chạy pass file test offline** `apps/web/tests/header-global.test.ts` (7/7) (+ 2 test cũ cập nhật)
- [x] Frontend: `cd apps/web && pnpm test` → 151/151 pass
- [x] Frontend: `cd apps/web && pnpm build` → PASS
- [x] Notes: `python3 scripts/notes_index.py --check` → OK
- [x] `git status --porcelain` — không có xóa file ngoài ý muốn
- [x] Kiểm tra functional: 4 icon nav; `/reports` → `/`; 3 widget header; toggle đồng hồ; đồng bộ lọc 2 trang; 404 `/clusters` → unavailable (assert trong test offline)

---

## 6. Rủi ro khi làm
- `localStorage` không có trong node:test → test hàm thuần với `Date` cố định, mock localStorage khi cần.
- Header chật trên mobile → dùng token + breakpoint 767px có sẵn.
- `/statistics` có chip nhưng số liệu không đổi (API không có param country) → đã được chấp nhận, không tự cắt dữ liệu.

---

## 7. Rollback
Revert commit trên nhánh `feat/2026-11-21-header-country-clock-refresh-thien`; không có migration hay DB để downgrade. Giữ lại note proposal/testcase làm negative knowledge.

---

## 8. Ghi chú
Chỉ thị người dùng 2026-11-21: "làm cho mỗi giao diện FE, không đụng đến vấn đề khác". Mọi thay đổi BE/docs/contracts nếu cần sau này phải là proposal riêng. Dừng CHECKPOINT 1 sau validation xanh.
