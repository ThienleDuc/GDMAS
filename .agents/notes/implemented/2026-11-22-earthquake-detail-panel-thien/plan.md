<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9. -->

# Implementation Plan: Panel chi tiết sự kiện động đất (RD-13)

## Metadata
- ID: 2026-11-22-earthquake-detail-panel-thien
- Proposal: .agents/notes/proposed/2026-11-22-earthquake-detail-panel-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Gắn consumer vào `getEarthquakeDetail()` đã có: click dòng bảng `/earthquakes` → nạp chi tiết BE thật, hiển thị panel với field đầy đủ kể cả `raw_data`.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/earthquakes/earthquake-detail.ts` *(mới — helper thuần)*
- `apps/web/src/features/earthquakes/components/EarthquakeDetailPanel.tsx` *(mới)*
- `apps/web/src/features/earthquakes/components/EarthquakeTable.tsx` *(thêm prop `onSelect` tùy chọn)*
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` *(state + effect fetch + render panel)*
- `apps/web/src/features/earthquakes/EarthquakesPage.css` *(style panel — chỉ CSS token, không hardcode màu)*
- `apps/web/tests/earthquake-detail.test.ts` *(mới)*
- `apps/web/tests/earthquakes-page.test.ts` *(bổ sung assertion wiring)*
- `docs/task/fe-be-integration-ready.md` *(mục 4 — ghi kết quả để phiên sau không phân tích lại)*
- `.agents/notes/testcase/2026-11-22-earthquake-detail-panel-thien.md` *(đặc tả sinh đồng thời)*

### Out of Scope
- `apps/api/**`, `contracts/**` repo-level, `docs/api/API.md`, migration (I4)
- `apps/web/src/services/earthquake-api.ts`, `apps/web/src/contracts/**` (đã đủ)
- `/monitoring`, Leaflet/SSE, `useCatalogSelection`, luồng lọc/phân trang
- RD-14 (nút đồng bộ USGS), GAP-05 (mock region clusters)

---

## 3. Các bước
### Step 1 — Helper thuần
`earthquake-detail.ts`: `detailFields(item, timezone)`, `rawDataSummary(item)`, `isNotFound(error)`; chỉ field có giá trị, UTC/WGS84 đúng, không số giả.

### Step 2 — Component panel
`EarthquakeDetailPanel.tsx`: 4 trạng thái loading / not_found / error / ready; `<details>` cho `raw_data`; dùng CSS token có sẵn.

### Step 3 — Wiring
`EarthquakeTable.tsx`: prop `onSelect?`. `EarthquakesPage.tsx`: `selectedId`, abortable fetch, render panel.

### Step 4 — Test & nhật ký
Test helper + assertion wiring; chạy `pnpm test && pnpm build`; ghi mục 4 `docs/task/fe-be-integration-ready.md`; cập nhật status → `validation`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có — chỉ thêm FE consumer cho endpoint BE đã tồn tại. Không migration, không contract, không env.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-earthquake-detail-panel-thien.md`
- [ ] **Đã tạo và chạy pass file test offline** — `earthquake-detail.test.ts` + `earthquakes-page.test.ts`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Kiểm tra chức năng: click dòng → panel hiện field thật; 404 → "Không tìm thấy"; `raw_data` → `<details>`; đổi dòng nhanh không race (abort)

---

## 6. Rủi ro khi làm
Không có React Testing Library → test helper thuần + assertion source. BE trả object thuần (không envelope) → `fetchApi` đã hỗ trợ raw entity.

---

## 7. Rollback
Revert 6 file FE + mục 4 docs/task; giữ notes. Không có migration.

---

## 8. Ghi chú
Chủ vùng `thien` (T7/FE). Không tự merge khi còn xung đột; dừng CHECKPOINT 1 sau validation.
