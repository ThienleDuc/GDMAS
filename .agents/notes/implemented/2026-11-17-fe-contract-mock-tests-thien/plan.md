# Implementation Plan: Bộ test mock Frontend theo contracts

## Metadata
- ID: 2026-11-17-fe-contract-mock-tests-thien
- Proposal: .agents/notes/proposed/2026-11-17-fe-contract-mock-tests-thien.md
- Approved By: thien
- Approved At: 2026-11-17
- Implementer: agent | thien
- Status: in_progress

---

## 1. Mục tiêu
Tạo test-only mock infrastructure cho FE từ các fixtures `contracts/examples/`, bổ sung mock SSE fixture và test envelope/empty/error/UTC/WGS84/demo recovery offline. Đồng bộ earthquake schema/example legacy với canonical docs/API + FE, theo hướng additive aliases, không đổi runtime BE.

---

## 2. Phạm vi
### In Scope
- `contracts/schemas/earthquake.json` — canonical fields theo `docs/api/API.md` §3.2, giữ legacy aliases tương thích.
- `contracts/examples/earthquake_sample.json` — sample canonical shape + compatible aliases nếu cần.
- `contracts/examples/sse-event_sample.json` — fixture SSE theo schema.
- `contracts/README.md` — cập nhật §3.1, §3.2, test-only/runtime boundary.
- `apps/web/tests/mocks/fixtures.ts` — tải example fixtures từ repo, typed helper.
- `apps/web/tests/mocks/fetch-mock.ts` — mock fetch theo URL, envelope success/error/404/empty.
- `apps/web/tests/mocks/sse-mock.ts` — mock EventSource, emit event fixtures.
- `apps/web/tests/contract-mocks.test.ts` — test offline tích hợp mock + contract + FE services.
- `apps/web/package.json` — ghim `packageManager: pnpm@10.20.0` (tương thích Node ≥18.18 theo §1.4) + `engines` khai báo ngưỡng `node >=18.18.0`, `pnpm >=8.15.0`.
- `apps/web/.env.example` — đồng bộ tên `VITE_API_BASE_URL`, `VITE_SSE_ENDPOINT`; có comment hướng dẫn opt-in `VITE_API_MOCKING=enabled` (mặc định không bật).
- `apps/web/vite.config.ts` — mock dev-only qua Vite middleware, nạp fixtures từ `contracts/examples/`, tự trỏ API base cùng origin khi mock bật và không vào production build.
- `apps/web/dev-mock.ts` — resolver thuần test được cho mock API/SSE responses.
- `apps/web/tests/dev-mock.test.ts` — offline test cho bật/tắt mock và endpoint fixtures.
- `docs/setup.md` — §1.4 ghi chú Corepack/pin pnpm tương thích Node ≥18.18.
- `.gitignore` — ignore `.vscode/` (IDE artifacts cục bộ).
- `.agents/notes/testcase/2026-11-17-fe-contract-mock-tests-thien.md`.
- `.agents/notes/proposed/2026-11-17-fe-contract-mock-tests-thien.md`.
- `.agents/notes/implemented/2026-11-17-fe-contract-mock-tests-thien/{plan,status}.md`.

### Out of Scope
- `apps/web/src/**` runtime behavior/API services và không import test fixtures vào client bundle (mock cấp Vite dev middleware chỉ chạy local dev).
- `apps/api/**`, Pydantic models, API routes, database, migrations, `.env`.
- Page/UI styles, routing, real network/MSW dependency.
- Sửa/xóa 7 file test FE cũ; giữ 39 test hiện hữu (I7).

---

## 3. Các bước
### Step 1 — Contract/sample drift
Đối chiếu `docs/api/API.md` §3.2 và `EarthquakeContract`; mở rộng `earthquake.json` required/properties cho canonical shape (`id` integer, `source_event_id`, `event_time`, `depth_km`, `magnitude_type`, `source_url`, `ingested_at`, `raw_data?`), giữ alias legacy `time`, `depth`, `status` additive/optional. Chỉnh sample canonical. Thêm SSE example theo `sse-event.json`. Cập nhật README về envelope / fixture test-only.

