<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Loại bỏ khu vực trùng lặp (BE chuẩn hóa, FE dùng lại)

## Metadata
- ID: 2026-11-24-monitoring-region-dedupe-thien
- Proposal: .agents/notes/proposed/2026-11-24-monitoring-region-dedupe-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
BE trả danh mục khu vực mỗi khu vực đúng 1 dòng (khoá trim+casefold, gộp count/avg/max); FE dùng lại và dedupe phòng thủ theo cùng khoá.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/api/routes/earthquakes.py` (hàm gộp thuần + dùng trong `/regions`)
- `apps/api/tests/unit/test_earthquakes_routes.py` (bổ sung test dedupe)
- `apps/web/src/layouts/header/header-data.ts` (dedupe casefold)
- `apps/web/src/features/monitoring/region-catalog-view.ts` (khoá normalize)
- `apps/web/src/components/map/MapRegionPanel.tsx` (dedupe prop/extraRegions)
- `apps/web/tests/monitoring-region-map.test.ts`, `apps/web/tests/header-global.test.ts` (bổ sung)
- `.agents/notes/testcase/2026-11-24-monitoring-region-dedupe-thien.md`

### Out of Scope
- `derive_region`/ingestion/artifact, contract/schema/migration/SSE/worker, Dark Mode/6 Patterns
- Working tree chưa commit của các task trước (timezone, overview-severity, BE precision)

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD (git-ship.sh start bị chặn bởi dirty tree); giữ nguyên working tree.

### Step 3 — BE
Hàm thuần gộp region rows theo `trim().casefold()`; route `/regions` dùng thay map trực tiếp.

### Step 4 — FE
`regionOptionsFromCatalog`/`region-catalog-view`/`MapRegionPanel` dùng khoá normalize; dedupe phòng thủ.

### Step 5 — Test & validation
BE pytest + ruff; FE build + test; `notes_index --check`.

### Step 6 — CHECKPOINT 1
`status.md = validation`, báo cáo, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Cùng payload shape `RegionCount[]`, chỉ gộp dòng trùng.

---

## 5. Validation (nhẹ)
- [x] testcase + file test offline 2 phía
- [x] `cd apps/api && uv run python -m pytest tests/unit/test_earthquakes_routes.py` — 38 passed
- [x] `cd apps/api && uv run ruff check . && uv run ruff format --check .` — sạch
- [x] `cd apps/web && pnpm build && pnpm test` — 360 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: không xoá file

---

## 6. Rủi ro khi làm
- Gộp nhầm 2 vùng khác nhau chỉ trùng casefold → chỉ bỏ hoa/thường & khoảng trắng.
- Avg sau gộp → dùng `avg*count` rồi chia lại.

---

## 7. Rollback
Revert commit; không DB/migration. Giữ working tree các task trước.

---

## 8. Ghi chú
Giữ chữ ký route/hàm/props cũ (I2).
