<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Temporal bucket theo UTC/UTC+7

## Metadata
- ID: 2026-11-24-temporal-timezone-buckets-thien
- Proposal: .agents/notes/proposed/2026-11-24-temporal-timezone-buckets-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Sự kiện 23/11 20:00Z phải nằm bucket 24 khi chọn UTC+7; UTC giữ bucket 23. Payload shape & DB UTC không đổi.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/analysis/patterns.py` (`compute_temporal(..., tz)`)
- `apps/api/src/gdmas/services/analysis/filtered.py` (`compute_filtered_metrics(..., timezone)`)
- `apps/api/src/gdmas/api/routes/analysis.py` (`/analysis/temporal` query `timezone`)
- `apps/web/src/services/earthquake-api.ts` (`getTemporalAnalysis` gửi timezone)
- `apps/web/src/features/statistics/statistics-data.tsx` (truyền timezone + deps)
- `apps/api/tests/unit/test_analysis_temporal_window.py`, FE test bổ sung
- `.agents/notes/testcase/2026-11-24-temporal-timezone-buckets-thien.md`

### Out of Scope
- DB timestamp/contract shape, Dark Mode, 6 Patterns logic, header combobox, 3 task trước (giữ working tree)

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD.

### Step 3 — BE
TZ map; convert local trước resample; query param optional; default UTC.

### Step 4 — FE + test
Gửi timezone; deps; test 2 mode; validation.

### Step 5 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Thêm query param optional `timezone` trên `/analysis/temporal` (additive). Có thể cần cập nhật snapshot `quality_contracts.json`.

---

## 5. Validation
- [x] testcase + test BE/FE
- [x] BE `uv run python -m pytest -q` — 382 passed + ruff sạch (snapshot OpenAPI cập nhật)
- [x] FE `pnpm build && pnpm test` — 368 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: default UTC, giữ chữ ký cũ; nhãn chỉ giữ ngày

---

## 6. Rủi ro khi làm
- Contract guard OpenAPI đổi → cập nhật snapshot có chủ đích.
- FE double shift → nhãn BE đã local, `formatStatDate` giữ nguyên.

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
Scatter timestamp vẫn UTC ISO để FE format theo mode.
