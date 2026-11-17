# Proposal: Bộ test mock cho Frontend theo contracts (T7) — test cục bộ, không lệch BE

## Metadata
- ID: 2026-11-17-fe-contract-mock-tests-thien
- Author: agent | thien
- Created: 2026-11-17
- Type: feature
- Status: approved
- Priority: medium
- Area: `apps/web/tests/`, `apps/web/dev-mock.ts`, `apps/web/vite.config.ts`, `apps/web/.env.example`, `apps/web/package.json`, `contracts/{schemas,examples}/`, `contracts/README.md`, `docs/setup.md` §1.4, `.gitignore`
- Architecture Impact: contracts/   <!-- sự thật thay đổi: earthquake schema/sample được chỉnh theo canonical shape của docs/api/API.md §3.2 + bổ sung fixture SSE example; không đổi route/payload runtime của BE -->
- Related Docs:
  - docs/api/API.md (§2 envelope, §3.1–3.5 endpoints, §4 error codes)
  - docs/architecture.md (§7 API, §9.4 dữ liệu cũ, §12 6 patterns, §6.6 FE)
  - docs/architecture/SAD.md
  - docs/task/thien.md (Task 4 — mock `fetch`/`EventSource`, test offline)
  - docs/yeucaubatbuoc.md (§4 Kịch bản Demo 6 bước)
  - docs/setup.md (§1.4 Danh mục Phần mềm Cốt lõi — pnpm ≥ 8.15/khuyến nghị ≥ 9.0+, Node ≥ 18.18/khuyến nghị 20.12+/22+; Bước 4 cấu hình FE)
  - apps/web/.env.example, apps/web/vite.config.ts (quy ước biến `VITE_*`, cổng 3000 — xem §4.3)
  - contracts/README.md (§3.3–3.8 — mock dùng cho test, không import runtime)
- Related Proposals:
  - .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md (completed — giữ nguyên 6 file test cũ, I7)
  - .agents/notes/proposed/2026-11-16-six-patterns-chart-components-thien.md (completed — giữ nguyên chart-data.test.ts 12/12)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Frontend (T7) hiện **chưa có hạ tầng mock tập trung**: các test trong `apps/web/tests/` tự monkey-patch `globalThis.fetch` / `EventSource` với payload tự dựng ngay trong từng test (`services.test.ts`, `sse-machine.test.ts`...). `contracts/examples/` đã có sẵn mock payload cho 6 patterns, health, system-status, clusters, nhưng:
- **Chưa có fixture SSE** (schema `sse-event.json` có, nhưng `contracts/examples/` không có file mẫu).
- **Có drift giữa contracts và docs**: `contracts/schemas/earthquake.json` + `examples/earthquake_sample.json` dùng shape cũ `id`(string USGS)/`time`/`depth`/`status`, trong khi `docs/api/API.md` §3.2 và `EarthquakeContract` (FE) dùng shape canonical `id`(int)/`event_time`/`depth_km`/`source_event_id`/`magnitude_type`/`ingested_at`/`source`/`place`.
- Chưa có bộ mock envelope nhất quán `{success,data,metadata}` và error codes (§4) để test Loading/Error/Empty/404 theo đúng hợp đồng.
- **Chưa chuẩn hóa cấu hình chạy riêng FE (T7)**: repo không có root `package.json`/`pnpm-workspace.yaml` nên `apps/web` là project pnpm độc lập; lệnh đúng là `cd apps/web && corepack pnpm dev`. Đồng thời `.env.example` khai báo `VITE_API_URL`/`VITE_SSE_URL` nhưng code lại đọc `VITE_API_BASE_URL`/`VITE_SSE_ENDPOINT` → drift khiến cấu hình không có tác dụng, FE rơi về default hardcode `http://localhost:8000`.

