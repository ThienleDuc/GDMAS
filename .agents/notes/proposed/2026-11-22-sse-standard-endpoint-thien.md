# Proposal: Dùng endpoint SSE chuẩn `/events/stream` làm default (RD-17)

## Metadata
- ID: 2026-11-22-sse-standard-endpoint-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: refactor
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: apps/web/src/hooks/, apps/web/src/layouts/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi route BE, contract wire, payload SSE hay env tên mới. Chỉ đổi default endpoint FE
       sang route chuẩn đã có sẵn trên BE (/events/stream) và gom cấu hình về 1 service. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/api/API.md §3.5 (hai route SSE, packet `{event,data,timestamp}`)
  - docs/task/fe-be-integration-ready.md (RD-17)
- Related Proposals:
  - 2026-11-20-fe-t6-contract-services-audit-thien (tạo `services/sse-api.ts`, ghi rõ "hook sẽ dùng lại service này ở task sau")
  - 2026-11-21-monitoring-leaflet-map-markers-thien (shell có 1 kết nối SSE qua context)
  - 2026-11-22-patterns-cluster-fallback-thien, 2026-11-22-earthquake-detail-panel-thien (proposal 1/2, đã merge)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
BE đã đăng ký **hai** route SSE dùng chung generator: `/api/v1/stream/earthquakes` (legacy) và `/api/v1/events/stream` (chuẩn theo `docs/api/API.md` §3.5). FE đã có `services/sse-api.ts` với `getEventsStreamUrl()` trả đúng route chuẩn làm mặc định.

### Vấn đề
`useSSE()` vẫn tự giữ cấu hình riêng: `DEFAULT_ENDPOINT = "/api/v1/stream/earthquakes"` (`useSSE.ts:12`), và `DashboardLayout.tsx:30` còn truyền tường minh route legacy. Hệ quả: **hai nguồn sự thật** — service đã chuẩn hóa nhưng hook runtime vẫn dùng route cũ; đúng drift RD-17.

### Ảnh hưởng
Không gây lỗi (cả 2 route cùng generator), nhưng FE không tiêu thụ endpoint chuẩn đã cam kết trong API.md và phải duy trì 2 chỗ cấu hình.

---

## 2. Hiện trạng
- `useSSE.ts:10-12` — `API_BASE_URL`, `ENV_ENDPOINT`, `DEFAULT_ENDPOINT` (legacy); `:33` signature `useSSE(endpoint = ENV_ENDPOINT || DEFAULT_ENDPOINT)`; `:43` `resolveSseUrl(...)`.
- `services/sse-api.ts:11-25` — `DEFAULT_EVENTS_ENDPOINT="/api/v1/events/stream"`, `LEGACY_STREAM_ENDPOINT="/api/v1/stream/earthquakes"`, `getEventsStreamUrl(endpoint?)` ưu tiên explicit → `VITE_SSE_ENDPOINT` → chuẩn; `connectEventsStream` đã dùng hàm này.
- `DashboardLayout.tsx:30` — `useSSE("/api/v1/stream/earthquakes")`; chỉ 1 kết nối tại shell, `SseMarkersProvider`, `onRefresh={sse.reconnect}`.
- `lib/sse.ts:resolveSseUrl` — giữ nguyên (nhiều test thuần đang dùng).
- Test: `sse-api.test.ts` TC-08/TC-10 đã kiểm chứng default chuẩn + override legacy; `lib-redesign.test.ts`, `sse-machine.test.ts` test `resolveSseUrl` (không đổi).

---

## 3. Mục tiêu
- **Mục tiêu:** `useSSE()` dùng chung `getEventsStreamUrl()` → mặc định `/api/v1/events/stream`; bỏ cấu hình trùng trong hook; `DashboardLayout` gọi `useSSE()` không truyền route legacy; vẫn giữ legacy qua đối số tường minh hoặc `VITE_SSE_ENDPOINT`.
- **Không nằm trong mục tiêu (Out of Scope):** sửa `apps/api/**`, `docs/api/API.md`, `contracts/**`, payload/packet SSE, event names, backoff/reconnect, `lib/sse.ts`, `/monitoring`, RD-14/RD-16.

---

