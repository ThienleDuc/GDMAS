# Testcase: FE gọi API/SSE cùng origin qua Vite proxy (hết lỗi CORS)

## Metadata
- ID: 2026-11-22-vite-same-origin-proxy-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/vite.config.ts, docker-compose.yml, apps/web/.env.example, docs/setup.md
- Test File: apps/web/tests/vite-proxy.test.ts
- Author: agent | thien
- Created: 2026-11-22
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc kiểm thử
- **Đối tượng kiểm chứng:** Cấu hình Vite dev proxy `/api` → backend (`VITE_API_PROXY_TARGET`) và việc FE dùng base URI tương đối (`VITE_API_BASE_URL=/`) trong Docker để mọi request — kể cả SSE — đi cùng origin, không còn CORS.
- **Lỗi gốc:** `Cross-Origin Request Blocked ... http://localhost:8000/api/v1/stream/earthquakes ... (Reason: CORS request did not succeed). Status code: (null).` Curl từ host với `Origin: http://localhost:3000` cho thấy BE vẫn trả đúng `access-control-allow-origin` và SSE 200 → lỗi là **trình duyệt không kết nối được tới `localhost:8000`** (URL tuyệt đối cross-origin), không phải BE thiếu header.
- **Ràng buộc GDMAS liên quan:**
  - [x] I2 (OCP) — proxy là tuỳ chọn (`VITE_API_PROXY_TARGET` unset → giữ nguyên hành vi cũ); không đổi chữ ký `resolveSseUrl`/`getEventsStreamUrl`/`resolveContractMock`.
  - [x] I3 — không đổi payload/schema, timestamp UTC & toạ độ WGS84; chỉ đổi đường dẫn vận chuyển.
  - [x] I5 — không hardcode mock vào view; dev-mock (`apply: "serve"`) vẫn chặn trước proxy.
  - [x] I6 — `.env.example` chỉ khai báo tên biến, không secret; không đụng `.env` local.
  - [x] I7 — test offline 100% (đọc source + hàm thuần), không gọi mạng.

---

## 2. Điều kiện tiên quyết & Dữ liệu mẫu (Fixtures)
- **Môi trường / Mock:** `node:test` + type stripping; `readFileSync` các tệp cấu hình + gọi thuần `resolveSseUrl`. Kiểm chứng end-to-end bằng Vite thật (thủ công, có backend local) — không nằm trong test tự động.

| TC ID | Tên Test Case | Nhóm | Đầu vào / Thao tác | Kết quả mong đợi | Kết quả |
|---|---|---|---|---|---|
| `TC-01` | Vite proxy opt-in | Functional | Đọc `apps/web/vite.config.ts` | Có `VITE_API_PROXY_TARGET`, `proxy: apiProxyTarget`, rule `/api` + `changeOrigin: true` | `PASS` |
| `TC-02` | Compose cùng origin | Functional | Đọc `docker-compose.yml` | `VITE_API_BASE_URL` mặc định `/`, `VITE_API_PROXY_TARGET=http://api:8000` | `PASS` |
| `TC-03` | `.env.example` | Resilience | Đọc `apps/web/.env.example` | Có biến proxy, giữ hướng dẫn base mặc định, không secret | `PASS` |
| `TC-04` | Base tương đối | Boundary | `resolveSseUrl(route, "/" \| "")` | Trả `/api/v1/...` (cùng origin), không có `localhost:8000` | `PASS` |
| `TC-05` | Base tuyệt đối | Regression | `resolveSseUrl(route, "http://localhost:8000")` | Vẫn trả URL tuyệt đối như cũ (RULE-03) | `PASS` |

---

## 3. Lệnh thực thi & Kết quả thực tế

```bash
cd apps/web && node --test tests/vite-proxy.test.ts
cd apps/web && pnpm test
cd apps/web && pnpm build
python3 scripts/notes_index.py --check
docker compose config   # kiểm tra env đã resolve
```

- **Ngày chạy cuối:** 2026-11-22
- **Kết quả quan sát thật:** `vite-proxy.test.ts` 5/5 PASS; `pnpm test` 238/238 PASS (không xoá/skip test cũ); `pnpm build` OK; `notes_index.py --check` OK; `docker compose config` trả `VITE_API_BASE_URL=/`, `VITE_API_PROXY_TARGET=http://api:8000`.
- **End-to-end (thủ công):** chạy Vite thật với `VITE_API_BASE_URL=/`, `VITE_API_PROXY_TARGET=http://localhost:8000`, gọi `GET http://127.0.0.1:5202/api/v1/events/stream` → `200 text/event-stream`, nhận heartbeat SSE liên tục — chứng minh trình duyệt chỉ cần 1 origin.

---

## 4. Lỗi phát hiện & Bug Logs (`.agents/notes/bugs/`)
- `none` — lỗi CORS ban đầu là lỗi được sửa; test mới chạy xanh (lần đầu fail do sai đường dẫn tương đối trong test, đã sửa `../..` → `../../..` trước khi commit).
