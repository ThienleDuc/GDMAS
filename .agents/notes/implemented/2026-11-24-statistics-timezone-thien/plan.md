<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Statistics nhận UTC/UTC+7 từ header

## Metadata
- ID: 2026-11-24-statistics-timezone-thien
- Proposal: .agents/notes/proposed/2026-11-24-statistics-timezone-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Chế độ UTC/UTC+7 chọn ở header được dùng để hiển thị nhãn ngày trên mọi biểu đồ Statistics; dữ liệu vẫn UTC.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/statistics/statistics-data.tsx` (timezone từ useTimezone vào context)
- `apps/web/src/features/statistics/statistics-view.ts` (helper `formatStatDate`)
- `apps/web/src/features/statistics/patterns/TemporalPatternPage.tsx`, `ForecastPatternPage.tsx`
- `apps/web/src/components/charts/TemporalPatternCharts.tsx` (prop timezone optional)
- `apps/web/src/features/statistics/ai-insights.ts` (chuỗi ngày, optional)
- `apps/web/tests/statistics-view.test.ts` + test structural
- `.agents/notes/testcase/2026-11-24-statistics-timezone-thien.md`

### Out of Scope
- BE/contract/payload/DB (I3), Dark Mode, 6 Patterns logic, header/aside
- Working tree 2 task trước — giữ nguyên, stage riêng

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD.

### Step 3 — FE
Context timezone; helper formatStatDate; truyền vào chart/page/insight.

### Step 4 — Test
FE build + test; notes check; OCP.

### Step 5 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có.

---

## 5. Validation
- [x] test helper 2 mode + test structural
- [x] `cd apps/web && pnpm build && pnpm test` — 368 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] OCP: giữ chữ ký/props cũ

---

## 6. Rủi ro khi làm
- Nhãn ngày lệch 1 ngày → parse UTC rồi format, không cộng ngày.

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
Props/luồng timezone optional để caller cũ không vỡ (I2).
