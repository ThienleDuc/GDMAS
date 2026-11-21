# Proposal: Trang Tổng quan (Home `/`) — Bento Dashboard từ dữ liệu API thật

## Metadata
- ID: 2026-11-21-overview-dashboard-thien
- Author: agent | thien
- Created: 2026-11-21
- Type: feature
- Status: approved
- Priority: medium
- Area: `apps/web/src/features/overview/` (mới), `apps/web/src/components/charts/OverviewTimeSeriesChart.tsx` (mới), `apps/web/src/app/App.tsx` (thay placeholder), `apps/web/tests/`
- Architecture Impact: none
  <!-- Chỉ đổi FE: thay PlaceholderPage bằng page thật, dùng contract/endpoint có sẵn. Không đổi contracts/, docs/api/API.md, endpoint, payload hay DB. -->
- Related Docs:
  - docs/guides/design/style-guide.md §9.1–9.3 (Dashboard Grid 12 cột, KPI 4 cột, Bento cho Overview), §12.2 (KPI Card)
  - docs/yeucaubatbuoc.md §2 (6 patterns), §3.1 (Dark Mode/Zoom/Filter), §4 (Demo 6 bước)
  - docs/task/thien.md T7.01–T7.10 (nền tảng, contract, danh mục, bản đồ, SSE shell)
- Related Proposals:
  - .agents/notes/proposed/2026-11-21-header-country-clock-refresh-thien.md — nguồn lọc quốc gia toàn cục `?country=`; proposal này tái dùng, không tạo state riêng.
  - .agents/notes/proposed/2026-11-21-monitoring-leaflet-map-markers-thien.md — helper `groupClustersByCountry`/`countryFromPlace` suy quốc gia từ `place`; tái dùng.
  - .agents/notes/proposed/2026-11-21-statistics-six-patterns-charts-thien.md — 6 biểu đồ Patterns nằm ở `/statistics`; trang tổng quan **không nhân bản**, chỉ link sang.
  - .agents/notes/proposed/2026-11-17-ui-component-styles-thien.md — style guide light-first + Bento; đã có Dark Mode (proposal `2026-11-21-darkmode-toggle-thien`).
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Route `/` hiện trỏ tới `PlaceholderPage title="Tổng quan"` ("Đang xây dựng…") trong `App.tsx`. Trong khi đó T7 đã có đầy đủ 3 trang sâu: `/earthquakes` (danh mục + lọc), `/monitoring` (bản đồ + SSE), `/statistics` (6 patterns), cùng hệ thống contracts/services/hooks (`getEarthquakeStatistics`, `getPredictions`, `getClassifications`, `getSystemStatusOptional`, `useSSE`, `useCatalogSelection`).

### Vấn đề
Điểm vào mặc định của ứng dụng đang trống — người dùng/demo không có cái nhìn tức thời về "hệ thống đang thế nào", và phải biết route để tìm dữ liệu.

### Ảnh hưởng
Trang tổng quan là màn hình đầu tiên trong Demo; cần tóm tắt được 4 câu hỏi: **có bao nhiêu động đất, đang ở đâu, dự báo t+1 ra sao, các Terminal có khoẻ không** — mà không nhân bản logic của 3 trang sâu.

---

## 2. Hiện trạng
| Thành phần | Có sẵn |
|---|---|
| Route `/` | `PlaceholderPage` trong `App.tsx` |
| `useEarthquakeInsights(interval)` | Đã gộp `statistics` + `temporal` + `clusters`, xử lý 404 → `unavailable` |
| `getPredictions()` / `getClassifications()` | Pattern 5 (số trận t+1) / Pattern 6 (mức rủi ro t+1) — contract có sẵn |
| `getSystemStatusOptional()`, `evaluateServiceFreshness` | 7 Terminals + ngưỡng stale 15p / interrupted 60p |
| `getEarthquakes({limit:5, sort_by:"event_time", order:"desc"})` | Sự kiện mới nhất |
| `useSSE()` / `SseMarkersProvider` | SSE shell; có thể lấy sự kiện realtime cho live feed |
| `groupClustersByCountry()` | Gom cụm theo quốc gia từ `dominant_place` |
| Style guide | 12-col grid, KPI 4 cột, **Bento ưu tiên cho Dashboard Overview**, Dark Mode token |

---

