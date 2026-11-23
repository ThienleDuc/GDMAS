<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Overview — cửa sổ 1 tháng, 1 chart chu kỳ, layout 3 hàng

## Metadata
- ID: 2026-11-24-overview-month-window-layout-thien
- Proposal: .agents/notes/proposed/2026-11-24-overview-month-window-layout-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
BE: đổi cửa sổ analysis/data/clustering từ 365 → 30 ngày. FE: truyền cửa sổ tháng cho seasonality, bỏ chart 12 tháng, xếp lại 3 hàng card (ranking chart trên/bảng dưới).

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/core/config.py` (3 window config → 30)
- `docker-compose.yml` (6 default `${...:-365}` → `:-30`)
- `apps/api/src/gdmas/services/analysis/service.py` (`DEFAULT_WINDOW_DAYS = 30`)
- `apps/api/src/gdmas/api/routes/analysis.py` (seasonality: `start_time`/`end_time` → `compute_filtered_metrics`)
- `apps/web/src/services/earthquake-api.ts` (`getSeasonalityAnalysis` truyền start/end)
- `apps/web/src/features/overview/useOverviewData.ts` (truyền window; bỏ `getMonthlyPeaks`)
- `apps/web/src/features/overview/OverviewPage.tsx` + `.css` (1 chart chu kỳ, layout 3 hàng, ranking 2 hàng dọc)
- `.agents/notes/testcase/2026-11-24-overview-month-window-layout-thien.md`
- BE test route analysis + FE `overview-page.test.ts`, `overview-view.test.ts`, `services.test.ts`

### Out of Scope
- Schema/contract field, migration, worker/SSE, Dark Mode, 6 Patterns, header/aside, monitoring
- Cờ env override tên biến (vẫn giữ `*_WINDOW_DAYS`)
- Working tree timezone chưa commit — stage patch riêng

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD; giữ working tree timezone.

### Step 3 — BE window
config.py + docker-compose + analysis service default → 30; route seasonality nhận start/end.

### Step 4 — FE
`getSeasonalityAnalysis` truyền window; bỏ monthly-peaks; 1 chart chu kỳ; layout 3 hàng; ranking dọc.

### Step 5 — Test & validation
BE pytest + ruff; FE build + test; `notes_index --check`.

### Step 6 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
**Có:** 3 biến cấu hình cửa sổ mặc định 365 → 30 ngày (config + compose). Không đổi schema/payload.

---

## 5. Validation
- [x] testcase + test offline 2 phía
- [x] BE `uv run python -m pytest -q` — 372 passed
- [x] BE ruff check/format — sạch (snapshot contract cập nhật)
- [x] FE `pnpm build && pnpm test` — 362 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: không xoá file/hàm cũ
- [x] `.env`/`.env.example` cửa sổ = 30; compose `${...:-30}` trỏ tới biến môi trường

---

## 6. Rủi ro khi làm
- Cửa sổ 30 ngày → seasonality insufficient (<14 ngày) → hệ số 0 (đã có guard, không bịa).
- Test cũ assert 365 → cập nhật assertion, không xoá.
- Dirty tree timezone → stage patch riêng.

---

## 7. Rollback
Revert commit; env vẫn override được cửa sổ nếu cần.

---

## 8. Ghi chú
Giữ chữ ký hàm/props cũ (I2).
