# Proposal: Gọn điều hướng aside và bổ sung Header toàn cục (lọc quốc gia theo cụm, đồng hồ UTC/UTC+7, nhãn chu kỳ 5 phút)

## Metadata
- ID: 2026-11-21-header-country-clock-refresh-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: refactor
- Status: approved   <!-- proposed | changes_requested | approved | rejected (khớp với Decision ở §9) -->
- Priority: medium
- Area: `apps/web/src/layouts/{navigation.ts,DashboardLayout.tsx,layout.css}` (sửa), `apps/web/src/layouts/header/` (mới), `apps/web/src/utils/timezone.ts` (bổ sung hàm thuần), `apps/web/src/app/{App.tsx,routes.tsx}` (sửa), `apps/web/tests/` (sửa + mới)
- Architecture Impact: none
  <!-- Chỉ đổi giao diện FE: shell, widget header, route/nav. Không đổi contracts/, docs/api/API.md, docs/task/thien.md, docs/yeucaubatbuoc.md hay apps/api/**. Theo chỉ thị người dùng 2026-11-21 "hiện tại làm cho mỗi giao diện FE, không đụng đến vấn đề khác": drift tài liệu (T7.11/T7.12, ảnh Demo) được ghi nhận nhưng xử lý ở proposal riêng. -->
- Related Docs:
  - docs/task/thien.md — T7.01 (shell), T7.03/T7.04 (đã có lọc quốc gia/khu vực); T7.11/T7.12 **giữ nguyên** (drift ngoài scope)
  - docs/yeucaubatbuoc.md — §3.1 (Dark Mode/Zoom/Filter), §4 (Demo 6 bước) — giữ nguyên ngoài scope
  - docs/architecture.md §12 (cấu trúc FE), docs/quyuocchung.md, docs/coding-rules.md
  - .agents/notes/proposed/2026-11-21-layout-aside-hover-thien.md — nguồn cấu hình 6 mục aside
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-layout-aside-hover-thien.md — thiết lập aside rail 6 mục + breadcrumb; proposal này chỉ gỡ 2 mục, giữ nguyên hành vi rail/hover.
  - .agents/notes/proposed/2026-11-20-fe-task-thien-7-terminals-thien.md — T7.11/T7.12 vẫn nằm trong task doc dù page chỉ là placeholder.
  - .agents/notes/proposed/2026-11-21-monitoring-leaflet-map-markers-thien.md — chuẩn `?country=&region=` làm nguồn sự thật chung cho 2 trang; proposal này tái dùng cơ chế đó ở header.
  - .agents/notes/proposed/2026-11-16-fe-contract-gis-reports-thien.md — đã bị override, không khôi phục lại ReportsPage/SettingsPage.
  - .agents/notes/proposed/2026-11-20-fe-task-thien-7-terminals-thien.md — **giữ nguyên** task doc theo chỉ thị "chỉ làm FE"; T7.11/T7.12 vẫn nằm đó, drift không xử lý ở proposal này.
  - Overrides: 2026-11-21-layout-aside-hover-thien — **chỉ riêng quyết định "aside có 6 mục điều hướng"**; mọi quyết định khác (rail cố định, hover card, breadcrumb, vùng nội dung rộng) giữ nguyên.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Shell FE (T7) hiện là một `DashboardLayout` duy nhất. `apps/web/src/layouts/navigation.ts` khai báo 6 mục `NAV_META`; aside render 6 icon rail. Trong đó `/reports` ("Báo cáo & Xuất bản") và `/settings` ("Cấu hình Hệ thống") chỉ trỏ tới `PlaceholderPage` với chữ "Đang xây dựng…" (`apps/web/src/app/App.tsx`), không có logic, không có API, không được ai sử dụng. Ở chiều ngược lại, `<div className="layout__header-actions" />` đang **trống** — header chỉ có breadcrumb.

Dữ liệu để lọc quốc gia đã có sẵn nhưng nằm rời rạc: `useCatalogSelection` (`?country=&region=`) mới chỉ được `/earthquakes` và `/monitoring` dùng; `groupClustersByCountry` / `countryFromPlace` là helper thuần suy quốc gia từ cụm DBSCAN; `getStoredTimezone` / `setStoredTimezone` / `formatEventTime` / `getRelativeTime` đã có trong `utils/timezone.ts`; `useSSE` đã expose `lastEventTime` ở shell.

### Vấn đề
1. Hai mục nav vô dụng chiếm diện tích rail, tạo kỳ vọng sai (task doc T7.11/T7.12 vẫn hứa xây trang), và làm breadcrumb trả nhãn cho route không tồn tại thật.
2. Bộ lọc quốc gia chỉ có ở 2 trang, không đồng nhất toàn cục; các trang còn lại (`/`, `/statistics`) không có điểm chọn/quan sát quốc gia dùng chung.
3. Chưa có đồng hồ realtime nào trên UI, dù hệ thống có chu kỳ cập nhật 5 phút và đã chuẩn hóa 2 chế độ UTC / UTC+7.
4. Không có nhãn báo chu kỳ cập nhật dữ liệu để người dùng biết dữ liệu đang ở trạng thái nào.

### Ảnh hưởng
- Đây là shell dùng chung của **mọi** route FE → thay đổi ảnh hưởng trực tiếp T7 và khả năng demo của toàn hệ thống (I1: vẫn chỉ là FastAPI/SSE ở T6 + React ở T7, không nhúng worker).
- Phải tái dùng cơ chế URL + helper thuần có sẵn để không tạo "nguồn sự thật thứ 2" (I3), không fallback mock (I5) và giữ unit test offline 100% (I7).

---

## 2. Hiện trạng
| Tệp | Hiện trạng |
|---|---|
| `apps/web/src/layouts/navigation.ts` | `NAV_META` có 6 mục, gồm `/reports` (dòng 24) và `/settings` (dòng 25); `navMetaFor` / `routeLabel` suy từ mảng này. |
| `apps/web/src/layouts/DashboardLayout.tsx` | `NAV_ICONS` có 6 icon (trong đó `FileText`, `Settings`); header-actions rỗng; `sse = useSSE("/api/v1/stream/earthquakes")` đã có sẵn (`lastEventTime`). |
| `apps/web/src/app/App.tsx` | 2 route cuối trỏ `PlaceholderPage` "Đang xây dựng…". Route `*` đã `Navigate` về HOME. |
| `apps/web/src/app/routes.tsx` | `APP_ROUTES.REPORTS`, `APP_ROUTES.SETTINGS` chỉ được `App.tsx` tham chiếu (đã grep: không nơi khác dùng). |
| `apps/web/src/features/earthquakes/useCatalogSelection.ts` | Nguồn sự thật `?country=&region=`; đã dùng chung ở `/earthquakes` và `/monitoring`. |
| `apps/web/src/features/earthquakes/country-clusters.ts`, `region-filter.ts` | `groupClustersByCountry`, `countryFromPlace`, `regionFromPlace` — thuần, offline. |
| `apps/web/src/services/earthquake-api.ts` | `getClustersOptional()` trả `OptionalApiResult<ClustersResponse>`, xử lý 404 → `unavailable`. |
| `apps/web/src/utils/timezone.ts` | Đã có `TimezoneMode = "UTC" \| "UTC+7"`, `getStoredTimezone`, `setStoredTimezone`, `formatEventTime`, `getRelativeTime`. |
| `apps/web/tests/layout-navigation.test.ts` | TC-01/TC-02 khẳng định 6 route (cả reports/settings) — sẽ phải cập nhật. |

**Kiểm toán contracts (theo yêu cầu người dùng 2026-11-21):** **dùng được, không cần sửa contracts.**
- `contracts/schemas/clusters.json` — `data.clusters[]` có `dominant_place`, `cluster_id`, `event_count`, `avg_magnitude`, `max_magnitude` → đủ để `groupClustersByCountry` suy danh mục quốc gia theo cụm; `docs/api/API.md` §3.4 / `contracts/README.md` §3.4 đã mô tả.
- `contracts/schemas/earthquake.json` — field `place` là nguồn suy quốc gia/khu vực cho `Danh mục động đất` và `Bản đồ giám sát`.
- `apps/web/src/contracts/country-clusters.ts` — `CountryClusterSummary` đã khai báo rõ *"FE-only view model derived from ClustersResponse — no backend schema change"*.
- `contracts/README.md` §3.8 — ưu tiên `/api/v1/clusters`, 404 → fallback `/api/v1/patterns` → `clustering_summary`; **không** mock. Header tái dùng đúng quy tắc này.
→ Không thêm schema, không thêm endpoint, không đụng `contracts/`; `Architecture Impact: none`.

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Gỡ `/reports` và `/settings` khỏi aside nav, route registration và `APP_ROUTES`; URL cũ vẫn rơi vào route `*` → redirect về `/` (không 404, không link chết).
  2. Đưa vào `layout__header-actions` (phía tay phải) 3 widget dùng chung mọi trang: **bộ chọn quốc gia theo cụm từ API**, **đồng hồ realtime UTC / UTC+7**, **nhãn "Dữ liệu cập nhật mỗi 5 phút"** kèm thời điểm cập nhật gần nhất.
  3. Dùng `?country=&region=` làm nguồn sự thật duy nhất: **mọi giao diện FE** đều có bộ lọc quốc gia dùng chung ở header; trang đã có lọc riêng (`/earthquakes`, `/monitoring`) tự động đồng bộ, trang chưa có (`/`, `/statistics`) đọc cùng param và hiển thị ngữ cảnh lọc (xem §4.3).
  4. Giữ nguyên 7 bất biến I1–I7, đặc biệt I2 (thêm mới thay vì xóa helper cũ), I3 (UTC/WGS84), I5 (không mock), I7 (test offline).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không xây `ReportsPage` / `SettingsPage` thật, không khôi phục nội dung đã bị override của proposal `2026-11-16-fe-contract-gis-reports-thien`.
  - Không đổi `contracts/` — **đã kiểm toán và dùng được** (xem §2); không thêm endpoint `/countries`, không đụng `docs/api/API.md`, schema, DB hay `apps/api/**`.
  - Không đổi hành vi rail/hover/breadcrumb của aside, không đổi 6 patterns, không đổi Dark Mode token.
  - Không sửa `AGENTS.md`, `docs/quyuocchung.md`, `docs/task/thien.md`, `docs/yeucaubatbuoc.md`, migration Alembic, `.env*`.

---

## 4. Giải pháp đề xuất
### 4.1. Gọn aside (Task A)
- `navigation.ts`: xoá 2 entry `/reports`, `/settings` khỏi `NAV_META` → còn 4 mục. `navMetaFor` / `routeLabel` giữ nguyên chữ ký; route lạ trả `null` / `"Trang"` như cũ.
- `DashboardLayout.tsx`: bỏ import `FileText`, `Settings` và bỏ 2 phần tử cuối của `NAV_ICONS`; `NAV_ITEMS` vẫn map từ `NAV_META` nên index tự khớp (4 icon ↔ 4 mục).
- `App.tsx`: xoá 2 `<Route>` của `REPORTS`/`SETTINGS`; giữ `PlaceholderPage` cho HOME/Suspense. `routes.tsx`: xoá 2 key `REPORTS`/`SETTINGS` (đã xác nhận không còn reference). Route `*` hiện có sẵn lo redirect.

### 4.2. Widget Header (Task B) — tệp mới trong `apps/web/src/layouts/header/`
| Tệp mới | Trách nhiệm |
|---|---|
| `HeaderActions.tsx` | Container xếp 3 widget; nhận `lastEventTime` từ `sse` của shell (không mở kết nối SSE thứ 2). |
| `GlobalCountryFilter.tsx` | Combobox/select danh mục quốc gia; lấy danh sách qua `getClustersOptional()` → `groupClustersByCountry()` → sort theo `eventCount`; option "Tất cả" = `ALL_COUNTRIES`. Ghi chọn vào URL qua `useCatalogSelection().setCountry` (đồng bộ 2 trang cũ). Khi API `unavailable`/404 → hiển thị nhãn "Chưa có dữ liệu cụm", **không** thay bằng mock (I5). |
| `RealtimeClock.tsx` | `setInterval` 1s, cleanup ở `useEffect`; đọc/ghi chế độ bằng `getStoredTimezone`/`setStoredTimezone`; nút toggle `UTC` ⇄ `UTC+7`. Format qua hàm thuần mới `formatClockTime(now, mode)` bổ sung vào `utils/timezone.ts` (additive, không đổi chữ ký hàm cũ — I2). |
| `DataRefreshLabel.tsx` | Nhãn tĩnh "Dữ liệu cập nhật mỗi 5 phút" + `getRelativeTime(lastEventTime.toISOString())`; khi SSE chưa open → "Đang kết nối…" / "Chưa có dữ liệu", không bịa thời gian. Chu kỳ 5 phút lấy từ `TERMINAL_SPECS` (`lib/transforms/settings-data.ts`) thay vì hardcode chuỗi ở nhiều nơi. |
| `header-data.ts` | Hàm thuần `countriesFromClusters(payload)` / `refreshLabelFor(lastEventTime, now)` — không React/DOM/network, chạy offline trong `node:test`. |

CSS: bổ sung `.layout__header-actions` và các class con trong `apps/web/src/layouts/layout.css` (@layer components, dùng token `--space-*`, `--surface`, `--muted-foreground`), giữ responsive ở breakpoint 767px; **không** hardcode màu (Dark Mode theo I5).

### 4.3. Dùng chung toàn cục
- Quy ước: `?country=` là nguồn sự thật. Header ghi, các trang đọc.
- `/earthquakes`, `/monitoring`: đã dùng `useCatalogSelection` → tự động ăn lựa chọn từ header. Giữ nguyên filter bar/sidebar riêng của từng trang, không xóa (I2); **đồng bộ** giá trị ban đầu từ URL thay vì state riêng.
- `/` và `/statistics` (và mọi route FE khác): dùng chung `useCatalogSelection()` để đọc `country`, hiển thị chip ngữ cảnh "Đang xem: \<quốc gia\>" ngay dưới header (component dùng chung `HeaderFilterContext`). **Không** mở rộng params API, **không** tự cắt dữ liệu ở FE — chỉ đồng bộ ngữ cảnh lọc. Đây là phạm vi FE được người dùng xác nhận 2026-11-21; mọi thay đổi BE/contracts nếu cần sẽ là proposal riêng.

### 4.4. Tuân thủ RULE-03 / I1–I7
- **I1:** mọi thứ nằm ở T7 shell; không thêm worker/cron vào `main.py`; SSE vẫn là kết nối duy nhất do shell tạo.
- **I2:** giữ nguyên tên `NAV_ITEMS`, `navMetaFor`, `routeLabel`, `useCatalogSelection`, mọi hàm trong `timezone.ts`; chỉ **thêm** tệp/hàm. Không xóa helper lõi `country-clusters.ts`, `region-filter.ts`, `catalog-selection.ts`.
- **I3:** UTC mọi mốc thời gian; quốc gia/khu vực suy từ WGS84 `place` như hiện tại; không thêm payload mới.
- **I4:** không đụng migration.
- **I5:** danh mục quốc gia từ API thật (`/api/v1/clusters`); 404 → trạng thái unavailable; không mock.
- **I6:** không đụng `.env`/secret.
- **I7:** test thuần offline + cập nhật test cũ; không xóa test đang pass.

---

## 5. Phương án đã cân nhắc
### Phương án A: Giữ 2 route nhưng ẩn nav, thêm widget vào header
Ưu: ít sửa nhất; nhược: URL `/reports`, `/settings` vẫn tồn tại dưới dạng placeholder vô dụng, task doc T7.11/T7.12 vẫn "có route" nên tiếp tục gây hiểu nhầm. **Không chọn** — không triệt để yêu cầu "xóa chức năng không dùng".

### Phương án B: Xóa nav + xóa route registration + thêm 3 widget header, tái dùng URL `?country=` và helper thuần có sẵn
Ưu: nhất quán (một nguồn sự thật), tận dụng code đã test, không thêm dependency, dễ kiểm chứng offline, không đụng contracts/docs. Nhược: phải cập nhật vài test cũ và 5 tệp FE mới. **Chọn** — khớp yêu cầu và chi phí thấp.

### Phương án C: Thêm endpoint BE `/api/v1/countries` để trả danh mục quốc gia
Ưu: "sạch" về mặt API; nhược: đụng `contracts/`, `docs/api/API.md`, `apps/api/**`, migration có thể phát sinh, kéo dài timeline và vi phạm Out of Scope của proposal này. **Không chọn** — có thể dùng dữ liệu cụm có sẵn.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình — 4 mục nav thay vì 6, thêm 5 tệp FE nhỏ + 1 hàm thuần | Tách widget theo trách nhiệm giúp test offline từng phần |
| Hiệu năng | Tăng nhẹ: 1 `setInterval` 1s (clock) + 1 lần fetch `/clusters` khi mount header | Fetch đã có cache ở lớp service theo signal; có thể memo hóa ở `HeaderActions` |
| Bảo trì / Open-Closed | Tốt — thêm tệp mới, giữ chữ ký cũ; chỉ xóa 2 route/nav entry không còn ai dùng | I2: không phá helper đang được module khác gọi |
| Độ tin cậy | Tốt — 404/DB rỗng → unavailable, không mock; SSE mất → nhãn "Đang kết nối…" | I5 + I7 |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Chip ngữ cảnh quốc gia trên `/statistics` không đổi số liệu (API không có param country) | Trung bình | Thấp | Đã được chấp nhận trong phạm vi FE-only: chỉ hiển thị ngữ cảnh, không tự cắt dữ liệu; ghi rõ trong testcase |
| Người dùng vào URL cũ `/reports`, `/settings` thấy redirect về `/` và tưởng lỗi | Thấp | Thấp | Route `*` đã redirect sẵn; ghi chú trong Implementation Report |
| Xung đột font/layout header trên màn hình nhỏ (<768px) | Trung bình | Thấp | Dùng token có sẵn + breakpoint 767px hiện hữu; chạy `pnpm build` + kiểm tra CSS |
| `getStoredTimezone` dùng `localStorage` → node:test không có DOM | Cao (khi test) | Thấp | Test hàm thuần `formatClockTime` với `Date` cố định; mock `localStorage` trong test component nếu cần |
| Drift tài liệu: task doc vẫn liệt kê T7.11/T7.12 | Cao | Thấp | Người dùng đã chọn "không đụng vấn đề khác" — giữ nguyên docs, ghi nhận drift ở proposal này, xử lý ở proposal riêng |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-header-country-clock-refresh-thien.md` *(copy từ `.agents/notes/testcase/_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test tự động (offline):**
  - `apps/web/tests/header-global.test.ts` *(mới — `countriesFromClusters` từ fixture `/clusters`, `formatClockTime` UTC/UTC+7 với `Date` cố định, `refreshLabelFor` với `lastEventTime` giả, 404 → unavailable, không mock)*
  - `apps/web/tests/layout-navigation.test.ts` *(sửa TC-01/TC-02: 4 route, bỏ reports/settings, fallback "Trang" cho route cũ)*
  - `apps/web/tests/layout-styles.test.ts` *(bổ sung assertion CSS cho `.layout__header-actions`)*
- **Cách kiểm chứng:**
  - `cd apps/web && pnpm test` (node:test, giữ nguyên mọi test đang pass + test mới)
  - `cd apps/web && pnpm build` (`tsc -b && vite build` phải xanh)
  - Kiểm tra thủ công: aside còn 4 icon; `/reports` → redirect `/`; header có 3 widget; toggle đồng hồ đổi UTC ⇄ UTC+7; đổi quốc gia ở header làm `/earthquakes` và `/monitoring` cùng đổi theo URL; ngắt API `/clusters` → hiện "Chưa có dữ liệu cụm", không có số giả.
  - Lệnh chi tiết ghi trong `implemented/<id>/plan.md` và `testcase/<id>.md`.

---

## 9. Human Review
Decision: Approved   <!-- Pending | Changes Requested | Approved | Rejected — bất kỳ thành viên nào trong .agents/team.md (kể cả tác giả) đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: Xác nhận rõ trong chat 2026-11-21: "hiện tại làm cho mỗi giao diện FE, không đụng đến vấn đề khác" + "kiểm tra có contracts dùng được như Danh mục động đất hay Bản đồ giám sát không, không có thì sửa contracts". Kết quả kiểm toán: contracts hiện có đã đủ (clusters.json / earthquake.json / country-clusters.ts) → KHÔNG sửa contracts. Phạm vi: FE-only, bộ lọc quốc gia dùng chung trên mọi giao diện FE; KHÔNG sửa docs/task/thien.md, docs/yeucaubatbuoc.md, docs/api/API.md hay apps/api/**; KHÔNG mở rộng params API (chỉ chip ngữ cảnh). Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
§9 đã `Approved`. Agent chạy `build-implementation`: tạo **đồng thời** `implemented/2026-11-21-header-country-clock-refresh-thien/{plan.md,status.md}` và `testcase/2026-11-21-header-country-clock-refresh-thien.md`, rẽ nhánh `feat/2026-11-21-header-country-clock-refresh-thien` (Phần A `review-pr`), triển khai Task A → Task B → test → `pnpm build`, rồi dừng **CHECKPOINT 1** chờ lệnh `tiếp tục workflow`.