## 3. Mục tiêu
- **Mục tiêu:** Thay placeholder bằng trang tổng quan dạng **Bento grid**, gồm:
  1. **KPI row (4 thẻ × 3 cột):** Tổng sự kiện · Số lượng 24h gần đây · Độ lớn cao nhất · Số cụm DBSCAN. Mỗi thẻ có nhãn, giá trị từ API, phụ đề ngữ nghĩa (vd. "Trung bình M4.2") — **không tạo delta/giả định so sánh** khi API không có số liệu trước đó.
  2. **Bento chính (12 cột) — mỗi biểu đồ trả lời đúng 1 câu hỏi, không chart trang trí:**
     - `8/col` — **A. Xu hướng: thực tế vs đường xu hướng** (14/30 ngày). Line chart 2 series từ `/analysis/trend` (`series[].actual_value` vs `series[].trend_value`), phụ đề `trend_direction` + `r_squared`. Câu hỏi: *"Số động đất đang tăng hay giảm, mức độ tin cậy thế nào?"*. Dùng `buildTrendSeries()` — giữ `trend_value = null` (không thay bằng 0); điểm `is_complete = false` vẽ đứt nét. **Thay cho bản sparkline 24h đề xuất ban đầu** vì chỉ vẽ số liệu thì không trả lời được câu hỏi so sánh.
     - `4/col` — **B. Cơ cấu độ lớn**: thanh xếp chồng từ `statistics.data.{minor_events_count, moderate_events_count, strong_events_count}`. Câu hỏi: *"Trong tổng số sự kiện, bao nhiêu là sự kiện mạnh?"*. **Không cần request mới**; nếu thiếu `minor_events_count` thì chỉ hiển thị phần biết rõ + chú thích — không tự tính phần dư (không bịa số).
     - `6/col` — **C. Top 5 điểm nóng** (kèm bảng xếp hạng): horizontal bar + bảng 4 cột từ `groupClustersByCountry()` (chưa chọn quốc gia) hoặc `rankRegionsForCountry()` (đã chọn quốc gia → xếp hạng khu vực). Câu hỏi: *"Động đất tập trung ở đâu?"*. Click → set `?country=`/`?region=` rồi sang `/monitoring`. **Lưu ý contract:** BE `/clusters` hiện chưa trả `dominant_place` dù schema cho phép → cần chọn phương án dữ liệu ở câu hỏi §10.
     - `6/col` — **D. Khung giờ cao điểm**: bar từ `seasonality.components.seasonal_line[].seasonal_factor`, đường baseline ở **1.0 = mức trung bình**. Câu hỏi: *"Khung giờ nào hoạt động cao hơn bình thường?"*. `status = insufficient_data` hoặc mảng rỗng → empty state, không bịa.
     - `8/col` — **E. Sự kiện gần đây**: 5 bản ghi mới nhất (UTC + WGS84 + độ lớn), REST làm nền + SSE cập nhật; click → `/earthquakes`.
     - `4/col` — **F. Dự báo t+1**: `predictions.predicted_value` + khoảng tin cậy + nhãn rủi ro chuẩn hoá; kèm chú thích *"dự báo cho ngày kế tiếp"* — **không so sánh trực tiếp với số 24h thực tế** (khác cửa sổ thời gian → so sánh sai ý nghĩa).
     - `12/col` — **G. Tình trạng 7 Terminals**: strip ngang chấm trạng thái dùng `evaluateServiceFreshness`; **không link tới `/settings`** (trang đã bị gỡ).
  3. **Hero band (12 cột):** tiêu đề, ngày hiện tại (theo chế độ UTC/UTC+7 đã chọn ở header), chip ngữ cảnh quốc gia, 2 CTA "Bản đồ trực tiếp" / "6 nhóm phân tích".
  4. **Trạng thái dữ liệu:** Loading skeleton, Empty state khi DB rỗng/API 404, Error state khi lỗi — **không fallback mock** (I5). Khi bộ lọc quốc gia đang active, hiển thị nhãn "Số liệu tổng hợp toàn cục" trên các KPI vì endpoint statistics không nhận param country (I3, trung thực).
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không xây lại `/monitoring`, `/earthquakes`, `/statistics`; không nhân bản 6 biểu đồ Patterns.
  - Không đổi endpoint/contract/schema/DB; không thêm dependency (Recharts đã có).
  - Không sửa aside/header, docs, `AGENTS.md`, `.env*`, migration.

