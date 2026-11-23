# Implementation Plan: Áp dụng chế độ UTC/UTC+7 từ Header tới mọi trang dùng thời gian

## Metadata
- ID: 2026-11-23-global-timezone-context-thien
- Proposal: .agents/notes/proposed/2026-11-23-global-timezone-context-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Đưa lựa chọn múi giờ (UTC / UTC+7) từ đồng hồ header thành một nguồn sự thật dùng chung, để mọi trang hiển thị thời gian đổi ngay khi bấm toggle — không cần reload.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/contexts/timezone-context.tsx` *(mới — provider + hook `useTimezone`)*
- `apps/web/src/layouts/DashboardLayout.tsx` *(bọc `Outlet` bằng provider)*
- `apps/web/src/layouts/header/RealtimeClock.tsx` *(dùng context thay state/localStorage trực tiếp)*
- `apps/web/src/features/overview/OverviewPage.tsx` *(dùng `useTimezone()`)*
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` *(dùng `useTimezone()` cho bảng và panel chi tiết)*
- `apps/web/src/components/map/EventListPanel.tsx`, `apps/web/src/components/map/MapPopupCard.tsx` *(bỏ hardcode `"UTC"`)*
- `.agents/notes/testcase/2026-11-23-global-timezone-context-thien.md` *(đặc tả sinh đồng thời)*
- `apps/web/tests/timezone-context.test.ts` *(mới — test offline)*
- `apps/web/tests/timezone-display.test.ts` *(mới — kiểm tra nguồn caller dùng context)*

### Out of Scope
- `apps/api/**`, `contracts/**`, `docs/api/API.md`, migration Alembic (I3/I4)
- Đổi lưu trữ UTC, payload SSE, `AGENTS.md`
- Xoá/sửa chữ ký `getStoredTimezone`, `setStoredTimezone`, `formatEventTime`, `formatClockTime` (I2)
- Commit/push/merge (dừng CHECKPOINT 1)

---

## 3. Các bước
### Step 1 — Artifacts
Cập nhật §9 Approved; tạo đồng thời `plan.md`, `status.md`, testcase; `notes_index --check`.
### Step 2 — Nhánh
`refactor/2026-11-23-global-timezone-context-thien` đã checkout từ `develop`.
### Step 3 — Context
Tạo provider/hook `useTimezone` (đọc localStorage lúc mount, ghi khi đổi), bọc `Outlet` trong `DashboardLayout`.
### Step 4 — Callers
Đổi `RealtimeClock`, `OverviewPage`, `EarthquakesPage`, `EventListPanel`, `MapPopupCard` sang context; giữ default của hàm thuần (I2).
### Step 5 — Test & validation
Test offline, `pnpm test`, `pnpm build`, `notes_index --check`, `git status` không có xoá; status → `validation`; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có. Không migration, không endpoint/schema/contract mới. Chỉ state FE + localStorage đã dùng sẵn.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase tại `.agents/notes/testcase/2026-11-23-global-timezone-context-thien.md`
- [x] Đã tạo và chạy pass file test offline `apps/web/tests/timezone-context.test.ts` (5/5) + `timezone-display.test.ts` (4/4)
- [x] Backend test/lint: **N/A** (không đụng `apps/api`)
- [x] Frontend: `cd apps/web && pnpm test` (326/326 PASS) `&& pnpm build` OK
- [x] Notes: `python3 scripts/notes_index.py --check` OK
- [x] Tài liệu bị ảnh hưởng: **N/A** (Architecture Impact = none)
- [ ] Kiểm chức năng: toggle UTC/UTC+7 ở header → mọi trang đổi ngay không reload.

---

## 6. Rủi ro khi làm
Page render ngoài provider → hook ném lỗi rõ; test cũ soi cứng `getStoredTimezone()` → cập nhật additive.

---

## 7. Rollback
Revert commit/nhánh `refactor/2026-11-23-global-timezone-context-thien`; helper/localStorage cũ vẫn nguyên.

---

## 8. Ghi chú
Không đụng `AGENTS.md`, `contracts/`, migration. Mọi thay đổi additive (I2/RULE-03).
