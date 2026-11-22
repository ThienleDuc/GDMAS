# Proposal: Panel trạng thái 7 Terminals từ API thật (RD-16)

## Metadata
- ID: 2026-11-22-terminal-status-panel-thien
- Author: agent | thien
- Created: 2026-11-22
- Type: feature
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: apps/web/src/layouts/header/, apps/web/tests/
- Architecture Impact: none
  <!-- Không đổi contracts/, docs/api/API.md, route/payload BE. Chỉ nạp service đã có (health/system/status)
       vào widget header; không khôi phục route /settings đã gỡ. -->
- Related Docs:
  - docs/quyuocchung.md
  - docs/coding-rules.md
  - docs/architecture.md §9.4 (ngưỡng stale 15p/60p, 26h/48h)
  - docs/api/API.md §3.1 (`/health`, `/system/status`)
  - docs/task/fe-be-integration-ready.md (RD-16)
- Related Proposals:
  - 2026-11-16-fe-contract-gis-reports-thien (từng có SettingsPage 7 Terminals — đã gỡ cùng route)
  - 2026-11-21-overview-dashboard-thien (card strip 7 Terminals bị gỡ theo yêu cầu user)
  - 2026-11-21-header-country-clock-refresh-thien (shell/header, `TERMINAL_SPECS` làm nguồn chu kỳ)
  - 2026-11-22-sse-standard-endpoint-thien (proposal 3, đã merge)
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
BE đã có `GET /api/v1/health` và `GET /api/v1/system/status` trả trạng thái 7 service + `last_run` + `data_feed`. FE đã có service `getHealthOptional`/`getSystemStatusOptional`, contract types, và helper thuần `evaluateServiceFreshness`/`formatElapsedMinutes` (`lib/transforms/settings-data.ts`).

### Vấn đề
Các hàm trên **chưa có consumer runtime** (`settings-data.ts` chỉ cung cấp metadata tĩnh `TERMINAL_SPECS` cho đồng hồ đếm ngược). Người dùng không thấy trạng thái 7 Terminals ở đâu cả, dù dữ liệu thật đã sẵn. Đây là RD-16 trong file task.

### Ảnh hưởng
Thiếu khả năng giám sát nhanh (Demo 6 bước cần thấy worker có chạy/dữ liệu có cũ không). Phải hiển thị `unknown` khi thiếu `last_run` — không được suy diễn "đang chạy" (I3, `docs/architecture.md` §9.4).

---

## 2. Hiện trạng
- `services/earthquake-api.ts:173-196` — `getHealth`, `getHealthOptional`, `getSystemStatus`, `getSystemStatusOptional` (404 → `{unavailable:true}`).
- `contracts/system-status.ts:15-56` — `ServiceKey` (7), `SERVICE_LABELS`, `ServiceStatus` (`last_run?`, `cycle?`, ...), `SystemStatusResponse`.
- `lib/transforms/settings-data.ts:26-121` — `evaluateServiceFreshness(service, now?)` (unknown/stale/interrupted/fresh), `formatElapsedMinutes(minutes)`; `:126-182` `TERMINAL_KEYS`, `TERMINAL_SPECS`.
- `layouts/header/HeaderActions.tsx:13-21` — cụm widget: filter quốc gia, countdown, đồng hồ, theme toggle. Chưa có trạng thái hệ thống.
- BE `routes/system.py` — `/health` trả `{status, database, version, timestamp}`; `/system/status` trả `services{postgres,ingestion,analysis,clustering,prediction,api,frontend}` với `status` map `unknown|error|idle|active|running`, `last_run`, `cycle`.
- `/settings` đã bị gỡ; card strip 7 Terminals trên `/` cũng đã gỡ theo yêu cầu người dùng 2026-11-21 → **không khôi phục**.

---

## 3. Mục tiêu
- **Mục tiêu:** Thêm widget nhỏ trong header (dạng `<details>` gọn) liệt kê 7 Terminals với trạng thái + độ tươi từ API thật; thiếu `last_run` → `unknown`/"Chưa có thông tin"; API 404 → cờ unavailable, không mock.
- **Không nằm trong mục tiêu (Out of Scope):** khôi phục `/settings`, đưa strip 7 Terminals lại trang `/`, sửa BE/contracts/docs API, poll liên tục/SSE riêng, đổi service/contract FE, dark mode CSS mới.

---

