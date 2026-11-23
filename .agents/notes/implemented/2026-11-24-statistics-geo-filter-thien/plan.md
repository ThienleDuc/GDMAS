<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Bộ lọc quốc gia & khu vực cho Statistics

## Metadata
- ID: 2026-11-24-statistics-geo-filter-thien
- Proposal: .agents/notes/proposed/2026-11-24-statistics-geo-filter-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Thêm CountryPicker cạnh RegionPicker trên trang Statistics; cả 2 dùng chung URL ?country=&region= → 6 biểu đồ tự lọc.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/statistics/StatisticsLayout.tsx` (chip ngữ cảnh; giữ RegionPicker, KHÔNG thêm picker quốc gia)
- `apps/web/src/features/statistics/StatisticsPage.css` (chip)
- `apps/web/tests/statistics-subroute.test.ts` / `chart-region-filter.test.ts` bổ sung
- `.agents/notes/testcase/2026-11-24-statistics-geo-filter-thien.md`

### Out of Scope
- BE, contract, `statistics-data.tsx` (đã truyền geo cho 6 endpoint), 6 component biểu đồ, header combobox
- Working tree của task `temporal-daily-series` — giữ nguyên

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời 3 note; `notes_index --check`.

### Step 2 — Nhánh
`git switch -c fix/<id>` từ HEAD (dirty tree temporal), giữ mọi thay đổi.

### Step 3 — FE
CountryPicker (catalog + fallback clusters, setCountry), chip ngữ cảnh, CSS token.

### Step 4 — Test & validation
FE build + test; notes check; OCP.

### Step 5 — CHECKPOINT 1
`status.md = validation`, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có.

---

## 5. Validation
- [ ] testcase + test FE bổ sung
- [ ] `cd apps/web && pnpm build && pnpm test`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] OCP: giữ RegionPicker/header, chữ ký cũ

---

## 6. Rủi ro khi làm
- Catalog rỗng/404 → fallback clusters, option "Tất cả" vẫn có.

---

## 7. Rollback
Revert commit; không DB/migration.

---

## 8. Ghi chú
`?country=&region=` vẫn là nguồn sự thật duy nhất.