### Vấn đề
- Không test cục bộ được FE khi BE chưa chạy mà **vẫn bảo đảm không lệch hợp đồng** với BE → dễ đoán sai shape payload.
- Mỗi test tự dựng payload → trùng lặp, lệch nhau, khó đồng bộ khi contract đổi.
- Contract bị lệch docs → FE test theo contract cũ sẽ pass nhưng lệch payload thật của BE.
- Chạy FE cục bộ khi BE chưa lên không có cờ mock chính thức; dễ dùng nhầm `PUBLIC_API_MOCKING` (convention Next.js/Astro) — Vite chỉ expose biến `VITE_*`, nên biến này bị bỏ qua hoàn toàn (xem §4.3).

### Ảnh hưởng
Đụng trực tiếp tới I3 (hợp đồng `contracts/` + UTC/WGS84) và I7 (test offline, giữ nguyên test cũ). Theo `docs/task/thien.md` Task 4, việc mock `fetch`/`EventSource` cho test là yêu cầu chính thức — **không vi phạm** quy tắc "không mock tĩnh ở view chính thức" (I5 / `contracts/README.md` §3.3): mock chỉ nằm ở lớp test, không import vào runtime.

---

## 2. Hiện trạng
- `apps/web/tests/*.test.ts`: 7 file test, tổng 39/39 pass (`node --test tests/*.test.ts` qua `corepack pnpm test`), mock `fetch`/`EventSource` kiểu inline.
- `apps/web/src/services/earthquake-api.ts`: 15+ hàm gọi `/api/v1/...` qua `fetchApi`; `getOptionalApi` xử lý 404 → `{data:null, unavailable:true}`.
- `apps/web/src/contracts/index.ts`: `EarthquakeContract` đã **chịu cả hai shape** (`id: string|number`, cả `time`/`event_time`, `depth`/`depth_km`...).
- `contracts/examples/`: 8 file sample (có envelope `success` ở 7 file), **thiếu SSE example**.
- `contracts/schemas/earthquake.json` + `examples/earthquake_sample.json`: shape legacy, lệch `docs/api/API.md` §3.2.
- KHÔNG có thư mục mock nào trong `apps/web/src` (xác nhận bằng `find`).
- Cấu hình chạy riêng FE (cập nhật 2026-11-18):
  - Không có root `package.json` / `pnpm-workspace.yaml`; `apps/web/package.json` có `"dev": "vite"`, `vite.config.ts` đặt `port: 3000` (không cần `--port`).
  - Corepack (có sẵn từ Node) tự ep đúng phiên bản theo field `packageManager`; **Corepack chỉ nhận semver chính xác, không nhận range** như `pnpm@>=9`.
  - Ban đầu pin `pnpm@11.28.12` nhưng bản đó yêu cầu **Node ≥ 22.13**, vi phạm ngưỡng tối thiểu §1.4 là Node 18.18.0. Đã đổi sang `pnpm@10.20.0` (yêu cầu Node ≥ 18.12 → chạy được từ 18.18.0 đến 22+, dùng lockfile `9.0`). Xác nhận `corepack pnpm -v` → `10.20.0`; Node máy hiện tại `v22.23.4`.
  - Ngưỡng tương thích được khai báo qua `"engines": { "node": ">=18.18.0", "pnpm": ">=8.15.0" }` (Corepack tự chọn bản cụ thể, `engines` ghi rão "mọi bản từ tối thiểu trở lên"). Lệnh `pnpm -v` trong §1.4 nếu trả bản global khác vẫn đạt ngưỡng; kiểm tra đúng FE dùng `corepack pnpm -v`.
  - `.env.example` ban đầu dùng `VITE_API_URL`, `VITE_SSE_URL`; đã đồng bộ sang `VITE_API_BASE_URL` và `VITE_SSE_ENDPOINT` như code đọc. `apps/web/.env` **chưa tồn tại** (chỉ có `.env.example`).
  - Vite 8.3.6 dùng `envPrefix: "VITE_"` mặc định (`vite.config.ts` không override) → `PUBLIC_API_MOCKING` / `API_MOCKING` không bao giờ xuất hiện trong `import.meta.env`; grep toàn `apps/web/src` không có dòng nào đọc cờ mocking.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Xây **bộ test mock tập trung** cho FE tại `apps/web/tests/mocks/`: fixture đọc trực tiếp từ `contracts/examples/` (single source of truth) + helper mock `fetch` (envelope thành công, 404 `unavailable`, 500 lỗi, empty DB) và mock `EventSource` (các event theo `sse-event.json`, gồm `database_cleared` cho Demo Bước 2–3).
  2. Viết test offline chứng minh FE tiêu thụ đúng payload theo `docs/api/API.md` + `contracts/`: UTC `Z`, WGS84, envelope, 6 patterns, empty/pending/insufficient_data → Empty State (không bịa số).
  3. **Sửa drift contract**: cập nhật `earthquake.json` + `earthquake_sample.json` theo canonical shape của `docs/api/API.md` §3.2 (giữ alias tương thích để không vỡ FE cũ — RULE-03), bổ sung `examples/sse-event_sample.json`, cập nhật `contracts/README.md` §3.1 và §3.2 cho khớp.
  4. Giữ nguyên **7 file test cũ 39/39 pass** (I7), mock **không** đưa vào runtime.
  5. **Chuẩn hóa cấu hình chạy riêng FE (bổ sung 2026-11-18):** ghim `"packageManager": "pnpm@10.20.0"` (tương thích Node ≥18.18) + `"engines"` khai báo ngưỡng §1.4 trong `apps/web/package.json`; ghi rõ lệnh `cd apps/web && corepack pnpm dev` (Corepack đọc pin, Vite :3000); sửa drift `.env.example` sang đúng tên biến code đọc (`VITE_API_BASE_URL`, `VITE_SSE_ENDPOINT`) và bổ sung cờ `VITE_API_MOCKING` (opt-in, dev-only) để chạy FE cục bộ với fixture từ `contracts/examples/` khi BE chưa sẵn sàng — chi tiết §4.3.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi logic runtime FE/client bundle, hook, service signature, route API, `apps/api/**`; mock chỉ đặt trong Vite dev-server middleware.
  - Không đổi schema BE/Pydantic, migration, `.env`.
  - Không dùng mock trong view chính thức (giữ nguyên nguồn dữ liệu thật từ BE — I5).
  - Không xóa/sửa test cũ; không đụng page CSS / layout CSS đã merge ở proposal trước.
  - Không bật mock ở bản build production: cờ `VITE_API_MOCKING` phải đi kèm điều kiện `import.meta.env.DEV`, mặc định `disabled`, và **không commit** `apps/web/.env` (I6).
  - Không dùng tên biến `PUBLIC_*` hay `API_MOCKING` (bị Vite bỏ qua) làm cấu hình chính thức.

