# Implementation Plan: Toast theo SSE (GAP-13)

## Metadata
- ID: 2026-11-22-sse-refresh-toast-thien
- Proposal: .agents/notes/proposed/2026-11-22-sse-refresh-toast-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Toast bắn theo `ingestion_cycle_completed`, không theo đồng hồ cục bộ; giữ toast/CSS cũ.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/layouts/header/header-data.ts` *(helper `dataRefreshKey`)*
- `apps/web/src/layouts/header/DataRefreshLabel.tsx` *(prop + effect, bỏ setToast khỏi countdown)*
- `apps/web/src/layouts/header/HeaderActions.tsx` *(truyền prop)*
- `apps/web/src/layouts/DashboardLayout.tsx` *(derive key từ sse.data)*
- `apps/web/tests/header-sse-refresh.test.ts` *(mới)*
- `docs/task/fe-be-integration-gaps.md` *(nhật ký)*
- `.agents/notes/testcase/2026-11-22-sse-refresh-toast-thien.md`

### Out of Scope
BE, contracts, CSS toast, countdown/reconnect, GAP-08/09/12.

---

## 3. Các bước
1. Helper thuần `dataRefreshKey(event?)`.
2. Wire DashboardLayout → HeaderActions → DataRefreshLabel.
3. Test helper + source assertions; validation + nhật ký; merge tự động (user cho phép).

---

## 4/5/6/7. Khác
Không migration/schema/env. Test offline `node:test`. Rollback: revert 5 file + nhật ký. Chủ vùng `thien` (FE).
