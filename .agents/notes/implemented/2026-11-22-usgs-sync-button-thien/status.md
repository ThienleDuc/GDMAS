<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/status.md — ngắn, sống, cập nhật liên tục. -->

# Implementation Status: Nút đồng bộ USGS (RD-14)

## Metadata
- ID: 2026-11-22-usgs-sync-button-thien
- Status: validation   <!-- planned | in_progress | blocked | validation | completed -->
- Started: 2026-11-22
- Last Updated: 2026-11-22
- Owner: agent | thien

---

## Tiến độ
Progress: 100%
Current Phase: CHECKPOINT 1 — chờ người dùng commit/push hay giữ nguyên

Completed:
- Rẽ nhánh `feat/2026-11-22-usgs-sync-button-thien` từ `develop`
- Proposal §9 Approved + implemented plan/status + testcase (đồng thời)
- Đọc nhật ký proposal 1–4 tại `docs/task/fe-be-integration-ready.md` mục 4
- Step 1 — `usgs-sync.ts`: `syncReducer`, `formatSyncMessage`, `syncErrorMessage`
- Step 2 — `UsgsSyncButton.tsx`: xác nhận 2 bước, disable, abort + mountedRef, refresh sau success
- Step 3 — `EarthquakesPage.tsx/.css`: nút cạnh "Tải lại", `handleSynced`, CSS token
- Step 3b — vá `isApiEnvelope` cho shape `/sync`; `syncUsgsData(signal?)`
- Step 4 — `usgs-sync.test.ts` 7 case; ghi mục 4 + bảng tổng kết 5 proposal

In Progress:
- none

Blocked:
- none

---

## Validation
| Kiểm tra | Kết quả | Ghi chú |
|---|---|---|
| Testcase & file test | DONE | `testcase/2026-11-22-usgs-sync-button-thien.md` + `usgs-sync.test.ts` (gom cả case service) |
| FE test (`pnpm test`) | PASS | 209/209 |
| FE build (`pnpm build`) | PASS | tsc + vite build sạch |
| Notes check | PASS | OK |
| Nhật ký vào `docs/task/fe-be-integration-ready.md` | DONE | proposal 5 + bảng tổng kết |

---

## Known Issues
- none — user quyết định 2026-11-22: website mở, ai cũng dùng được → **không làm auth**, `/sync` giữ public. Nút xác nhận 2 bước là để tránh click nhầm (tác dụng phụ ghi DB), không phải bảo mật.

---

## Deviations From Plan
- none

---

## Decisions Made During Implementation
- Xác nhận 2 bước trước POST (có tác dụng phụ ghi DB); không tự tạo auth (repo chưa có).
- Không đổi chữ ký `syncUsgsData()` (không có signal) → dùng `mountedRef` chặn setState sau unmount.

---

## Next Actions
- CHECKPOINT 1: chờ người dùng commit/push (`tiếp tục workflow`) hoặc giữ nguyên/sửa thêm. Đây là proposal cuối của `fe-be-integration-ready.md`.

---

## Last Update
2026-11-22 — Hoàn tất RD-14 (nút đồng bộ USGS), validation 209/209 xanh, dừng CHECKPOINT 1.
