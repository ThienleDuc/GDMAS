<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9. -->

# Implementation Plan: Nút đồng bộ USGS (RD-14)

## Metadata
- ID: 2026-11-22-usgs-sync-button-thien
- Proposal: .agents/notes/proposed/2026-11-22-usgs-sync-button-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Gắn consumer cho `syncUsgsData()` qua nút 2 bước xác nhận trên `/earthquakes`; disable khi chạy, refresh sau thành công, không gọi mạng thật trong test.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/features/earthquakes/usgs-sync.ts` *(mới — helper thuần + state machine)*
- `apps/web/src/features/earthquakes/components/UsgsSyncButton.tsx` *(mới)*
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx` *(thêm nút cạnh "Tải lại")*
- `apps/web/src/features/earthquakes/EarthquakesPage.css` *(class `.eq-sync-*`, chỉ CSS token)*
- `apps/web/src/contracts/common.ts` *(mở rộng `isApiEnvelope` cho shape `/sync` — phát hiện khi implement, giống RD-15)*
- `apps/web/src/services/earthquake-api.ts` *(thêm `signal?: AbortSignal` cho `syncUsgsData` — additive)*
- `apps/web/tests/usgs-sync.test.ts` *(mới)*
- `apps/web/tests/services.test.ts` *(dự kiến bổ sung — thực tế gom case service vào `usgs-sync.test.ts`, không sửa services.test.ts)*
- `docs/task/fe-be-integration-ready.md` *(mục 4 — nhật ký)*
- `.agents/notes/testcase/2026-11-22-usgs-sync-button-thien.md` *(đặc tả sinh đồng thời)*

### Out of Scope
- `apps/api/**`, `contracts/**`, `docs/api/API.md`, migration
- Hệ phân quyền/auth (repo chưa có — báo câu hỏi cuối phiên)
- Service/contract FE, route/lọc/phân trang, RD-01…RD-13

---

## 3. Các bước
### Step 1 — Helper thuần
`formatSyncResult(result)`, `formatSyncError(error)`, `nextSyncState(state, event)` (idle→confirm→syncing→done/error→idle).
### Step 2 — Component
`UsgsSyncButton.tsx`: 2 bước xác nhận, disable khi `syncing`, `mountedRef`, gọi `syncUsgsData()`, `onSynced()` khi thành công.
### Step 3 — Wiring
`EarthquakesPage.tsx`: nút cạnh "Tải lại", `handleSynced` tăng `refreshKey`.
### Step 3b — Vá envelope & signal (phát hiện khi implement)
`isApiEnvelope()` chấp nhận `{success:true,synced_count,timestamp}`; `syncUsgsData(signal?)` truyền `{method:"POST",signal}`.

### Step 4 — Test & nhật ký
`usgs-sync.test.ts` + `services.test.ts` mock fetch (200 shape thật / 503 / 500 / abort); `pnpm test && pnpm build`; ghi mục 4; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có — chỉ dùng POST đã có. Không migration/schema/env/route mới.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-usgs-sync-button-thien.md`
- [ ] **Đã tạo và chạy pass file test offline** — `usgs-sync.test.ts` + `services.test.ts`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Kiểm tra chức năng: click 1 không gọi API; xác nhận → 1 POST; 503 → alert; disable khi chạy; refresh sau success

---

## 6. Rủi ro khi làm
POST có tác dụng phụ → xác nhận 2 bước; test mock fetch (không gọi USGS); mountedRef chặn setState sau unmount.

---

## 7. Rollback
Revert 5 file FE + mục 4 docs/task; giữ notes. Không có migration.

---

## 8. Ghi chú
Chủ vùng `thien` (T7/FE). Dừng CHECKPOINT 1 sau validation.
