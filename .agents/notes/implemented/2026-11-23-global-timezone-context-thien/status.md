# Implementation Status: Áp dụng chế độ UTC/UTC+7 từ Header tới mọi trang

## Metadata
- ID: 2026-11-23-global-timezone-context-thien
- Status: validation
- Started: 2026-11-23
- Last Updated: 2026-11-23
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: Step 5 — validation xong, chờ CHECKPOINT 1

Completed:
- Proposal §9 Approved (Reviewer: thien — "Approved - tiếp tục workflow")
- Nhánh `refactor/2026-11-23-global-timezone-context-thien` rẽ từ develop
- Artifacts sinh đồng thời: `plan.md`, `status.md`, testcase
- Context `TimezoneProvider`/`useTimezone` tại shell; helper thuần `timezoneFromStorage`/`timezoneToStorage` (I2)
- Đổi caller: `RealtimeClock`, `OverviewPage`, `EarthquakesPage`, `EventListPanel`, `MapPopupCard`; giữ default `"UTC"` của hàm thuần
- Validation: `pnpm test` 326/326 PASS, `pnpm build` OK, `notes_index --check` OK

In Progress:
- none — chờ CHECKPOINT 1

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/<id>.md` + `timezone-context.test.ts` (5/5) + `timezone-display.test.ts` (4/4) |
| Test liên quan (`pnpm test`) | PASS | 326/326 (1 assertion cũ cập nhật additive, không xoá test) |
| Lint / Build (`pnpm build`) | PASS | `tsc -b && vite build` OK |
| Notes check (`notes_index.py --check`) | PASS | OK |
| Tài liệu cập nhật | N/A | Architecture Impact = none |

---

## Known Issues
- none

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Dùng React Context tại shell thay vì storage event/poll từng page để đổi ngay không reload.
- Fix runtime: provider bọc toàn bộ root layout (bao gồm header), không chỉ `<Outlet />` — nếu không `RealtimeClock` nằm ngoài provider sẽ ném lỗi.

---

## Next Actions
- CHECKPOINT 1: người dùng chọn `tiếp tục workflow` (commit + push + PR) / `dừng lại` / `sửa thêm`.

---

## Last Update
2026-11-23 — Hoàn tất triển khai timezone context, validation xanh, `Status: validation`, dừng CHECKPOINT 1.