---

## 4. Giải pháp đề xuất
### 4.1. Cấu trúc tệp mới
| Tệp | Trách nhiệm |
|---|---|
| `features/overview/OverviewPage.tsx` | Shell page: hero + KPI grid + Bento grid, dùng hook/pure view model |
| `features/overview/overview-view.ts` | Hàm thuần: `buildKpis`, `buildSeverityMix`, `rankRegionsForCountry`, `buildTrendComparison`, `buildSeasonalityBars`, `buildLatestEvents`, `formatPrediction` — không React/DOM/network, mọi mốc UTC |
| `features/overview/useOverviewData.ts` | Gọi `useEarthquakeInsights("day")` + `getTrendAnalysis`/`getSeasonalityAnalysis`/`getPredictions`/`getClassifications`/`getSystemStatusOptional`/`getEarthquakes` bằng `Promise.allSettled`, 404-tolerant, abortable |
| `features/overview/OverviewPage.css` | Grid 12/6/1 cột, KPI/Bento card, skeleton/empty/error, Dark Mode bằng token |
| `components/charts/OverviewTrendChart.tsx`, `OverviewSeverityChart.tsx`, `OverviewHotspotsChart.tsx`, `OverviewSeasonalityChart.tsx` | 4 component Recharts mỏng, chỉ nhận view model từ `overview-view.ts` — đặt trong `charts/` theo I5 |

`App.tsx`: thay `element={<PlaceholderPage title="Tổng quan" />}` bằng `<OverviewPage />` (giữ `PlaceholderPage` cho Suspense nếu cần).

### 4.2. Dùng chung (không tạo nguồn sự thật mới)
- Lọc quốc gia: đọc `useCatalogSelection()` như header; set country → navigate `/monitoring?country=...`.
- SSE: đọc từ `SseMarkersProvider` của shell (không mở EventSource thứ 2).
- Timezone: `formatEventTime` / `formatClockTime` từ `utils/timezone.ts`.
- Freshness: `evaluateServiceFreshness` từ `lib/transforms/settings-data.ts`.

### 4.3. Tuân thủ I1–I7
T7 shell, không worker (I1) · thêm tệp, giữ chữ ký cũ (I2) · UTC `Z`, WGS84, không payload mới (I3) · không migration (I4) · chart mới trong `charts/`, Dark Mode token, không mock (I5) · không secret (I6) · test offline (I7).

---

