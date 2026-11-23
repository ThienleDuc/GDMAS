<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9.
     Tầng thực thi, không chép lại lý lẽ của proposal. Luật: docs/agent-workflow.md. -->

# Implementation Plan: Sửa bộ lọc Danh mục động đất & gom điều khiển dùng chung lên Header/Aside

## Metadata
- ID: 2026-11-23-earthquakes-filter-header-controls-thien
- Proposal: .agents/notes/proposed/2026-11-23-earthquakes-filter-header-controls-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Làm cho bộ lọc Ngày/Tuần/Tháng + Độ lớn/Độ sâu có tác dụng thật (kể cả dev-mock), gom lọc quốc gia/khu vực về một nguồn sự thật `?country=&region=` trên header, và dời countdown `5:00` + nút Light/Dark xuống footer của aside (countdown ở trên toggle).

---

## 2. Phạm vi
### In Scope
- `apps/web/dev-mock.ts` (lọc đủ 6 tham số cho `/api/v1/earthquakes`)
- `apps/web/src/features/earthquakes/components/EarthquakeFilterBar.tsx` (nút "Áp dụng" có nhãn)
- `apps/web/src/features/earthquakes/EarthquakesPage.css` (style nút có nhãn)
- `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx` (bỏ 2 select cục bộ, hiện nhãn ngữ cảnh)
- `apps/web/src/features/earthquakes/earthquake-insights.ts` (hàm thuần `buildCatalogStatistics` — vòng 2)
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` (chỉ 5 hunk của task này: import helper, `chartTotal`/`chartLoaded`, chart fetch, `catalogStats`, truyền KPI — **giữ nguyên** thay đổi timezone đang dở trong cùng tệp, stage bằng patch riêng)
- `apps/web/src/features/earthquakes/components/EarthquakeInsights.tsx` (không truyền callback lọc xuống histogram)
- `apps/web/src/layouts/header/GlobalRegionFilter.tsx` *(mới)*
- `apps/web/src/layouts/header/CompactRefreshCountdown.tsx` *(mới)*
- `apps/web/src/layouts/header/RefreshToastHost.tsx` *(mới)*
- `apps/web/src/layouts/header/header-data.ts` (thêm hàm thuần `compactCountdownLabel`, `regionOptionsFromCatalog`)
- `apps/web/src/layouts/header/HeaderActions.tsx` (đổi widget; bỏ ThemeToggle/DataRefreshLabel)
- `apps/web/src/layouts/DashboardLayout.tsx` (render countdown + toggle trong `layout__sidebar-footer`)
- `apps/web/src/layouts/layout.css` (style footer/compact/region/context)
- `.agents/notes/testcase/2026-11-23-earthquakes-filter-header-controls-thien.md` *(đặc tả sinh đồng thời)*
- `apps/web/tests/dev-mock.test.ts` (bổ sung case lọc)
- `apps/web/tests/header-region-filter.test.ts` *(mới)*
- `apps/web/tests/header-aside-controls.test.ts` *(mới)*
- `apps/web/tests/theme-toggle.test.ts`, `apps/web/tests/terminal-status.test.ts`, `apps/web/tests/earthquakes-insights.test.ts`, `apps/web/tests/header-global.test.ts`, `apps/web/tests/layout-styles.test.ts` (cập nhật assertion — không xoá test)

### Out of Scope
- `apps/api/**`, `contracts/**`, `docs/api/API.md`, migration Alembic, worker/SSE protocol (I1/I3/I4)
- Toàn bộ thay đổi chưa commit của proposal timezone `2026-11-23-global-timezone-context-thien` (map components, monitoring, overview, `RealtimeClock.tsx`, `api-client.ts`, `timezone.ts`, contexts/, test timezone) — **không stage, không commit**; `EarthquakesPage.tsx`/`DashboardLayout.tsx` chỉ stage hunk của task này qua patch riêng
- Dark Mode tokens (`globals.css`), `useTheme`, `TimezoneProvider`, `RealtimeClock`, `SystemStatusPanel`, `HeaderFilterContext`
- Xoá/sửa test đang pass (I7); commit/push/merge (CHECKPOINT 1/2)

---

## 3. Các bước
### Step 1 — Ghi nhận phê duyệt & sinh notes đồng thời
Cập nhật §9 proposal thành `Approved`; tạo `plan.md`, `status.md` và `testcase/<id>.md` từ template; chạy `notes_index.py --check`.

### Step 2 — Nhánh làm việc
`git-ship.sh start fix/<id>` (bị từ chối vì đang ở feature branch có working tree dở) → fallback `git switch -c fix/<id>` giữ nguyên mọi thay đổi hiện có; ghi rõ deviation.

### Step 3 — Sửa bộ lọc (dev-mock + nút)
Bổ sung lọc `min/max_magnitude`, `min/max_depth`, `country/region` trong `dev-mock.ts` qua helper thuần; thêm nhãn "Áp dụng" vào `EarthquakeFilterBar`; CSS `eq-filter-apply` dạng inline-flex.

### Step 4 — Histogram dùng chung country/region
Bỏ 2 `<select>` khỏi `MagnitudeHistogramChart`; giữ props cũ (I2), chỉ đọc `selectedCountry`/`selectedRegion` để hiện nhãn; `EarthquakeInsights` không truyền callback xuống nữa.

### Step 5 — Region filter lên header
`GlobalRegionFilter` dùng `getRegionCatalog(country, signal)` + hàm thuần `regionOptionsFromCatalog`; ghi `?region=` qua `setRegion`; disable khi chưa chọn quốc gia / API unavailable (không mock).

### Step 6 — Countdown + toggle xuống aside
`CompactRefreshCountdown` (chỉ `5:00`, giữ tick/onRefresh) + `RefreshToastHost` (giữ toast SSE) tách khỏi `DataRefreshLabel`; render trong `layout__sidebar-footer`: countdown trước, `ThemeToggle` sau; bỏ 2 widget khỏi `HeaderActions`.

### Step 7 — Test offline & validation
Tạo 2 test mới + bổ sung `dev-mock.test.ts`; cập nhật 5 test cũ; chạy `pnpm build`, `pnpm test`, `notes_index.py --check`; kiểm `git status` không có xoá file lạ.

### Step 8 — CHECKPOINT 1
Đặt `status.md` = `validation`, xuất báo cáo, dừng chờ người dùng.

### Step 9 — Sửa thêm theo phản hồi (vòng 2)
- `earthquake-insights.ts`: hàm thuần `buildCatalogStatistics(items, total, now)` tính 4 KPI từ tập đã lọc.
- `EarthquakesPage.tsx`: lưu `chartTotal`/`chartLoaded` từ chart fetch, truyền `catalogStats` cho `EarthquakeInsights` → histogram + KPI cùng ăn range/magnitude/depth/country/region.
- `dev-mock.ts`: thêm `/earthquakes/countries`, `/earthquakes/regions` và `/statistics/earthquakes` dùng chung `filterMockEarthquakes` → header bật được filter khu vực, KPI đổi theo filter ngay trong demo.
- Test: `buildCatalogStatistics`, catalog endpoints, mock KPI; `pnpm test` 343 pass.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. FE-only; `?country=&region=` và các endpoint `/earthquakes/{countries,regions}` đã tồn tại. Không đổi contract/schema/env/migration.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-23-earthquakes-filter-header-controls-thien.md`
- [x] **Đã tạo file test offline** (`apps/web/tests/header-aside-controls.test.ts`, `header-region-filter.test.ts`, bổ sung `dev-mock.test.ts`)
- [x] Frontend typecheck & build: `cd apps/web && pnpm build` — PASS
- [x] Frontend test: `cd apps/web && pnpm test` — 339 tests / 0 fail
- [x] Kiểm tra nhất quán notes: `python3 scripts/notes_index.py --check` — OK
- [x] Tài liệu bị ảnh hưởng: không có (`Architecture Impact: none`)
- [x] Kiểm chức năng: filter đổi có tác dụng (dev-mock lọc 6 tham số); header đổi quốc gia/khu vực cập nhật bảng+histogram+KPI; countdown `5:00` nằm trên toggle ở aside; toast SSE giữ nguyên (qua `RefreshToastHost`)

---

## 6. Rủi ro khi làm
- Test cũ assert `ThemeToggle` sau `RealtimeClock` → sửa assertion, không xoá test.
- Dời countdown có thể làm mất toast → tách `RefreshToastHost` giữ `dataRefreshKey` từ shell.
- `getRegionCatalog` 404 → disable widget, không fallback mock.
- Working tree nhánh timezone đang dở → không switch về develop, không stage/commit lẫn code của nhánh đó.

---

## 7. Rollback
Revert các commit của nhánh `fix/2026-11-23-earthquakes-filter-header-controls-thien` (hoặc `git restore` từng file nếu chưa commit). Không có migration/DB để downgrade. Giữ nguyên nhánh timezone và working tree của nó.

---

## 8. Ghi chú
`EarthquakesPage.tsx` và `DashboardLayout.tsx` đang có thay đổi chưa commit của proposal timezone — mọi edit phải là targeted edit, tuyệt đối không ghi đè toàn file.