---

## 4. Giải pháp đề xuất
### 4.1. Cấu trúc mock (test-only)
```text
apps/web/tests/
├── mocks/
│   ├── fixtures.ts        # đọc contracts/examples/* bằng node:fs, trả payload typed
│   ├── fetch-mock.ts      # cài globalThis.fetch: route -> envelope / 404 / 500 / empty
│   └── sse-mock.ts        # mock EventSource: earthquake_detected/alert, heartbeat, database_cleared
├── contract-mocks.test.ts # test FE tiêu thụ đúng contract (mới)
└── ...7 file test cũ (giữ nguyên)
contracts/
├── schemas/earthquake.json          # SỬA: canonical shape theo API.md §3.2 (+ alias)
├── examples/earthquake_sample.json  # SỬA: canonical sample
├── examples/sse-event_sample.json   # MỚI: fixture SSE
└── README.md                        # SỬA: §3.1 shape + §3.2 tham chiếu example mới
```

### 4.2. Nguyên tắc
- **Fixture từ contracts**: `fixtures.ts` chỉ đọc file trong `contracts/examples/` — khi contract đổi, mock đổi theo, không lệch BE. Không hardcode payload trong mock helper.
- **Envelope & error theo API.md**: helper `fetch-mock` trả đúng `{success,data,metadata}` (200), `{success:false,error:{code,message,details}}` (400/404/500), các `code` theo §4. Route map đúng `/api/v1/...` (api-client dùng base `http://localhost:8000` + path).
- **SSE theo `sse-event.json`**: event enum additive, có `id`/`retry` optional; phát `database_cleared` để test chuyển Empty State rồi `ingestion_cycle_completed` để test phục hồi (Demo §4 Bước 2–3, 6).
- **UTC/WGS84 (I3)**: mọi timestamp fixture kết thúc `Z`; tọa độ `latitude`/`longitude` trong `[-90,90]`/`[-180,180]`.
- **RULE-03/I2**: sửa earthquake schema/sample theo hướng **bổ sung alias canonical** (giữ `time`/`depth`/string `id` làm optional alias), không xóa field cũ — FE `EarthquakeContract` vẫn chịu cả hai. Test cũ không đụng.
- **Offline 100% (I7)**: unit test chỉ đọc filesystem + mock `fetch`/`EventSource`, không gọi mạng thật. Chạy `corepack pnpm test` (Corepack lấy đúng phiên bản từ `packageManager`).

