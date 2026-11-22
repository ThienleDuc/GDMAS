<!-- Template cho .agents/notes/implemented/yyyy-mm-dd-<slug>-<handle>/plan.md — chỉ tạo sau khi proposal có Decision: Approved ở §9. -->

# Implementation Plan: Dùng endpoint SSE chuẩn `/events/stream` làm default (RD-17)

## Metadata
- ID: 2026-11-22-sse-standard-endpoint-thien
- Proposal: .agents/notes/proposed/2026-11-22-sse-standard-endpoint-thien.md
- Approved By: thien
- Approved At: 2026-11-22
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Gom cấu hình endpoint SSE về `getEventsStreamUrl()`; `useSSE()` mặc định `/api/v1/events/stream`, vẫn giữ legacy qua đối số/env.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/hooks/useSSE.ts` *(bỏ hằng cục bộ, ủy quyền `getEventsStreamUrl`, re-export legacy)*
- `apps/web/src/layouts/DashboardLayout.tsx` *(gọi `useSSE()` — bỏ đối số legacy)*
- `apps/web/tests/sse-default.test.ts` *(mới)*
- `apps/web/.env.example` *(đổi sample `VITE_SSE_ENDPOINT` sang route chuẩn — user duyệt 2026-11-22)*
- `apps/web/dev-mock.ts` *(phục vụ thêm `/api/v1/events/stream`, giữ legacy — user duyệt 2026-11-22)*
- `apps/web/tests/dev-mock.test.ts` *(bổ sung case route SSE chuẩn)*
- `docs/task/fe-be-integration-ready.md` *(mục 4 — nhật ký)*
- `.agents/notes/testcase/2026-11-22-sse-standard-endpoint-thien.md` *(đặc tả sinh đồng thời)*

### Out of Scope
- `apps/api/**`, `contracts/**`, `docs/api/API.md`, `apps/web/.env` (file local), `vite.config.ts` — chỉ sửa `.env.example` theo duyệt
- `apps/web/src/lib/sse.ts` (`resolveSseUrl`, backoff, parse payload), `services/sse-api.ts` (đã đúng)
- `features/monitoring/**`, event names, packet shape, RD-14/RD-16

---

## 3. Các bước
### Step 1 — Hook ủy quyền
`useSSE.ts`: xoá `API_BASE_URL`/`ENV_ENDPOINT`/`DEFAULT_ENDPOINT`, bỏ import `resolveSseUrl`; import `getEventsStreamUrl` + re-export `LEGACY_STREAM_ENDPOINT`; trong effect dùng `getEventsStreamUrl(endpoint)`. Giữ nguyên chữ ký `useSSE(endpoint?: string)`.

### Step 2 — Shell
`DashboardLayout.tsx`: `useSSE()` thay vì truyền route legacy; giữ 1 kết nối + `SseMarkersProvider` + `reconnect`.

### Step 3 — Test
`sse-default.test.ts`: default chuẩn, override legacy, `connectEventsStream` legacy, source assertion (hook dùng `getEventsStreamUrl`, shell gọi `useSSE()`, signature không đổi).

### Step 4 — Nhật ký & validation
Ghi mục 4 `docs/task/fe-be-integration-ready.md`; `pnpm test && pnpm build`; `notes_index --check`; dừng CHECKPOINT 1.

### Step 5 — Bổ sung theo duyệt user 2026-11-22
(1) `.env.example`: `VITE_SSE_ENDPOINT` → `/api/v1/events/stream` (comment nhắc legacy override); (2) `dev-mock.ts`: phục vụ cả 2 route SSE; (3) `dev-mock.test.ts`: case route chuẩn.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không có migration, không đổi schema/contract/route/payload/env. Chỉ đổi FE wiring.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] **Đã tạo đặc tả testcase** tại `.agents/notes/testcase/2026-11-22-sse-standard-endpoint-thien.md`
- [ ] **Đã tạo và chạy pass file test offline** — `sse-default.test.ts` + test cũ liên quan
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] Kiểm tra chức năng: EventSource mở đúng `/api/v1/events/stream`; truyền legacy hoặc set `VITE_SSE_ENDPOINT` vẫn mở route cũ; reconnect/backoff không đổi

---

## 6. Rủi ro khi làm
`VITE_SSE_ENDPOINT` nếu đang trỏ legacy thì vẫn dùng legacy (override có chủ đích). Không test nào assert chuỗi legacy trong `DashboardLayout` (đã grep).

---

## 7. Rollback
Revert 2 file code + 1 file test + mục 4 docs/task; giữ notes. Không có migration.

---

## 8. Ghi chú
Chủ vùng `thien` (T7/FE). Dừng CHECKPOINT 1 sau validation.
