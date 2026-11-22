<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9. -->

# Implementation Plan: Panel trạng thái 7 Terminals (RD-16)

## Metadata
- ID: 2026-11-22-terminal-status-panel-thien
- Proposal: .agents/notes/proposed/2026-11-22-terminal-status-panel-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Nạp `/health` + `/system/status` thật vào widget header 7 Terminals; thiếu `last_run` → unknown; không mock, không khôi phục `/settings`.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/layouts/header/header-data.ts` *(thêm `terminalStatusRows`, `summarizeTerminalRows`)*
- `apps/web/src/layouts/header/SystemStatusPanel.tsx` *(mới — component `<details>`)*
- `apps/web/src/layouts/header/HeaderActions.tsx` *(thêm 1 widget)*
- `apps/web/src/layouts/layout.css` *(class `.layout__system-*`, chỉ CSS token)*
- `apps/web/tests/terminal-status.test.ts` *(mới)*
- `docs/task/fe-be-integration-ready.md` *(mục 4 — nhật ký)*
- `.agents/notes/testcase/2026-11-22-terminal-status-panel-thien.md` *(đặc tả sinh đồng thời)*

### Out of Scope
- `apps/api/**`, `contracts/**`, `docs/api/API.md`, migration
- Route `/settings`, card strip 7 Terminals trên `/` (đã gỡ theo yêu cầu cũ)
- `apps/web/src/services/**`, contracts FE, `lib/transforms/settings-data.ts` (đã có helper)
- SSE/poll nền, theme toggle, countdown, filter quốc gia

---

## 3. Các bước
### Step 1 — Helper thuần
`terminalStatusRows(payload, now?)` map 7 key → `{key, terminalId, name, status, freshness, lastRunLabel}`, dùng `TERMINAL_KEYS/SPECS`, `SERVICE_LABELS`, `evaluateServiceFreshness`, `formatElapsedMinutes`; `summarizeTerminalRows(rows)` → `{healthy,total}`.
### Step 2 — Component
`SystemStatusPanel.tsx`: `<details>` summary `"Hệ thống {healthy}/{total}"`; fetch abortable `getSystemStatusOptional` + `getHealthOptional` (mount + mở panel); 404/unavailable → nhãn riêng; 500 → alert + retry.
### Step 3 — Wiring & CSS
Thêm widget vào `HeaderActions.tsx`; CSS token trong `layout.css`.
### Step 4 — Test & nhật ký
`terminal-status.test.ts` (helper + source assertions); `pnpm test && pnpm build`; ghi mục 4; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có — chỉ dùng endpoint có sẵn. Không migration/schema/env/route mới.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-terminal-status-panel-thien.md`
- [ ] **Đã tạo và chạy pass file test offline** — `terminal-status.test.ts`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Kiểm tra chức năng: 7 dòng T1–T7; thiếu `last_run` → "Chưa có thông tin"; 404 → unavailable; không có `/settings` mới

---

## 6. Rủi ro khi làm
Header chật mobile → `<details>` gọn + breakpoint CSS; helper mặc định `unknown` cho status lạ.

---

## 7. Rollback
Revert 5 file FE + mục 4 docs/task; giữ notes. Không có migration.

---

## 8. Ghi chú
Chủ vùng `thien` (T7/FE). Dừng CHECKPOINT 1 sau validation.