### 4.3. Cấu hình chạy riêng Frontend (bổ sung 2026-11-18)
**Lệnh chuẩn (Terminal 7):**
```bash
cd apps/web
corepack pnpm dev                      # Vite :3000 (đã set trong vite.config.ts)
# có thể inject biến cho đúng phiên chạy:
VITE_API_BASE_URL=http://localhost:8000 corepack pnpm dev
VITE_API_MOCKING=enabled corepack pnpm dev   # chạy FE với fixture, không cần BE
```
- **Vì sao `cd apps/web`:** repo **không có root `package.json` / `pnpm-workspace.yaml`** → `apps/web` là project pnpm độc lập; script `"dev": "vite"` nằm ở `apps/web/package.json`. Chạy từ root sẽ lỗi "no package.json / command not found".
- **Vì sao `corepack pnpm dev`:** Corepack (có sẵn từ Node) đọc `packageManager` trong `apps/web/package.json` và tự tải/ep đúng bản → khớp `pnpm-lock.yaml` (`lockfileVersion: '9.0'`), tránh lỗi "modules directory created by a different pnpm version". Chọn **pnpm@10.20.0** thay vì 11 vì bản 11 yêu cầu Node ≥22.13 (loại ngưỡng tối thiểu 18.18.0 của §1.4); 10.20.0 chạy được từ Node 18.12→22+ và đã rebuild `node_modules` khớp.
- **Corepack không nhận range:** `pnpm@>=9`, `pnpm@^9.0.0`, `pnpm@11` đều bị từ chối ("expected a semver version") — chỉ nhận semver đầy đủ. Vì vậy ngưỡng "mọi bản từ tối thiểu" được thể hiện bằng `"engines": { "node": ">=18.18.0", "pnpm": ">=8.15.0" }`, còn `packageManager` là một bản đại diện cụ thể.
- **Đã ghim để khỏi gõ tay:** `apps/web/package.json` có `"packageManager": "pnpm@10.20.0"`; xác nhận `cd apps/web && corepack pnpm -v` → `10.20.0`, sau đó `corepack pnpm dev` dùng đúng pin.
- **Quy ước biến môi trường (Vite 8):** chỉ biến `VITE_*` được expose qua `import.meta.env` (`envPrefix` mặc định, không override). `PUBLIC_API_MOCKING` là convention Next.js/Astro → **bị bỏ qua**, không code nào đọc. Sửa `.env.example` cho khớp thực tế:

  | `.env.example` (cũ — sai) | Code đọc (đúng) | Default khi thiếu |
  |---|---|---|
  | `VITE_API_URL` | `VITE_API_BASE_URL` | `http://localhost:8000` |
  | `VITE_SSE_URL` | `VITE_SSE_ENDPOINT` | `/api/v1/stream/earthquakes` |
  | — | `VITE_API_MOCKING` (mới, opt-in) | `disabled` |