## 4. Giải pháp đề xuất
1. **`useSSE.ts`** (giữ nguyên chữ ký `useSSE(endpoint?: string)` — I2):
   - Bỏ 3 hằng cục bộ `API_BASE_URL`/`ENV_ENDPOINT`/`DEFAULT_ENDPOINT` và import `resolveSseUrl`.
   - Import `getEventsStreamUrl` từ `services/sse-api.ts`; trong effect: `const targetUrl = getEventsStreamUrl(endpoint)`.
   - Re-export `LEGACY_STREAM_ENDPOINT` để consumer cũ có thể truyền tường minh mà không hardcode chuỗi.
2. **`DashboardLayout.tsx`**: `useSSE()` thay vì `useSSE("/api/v1/stream/earthquakes")` — vẫn đúng I1 (1 kết nối tại shell).
3. **Không đổi** `services/sse-api.ts`, `lib/sse.ts`, BE, env sample.
4. **Test** `apps/web/tests/sse-default.test.ts` (mới): URL mặc định chuẩn; override legacy qua đối số; `connectEventsStream` với legacy tạo đúng URL; source assertion `useSSE.ts` dùng `getEventsStreamUrl` và `DashboardLayout.tsx` gọi `useSSE()`; giữ nguyên chữ ký hook.

---

## 5. Phương án đã cân nhắc
### Phương án A: Hook ủy quyền cho `getEventsStreamUrl()` (chọn)
Ưu: một nguồn cấu hình; tận dụng code/service đã có; test sẵn TC-08/TC-10; không đổi BE. Nhược: hook phụ thuộc service layer (cùng FE, không tạo chu trình — `sse-api.ts` chỉ import `lib/sse.ts` + contracts).

### Phương án B: Chỉ đổi hằng `DEFAULT_ENDPOINT` trong hook
Ưu: 1 dòng. Nhược: vẫn 2 nguồn cấu hình (hook + service), drift có thể tái diễn.

### Phương án C: Xóa route legacy trên BE
Ưu: còn 1 route. Nhược: breaking change, vi phạm RULE-03, ảnh hưởng script demo/consumer khác — nằm ngoài phạm vi.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Thấp | Bỏ 3 hằng, thêm 1 import |
| Hiệu năng | Không đổi | Vẫn 1 EventSource tại shell |
| Bảo trì / Open-Closed | Tốt | Giữ chữ ký `useSSE(endpoint?)` và route legacy override |
| Độ tin cậy | Tăng | FE dùng đúng endpoint chuẩn đã có trong API.md |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `VITE_SSE_ENDPOINT` đang trỏ legacy → vẫn dùng legacy | Trung bình | Thấp | Đây là override có chủ đích; giữ nguyên hành vi, không ép đổi env |
| Test cũ assert route legacy trong `DashboardLayout` | Thấp | Thấp | Đã grep: không có test nào assert chuỗi đó |
| Hook mất reconnect khi đổi URL | Thấp | Trung bình | `getEventsStreamUrl(endpoint)` được tính trong effect có `endpoint` dependency; giữ nguyên `reconnectKey` |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-sse-standard-endpoint-thien.md`
- **Code test tự động (offline):** `apps/web/tests/sse-default.test.ts` *(mới — URL default/override, connectEventsStream legacy, source assertions)*; giữ nguyên `sse-api.test.ts`, `sse-machine.test.ts`, `lib-redesign.test.ts`.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`, đang thao tác) xác nhận "được" để bắt đầu proposal 3 theo thứ tự đã ghi trong `docs/task/fe-be-integration-ready.md` mục 4. Giới hạn đúng §3 — chỉ đổi default FE, giữ legacy fallback, không đụng BE/contracts.
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, code FE, validation, dừng CHECKPOINT 1, ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md` mục 4.

### Revision 2026-11-22
- User trả lời 2 câu hỏi gom cuối phiên: **(1) có** đổi `.env.example` → `VITE_SSE_ENDPOINT=/api/v1/events/stream`; **(2) có** bổ sung `dev-mock.ts` phục vụ thêm `/api/v1/events/stream` (giữ legacy). Cả 2 là additive, đưa vào In Scope của plan/testcase; không đổi BE/contracts.
