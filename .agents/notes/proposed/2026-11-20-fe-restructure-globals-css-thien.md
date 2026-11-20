# Proposal: Tái cấu trúc Frontend — nền globals.css, layout thống nhất, tái thiết lib/contracts

## Metadata
- ID: 2026-11-20-fe-restructure-globals-css-thien
- Author: agent | thien
- Created: 2026-11-20
- Type: refactor
- Status: approved
- Priority: high
- Area: `apps/web/src/` — `styles/`, `layouts/`, `contracts/`, `lib/`, `services/`, `hooks/`, `app/`
- Architecture Impact: docs/architecture.md
  <!-- Cập nhật cây thư mục FE ở §12 theo cấu trúc mới; KHÔNG đổi contracts/schemas/, docs/api/API.md, payload hay endpoint. -->
- Related Docs:
  - docs/api/API.md (§2 envelope, §3 endpoints, §4 error codes)
  - docs/architecture.md (§12 cấu trúc src, §9.4 stale/interrupted)
  - docs/coding-rules.md (I2/I3/I5/I7)
  - docs/development/coding-conventions.md (§3 React/TS)
  - docs/task/thien.md (Task 4 — services/contracts/SSE/test)
  - contracts/README.md (§3.2 SSE, §3.4 clusters, §3.8 rule 404)
- Related Proposals:
  - Overrides: 2026-11-17-ui-component-styles-thien — proposal đó duyệt 3 layout (dashboard/fullscreen/report) + CSS phân trang theo từng page/component; chỉ thị hiện tại thu hẹp về 1 layout duy nhất và index.css chỉ import, nên các quyết địnhdesign đó bị thay thế. Scope of Rejection của proposal cũ là `-`, không cấm kiến trúc layout đơn nhất.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Terminal 7 (React + Vite) đã tích hợp đầy đủ hợp đồng API, nhưng lớp trình bày và lớp dữ liệu bị phân mảnh sau nhiều đợt bổ sung incremental:
- 3 layout song song (`DashboardLayout`, `FullscreenMapLayout`, `ReportLayout`) với CSS riêng dễ drift.
- `components/` + `features/` chứa UI cũ, bị thay thế bởi design system mới.
- `styles/index.css` vừa import vừa chứa CSS inline (`@theme`, `:root`, `body`, scrollbar) trong khi `styles/globals.css` đã có design system đầy đủ.
- `contracts/index.ts` là file đơn 334 dòng, trộn kiểu API, kiểu UI và alias legacy.
- `lib/` chỉ có API client; SSE nằm trong `hooks/`, formatter nằm rải trong `utils/`; các hàm transform thuần nằm lẫn trong `components/`.

### Vấn đề
Cần một mặt bằng sạch cho FE: một layout duy nhất, CSS entry point chỉ import, và lớp dữ liệu được tổ chức lại theo đúng tài liệu architecture mà không làm thay đổi giao thức BE↔FE.

### Ảnh hưởng
Nếu không chuẩn hóa: drift giữa 3 layout, CSS chồng chéo, contract type khó đối chiếu với `contracts/schemas/`, và nguy cơ hardcode mock quay lại khi viết UI mới (I5).

---

## 2. Hiện trạng
- `apps/web/src/app/App.tsx`: 3 nhóm `<Route>` tương ứng 3 layout.
- `apps/web/src/layouts/`: `DashboardLayout.tsx`, `FullscreenMapLayout.tsx`, `ReportLayout.tsx`, `layout.css` (544 dòng, 3 variant + print CSS).
- `apps/web/src/styles/index.css`: 6 lệnh import + ~35 dòng CSS inline.
- `apps/web/src/components/` (27 file) và `apps/web/src/features/` (11 file): UI cũ.
- `apps/web/src/contracts/index.ts`: 334 dòng, mọi kiểu trong 1 file.
- `apps/web/src/lib/api-client.ts`: chỉ có `fetchApi`/`ApiError`; transform nằm trong `components/{charts,map}/` và `features/settings/`.
- `apps/web/src/hooks/sse-machine.ts`: state machine SSE tự định nghĩa tên event, tách rời `SSEEventName` trong contracts.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Dọn `components/` và `features/`; `styles/index.css` chỉ chứa import, mọi style dùng `styles/globals.css`.
  2. Chuẩn hóa về **1 layout duy nhất** gồm `<aside>` điều hướng + vùng nội dung (`Outlet`).
  3. Tái thiết `contracts/` theo từng schema + barrel tương thích; giữ alias legacy (I2).
  4. Tái thiết `lib/`: API client + SSE EventSource + formatters UTC/WGS84 + transforms thuần.
  5. Giữ build và toàn bộ test offline xanh; không đổi wire format gửi BE.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không xây dựng UI/page mới (chỉ placeholder tạm).
  - Không sửa `contracts/schemas/`, `contracts/examples/`, `docs/`, `apps/api/`, migration Alembic.
  - Không commit/push/merge ở proposal này (dừng CHECKPOINT 1).

