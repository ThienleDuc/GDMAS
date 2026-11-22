# Implementation Plan: Tách `place` từ USGS thành quốc gia & khu vực tại Backend

## Metadata
- ID: 2026-11-22-be-country-region-derivation-thien
- Proposal: .agents/notes/proposed/2026-11-22-be-country-region-derivation-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: in_progress

---

## 1. Mục tiêu
Đưa việc tách chuỗi `place` của USGS thành `country` + `region` xuống BE: module thuần dùng chung, lưu cột mới qua migration MỚI, trả field optional trong response `/earthquakes`, thêm query param lọc server-side, cập nhật hợp đồng và FE ưu tiên field BE (giữ fallback).

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/ingestion/geo.py` *(mới — derive thuần)*
- `apps/api/src/gdmas/services/ingestion/backfill.py` *(mới — CLI backfill all_month, tái dùng IngestionService)*
- `apps/api/src/gdmas/services/ingestion/parser.py` *(bổ sung 2 khoá vào dict)*
- `apps/api/src/gdmas/services/ingestion/upsert.py` *(bổ sung 2 cột vào `UPDATABLE_COLUMNS` — bắt buộc để upsert ghi giá trị mới)*
- `apps/api/src/gdmas/api/routes/earthquakes.py` *(sync route + list route params/filter)*
- `apps/api/src/gdmas/models/earthquake.py` *(2 cột + index)*
- `apps/api/alembic/versions/002_add_country_region.py` *(migration MỚI + backfill)*
- `apps/api/src/gdmas/schemas/earthquake.py` *(2 field optional)*
- `contracts/schemas/earthquake.json`, `contracts/schemas/geo-catalog.json` *(mới)*, `contracts/README.md`, `contracts/examples/earthquake_sample.json`, `docs/api/API.md` *(I3)*
- `docs/architecture/ERD.md` *(sơ đồ/cột/index/upsert/migration — theo yêu cầu docs kiến trúc)*
- `docs/architecture/SAD.md` *(T2/T6/pipeline/cây thư mục — theo yêu cầu docs kiến trúc)*
- `apps/web/src/contracts/earthquake.ts`, `apps/web/src/features/earthquakes/country-filter.ts`, `apps/web/src/features/earthquakes/region-filter.ts` *(additive, ưu tiên field BE)*
- `apps/web/src/features/earthquakes/country-clusters.ts` *(US state name + MX → Mexico, đồng bộ BE)*
- `apps/api/tests/fixtures/quality_contracts.json` *(refresh snapshot OpenAPI/ORM sau khi đổi field/cột — không xoá/skip test)*
- `apps/web/src/contracts/geo-catalog.ts` *(mới)*, `apps/web/src/services/geo-catalog-api.ts` *(mới)*, `apps/web/src/layouts/header/GlobalCountryFilter.tsx`, `apps/web/src/features/monitoring/MonitoringMapPage.tsx`, `apps/web/src/components/map/MapRegionPanel.tsx` *(dùng danh mục BE, giữ fallback)*
- `.agents/notes/testcase/2026-11-22-be-country-region-derivation-thien.md` *(đặc tả sinh đồng thời)*
- `apps/api/tests/unit/test_ingestion_geo.py` *(mới)*, `apps/api/tests/unit/test_ingestion_backfill.py` *(mới)*, `apps/api/tests/unit/test_ingestion_parser.py`, `apps/api/tests/unit/test_earthquakes_routes.py` *(bổ sung — gồm test catalog)*
- `apps/web/tests/be-country-region-fields.test.ts` *(mới)*, `apps/web/tests/geo-catalog-api.test.ts` *(mới)*

### Out of Scope
- `apps/api/alembic/versions/001_initial_gdmas_schema.py` (I4 — tuyệt đối không sửa), `AGENTS.md`, `apps/api/src/gdmas/main.py`, `contracts/README.md` phần khác ngoài §3.1
- Không thêm endpoint **top-level** `/api/v1/countries` (đã bị proposal header loại); danh mục được đặt namespace `/api/v1/earthquakes/{countries,regions}`; không reverse-geocode, không đổi SSE/payload event, không xoá helper FE cũ (I2)

---

## 3. Các bước
### Step 1 — Module derive thuần (`geo.py`)
Port `COUNTRY_PATTERNS`, `US_STATE_CODES`, `derive_country(place)`, `derive_region(place, country)` từ FE sang Python; fallback `"Khác"`; không mạng, không prefix `id`.

### Step 2 — Ingestion & sync dùng chung helper
`parser.py` (T2) và `routes/earthquakes.py::sync_usgs_earthquakes` (T6) gán `country`/`region` từ `geo.py` (additive dict, không đổi chữ ký hàm).

### Step 3 — DB + migration mới
`models/earthquake.py` thêm 2 cột `String(128)` nullable + index; migration `002_...py` `op.add_column` + backfill regex SQL từ `place`.

### Step 4 — Response & lọc
`schemas/earthquake.py` thêm field optional; `GET /earthquakes` thêm `country`/`region` query param (default `None`) + filter trước `count()`/phân trang.

### Step 5 — Hợp đồng & FE
Cập nhật `contracts/`, `docs/api/API.md` §3.2; FE khai báo field và ưu tiên `item.country ?? countryFromPlace(item.place)` (giữ fallback).

### Step 6 — Test & validation
Test offline BE/FE; cập nhật testcase note; chạy pytest/ruff/pnpm build/notes_index.

### Step 8 (Revision 2026-11-23) — Backfill lịch sử & danh mục
- `backfill.py`: chạy 1 lần feed `all_month`, tái dùng `IngestionService` (parse/upsert/log), giữ feed `all_hour` mặc định, không đụng `.env`.
- 2 endpoint `/earthquakes/{countries,regions}` + `geo-catalog-api.ts`; FE dùng catalog, fallback cũ giữ nguyên.
- Chuẩn hoá `MX → Mexico`; re-derive DB dev (102 quốc gia).

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Alembic migration **mới** `002_add_country_region.py` (không đụng `001_...`).
- Response `/api/v1/earthquakes` (list + detail): thêm `country?: string | null`, `region?: string | null`.
- Query params mới: `country`, `region` (optional).
- Hợp đồng: `contracts/schemas/earthquake.json`, `contracts/README.md` §3.1, `contracts/examples/earthquake_sample.json`, `docs/api/API.md` §3.2.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-be-country-region-derivation-thien.md`
- [ ] **Đã tạo và chạy pass file unit/integration test offline**
- [ ] `cd apps/api && uv run pytest tests/unit/test_ingestion_geo.py tests/unit/test_ingestion_parser.py tests/unit/test_earthquakes_routes.py -q`
- [ ] `cd apps/api && uv run pytest` (diff rộng đụng `contracts/**`, `alembic/**`)
- [ ] `cd apps/api && uv run ruff check . && uv run ruff format --check .`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Tài liệu `Architecture Impact` đã cập nhật
- [ ] Kiểm chứng backfill migration trên DB test & đối chiếu output FE/BE

---

## 6. Rủi ro khi làm
Regex thiếu quốc gia → fallback `"Khác"`; backfill SQL lệch Python → test đối chiếu; FE/BE cùng derive → FE ưu tiên field BE, giữ fallback.

---

## 7. Rollback
Revert commit/PR; `alembic downgrade 001` (xoá 2 cột); FE giữ helper cũ nên vẫn chạy được khi BE chưa có field.

---

## 8. Ghi chú
`Overrides:` đã ghi trong proposal; các quyết định cũ khác (bản đồ, header, SSE) giữ nguyên. Không mock, không bịa dữ liệu.