### Step 2 — Test-only fixtures and fetch mock
Tạo helper đọc JSON từ `contracts/examples/` theo path repo; không copy payload vào helper. `createFetchMock(routeMap)` hỗ trợ response 200 envelope, 404, 500 và payload rỗng; restore `globalThis.fetch` an toàn bằng helper/install teardown.

### Step 3 — EventSource mock + FE contract tests
Tạo mock EventSource tối thiểu tương thích `useSSE` (`addEventListener`, `onmessage`, `close`, static readyState/constants), phát SSE fixture events. Test contracts/examples parse, envelope/service consumption, `database_cleared` và cycle recovery event. Test UTC/WGS84 bounds; test empty endpoint không fallback dữ liệu.

### Step 4 — Dev-only mock server and FE launch configuration
Ghim `packageManager` đúng `pnpm@10.20.0` + khai báo `engines` theo §1.4 (Corepack chỉ nhận semver cụ thể, nên ngưỡng "mọi bản từ tối thiểu" nằm ở `engines`); rebuild `node_modules` bằng bản đã ghim; sửa `.env.example` cho các tên biến code đọc được. Thêm dev-only mock middleware trong `vite.config.ts`: chỉ bật với `VITE_API_MOCKING=enabled` và plugin `apply: "serve"`, đọc fixtures từ `contracts/examples/`, phục vụ API path tương ứng và SSE mock; không dùng `src/lib/api-client.ts` mock hook và không đưa fixture vào production bundle. Khi mock bật, dev config trỏ `VITE_API_BASE_URL` sang Vite origin; mặc định không bật mock, production luôn gọi API thật.

### Step 5 — Build/test loop
Chạy test mới, toàn bộ `corepack pnpm test`, `corepack pnpm build`; chạy dev server với/không mock và kiểm tra response; sửa lỗi đến khi tất cả pass. Chạy `notes_index.py --check` và `git diff --check`. Không commit/push/merge theo yêu cầu người dùng.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Không đổi runtime API hay DB. Chỉ cập nhật consumer-facing JSON Schema/example và docs contract (`contracts/`) để khớp API spec; thêm `sse-event_sample.json`.
- Không thêm dependency, mock thuần Node built-ins.

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Tạo testcase từ `_TEMPLATE.md`.
- [x] Tạo file FE test offline dự kiến `apps/web/tests/contract-mocks.test.ts`.
- [ ] Test mới: `cd apps/web && node --test tests/contract-mocks.test.ts`.
- [x] Toàn bộ test FE: `cd apps/web && corepack pnpm test` — 49/49 pass.
- [x] Frontend build: `cd apps/web && corepack pnpm build` — pass.
- [ ] Notes: `python3 scripts/notes_index.py --check`.
- [ ] `git diff --check`.
- [ ] Test tính đúng contract: example validate shape/schema, ISO UTC `Z`, WGS84, envelope; 404/empty không bịa dữ liệu; SSE empty/recovery event.

---

## 6. Rủi ro khi làm
- Giữ contract additive để không làm vỡ consumers cũ; test schema sample bắt drift.
- `EventSource` browser API chưa có trong Node; test mock chỉ cần bề mặt mà `useSSE` sử dụng.
- Test node đọc contract files từ cwd khác nhau: resolve theo `import.meta.dirname` từ test file và cover bằng test runner.

---

## 7. Rollback
Revert riêng mock helper/test, example SSE và contract/schema bổ sung. Không có thay đổi DB/API runtime cần migration/rollback dữ liệu.

---

## 8. Ghi chú
Người dùng yêu cầu dừng ở working tree sau khi tất cả test/build pass; không commit, push, tạo PR hay merge.