- **Cờ `VITE_API_MOCKING` (dev-only):** chỉ Vite config đọc cờ này để cài middleware `apply: "serve"`, nhận API/SSE request trên cùng origin và trả fixture từ `contracts/examples/`; khi bật, `VITE_API_BASE_URL` của client được đổi sang Vite origin. Không sửa `src/lib/api-client.ts`, không import test mocks/fixtures vào FE client bundle. Mọi giá trị khác hoặc production build/preview không có middleware mock và gọi API thật (I5); không commit `.env` (I6).

---

## 5. Phương án đã cân nhắc
### Phương án A: Mock server chạy riêng (MSW / json-server / nodemon)
Ưu: giống BE thật. Nhược: thêm dependency + tiến trình, test không còn offline thuần, dễ lệch contract nếu tự dựng payload. **Không chọn.**

### Phương án B: Fixture từ `contracts/examples/` + helper mock `fetch`/`EventSource` trong `tests/mocks/`
Ưu: offline 100%, dùng chung nguồn dữ liệu với BE contract, tận dụng 7 file test cũ, dễ validate drift. Nhược: không mô phỏng latency/real network (không cần cho unit test). **Chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 3 helper + 1 file test; 3 file contract sửa/ thêm |
| Hiệu năng | Không đổi | Chỉ chạy lúc test |
| Bảo trì / Open-Closed | Tốt | Contract là nguồn đơn nhất; đổi contract → đổi mock tự động |
| Độ tin cậy | Cao | Test chạy offline, bắt drift FE↔BE sớm |
| Tương thích | An toàn | Sửa earthquake schema theo hướng additive alias, không xóa field cũ |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Đụng quy tắc "không mock ở view chính thức" (I5) | Thấp | Cao | Mock server chỉ trong Vite dev middleware opt-in; không vào client bundle hoặc production build; fixtures test vẫn ở `tests/` |
| Sửa `earthquake.json` làm vỡ test schema cũ | Trung bình | Trung bình | Giữ alias, chạy lại 39 test + thêm test validate sample theo schema |
| Fixture đọc sai path tương đối | Thấp | Thấp | Dùng `import.meta.dirname` + `join`, test sẽ fail ngay nếu sai |
| Store mismatch nếu chạy pnpm global khác pin | Trung bình | Trung bình | Dùng `corepack pnpm` để ep đúng `packageManager` (10.20.0); đã rebuild `node_modules` khớp |
| Dùng nhầm `PUBLIC_API_MOCKING` / tên `.env.example` cũ | Trung bình | Trung bình | Chỉ dùng `VITE_*`; sửa `.env.example` + test khẳng định biến sai prefix không có tác dụng (§4.3) |
| Cờ mock lọt vào production build | Thấp | Cao | Plugin `apply: "serve"` chỉ được cài trong Vite dev server; production build/preview không có middleware; không commit `.env` (I5/I6) |
| Thêm scope sau khi §9 đã Approved | Trung bình | Trung bình | Ghi rõ `### Revision 2026-11-18`; phần cấu hình chỉ triển khai sau khi xác nhận, không âm thầm tính vào scope cũ |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-17-fe-contract-mock-tests-thien.md` *(copy từ `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline, FE):** `apps/web/tests/contract-mocks.test.ts`, `apps/web/tests/dev-mock.test.ts` + test helpers `apps/web/tests/mocks/{fixtures,fetch-mock,sse-mock}.ts`; chạy bằng `cd apps/web && corepack pnpm test`.
- **Cách kiểm chứng:** `cd apps/web && corepack pnpm test` (39 cũ + test mới pass), `corepack pnpm build` (tsc + vite), `python3 scripts/notes_index.py --check`, `git diff --check`. Kiểm tra func: mock trả đúng envelope/UTC Z/WGS84, empty/404 → Empty State, SSE `database_cleared` → rỗng rồi phục hồi.
- **Kiểm chứng cấu hình chạy riêng FE (§4.3):**
  - `cd apps/web && corepack pnpm -v` → `10.20.0` (tương thích §1.4: Node ≥18.18); `corepack pnpm dev` → Vite listen `:3000`, không cần `--port`.
  - `corepack pnpm -v` trong `apps/web` → `10.20.0` (Corepack đọc pin); `engines` ghi nhận ngưỡng §1.4; env sample khai báo đúng `VITE_API_BASE_URL` / `VITE_SSE_ENDPOINT`; `PUBLIC_API_MOCKING` không được hỗ trợ.
  - `VITE_API_MOCKING=enabled` → Vite dev middleware trả fixture API/SSE từ `contracts/examples/`; mock unset thì middleware không chặn API; production build/preview không cài middleware.
  - `python3 scripts/notes_index.py --check` vẫn xanh sau khi sửa `.env.example` / `package.json`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-17
