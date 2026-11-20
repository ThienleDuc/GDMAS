# Implementation Plan: Kiểm chứng hợp đồng T6 ↔ T7 và lớp Services (Task T7.02)

## Metadata
- ID: 2026-11-20-fe-t6-contract-services-audit-thien
- Proposal: .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md
- Approved By: thien
- Approved At: 2026-11-20
- Implementer: agent | thien
- Status: planned

---

## 1. Mục tiêu
Đối chiếu toàn bộ endpoint `docs/api/API.md` §3 với FE services/contracts; bổ sung runtime type guard cho envelope/lỗi, validate query UTC/WGS84, và service SSE cho `/api/v1/events/stream` có giữ tương thích route cũ. Không đổi wire contract, chữ ký công khai đang dùng hoặc gọi mạng thật trong test.

---

## 2. Phạm vi
### In Scope
- `apps/web/src/contracts/common.ts` — type guards envelope/error/UTC/WGS84, additive.
- `apps/web/src/contracts/analysis.ts` — sửa type/query discrepancy nếu đối chiếu API yêu cầu.
- `apps/web/src/contracts/earthquake.ts` — type/query discrepancy nếu phát hiện.
- `apps/web/src/services/earthquake-api.ts` — đối chiếu 18 hàm; validation query, giữ signature cũ; bổ sung hàm còn thiếu chỉ khi ma trận API chứng minh cần.
- `apps/web/src/services/sse-api.ts` — mới: `getEventsStreamUrl`, `connectEventsStream`, route `/api/v1/events/stream` mặc định + override route hiện hành.
- `apps/web/src/lib/api-client.ts` — parse error envelope/code, giữ `fetchApi<T>`/`ApiError` compatibility.
- `apps/web/src/lib/index.ts` — thêm exports mới nếu cần.
- `apps/web/tests/services.test.ts` — test endpoint/query/optional error statuses.
- `apps/web/tests/contract-mocks.test.ts` — test envelope/contracts theo fixture hiện hành.
- `apps/web/tests/sse-api.test.ts` — mới, offline test SSE service URL/connect wiring.
- `.agents/notes/testcase/2026-11-20-fe-t6-contract-services-audit-thien.md` — đặc tả testcase sinh đồng thời.

### Out of Scope
- `contracts/schemas/**`, `contracts/examples/**`, `contracts/README.md`, `docs/api/API.md` (không đổi hợp đồng BE).
- `apps/api/**`, worker T2–T5, migration.
- UI/components/features, refactor `useSSE` sang service mới (chỉ cung cấp service tương thích; tích hợp hook là task riêng nếu ngoài scope).
- `.env`, secrets, route/payload backend.

---

## 3. Các bước
### Step 1 — Đối chiếu endpoint
Lập ma trận endpoint API.md §3.1–§3.5 ↔ hàm service, method/path/query/response; xác định chính xác 18 hàm hiện tại và thiếu sót. Không suy diễn số hàm mục tiêu 20.

### Step 2 — Envelope/type guards
Thêm type guards narrow `unknown` cho success/error envelopes, error code, UTC timestamp có `Z`, và WGS84 bounds. Nối error envelope vào `ApiError` một cách tương thích.

### Step 3 — Query validation
Validate `start_time/end_time` là UTC ISO có `Z`, start ≤ end; kiểm tra bbox ranges và min ≤ max trước fetch. Preserve behavior cho query không truyền các trường này.

### Step 4 — SSE service mới
Tạo `services/sse-api.ts` dùng `lib/sse.ts`/`contracts/sse.ts`; mặc định `/api/v1/events/stream`, cho override `/api/v1/stream/earthquakes`; không dùng mạng trong test.

### Step 5 — Test & validation
Mở rộng tests services/contracts, thêm `sse-api.test.ts`; chạy `pnpm build`, `pnpm test`, `notes_index.py --check`; cập nhật testcase/status; dừng CHECKPOINT 1.

---

## 4. Thay đổi dữ liệu / API / cấu hình
Không đổi API/backend/schema/envelope wire-format. FE thêm runtime validation và thêm factory/service SSE cho endpoint đã mô tả trong API.md. Không thêm biến môi trường; tôn trọng `VITE_SSE_ENDPOINT`/override hiện hành.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [ ] **Đã tạo đặc tả testcase** `.agents/notes/testcase/2026-11-20-fe-t6-contract-services-audit-thien.md`
- [ ] **Đã tạo/chạy test offline**: `apps/web/tests/services.test.ts`, `contract-mocks.test.ts`, `sse-api.test.ts`
- [ ] Backend test/lint: N/A — không đụng `apps/api`.
- [ ] Frontend typecheck/build: `cd apps/web && pnpm build`
- [ ] Frontend tests: `cd apps/web && pnpm test` (không giảm baseline 56).
- [ ] Notes: `python3 scripts/notes_index.py --check`
- [ ] Docs/API drift: N/A — không đổi wire contract; nếu phát hiện tài liệu sai, dừng và báo thay vì tự sửa ngoài scope.
- [ ] Ma trận endpoint có đủ 5 nhóm API §3 và 6 error code §4.

---

## 6. Rủi ro khi làm
- Runtime validation có thể từ chối input cũ; giảm thiểu bằng chỉ validate khi caller truyền param và error message chỉ rõ field.
- Error shape giữa FastAPI thực tế và tài liệu có thể khác; test với fixture/error envelope và giữ tương thích `detail`/`message` cũ.
- SSE hai URL: route mặc định theo API.md, giữ override cũ và test rõ cả hai.

---

## 7. Rollback
Các thay đổi additive, rollback bằng revert commit/PR. Không đổi DB/API server hay schema.

---

## 8. Ghi chú
Proposal đã được duyệt sau revision bổ sung service SSE. Bắt đầu từ nhánh `feat/2026-11-20-fe-t6-contract-services-audit-thien`; dừng CHECKPOINT 1 sau validation xanh.