## 5. Phương án đã cân nhắc
### A: Trang tổng quan tĩnh (thông tin chào + link)
Ưu: làm nhanh; nhược: vô dụng với Demo, không thể hiện dữ liệu thật. **Không chọn.**
### B: Bento Dashboard như §3 (khuyến nghị)
Ưu: trả lời 4 câu hỏi nghiệp vụ ngay màn hình đầu, tận dụng hook/contract có sẵn, link sang 3 trang sâu. Nhược: 5 widget + 1 chart → khối lượng vừa phải. **Chọn.**
### C: Nhúng toàn bộ 6 Patterns lên trang tổng quan
Ưu: đầy đủ; nhược: nhân bản `/statistics`, quá tải, vi phạm I5 (chart mới ngoài `charts/`) và làm demo loãng. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình–cao hơn bản đầu — 4 chart + bảng xếp hạng + 6 widget, nhưng logic nằm hết ở hàm thuần nên vẫn test được offline | Pure helpers tách riêng; component chỉ vẽ |
| Hiệu năng | ~7 request khi mount (`Promise.allSettled`, abortable): statistics/temporal/clusters + trend + seasonality + predictions/classifications + system/status + 5 sự kiện | Đều là endpoint có sẵn, 404-tolerant; có thể gom trend/seasonality qua `/patterns` nếu cần tối ưu |
| Bảo trì | Tốt — view model thuần, component mỏng | I2 |
| Độ tin cậy | Tốt — 404/DB rỗng → empty state thật, không số giả | I5 |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Endpoint `/predictions` / `/classifications` / `/system/status` chưa có dữ liệu | Trung bình | Trung bình | `Promise.allSettled` + `unavailable[]` → hiển thị "Chưa có dữ liệu", không crash, không mock |
| Bộ lọc quốc gia nhưng KPI thống kê vẫn toàn cục | Cao | Trung bình | Hiện nhãn "Số liệu toàn cục"; chỉ lọc client-side danh sách cụm/sự kiện |
| `/analysis/trend` hoặc `/analysis/seasonality` trả `status = insufficient_data` | Cao khi DB mới | Trung bình | Empty state riêng cho từng chart ("Chưa đủ dữ liệu để so sánh"), không vẽ đường giả, không làm chết các widget khác |
| BE `/clusters` chưa trả `dominant_place` → xếp hạng quốc gia sai nhãn | Cao | Trung bình | Chọn phương án dữ liệu ở §10; nếu giữ FE-only thì gộp nhãn không xác định được thành "Khác" + chú thích |
| Quá nhiều chart gây nhiễu | Trung bình | Trung bình | Mỗi chart có 1 câu hỏi + 1 insight text ngắn dưới tiêu đề; bỏ chart nào người dùng không chọn ở §10 |
| Bento vỡ trên tablet | Thấp | Thấp | Breakpoint 1023px → 6 cột, 767px → 1 cột theo style guide |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời khi §9 Approved:** `.agents/notes/testcase/2026-11-21-overview-dashboard-thien.md` *(copy `_TEMPLATE.md`, `Mode: proposal-paired`)*
- **Code test offline:**
  - `apps/web/tests/overview-view.test.ts` *(mới — KPI, `buildSeverityMix` từ fixture minor/moderate/strong, `rankRegionsForCountry` theo `regionFromPlace`, `buildTrendComparison` giữ `trend_value = null` và `is_complete = false`, `buildSeasonalityBars` baseline 1.0, latest events sort UTC, prediction format, empty/insufficient → không bịa số)*
  - `apps/web/tests/overview-page.test.ts` *(tĩnh: App.tsx dùng `<OverviewPage`; 4 chart + bảng xếp hạng + live feed + status strip có mặt; grid token/Dark Mode)*
- **Lệnh:** `cd apps/web && pnpm test`, `pnpm build`, `python3 scripts/notes_index.py --check`

---

## 9. Human Review
Decision: Approved   <!-- bất kỳ thành viên nào trong team.md đều duyệt được; không cần ThienleDuc -->
Reviewer: thien
Review Date: 2026-11-21
Comments: Xác nhận rõ trong chat 2026-11-21: "được, duyệt". Không có chỉnh sửa thêm → áp dụng các lựa chọn mặc định đã nêu ở §10: giữ cả 4 biểu đồ A–D + bảng xếp hạng; nguồn ranking FE-only từ /clusters, gộp nhãn không xác định được thành "Khác" (không sửa BE); giữ chart D "Khung giờ cao điểm"; chart A dùng 14 ngày. Duyệt bởi thành viên đang thao tác (`thien`) — không cần `ThienleDuc`.
Scope of Rejection: -

---

## 10. Next Action
Chờ bạn chọn/confirm §9. Sau `Approved`, agent chạy `build-implementation` trên nhánh đã tạo `feat/2026-11-21-overview-dashboard-thien`: tạo đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`, triển khai theo §4, validation xanh rồi dừng **CHECKPOINT 1**.

> **Gợi ý ý tưởng để bạn chọn (trả lời 1 lần khi duyệt §9):**
> 1. **Duyệt §9** với bộ 4 biểu đồ A–D + bảng xếp hạng + live feed + status strip như §3 không? Muốn bỏ chart nào thì nói rõ (mặc định giữ cả 4 — mỗi chart có câu hỏi riêng, không chart trang trí).
> 2. **Nguồn dữ liệu cho bảng xếp hạng C:** (a) FE-only từ `/clusters`, gộp nhãn không xác định được thành "Khác" khi BE chưa trả `dominant_place` *(mặc định)*, hay (b) cho phép thêm 1 dòng BE trả `dominant_place` (contract/schema đã có sẵn, không migration)?
> 3. **Chart D (khung giờ cao điểm)** dùng `/analysis/seasonality` — có giữ không, hay thay bằng biểu đồ **độ sâu vs độ lớn** từ `temporal.scatter_plot` (thiên về khám phá, ít "giá trị hành động" hơn)?
> 4. **Số ngày của chart A:** 14 ngày *(mặc định, dễ đọc)* hay 30 ngày?
