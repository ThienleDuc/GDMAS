# Implementation Status: Trang Danh mục động đất với bộ lọc thời gian & độ lớn (T7.03)

## Metadata
- ID: 2026-11-20-earthquakes-catalog-filter-thien
- Status: completed
- Started: 2026-11-20
- Last Updated: 2026-11-20
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: completed — đã merge PR #32 vào develop (SHA f0c2790)

Completed:
- Proposal §9 Approved bởi `thien`; không conflict/critical bug.
- `earthquake-view.ts`: query builder UTC Z, deriveViewState 4 trạng thái, format row, fetchPage inject fetcher.
- `EarthquakesPage.tsx`: filter debounce, phân trang, timezone toggle, Loading/Error+Retry/Empty, bảng ds-table.
- `App.tsx`: route EARTHQUAKES dùng EarthquakesPage thay placeholder.
- Test offline `earthquakes-page.test.ts`: 6 TC mới; build/test/notes/scope xanh.

In Progress:
- none
Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-20-earthquakes-catalog-filter-thien.md` + `tests/earthquakes-page.test.ts` |
| Frontend build | PASS | `pnpm build` OK |
| Frontend tests | PASS | `pnpm test` 69/69 (baseline 63) |
| Notes check | PASS | `notes_index.py --check` OK |
| Scope | PASS | `git-ship.sh scope` — 8 tệp trong phạm vi |
| Tài liệu cập nhật | N/A | Architecture Impact: none |

---

## Known Issues
- none

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Tách logic thuần vì repo không có DOM testing library; component mỏng, helper test bằng node:test.

---

## Next Actions
- none — CHECKPOINT 1/2 đã xác nhận; PR #32 đã merge vào develop, sync hoàn tất.

---

## Last Update
2026-11-20 — Commit 3e74d90, PR #32 merge vào develop (SHA f0c2790), sync xong; status.md → completed.
