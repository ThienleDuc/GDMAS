# Danh sách Task & Hiện trạng — Lê Đức Thiện (`thien` / `ThienleDuc`)

Vai trò: Frontend Developer & Techlead (Terminal 7 — `apps/web/`, cổng `3000`).

Phạm vi: SPA React + TypeScript + Vite theo design system `apps/web/src/styles/globals.css`, tiêu thụ **duy nhất** Database API (T6), trực quan hóa 6 Patterns chuỗi thời gian, bản đồ GIS, luồng SSE, Dark Mode và đáp ứng Kịch bản Demo 6 bước từ dữ liệu thật.

> **Cập nhật 2026-11-21:** đối chiếu toàn bộ proposal có đuôi `-thien` trong `.agents/notes/proposed/`. Các task cũ bản 2026-11-20 (T7.01–T7.14 dạng "cần xây lại / chưa bắt đầu") đã **được thay bằng trạng thái hoàn thành + hạng mục còn lại**. Route `/reports` và `/settings` đã bị gỡ theo proposal `2026-11-21-header-country-clock-refresh-thien` — không còn là task của T7.

---

## 0. Căn cứ đối chiếu & mô hình 7 Terminals

### 0.1. Tài liệu nguồn

| Tài liệu | Mục sử dụng |
|---|---|
| `docs/api/API.md` | §2 envelope; §3.1 health/system-status; §3.2 earthquakes/statistics; §3.3 6 patterns; §3.4 clusters; §3.5 SSE; §4 mã lỗi |
| `docs/architecture/SAD.md` | §3.3 phân bổ 7 Terminals; §4 đặc tả khối; §5 bảng 6 Patterns; §7 chịu lỗi |
| `docs/architecture/ERD.md` | Các bảng nguồn (earthquake_events, analysis_results, clustering_results, prediction_results, classification_results, service_runs) |
| `docs/architecture.md` | §6.6 trách nhiệm T7; §9.4 kiểm soát dữ liệu cũ; §12 cấu trúc FE |
| `docs/yeucaubatbuoc.md` | §2 6 Patterns; §3.1 Dark Mode/Zoom/Filter; §4 Demo 6 bước; §5 thang điểm |
| `docs/guides/design/style-guide.md` | Light-first + Dark Mode (`.dark`), Dashboard Grid 12 cột, KPI 4 cột, Bento cho Overview |
| `.agents/notes/proposed/*-thien.md` | **Nguồn sự thật duy nhất** cho tiến độ T7 |
| `docs/task/{son,van,tai}.md` | Ranh giới T2/T3 (Sơn), T1/T4 (Văn), T5/T6 (Tài) |

### 0.2. Ma trận 7 Terminals ↔ Frontend hiện tại

| Terminal | Chủ sở hữu | Tần suất | Dữ liệu FE tiêu thụ | Hạng mục T7 tương ứng |
|---|---|---|---|---|
| **T1** | PostgreSQL 16 — `van` | Luôn chạy | Gián tiếp (`/system/status`), kịch bản xóa rỗng/phục hồi | Demo 6 bước (chưa kiểm chứng) |
| **T2** | Data Ingestion — `son` | 5 phút | `/earthquakes`, SSE `earthquake_detected` / `ingestion_cycle_completed` | Catalog, Bản đồ, Header countdown, Overview live feed |
| **T3** | Data Analysis — `son` | 5 phút | `/analysis/temporal`, `/trend`, `/seasonality`, `/correlation`, `/patterns` | 6 Patterns (`/statistics`), Overview chart A & D |
| **T4** | Clustering — `van` | 1 ngày | `/clusters` (fallback `clustering_summary`) | Bản đồ layer cụm, bảng xếp hạng Overview |
| **T5** | Prediction — `tai` | 5 phút | `/predictions`, `/classifications` | Panel Pattern 5/6, Overview card F |
| **T6** | FastAPI REST + SSE — `tai` | Luôn chạy (`:8000`) | Mọi endpoint + envelope + SSE | Hợp đồng services, shell SSE, `unavailable` handling |
| **T7** | Frontend — `thien` | Luôn chạy (`:3000`) | `apps/web/` — shell, 4 trang, theme, test | Toàn bộ proposal `-thien` |

**Nguyên tắc cứng:** T7 **không** truy cập PostgreSQL, không gọi USGS, không gọi trực tiếp worker T2–T5. Mọi dữ liệu đi qua T6. Khi T6 trả 404/503 → `getOptionalApi()` → `unavailable: true`, hiển thị Empty State; **tuyệt đối không thay bằng mock tĩnh** (`contracts/README.md` §3.8, I5).

