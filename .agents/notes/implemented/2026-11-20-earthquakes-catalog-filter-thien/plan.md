# Implementation Plan: Trang Danh mục động đất với bộ lọc thời gian & độ lớn (T7.03)

## Metadata
- ID: 2026-11-20-earthquakes-catalog-filter-thien
- Proposal: .agents/notes/proposed/2026-11-20-earthquakes-catalog-filter-thien.md
- Approved By: thien
- Approved At: 2026-11-20
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thay `PlaceholderPage` trên route `/earthquakes` bằng trang liệt kê sự kiện thật từ T6, có phân trang, lọc UTC/WGS84, debounce và 3 trạng thái Loading/Error/Empty. Logic thuần tách riêng để test offline 100%.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/earthquakes/earthquake-view.ts` — module logic thuần (query builder, view state, format row, fetchPage inject fetcher).
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` — component dùng design system `globals.css`.
- `apps/web/src/features/earthquakes/EarthquakesPage.css` — chỉ khi class `globals.css` chưa đủ (tối giản).
- `apps/web/src/app/App.tsx` — thay placeholder bằng `EarthquakesPage`.
- `apps/web/tests/earthquakes-page.test.ts` — unit test offline.
- `.agents/notes/testcase/2026-11-20-earthquakes-catalog-filter-thien.md` — đặc tả testcase.

### Out of Scope
- `apps/web/src/services/**`, `apps/web/src/contracts/**`, `apps/web/src/lib/**` (đã chuẩn ở T7.01/T7.02).
- `apps/web/src/layouts/**`, `app/routes.tsx`, styles dùng chung (`index.css`, `globals.css`, `layout.css`).
- T7.04 bản đồ, T7.10 SSE shell, T6/API/schema, mock runtime.

---

## 3. Các bước
### Step 1 — Logic thuần
Viết `earthquake-view.ts`: `buildEarthquakeQuery`, `deriveViewState`, `formatEventRow`, `fetchPage(params, fetcher = getEarthquakes)`; dùng `toUtcIso`/`formatEventTime`/`formatWgs84Point` có sẵn; `start_time`/`end_time` luôn UTC `Z`.

### Step 2 — Component
`EarthquakesPage.tsx`: table (`ds-table-wrapper`), filter bar (select Ngày/Tuần/Tháng, input magnitude/depth với debounce), phân trang (Prev/Next + metadata), skeleton/error+Retry/empty; dùng `useState`/`useEffect`/`useCallback`, AbortController khi refetch, reset `page=1` khi đổi filter.

### Step 3 — Wire route
`App.tsx`: import `EarthquakesPage`, thay `PlaceholderPage` cho `APP_ROUTES.EARTHQUAKES`; giữ nguyên các route khác.

### Step 4 — Test & validation
Test `buildEarthquakeQuery` (UTC/wgs84/sort/page), `deriveViewState` (loading/error/empty/ready), `fetchPage` (mock fetcher 4 trạng thái), `formatEventRow`. Chạy `pnpm build`, `pnpm test`, `notes_index.py --check`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi API/schema/env. Chỉ gọi `GET /api/v1/earthquakes` qua service đã có (T7.02). Không thêm dependency.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [ ] Đã tạo testcase `.agents/notes/testcase/2026-11-20-earthquakes-catalog-filter-thien.md`
- [ ] Đã tạo/chạy test offline `apps/web/tests/earthquakes-page.test.ts`
- [ ] `cd apps/web && pnpm build`
- [ ] `cd apps/web && pnpm test` (baseline 63 — không giảm)
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Kiểm tra byte: không dùng mock runtime, query UTC `Z`, tọa độ WGS84, `page` reset về 1
- [ ] Scope/project-review: không xóa file, không đụng core protected

---

## 6. Rủi ro khi làm
- Filter debounce gây stale response → dùng AbortController + dependency đúng trong effect.
- Query không UTC → guard T7.02 sẽ ném TypeError; test mapping trước.
- DB rỗng → phải hiển thị Empty, không rơi về danh mục tĩnh (I5).

---

## 7. Rollback
Revert commit/PR; page quay lại placeholder; không có DB/schema thay đổi.

---

## 8. Ghi chú
Repo dùng `node --test` (không có DOM lib) nên mọi logic cần test được tách thuần; component chỉ render + gọi helper.
