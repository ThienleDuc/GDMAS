# Proposal: Kiểm chứng hợp đồng T6 ↔ T7 và lớp Services (Task T7.02)

## Metadata
- ID: 2026-11-20-fe-t6-contract-services-audit-thien
- Author: agent | thien
- Created: 2026-11-20
- Type: refactor
- Status: approved
- Priority: high
- Area: `apps/web/src/contracts/`, `apps/web/src/services/`, `apps/web/src/lib/api-client.ts`, `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ đối chiếu type/kiểu FE với docs/api/API.md & contracts/schemas/; KHÔNG đổi endpoint, envelope JSON, schema hay payload. -->
- Related Docs:
  - docs/api/API.md §2 (envelope), §3.1–§3.5 (endpoints), §4 (mã lỗi)
  - contracts/README.md §3.8 (rule 404 → unavailable, không mock)
  - docs/coding-rules.md (I2/I3/I5/I7)
  - docs/development/coding-conventions.md §3.2 (mọi fetch qua service layer, cấm `any`)
  - docs/task/thien.md — Task T7.02
- Related Proposals:
  - .agents/notes/proposed/2026-11-20-fe-restructure-globals-css-thien.md — nền tảng contracts/lib vừa tạo (PR #26), proposal này **bổ sung** chứ không thay thế.
  - .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md — đã định nghĩa 9 endpoint contract; proposal này rà soát phần còn thiếu.
  - .agents/notes/proposed/2026-11-17-fe-contract-mock-tests-thien.md — bộ mock test hiện hữu sẽ được mở rộng.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 7 vừa được tái thiết (PR #26): contracts tách thành 10 module + barrel, services giữ 18 hàm gọi endpoint, `getOptionalApi()` xử lý 404. `docs/task/thien.md` T7.02 yêu cầu kiểm chứng lớp này trước khi xây UI mới (các task T7.03–T7.13 phụ thuộc).

### Vấn đề
Chưa có bảng đối chiếu chứng minh mọi endpoint trong `API.md` §3 đều có hàm service tương ứng; runner-time guard cho envelope/lỗi/query params chưa được kiểm chứng có hệ thống. Có sự lệch nhỏ giữa task doc (ghi 20 hàm) và thực tế (18 hàm export) cần làm rõ.

### Ảnh hưởng
Nếu lớp services lệch hợp đồng, toàn bộ task UI phía sau sẽ gọi sai path/tham số hoặc hiển thị sai trạng thái lỗi → ảnh hưởng trực tiếp Kịch bản Demo 6 bước và tiêu chí Patterns 3.0 điểm (`yeucaubatbuoc.md` §5).

---

## 2. Hiện trạng
- **11 module contracts**: `common`, `sse`, `earthquake`, `health`, `system-status`, `clusters`, `analysis`, `patterns`, `predictions`, `classifications`, `index` (barrel).
- **18 hàm export** trong `services/earthquake-api.ts` (task doc ghi 20 — cần đối chiếu, có thể do đếm cả `fetchApi`/`buildQuery` hoặc endpoint `events/stream` chưa có hàm riêng).
- `getOptionalApi()` trả `{data:null, unavailable:true, status:404}` chỉ cho 404; các lỗi 0/400/500/503 ném `ApiError`.
- `buildQuery()` chỉ loại `undefined`/chuỗi rỗng — **chưa** kiểm tra ISO 8601 UTC `Z` cho `start_time`/`end_time` hay khoảng WGS84 cho bbox.
- `lib/api-client.ts`: `extractErrorMessage()` đọc `detail`/`message`/`error` nhưng chưa map sang `ErrorCode` (6 mã); `fetchApi<T>` ép kiểu trực tiếp `payload as T` — chưa có type guard envelope.
- Các type guard hiện có: `isUtcIso`, `isWgs84`, `isSseEventName` (trong `lib/`); chưa có `isApiEnvelope`/`isApiErrorEnvelope`.
- **Chưa có hàm service nào cho SSE**: `useSSE()` tự ghép URL qua `resolveSseUrl()` với route mặc định `/api/v1/stream/earthquakes`, trong khi `docs/api/API.md` §3.5 định nghĩa `GET /api/v1/events/stream` — cần một hàm service riêng để FE có một điểm cấu hình duy nhất.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Có bảng đối chiếu 1–1: mọi endpoint `API.md` §3 ↔ 1 hàm service (+ 6 mã lỗi §4 ↔ cách xử lý).
  2. `getOptionalApi()` được kiểm chứng phân biệt đúng 404 / 0 / 400 / 500 / 503.
  3. Query params thời gian UTC `Z` và bbox WGS84 được validate trước khi gửi.
  4. Có type guard envelope lỗi/thành công dùng chung, không dùng `any`.
  5. **Bổ sung hàm service cho `GET /api/v1/events/stream`** (API.md §3.5), giữ tương thích route đang dùng `/api/v1/stream/earthquakes`.
- **Out of Scope:** không đổi endpoint/schema/`docs/api/**`; không xây UI, charts hay map; không đụng `apps/api/**`.

---

## 4. Giải pháp đề xuất
- Bổ sung type guard trong `contracts/common.ts` (additive): `isApiEnvelope`, `isApiErrorEnvelope`, `isErrorCode`, `isUtcTimestamp`, `isWgs84Bounds` — giữ alias cũ, không xóa type đang dùng (I2).
- Trong `lib/api-client.ts`: dùng `isApiErrorEnvelope` để trích `code`/`message` chuẩn §4; giữ chữ ký `fetchApi`/`ApiError` (RULE-03).
- Trong `services/earthquake-api.ts`: thêm `assertQueryWindow`/`assertBbox` dùng helper có sẵn; bổ sung hàm còn thiếu nếu bảng đối chiếu phát hiện (không sửa chữ ký cũ).
- **SSE (theo góp ý §9):** tạo file mới `apps/web/src/services/sse-api.ts` (RULE-03 — mở rộng bằng file mới) xuất `getEventsStreamUrl(endpoint?)` và `connectEventsStream(options)` dùng `resolveSseUrl` + `createSseSource` từ `lib/sse.ts`, enum `SSE_EVENT_NAMES` từ `contracts/sse.ts`. Route mặc định `/api/v1/events/stream` (chuẩn API.md §3.5), vẫn nhận `/api/v1/stream/earthquakes` qua đối số `endpoint` để tương thích `VITE_SSE_ENDPOINT`. Không đổi chữ ký `useSSE(endpoint?)`; hook sẽ dùng lại service này ở task sau.
- Trong `tests/`: mở rộng `services.test.ts` + `contract-mocks.test.ts` bằng bảng test tham số hoá cho từng endpoint, 5 nhóm status, query UTC/WGS84; bổ sung `tests/sse-api.test.ts` kiểm chứng URL mặc định/override và 6 tên event.

---

## 5. Phương án đã cân nhắc
### Phương án A: Chỉ sửa services khi phát hiện lỗi
Ưu: ít diff. Nhược: không có bằng chứng đối chiếu toàn hợp đồng, task T7.02 không "đóng" được. **Không chọn.**
### Phương án B: Bảng đối chiếu + type guard additive + test参数 hoá
Ưu: có ma trận chứng minh DoD, guard dùng lại cho mọi task UI sau này, giữ tương thích import cũ. **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Tăng vài hàm guard + test | Cần chặn sai định dạng ngay tầng service |
| Hiệu năng | Không đáng kể | Guard chạy trước fetch, O(1) |
| Bảo trì / Open-Closed | Tốt | Thêm hàm/file mới, giữ chữ ký `fetchApi`, `getOptionalApi`, barrel |
| Độ tin cậy | Tốt | Lỗi 404 vs 500 khác nhau rõ; UTC/WGS84 đúng ngay từ request |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Thêm guard làm thay đổi hành vi service cũ | Trung bình | Trung bình | Chỉ validate params do caller truyền; mặc định vẫn như cũ; test hồi quy 56 test hiện hữu |
| Bảng đối chiếu lệch do API.md có endpoint mới | Thấp | Trung bình | Đọc trực tiếp §3.1–§3.5 lúc implement, ghi rõ nguồn từng dòng |
| Đụng `contracts/` root (I2/I4) | Thấp | Cao | Chỉ đọc `contracts/schemas/`; mọi thay đổi nằm ở `apps/web/src/contracts/` |
| SSE service mới trùng với `useSSE` | Thấp | Trung bình | `sse-api.ts` chỉ tạo URL/kết nối; `useSSE` giữ nguyên chữ ký và sẽ dùng lại ở task sau |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-20-fe-t6-contract-services-audit-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`)*
- **Code test tự động (offline):** `apps/web/tests/services.test.ts`, `apps/web/tests/contract-mocks.test.ts` *(mở rộng; mock fetch)* và `apps/web/tests/sse-api.test.ts` *(mới — mock URL/EventSource, không gọi mạng)*
- **Cách kiểm chứng:** `cd apps/web && pnpm build && pnpm test` (hiện 56/56 pass — không được giảm); `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-20
Comments: Người dùng xác nhận rõ "Approved" trong chat sau revision bổ sung hàm SSE events/stream. Duyệt phạm vi hiện tại §4, gồm rà soát contracts/services, type guards UTC/WGS84/envelope, hàm mới `services/sse-api.ts`, test offline và không đổi wire contract.
Scope of Rejection: -

---

## 10. Next Action
Proposal được duyệt; Pha 4 đang thực hiện theo `.agents/notes/implemented/2026-11-20-fe-t6-contract-services-audit-thien/plan.md` và dừng tại CHECKPOINT 1 sau validation.

### Revision 2026-11-20
- **Yêu cầu:** "Bổ sung hàm SSE events/stream" (phản hồi §9 dạng Changes Requested).
- **Đã sửa:** thêm mục tiêu 5 (hàm service cho `GET /api/v1/events/stream`); ghi nhận hiện trạng chưa có hàm SSE; bổ sung file mới `apps/web/src/services/sse-api.ts` (`getEventsStreamUrl`, `connectEventsStream`) dùng lại `lib/sse.ts` + `contracts/sse.ts`, giữ tương thích `/api/v1/stream/earthquakes`; thêm rủi ro và file test `apps/web/tests/sse-api.test.ts`.
- **Không đổi:** Architecture Impact vẫn `none`; chữ ký `useSSE`/`fetchApi` không đổi; Out of Scope giữ nguyên.