### 0.3. Quy ước chung (I1–I7)

- **I1:** T7 chỉ giao tiếp T6; một kết nối SSE duy nhất tại shell (`SseMarkersProvider`).
- **I2 / RULE-03:** mở rộng bằng file/component mới; giữ chữ ký `useSSE(endpoint?)`, `fetchApi`, barrel `contracts/`/`lib/`.
- **I3:** timestamp UTC ISO 8601 `Z` (`lib/formatters.ts` → `toUtcIso`, `isUtcIso`); tọa độ WGS84 (`isWgs84`, `formatWgs84Point`). Quy đổi giờ chỉ ở tầng hiển thị (`utils/timezone.ts`, 2 chế độ UTC / UTC+7).
- **I4:** không đụng migration Alembic.
- **I5:** token `globals.css`, Light-first + Dark Mode (`.dark`), đủ 3 trạng thái Loading/Error/Empty; biểu đồ mới đặt trong `components/charts/`; không hardcode số liệu.
- **I6:** không commit `.env`/secret.
- **I7:** test offline 100% (mock fetch/EventSource), kèm `.agents/notes/testcase/<id>.md` khi có logic mới.
- **Đường dẫn nền tảng:** `app/App.tsx` + `app/routes.tsx` (**4 route**), `layouts/DashboardLayout.tsx`, `styles/index.css` (chỉ import), `contracts/index.ts`, `lib/index.ts`, `services/earthquake-api.ts`.

---

## 1. Trạng thái hoàn thành (theo proposal `-thien`)

| Proposal | Hạng mục đã giao | Bằng chứng |
|---|---|---|
| `2026-11-17-ui-component-styles-thien` | Design system `globals.css`, CSS tập trung (đã bị supersede bởi restructure) | `tests/layout-styles.test.ts` |
| `2026-11-20-fe-restructure-globals-css-thien` | Nền tảng FE: 1 layout, contracts/lib tái thiết | PR #26; `tests/lib-redesign.test.ts` |
| `2026-11-20-fe-t6-contract-services-audit-thien` | Kiểm chứng 11 module contracts + lớp services | `tests/services.test.ts`, `tests/contract-mocks.test.ts`, `tests/sse-api.test.ts` |
| `2026-11-21-api-docs-contract-sync-thien` | Đồng bộ `docs/api/API.md` với implementation | `scripts/tests/test_api_docs_contracts.py` |
| `2026-11-21-layout-aside-hover-thien` | Aside rail 4 mục + breadcrumb (đã bị supersede phần nav bởi header proposal) | `tests/layout-navigation.test.ts` |
| `2026-11-21-header-country-clock-refresh-thien` | Header: lọc quốc gia theo cụm, chip ngữ cảnh, đồng hồ UTC/UTC+7, countdown 5 phút → reconnect SSE + toast; **gỡ `/reports`, `/settings`** | PR #46; `tests/header-global.test.ts` |
| `2026-11-21-darkmode-toggle-thien` | Dark Mode bằng token `.dark` + nút SVG toggle sau đồng hồ | PR #48; `tests/theme-toggle.test.ts` |
| `2026-11-20-earthquakes-catalog-filter-thien`, `2026-11-20-earthquakes-mock-pagination-histogram-thien` | Trang `/earthquakes`: lọc thời gian/độ lớn, phân trang, histogram, lọc quốc gia | `tests/earthquakes-page.test.ts`, `tests/mock-earthquakes.test.ts` |
| `2026-11-21-monitoring-leaflet-map-markers-thien` | Trang `/monitoring`: marker WGS84, popup, filter quốc gia/khu vực | PR #? (notes ID above); `tests/monitoring-map.test.ts`, `tests/region-filter.test.ts` |
| `2026-11-21-statistics-six-patterns-charts-thien` | Trang `/statistics`: 6 Patterns chuỗi thời gian | `tests/statistics-view.test.ts`, `tests/pattern-nav.test.ts` |
| `2026-11-21-overview-dashboard-thien` | Trang `/` thay placeholder: 4 chart so sánh, bảng xếp hạng, live feed, dự báo t+1 | PR #50; `tests/overview-view.test.ts`, `tests/overview-page.test.ts` |
| `2026-11-17-fe-contract-mock-tests-thien` | Bộ mock/offline FE theo contracts | `tests/contract-mocks.test.ts`, `tests/dev-mock.test.ts` |
| `2026-11-18-workflow-checkpoints-thien` | 2 checkpoint commit/push & merge trong workflow | `scripts/tests/test_workflow_checkpoints.py` |
| `2026-11-16-fe-contract-gis-reports-thien`, `2026-11-16-six-patterns-chart-components-thien`, `2026-11-20-fe-task-thien-7-terminals-thien` | Các proposal nền/tiền nhiệm (đã supersede hoặc là doc task bản cũ) | Xem `Overrides:` trong notes |

