<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Temporal luôn vẽ chuỗi theo ngày

## Metadata
- ID: 2026-11-24-temporal-daily-series-thien
- Proposal: .agents/notes/proposed/2026-11-24-temporal-daily-series-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Chip Ngày/Tuần/Tháng chỉ đổi cửa sổ; `/analysis/temporal` luôn resample theo ngày → 3 biểu đồ là chuỗi nhiều phiên ngày.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/statistics/statistics-data.tsx` (1 dòng: `interval: "day"` cho temporal)
- Test FE statistics bổ sung
- `.agents/notes/testcase/2026-11-24-temporal-daily-series-thien.md`

### Out of Scope
- `TemporalPatternCharts`, CSS, BE `compute_temporal`, contract/payload, chip/tên nhãn, `intervalToParams`

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ develop (working tree sạch).

### Step 3 — FE
Sửa `getTemporalAnalysis({ interval: "day", ...window, ...geo })`; deps giữ nguyên.

### Step 4 — Test & validation
FE build + test; notes check; OCP.

### Step 5 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có.

---

## 5. Validation
- [x] testcase + test FE bổ sung
- [x] `cd apps/web && pnpm build && pnpm test` — 364 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: giữ chữ ký/props

---

## 6. Rủi ro khi làm
- Chip Ngày chỉ 1–2 điểm — người dùng đã chọn.

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
`interval` trong context vẫn là trạng thái chip (highlight UI).
