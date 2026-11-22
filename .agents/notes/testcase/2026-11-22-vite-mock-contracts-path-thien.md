# Testcase: Định vị fixture hợp đồng cho Vite dev mock trong Docker

## Metadata
- ID: 2026-11-22-vite-mock-contracts-path-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/vite.config.ts, apps/web/contract-paths.ts, docker-compose.yml
- Test File: apps/web/tests/contract-paths.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Hàm `resolveExamplesDir(configDir)` — tìm thư mục `contracts/examples` chứa fixture SSE cho middleware mock của Vite (`VITE_API_MOCKING=enabled`), đúng ở cả bố cục local monorepo lẫn Docker dev (`WORKDIR /app`).
- **Lỗi gốc:** `ENOENT ... open '/contracts/examples/sse-event_sample.json'` — trong Docker, `/app` là `apps/web`, `contracts/` không được mount nên `../../contracts/examples` vượt root thành `/contracts/examples`.
- **Ràng buộc GDMAS liên quan:**
  - [x] I2 (OCP) — bổ sung module/hàm mới, giữ nguyên chữ ký `resolveContractMock`; không xóa file cũ.
  - [x] I5 — fixture chỉ phục vụ dev mock (`apply: "serve"`), không hardcode vào runtime view, không vào production bundle.
  - [x] I7 — unit test chạy offline 100% (dùng thư mục tạm trong `os.tmpdir()`, không gọi mạng/USGS).
  - [ ] I1/I3/I4/I6 — không chạm (không sửa `main.py`, contract, migration hay `.env`).

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test` + type stripping (Node ≥22); `mkdtempSync`/`writeFileSync` tạo bố cục giả; hàm nhận injector `fixtureExists` để kiểm chứng thuần logic chọn candidate. Fixture thật `contracts/examples/sse-event_sample.json` chỉ được đọc ở test tích hợp cuối.

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi (Assertions) | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Local monorepo | Functional | config `<repo>/apps/web`, fixture `<repo>/contracts/examples` | Trả `../../contracts/examples` | `PASS` |
| `TC-02` | Docker mount `/app/contracts` | Functional | config `<root>/app`, fixture `<root>/app/contracts/examples` | Bỏ candidate root-clamp, trả `./contracts/examples` | `PASS` |
| `TC-03` | Docker mount `/contracts` | Functional | inject `fixtureExists` chỉ true tại `/contracts/examples/...` | Trả `/contracts/examples` | `PASS` |
| `TC-04` | Fallback | Negative | `fixtureExists` luôn false | Trả candidate đầu (`../../contracts/examples`) để ENOENT chỉ đúng đường dẫn dự kiến | `PASS` |
| `TC-05` | Repo thật | Integration | config = `apps/web` của repo | `existsSync(sse-event_sample.json)` === true | `PASS` |

---

## 3. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/contract-paths.test.ts
cd apps/web && pnpm test
cd apps/web && pnpm build
```

- **Ngày chạy cuối:** 2026-11-22
- **Kết quả quan sát thật:** `contract-paths.test.ts` 5/5 PASS; toàn bộ `pnpm test` 233/233 PASS; `pnpm build` (tsc -b && vite build) thành công.
- **Kiểm chứng end-to-end:** dựng bố cục giả `<root>/app` + mount `<root>/app/contracts`, chạy Vite thật với `VITE_API_MOCKING=enabled` → `GET /api/v1/events/stream` trả `200 text/event-stream` với payload SSE (không còn ENOENT).

---

## 4. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` — test mới chạy xanh; lỗi ENOENT ban đầu là lỗi được sửa, không phải lỗi phát hiện khi chạy test.
