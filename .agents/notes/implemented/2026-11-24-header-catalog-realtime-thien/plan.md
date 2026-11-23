<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Catalog quốc gia/khu vực realtime qua SSE (chỉ đẩy khi đổi)

## Metadata
- ID: 2026-11-24-header-catalog-realtime-thien
- Proposal: .agents/notes/proposed/2026-11-24-header-catalog-realtime-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
BE tính catalog quốc gia/khu vực mỗi 5 phút ở luồng riêng, so sánh hash — chỉ đính vào SSE khi khác; FE combobox tiêu thụ có điều kiện, không đổi thì giữ nguyên.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/catalog.py` (mới: `country_counts`, `region_counts`, `catalog_payload`, hash)
- `apps/api/src/gdmas/realtime/sse.py` (`asyncio.to_thread`, `_last_catalog_hash`, đính `catalog` khi đổi)
- `apps/api/tests/unit/test_catalog_sse.py` (mới)
- `apps/web/src/layouts/DashboardLayout.tsx`, `HeaderActions.tsx`, `GlobalCountryFilter.tsx`, `GlobalRegionFilter.tsx`, `header-data.ts`
- `apps/web/tests/header-region-filter.test.ts`, `apps/web/tests/header-global.test.ts`
- `.agents/notes/testcase/2026-11-24-header-catalog-realtime-thien.md`

### Out of Scope
- Route `/countries`, `/regions` (giữ nguyên — không bắt buộc đổi để giảm rủi ro), schema/contract field, migration, worker, SSE event name
- URL `?country=&region=`, CSS/UI combobox, helper cũ
- Working tree timezone (đã sạch), commit/push/merge (CHECKPOINT)

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ develop (working tree sạch).

### Step 3 — BE
Service catalog thuần; SSE `to_thread` + hash diff; `database_cleared` reset.

### Step 4 — FE
`DashboardLayout` → `HeaderActions` → 2 filter nhận `catalog` optional; chỉ update khi có field.

### Step 5 — Test & validation
BE pytest + ruff (cập nhật snapshot contract nếu guard fail); FE build + test; notes check.

### Step 6 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi schema; SSE `data` (object tự do) thêm field optional `catalog` — additive. Có thể cần cập nhật snapshot `quality_contracts.json`.

---

## 5. Validation
- [x] testcase + test offline 2 phía
- [x] BE `uv run python -m pytest -q` — 381 passed + ruff sạch (gồm test cửa sổ 30 ngày & bỏ qua env 365)
- [x] FE `pnpm build && pnpm test` — 364 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: giữ helper/props cũ

---

## 6. Rủi ro khi làm
- Guard OpenAPI/contract: cập nhật snapshot có chủ đích.
- DB lỗi khi snapshot → không đính catalog, SSE vẫn phát.
- `to_thread` cần SessionLocal riêng (không share session giữa luồng).

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
`catalog` optional — FE thiếu field thì giữ nguyên (không fetch lại).