---

## 4. Giải pháp đề xuất
- **Step 1 — Dọn nền:** xóa nội dung `components/` + `features/`; `index.css` chỉ giữ `@import` (fonts, tailwind, tw-animate-css, globals.css, layouts/layout.css); `App.tsx` dùng `PlaceholderPage` trên nền design system.
- **Step 2 — Layout đơn nhất:** giữ `DashboardLayout` làm layout duy nhất (aside + content); xóa 2 layout kia; gộp 6 route vào 1 nhóm; cắt CSS fullscreen/report; cập nhật test layout.
- **Step 3 — Contracts theo schema:** tách `common/sse/earthquake/health/system-status/clusters/analysis/patterns/predictions/classifications` + barrel `index.ts` re-export; chuyển kiểu từ `services/earthquake-api.ts` vào contracts rồi re-export ngược để giữ import cũ.
- **Step 4 — Lib theo architecture:** `lib/api-client.ts` (giữ), `lib/sse.ts` (parse/backoff/URL/factory EventSource), `lib/formatters.ts` (UTC/WGS84), `lib/transforms/*` (5 file data dời từ UI), `lib/index.ts`; `useSSE` dùng `createSseSource`; `hooks/sse-machine.ts` thành lớp re-export tương thích.
- Tuân thủ I2 (không phá chữ ký/đường dẫn import cũ), I3 (UTC `Z`, WGS84), I5 (không mock), I7 (test offline + testcase).

---

## 5. Phương án đã cân nhắc
### Phương án A: Giữ nguyên 3 layout + 1 file contracts, chỉ vá lỗi
Ưu: ít diff. Nhược: không giải quyết drift CSS, contract vẫn khó đối chiếu schema, SSE vẫn trùng enum. **Không chọn** vì không đạt mục tiêu chuẩn hóa.

### Phương án B: Tách theo schema + lib đầy đủ + barrel tương thích
Ưu: khớp `docs/architecture.md` §12 và `contracts/README.md`; import cũ không vỡ nhờ barrel; test được tách theo module. Nhược: số file tăng (11 contract + 5 transform). **Chọn** — tính bảo trì và khả năng kiểm chứng quan trọng hơn số file.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Tăng số file, giảm kích thước mỗi file | Mỗi contract map 1 schema dễ review |
| Hiệu năng | Không đổi | Chỉ tổ chức lại type/import; cùng bundle ~271 kB JS |
| Bảo trì / Open-Closed | Tốt hơn | Barrel + re-export giữ mọi import cũ; alias legacy được bảo lưu |
| Độ tin cậy | Tốt hơn | Nguồn duy nhất cho SSE enum; formatter/parse được test offline |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Import cũ vỡ sau khi dời file | Trung bình | Cao | Barrel `contracts/index.ts`, `lib/index.ts`; re-export trong `services/` và `hooks/sse-machine.ts`; chạy `pnpm build` |
| React hook đổi hành vi khi nối `createSseSource` | Thấp | Trung bình | Giữ chữ ký `useSSE(endpoint?)`; helper thuần được test; build + 56 test xanh |
| Drift tài liệu (Architecture Impact) | Thấp | Trung bình | Không đổi schema/API.md; ghi rõ `none` + danh sách Related Docs; chạy `notes_index.py --check` |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-20-fe-restructure-globals-css-thien.md`
- **Code test tự động (offline):**
  - `apps/web/tests/lib-redesign.test.ts` (mới — 7 TC cho SSE/UTC/WGS84/barrel)
  - `apps/web/tests/layout-styles.test.ts` (cập nhật cho 1 layout)
  - `apps/web/tests/{chart-data,geo-format,map-data,settings-data}.test.ts` (đổi import sang `lib/transforms/`)
- **Cách kiểm chứng:** `cd apps/web && pnpm build` và `cd apps/web && pnpm test`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-20
Comments: Người dùng đang thao tác chỉ thị rõ ràng trong chat rằng bộ artifacts proposal/implement bị thiếu và yêu cầu bổ sung cho công việc FE đã thực hiện trên nhánh `refactor/2026-11-20-fe-restructure-globals-css-thien`. Ghi nhận §9 Approved theo chỉ thị trực tiếp đó; phạm vi đúng những gì đã làm, không mở rộng sang commit/push.
Scope of Rejection: -

---

## 10. Next Action
Đã sang Pha 4 (`build-implementation`). Cập nhật `implemented/<id>/status.md` ở mức `validation`, dừng **CHECKPOINT 1** chờ người dùng quyết định commit/push hay tiếp tục chỉnh sửa.
