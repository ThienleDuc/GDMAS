# Testcase: Mock FE offline theo contracts BE↔FE

## Metadata
- ID: 2026-11-17-fe-contract-mock-tests-thien
- Mode: proposal-paired
- Proposal: .agents/notes/proposed/2026-11-17-fe-contract-mock-tests-thien.md
- Target: `apps/web/tests/mocks/` + `apps/web/tests/contract-mocks.test.ts` + `contracts/schemas/earthquake.json` + examples/README
- Test File: `apps/web/tests/contract-mocks.test.ts`, `apps/web/tests/dev-mock.test.ts`
- Author: agent | thien
- Created: 2026-11-17
- Status: passed
- Completed At: 2026-11-18 (PR #19 → develop, merge d8732d7)
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Test-only fixtures/fetch/EventSource mock dùng contract examples làm nguồn; contract earthquake canonical khớp docs/API và FE; empty/error/SSE demo flows không fallback số liệu.
- **Ràng buộc GDMAS liên quan:**
  - [x] Tách biệt 7 Terminals (I1) — chỉ test T7, không worker.
  - [x] Chuẩn UTC ISO 8601 `Z` & WGS84 latitude/longitude (I3).
  - [x] Không fallback về dữ liệu mock tĩnh ở runtime (I5) — mock chỉ ở `apps/web/tests/`.
  - [x] Unit test offline 100%, không gọi mạng/USGS thật (I7).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test`, `node:assert`, `node:fs`, `Response`; không gọi mạng. Fixtures đọc từ `contracts/examples/`.
- Fixtures dự kiến: earthquake, patterns, analysis bundle, health, system-status, predictions, classifications, clusters, SSE event.
```json
{
  "event": {
    "source_event_id": "us_test_001",
    "event_time": "2026-11-11T00:00:00Z",
    "latitude": 38.29,
    "longitude": 142.38,
    "depth_km": 24.5,
    "magnitude": 5.8
  },
  "sse": {
    "event": "database_cleared",
    "timestamp": "2026-11-11T00:00:00Z",
    "data": {}
  }
}
```

---

## 3. Ma trận Kịch bản Test Cases

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Đọc fixture theo contract examples | Happy Path | Load example JSON qua fixtures helper | Tất cả fixture parse được; canonical Earthquake fields khớp schema/API docs; alias legacy được giữ optional | `PASS` |
| `TC-02` | Envelope thành công và service FE | Functional | fetch mock trả response canonical; gọi FE service | URL đúng; service consume shape canonical; list/detail đúng envelope thực tế | `PASS` |
| `TC-03` | Error / 404 unavailable / 500 | Negative | fetch mock trả error envelope/404/500 | 404 optional thành unavailable; 500 vẫn ném ApiError với status/message | `PASS` |
| `TC-04` | Empty DB / PENDING (Demo §4 Bước 2–3) | Resilience | Trả danh sách rỗng | Không crash, không fallback static events; total=0 | `PASS` |
| `TC-05` | Boundary UTC & WGS84 | Boundary | Kiểm timestamp + coordinates từ fixtures | timestamp kết thúc `Z`; lat ∈ [-90,90], lon ∈ [-180,180] | `PASS` |
| `TC-06` | SSE database cleared và recovery | Integration | EventSource mock emit `database_cleared`, sau đó `ingestion_cycle_completed` | Hai event theo hợp đồng; hỗ trợ listeners/open/close; offline 100% | `PASS` |
| `TC-07` | Test/build regression | Regression | `corepack pnpm test`, `corepack pnpm build` | 49 test pass; tsc + Vite build pass | `PASS` |
| `TC-08` | Corepack package manager pin | Configuration | Chạy `corepack pnpm -v` từ `apps/web`; đối chiếu `engines` với §1.4 | Corepack chọn đúng 10.20.0 (Node ≥18.12 → chạy được từ 18.18); `engines` ghi `node >=18.18.0`, `pnpm >=8.15.0` | `PASS` |
| `TC-09` | FE `.env.example` khớp tên biến | Configuration | Đối chiếu sample env với `VITE_API_BASE_URL` và `VITE_SSE_ENDPOINT` mà code đọc | Không còn biến `VITE_API_URL`/`VITE_SSE_URL`; flag mẫu comment để không override biến shell | `PASS` |
| `TC-10` | Mock API bật trong dev server | Integration / Offline | Khởi chạy Vite với `VITE_API_MOCKING=enabled`; gọi API fixture và SSE endpoint | Trả fixture từ `contracts/examples/`; API base URL tự trỏ cùng origin Vite, không cần BE | `PASS` |
| `TC-11` | Mock tắt mặc định và ở production | Safety / Regression | Chạy dev không có cờ và chạy Vite build | Middleware không chặn API khi tắt; plugin `apply: serve` không có trong build/preview | `PASS` |
| `TC-12` | Mock route chưa hỗ trợ | Boundary | Gọi API path không có fixture map khi dev mock bật | Response 404 contract-shaped; POST và non-API requests được chuyển tiếp | `PASS` |

---

## 4. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/contract-mocks.test.ts
cd apps/web && corepack pnpm test
cd apps/web && corepack pnpm build
cd apps/web && corepack pnpm -v
VITE_API_MOCKING=enabled corepack pnpm dev --host 127.0.0.1 --port 4317
python3 scripts/notes_index.py --check
```

- **Ghi chú pin:** Corepack chỉ nhận semver cụ thể trong `packageManager` (thử `pnpm@>=9`, `pnpm@^9.0.0`, `pnpm@11` đều bị từ chối). Pin 11.28.12 bị loại vì yêu cầu Node ≥22.13, mâu thuẫn ngưỡng tối thiểu §1.4 (Node 18.18.0). Chọn 10.20.0 (Node ≥18.12, lockfile 9.0) và rebuild node_modules; ngưỡng "mọi bản từ tối thiểu" thể hiện qua `engines` trong `package.json` + ghi chú `docs/setup.md` §1.4.

- **Ngày chạy cuối:** `2026-11-18`
- **Kết quả quan sát thật:** Trước phần mở rộng, `corepack pnpm@11 test` → 45/45 và `build` pass. Sau bổ sung: `corepack pnpm test` → 49/49 pass; `corepack pnpm build` → tsc + Vite pass (còn cảnh báo chunk JS >500 kB, đã có từ trước); `corepack pnpm -v` → 10.20.0. Typecheck riêng `dev-mock.ts` + `vite.config.ts` pass. Smoke test thật với `VITE_API_MOCKING=enabled corepack pnpm dev --host 127.0.0.1 --port 4317`: GET `/api/v1/health` trả fixture contract; GET SSE trả `text/event-stream` với event fixture; module FE được transform để API base trỏ `http://localhost:3000`. Khi cờ tắt, middleware không mock API. `python3 scripts/notes_index.py --check` và `git diff --check` đều OK.

---

## 5. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- none