Comments: Người dùng xác nhận rõ trong chat: "cập nhật human review ... buil-implement, testcase theo workflow, vừa build vừa test đén khi pass hết, chưa commit, đợi test." Chỉ triển khai theo proposal, chạy test/build đến pass; dừng ở working tree, không commit/push/merge.
Scope of Rejection: -

---

## 10. Next Action
Đã triển khai theo §9 `Approved` và xác nhận mở rộng ngày 2026-11-18; implementation đang `validation`, testcase `passed`. Chờ người dùng rà soát kết quả trong working tree (không commit/push theo chỉ thị).

<!-- Nhánh feat/2026-11-17-fe-contract-mock-tests-thien; triển khai đã validation, giữ working tree theo yêu cầu, chưa commit/push. -->

### Revision 2026-11-18
- **Lý do:** người dùng hỏi về cách chạy riêng FE và ví dụ `PUBLIC_API_MOCKING=enabled pnpm dev`; sau đó xác nhận triển khai phần cấu hình FE.
- **Đã bổ sung:**
  - Metadata: thêm `apps/web/.env.example`, `apps/web/package.json` vào Area; thêm `docs/setup.md` §1.4 vào Related Docs.
  - §1–§2: ghi nhận drift cấu hình FE (project pnpm độc lập, pin pnpm 11 vi phạm Node ≥18.18 nên đổi sang 10.20.0, `.env.example` sai tên biến, `PUBLIC_*` bị Vite bỏ qua).
  - §3 mục tiêu 5 + Out of Scope: chuẩn hóa cấu hình chạy riêng FE, cờ mock dev-only, không bật ở production.
  - §4.3 (mới): lệnh chuẩn, lý do `cd`/Corepack, bảng đối chiếu tên biến, thiết kế cờ `VITE_API_MOCKING` trong Vite dev middleware.
  - §7 rủi ro và §8 kiểm chứng: bổ sung các ca kiểm tra cấu hình.
  - Sau xác nhận rõ của người dùng ngày 2026-11-18, mở rộng `implemented/<id>/plan.md` + testcase, ghim packageManager (đổi 11 → 10.20.0 vì Node ≥18.18), sửa `.env.example`, thêm Vite dev-only middleware + resolver, test offline, cập nhật `docs/setup.md` §1.4 và ignore `.vscode/` trong `.gitignore`.
- **Giữ nguyên §9 `Decision: Approved` (thien, 2026-11-17)**; phần mở rộng scope được người dùng xác nhận rõ trong chat ngày 2026-11-18.
- **Trạng thái cuối:** `Approved` / implementation `validation` / testcase `passed`; 49 FE tests pass, build pass, `notes_index --check` OK. Working tree giữ nguyên, không commit/push.