**Fast-Track sau khi duyệt (không proposal):** PR #52 — đưa toast SSE xuống giữa dưới 1 dòng; nhãn Cao/Trung bình/Thấp bỏ nền chữ đậm có màu trên cả 2 bảng Overview; animation grow cho `eq-country-chart__bars`; bỏ `ov-global-note`.

---

## 2. Hiện trạng Frontend

- **4 route:** `/` (Tổng quan), `/monitoring` (Bản đồ Giám sát), `/earthquakes` (Danh mục Động đất), `/statistics` (6 nhóm phân tích). Route lạ → redirect `/`.
- **Shell:** aside rail 4 icon + breadcrumb tiếng Việt; header bên phải có lọc quốc gia, chip ngữ cảnh, countdown 5 phút, đồng hồ UTC/UTC+7, nút Dark Mode.
- **Trang:**
  - `features/overview/` — Bento dashboard, 4 biểu đồ (`Overview*Chart`), xếp hạng quốc gia/khu vực, live feed, dự báo t+1.
  - `features/earthquakes/` — bảng sự kiện, filter, phân pagin, histogram, country cluster chart.
  - `features/monitoring/` — bản đồ Leaflet + panel quốc gia/khu vực.
  - `features/statistics/` — 6 patterns + Expert Insights.
- **Chất lượng:** `cd apps/web && pnpm test` → **173/173 pass**; `pnpm build` PASS (main chunk ~419 kB nhờ lazy-load `OverviewPage`/`StatisticsRoutes`); `notes_index.py --check` OK.
- **Theme:** Light-first, toggle lưu `localStorage` (`gdmas_theme_mode`), system preference được tôn trọng khi chưa có lựa chọn.

---

## 3. Hạng mục còn lại / rủi ro đã biết

| Hạng mục | Tình trạng | Ghi chú |
|---|---|---|
| **Kịch bản Demo 6 bước** (trước đây T7.13) | Chưa kiểm chứng end-to-end | Cần chạy với `son`/`van`/`tai`: xóa rỗng DB → SSE `database_cleared` → Empty State → re-run worker → dữ liệu tự cập nhật. Ghi log + ảnh màn hình cho báo cáo. |
| **BE `/clusters` chưa trả `dominant_place`** | Gap dữ liệu | Schema/contract đã có field; FE hiện gộp cụm không rõ địa danh thành "Khác" + chú thích. Khi BE bổ sung → bảng xếp hạng Overview chính xác hơn (không cần sửa UI). |
| **Panel khu vực bản đồ dùng mock** | `features/monitoring/mock-region-clusters.ts` | Cần thay `fetchRegionClusters()` bằng API thật khi có nguồn địa danh; hiện chỉ dùng cho panel lọc, không thay dữ liệu sự kiện thật. |
| **Kiểm tra trực quan mobile** | Chưa làm | Đã có breakpoint 1023px/767px ở layout và các page; cần rà soát thực tế trên thiết bị nhỏ. |
| **Drift tài liệu đã biết** | Không sửa trong đợt này | `docs/yeucaubatbuoc.md` §4 vẫn nhắc ảnh màn hình "Báo cáo & Cấu hình" (2 trang đã gỡ). Xử lý ở proposal riêng nếu cần. |

---

## 4. Nguyên tắc khi tiếp tục

1. Thay đổi **> 1 file** hoặc đổi logic/contract → `write-proposal` (ID đuôi `-thien`) → `build-implementation` → `review-pr` với 2 checkpoint; sửa **≤ 1 file** → Fast-Track.
2. Mỗi proposal `-thien` sau khi merge phải **cập nhật mục 1 của file này** trong cùng PR (kèm ID proposal + đường dẫn test).
3. Không khôi phục `/reports` hay `/settings` khi chưa có proposal mới phê duyệt rõ ràng.
4. Luôn chạy `cd apps/web && pnpm test && pnpm build` và `python3 scripts/notes_index.py --check` trước khi mở PR.

> Cụm tiếp tục workflow sau mỗi checkpoint: **`tiếp tục workflow`**.
