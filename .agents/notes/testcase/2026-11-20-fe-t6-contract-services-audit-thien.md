# Testcase: Kiểm chứng hợp đồng T6 ↔ T7 và lớp Services

## Metadata
- ID: 2026-11-20-fe-t6-contract-services-audit-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-20-fe-t6-contract-services-audit-thien.md
- Target: `apps/web/src/contracts/`, `apps/web/src/services/`, `apps/web/src/lib/api-client.ts`
- Test File: `apps/web/tests/services.test.ts`, `apps/web/tests/contract-mocks.test.ts`, `apps/web/tests/sse-api.test.ts`
- Author: agent | thien
- Created: 2026-11-20
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Contracts/envelopes, API service paths/query params, optional API errors, SSE events stream service.
- **Ràng buộc GDMAS liên quan:**
  - [x] Chuẩn UTC ISO 8601 `Z` cho query thời gian và response.
  - [x] WGS84 latitude/longitude và bbox bounds.
  - [x] 404 → unavailable, không fallback sang mock; lỗi 0/400/500/503 giữ `ApiError`.
  - [x] Test offline 100%: mock `fetch`; SSE tests không kết nối mạng, factory EventSource dùng fake.
  - [x] Không `any`; giữ chữ ký consumer đang dùng.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** Node `node:test`, fixture từ `apps/web/tests/mocks/` và các error payload inline; `fetch` được mock/restored trong từng test.

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Khoảng thời gian không hợp lệ",
    "details": { "field": "start_time" }
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | API endpoint ↔ service | Functional | Gọi 17 hàm HTTP service bằng fetch mock | Path/method khớp API.md §3; SSE được kiểm riêng TC-08–10 | `PASSED` |
| `TC-02` | Envelope thành công | Functional | Envelope hợp lệ / payload sai shape | Type guard chấp nhận shape hợp lệ, từ chối envelope sai shape; giữ raw entity cho endpoint detail legacy | `PASSED` |
| `TC-03` | Error envelope/code | Negative | 400/500/503 với `{success:false,error:{code,message}}` | ApiError giữ status/code/message; không mất compatibility `detail` | `PASSED` |
| `TC-04` | Optional endpoint 404 | Resilience | Mock 404 | `{data:null, unavailable:true,status:404}` | `PASSED` |
| `TC-05` | Optional endpoint network/400/500/503 | Negative | Mock fetch reject / các HTTP status | Ném `ApiError`; chỉ 404 được convert thành unavailable | `PASSED` |
| `TC-06` | UTC query validation | Boundary | `Z` hợp lệ, local timestamp, start > end | Chấp nhận UTC hợp lệ; từ chối timestamp không `Z` hoặc khoảng đảo trước fetch | `PASSED` |
| `TC-07` | WGS84 bbox validation | Boundary | min/max trong range, ngoài range, min > max | Chấp nhận bbox hợp lệ; từ chối bounds sai trước fetch | `PASSED` |
| `TC-08` | SSE URL mặc định | Functional | Gọi `getEventsStreamUrl()` | URL kết thúc `/api/v1/events/stream` | `PASSED` |
| `TC-09` | SSE legacy override | Compatibility | Truyền `/api/v1/stream/earthquakes` | URL cũ vẫn được giữ/resolve đúng | `PASSED` |
| `TC-10` | SSE connect wiring | Offline integration | Fake EventSource + callback | Đăng ký 6 event names, forward payload; close dọn resource | `PASSED` |
| `TC-11` | Không regression | Regression | Chạy toàn bộ FE tests | Tất cả baseline + test mới pass; không giảm 56 test hiện tại | `PASSED` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && pnpm build
cd apps/web && pnpm test
python3 scripts/notes_index.py --check
```

- **Ngày chạy cuối:** 2026-11-20
- **Kết quả quan sát thật:** `cd apps/web && pnpm build` — OK; `cd apps/web && pnpm test` — 63/63 pass (baseline 56 + 7 test mới); `python3 scripts/notes_index.py --check` — OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` (nếu test phát hiện lỗi chưa xử lý, tạo bug note theo quy trình).
