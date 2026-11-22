<!-- Template cho .agents/notes/testcase/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Testcase: Endpoint SSE chuẩn `/events/stream` làm default (RD-17)

## Metadata
- ID: 2026-11-22-sse-standard-endpoint-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-22-sse-standard-endpoint-thien.md
- Target: apps/web/src/hooks/useSSE.ts, apps/web/src/layouts/DashboardLayout.tsx
- Test File: apps/web/tests/sse-default.test.ts, apps/web/tests/dev-mock.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed   <!-- draft | ready | passed | failed_with_bugs -->
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng:** mặc định endpoint SSE của FE là route chuẩn `/api/v1/events/stream`; legacy vẫn dùng được qua đối số/env; hook giữ chữ ký.
- **Ràng buộc:**
  - [x] I1 — vẫn 1 kết nối SSE duy nhất tại shell.
  - [x] I2 — giữ `useSSE(endpoint?)`, giữ route legacy fallback, không xoá hàm cũ.
  - [x] I3 — packet/event names không đổi.
  - [x] I5 — không mock runtime; test mock EventSource offline.
  - [x] I7 — test offline 100% (`node:test`).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- Dùng `getEventsStreamUrl`/`connectEventsStream` từ `services/sse-api.ts` với `FakeEventSource` như `apps/web/tests/sse-api.test.ts`; đọc source file bằng `readFileSync` cho wiring assertions.

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Default chuẩn | Functional | `getEventsStreamUrl()` | `http://localhost:8000/api/v1/events/stream` | `PASS` |
| `TC-02` | Override legacy qua đối số | Compatibility | `getEventsStreamUrl(LEGACY_STREAM_ENDPOINT)` | `.../api/v1/stream/earthquakes` | `PASS` |
| `TC-03` | connectEventsStream legacy | Functional | `connectEventsStream({endpoint: legacy, ...})` | EventSource mở đúng URL legacy | `PASS` |
| `TC-04` | Hook ủy quyền service | Functional | source `useSSE.ts` | Có `getEventsStreamUrl`, không còn hằng `DEFAULT_ENDPOINT`/`ENV_ENDPOINT` | `PASS` |
| `TC-05` | Giữ chữ ký hook | Regression | source `useSSE.ts` | Có `useSSE(endpoint?: string)`; re-export `LEGACY_STREAM_ENDPOINT` | `PASS` |
| `TC-06` | Shell dùng default | Functional | source `DashboardLayout.tsx` | Có `useSSE()`; không còn chuỗi `"/api/v1/stream/earthquakes"` | `PASS` |
| `TC-07` | Env sample chuẩn | Functional | `apps/web/.env.example` | `VITE_SSE_ENDPOINT=/api/v1/events/stream` (comment legacy) | `PASS` |
| `TC-08` | Dev mock route chuẩn | Functional | `resolveContractMock("GET","/api/v1/events/stream")` | 200 `text/event-stream`, fixture SSE; legacy vẫn 200 | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/sse-default.test.ts tests/sse-api.test.ts -v
cd apps/web && pnpm test && pnpm build
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** `2026-11-22`
- **Kết quả quan sát thật:** 19 test chuyên biệt PASS (sse-default + sse-api + sse-machine + lib-redesign); `pnpm test` 194/194 PASS; `pnpm build` PASS; `notes_index.py --check` OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none`