## 4. Giải pháp đề xuất
1. **Helper thuần** bổ sung vào `apps/web/src/layouts/header/header-data.ts` (file đã có `countriesFromClusters`):
   - `terminalStatusRows(payload, now = new Date()): TerminalStatusRow[]` — map `TERMINAL_KEYS` → `{key, terminalId, name, status, freshness, lastRunLabel}`; dùng `SERVICE_LABELS`, `TERMINAL_SPECS`, `evaluateServiceFreshness`, `formatElapsedMinutes`; service thiếu → `status:"unknown"`, `lastRunLabel:"—"`.
   - `summarizeTerminalRows(rows): {healthy, total}` — đếm `status ∈ {active,running}` **và** `freshness.state === "fresh"`.
2. **Component mới** `apps/web/src/layouts/header/SystemStatusPanel.tsx`:
   - `<details>` summary chip `"Hệ thống {healthy}/{total}"` (hoặc `"—"` khi unavailable).
   - Effect gọi `getSystemStatusOptional(signal)` + `getHealthOptional(signal)` (abortable); mở `<details>` → gọi lại để làm mới; không dùng timer.
   - Khi mở: danh sách 7 dòng (tên T1…T7, nhãn trạng thái, độ tươi), footer báo `data_feed.total_events` và `health.database` nếu có.
   - 404/empty → nhãn "Chưa có dữ liệu trạng thái"; 500 → `role="alert"` + nút thử lại.
3. **`HeaderActions.tsx`**: thêm `<SystemStatusPanel />` (1 dòng) trước `RealtimeClock`.
4. **CSS** `apps/web/src/layouts/layout.css`: class `.layout__system-*` chỉ dùng CSS token (không hex).
5. **Test** `apps/web/tests/terminal-status.test.ts` (mới): helper thuần (7 keys, missing last_run → unknown, stale/interrupted, summary) + source assertions (HeaderActions có component, không khôi phục `/settings`).

---

## 5. Phương án đã cân nhắc
### Phương án A: Widget header dạng `<details>` (chọn)
Ưu: ít file, không route mới, không đụng redux/router, tận dụng helper có sẵn, test thuần được. Nhược: panel nhỏ, không xem lịch sử bằng giờ.

### Phương án B: Khôi phục trang `/settings`
Ưu: đầy đủ chi tiết. Nhược: user đã yêu cầu gỡ route này; vi phạm quyết định cũ → cần `Overrides:` và xác nhận riêng.

### Phương án C: Đưa strip lại trang `/`
Ưu: dễ thấy. Nhược: user đã yêu cầu gỡ card G khỏi Overview; lặp lại quyết định cũ.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 helper + 1 component + 3 file hiện có |
| Hiệu năng | 2 request khi mở panel (abortable) | Không poll nền, không thêm SSE |
| Bảo trì / Open-Closed | Tốt | Thêm widget vào header, không đổi widget cũ |
| Độ tin cậy | Tăng | Trạng thái thật, `unknown` khi thiếu dữ liệu |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Header chật trên mobile | Trung bình | Thấp | Dùng `<details>` gọn, CSS ẩn nhãn phụ ở breakpoint nhỏ; reuse class cũ |
| `VITE_SSE_ENDPOINT` / env không ảnh hưởng | — | — | Widget chỉ gọi REST, không SSE (I1) |
| Dữ liệu `status` lạ từ BE | Thấp | Thấp | Helper mặc định `unknown`, không crash |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-22-terminal-status-panel-thien.md`
- **Code test tự động (offline):** `apps/web/tests/terminal-status.test.ts` *(mới — helper thuần + source assertions)*; giữ nguyên `header-global.test.ts`, `theme.test.ts`.
- **Cách kiểm chứng:** `cd apps/web && pnpm test && pnpm build`; `python3 scripts/notes_index.py --check`.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-22
Comments: Người dùng (`thien`) xác nhận "có" để bắt đầu proposal 4 theo thứ tự đã ghi trong `docs/task/fe-be-integration-ready.md` mục 4. Giới hạn §3 — chỉ widget header, không khôi phục `/settings` hay strip Overview (đã gỡ theo yêu cầu trước).
Scope of Rejection: -

---

## 10. Next Action
`build-implementation` — tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, code FE, validation, dừng CHECKPOINT 1, ghi kết quả vào cuối `docs/task/fe-be-integration-ready.md` mục 4.
