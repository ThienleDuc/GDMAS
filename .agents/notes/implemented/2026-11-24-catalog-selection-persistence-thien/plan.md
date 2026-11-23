<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal §9 Approved. -->

# Implementation Plan: Giữ lựa chọn quốc gia/khu vực khi chuyển trang & sau refresh 5 phút

## Metadata
- ID: 2026-11-24-catalog-selection-persistence-thien
- Proposal: .agents/notes/proposed/2026-11-24-catalog-selection-persistence-thien.md
- Approved By: thien
- Approved At: 2026-11-24
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Mọi điều hướng nội bộ giữ `?country=&region=` đang chọn; combobox vẫn đổi/reset được; chu kỳ 5 phút refetch vẫn dùng filter hiện tại. URL vẫn là nguồn sự thật duy nhất.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/earthquakes/catalog-selection.ts` (`pathWithSelection` thuần)
- `apps/web/src/features/earthquakes/useCatalogSelection.ts` (`withSelection` trong result)
- `apps/web/src/layouts/DashboardLayout.tsx` (aside NavLink — stage hunk riêng: file đang dính timezone)
- `apps/web/src/features/overview/OverviewPage.tsx` (navigate/Link + handleRankSelect — stage hunk riêng: đang dính timezone + overview task trước)
- `apps/web/src/features/statistics/StatisticsLayout.tsx` (tab NavLink)
- `.agents/notes/testcase/2026-11-24-catalog-selection-persistence-thien.md`
- `apps/web/tests/catalog-selection-persistence.test.ts` (mới)
- `apps/web/tests/header-global.test.ts`, `apps/web/tests/overview-page.test.ts` (bổ sung assertion)

### Out of Scope
- BE, contracts, API docs, migration, SSE protocol, Dark Mode tokens, 6 Patterns
- localStorage/sessionStorage (không thay URL làm nguồn sự thật)
- Toàn bộ working tree chưa commit của 2 proposal trước (`global-timezone-context`, `overview-severity-standard`) — giữ nguyên, không stage

---

## 3. Các bước
### Step 1 — Notes
§9 Approved; sinh đồng thời `plan.md`, `status.md`, `testcase/<id>.md`; `notes_index.py --check`.

### Step 2 — Nhánh
`git-ship.sh start` bị chặn bởi feature branch + dirty tree → `git switch -c fix/<id>` từ HEAD, giữ nguyên working tree.

### Step 3 — Hàm thuần & method
`catalog-selection.ts`: `pathWithSelection(to, selection)` — tách path/query/hash, merge qua `selectionToParams`. `useCatalogSelection.ts`: thêm `withSelection(to)` vào result.

### Step 4 — Link điều hướng
`DashboardLayout`, `OverviewPage` (3 Link + navigate + handleRankSelect truyền selection mới), `StatisticsLayout` dùng `withSelection`/`pathWithSelection`.

### Step 5 — Test & validation
Test mới + bổ sung test cũ; `pnpm build`, `pnpm test`, `notes_index.py --check`; kiểm no deletions.

### Step 6 — CHECKPOINT 1
`status.md = validation`, báo cáo, dừng chờ xác nhận.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. FE-only; query param hiện có, `Architecture Impact: none`.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] `.agents/notes/testcase/<id>.md` từ `_TEMPLATE.md`
- [x] Test offline mới + test cũ (không xoá)
- [x] `cd apps/web && pnpm build` — PASS
- [x] `cd apps/web && pnpm test` — 357 tests / 0 fail
- [x] `python3 scripts/notes_index.py --check` — OK
- [x] Kiểm chứng structural: link giữ query, refresh dùng `geo` (chưa test tay UI — không chạy browser)

---

## 6. Rủi ro khi làm
- Stale closure `handleRankSelect` → dùng `pathWithSelection` với selection mới.
- Link dính query lạ → `selectionToParams(base)` set/delete thay vì nối chuỗi.
- Dirty tree 2 proposal trước → stage patch riêng khi commit.

---

## 7. Rollback
Revert commit nhánh này; không DB/migration. Giữ nguyên working tree các proposal trước.

---

## 8. Ghi chú
`withSelection` là method mới trên result — giữ nguyên mọi chữ ký cũ (I2).
