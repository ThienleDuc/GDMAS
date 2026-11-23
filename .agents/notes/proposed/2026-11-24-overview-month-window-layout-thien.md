<!-- Template cho .agents/notes/proposed/yyyy-mm-dd-<slug>-<handle>.md — copy ra file mới, không sửa file này. -->

# Proposal: Overview — cửa sổ theo tháng, 1 biểu đồ chu kỳ tuần & sắp xếp lại 3 hàng card

## Metadata
- ID: 2026-11-24-overview-month-window-layout-thien
- Author: agent | thien
- Created: 2026-11-24
- Type: feature
- Status: approved
- Priority: medium
- Area: `apps/api/src/gdmas/core/config.py`, `apps/api/src/gdmas/services/analysis/{service,filtered}.py`, `apps/api/src/gdmas/api/routes/analysis.py`, `docker-compose.yml`, `apps/web/src/features/overview/`, `apps/web/src/services/`, `apps/web/tests/`
- Architecture Impact: none   <!-- Không đổi schema/contract field; đổi giá trị cấu hình cửa sổ + dùng query start_time/end_time đã có -->
- Related Docs:
  - docs/api/API.md
  - docs/coding-rules.md
- Related Proposals:
  - .agents/notes/proposed/2026-11-22-analysis-unsupported-query-params-thien.md   <!-- - Overrides: bỏ param seasonality không được BE hỗ trợ → nay BE hỗ trợ cửa sổ cho đường lọc -->
  - .agents/notes/proposed/2026-11-12-analysis-four-patterns-son.md   <!-- - Overrides: "cửa sổ mặc định 365 ngày" → 30 ngày cho analysis/data/clustering -->
  - .agents/notes/proposed/2026-11-23-overview-ranking-map-ux-thien.md
  - .agents/notes/proposed/2026-11-23-overview-severity-standard-thien.md
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Overview hiện lấy chu kỳ từ `GET /analysis/seasonality` **không truyền cửa sổ** → BE dùng `ANALYSIS_WINDOW_DAYS = 365`
(hàng năm). Trang vẽ **2 biểu đồ chu kỳ**: 7 ngày trong tuần + 12 tháng, và layout card rải theo span 8/4 rồi 12.

### Vấn đề (theo yêu cầu người dùng)
1. Cửa sổ phân tích phải **theo tháng** thay vì theo năm, và phải **nạp lại dữ liệu** khi đổi.
2. Giảm tải: chỉ giữ **1 biểu đồ chu kỳ theo tuần** (bỏ biểu đồ 12 tháng).
3. Sắp xếp lại card:
   - Hàng 1: **Xu hướng** + **Chu kỳ**
   - Hàng 2: **So sánh mức độ (thanh)** + **Dự báo ngày tiếp theo**
   - Hàng 3: **Động đất tập trung ở đâu?** + **Danh mục động đất gần đây**
   - Riêng card "Động đất tập trung ở đâu?": xếp **chart và bảng thành 2 hàng trong cùng cột** (thay vì 2 cột ngang như hiện tại).

### Ảnh hưởng
Số liệu chu kỳ đang phản ánh cả năm → không khớp khung Ngày/Tuần/Tháng đang chọn; 2 chart chu kỳ gây đọc trùng; layout chưa theo nhóm nghiệp vụ.

---

## 2. Hiện trạng
| Tệp | Hành vi |
|---|---|
| `useOverviewData.ts:210,215` | `getSeasonalityAnalysis(geoQuery(filter))` (không window); `getMonthlyPeaks(filter)` |
| `earthquake-api.ts::getSeasonalityAnalysis` | `buildQuery({...geoQuery(params), interval})` — **bỏ** `start_time`/`end_time` (theo quyết định cũ 2026-11-22) |
| `analysis.py::get_seasonality` | Đường lọc gọi `compute_filtered_metrics(... interval=interval)` — **không truyền start/end** |
| `filtered.py::compute_filtered_metrics` | Đã có tham số `start`/`end` → `load_filtered_events_df(... start, end)` (chưa được route dùng) |
| `OverviewPage.tsx` | `ov-card--8` trend, `ov-card--4` severity, `ov-card--wide` ranking, `ov-card--cycles` (2 chart), `ov-card--8` latest, `ov-card--4` forecast |
| `OverviewHotspotsChart.tsx:34` | `.ov-chart-row` gồm chart + bảng **2 cột ngang** |

---

## 3. Mục tiêu
- **Mục tiêu:**
  0. **BE:** đổi cửa sổ mặc định của **analysis / data / clustering từ 365 ngày (1 năm) xuống 30 ngày (1 tháng)** — `DATA_WINDOW_DAYS`, `ANALYSIS_WINDOW_DAYS`, `CLUSTERING_WINDOW_DAYS` trong `core/config.py` + `docker-compose.yml` + `analysis/service.py::DEFAULT_WINDOW_DAYS`. Ghi `Overrides:` cho quyết định 365 ngày cũ.
  1. FE truyền cửa sổ tháng (`start_time`/`end_time` từ `resolveWindow(range)`) tới `/analysis/seasonality` (đường lọc) → BE truyền tiếp vào `compute_filtered_metrics(start, end)`; đổi range → refetch.
  2. Bỏ biểu đồ 12 tháng: chỉ giữ 1 `OverviewSeasonalityChart` cho chu kỳ tuần; ngừng gọi `getMonthlyPeaks` (giảm tải phase 2).
  3. Layout 3 hàng như mô tả; card ranking đổi `.ov-chart-row` thành **2 hàng dọc** trong cột.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Không đổi schema/payload shape; không đổi thuật toán `seasonal_decompose`/factor.
  - Không đổi endpoint/contract khác (trend/statistics/country catalog), không migration/worker/SSE.
  - Không đổi Dark Mode token, 6 Patterns, header/aside, monitoring.
  - Không xoá test đang pass (I7); không commit/push/merge ở proposal này.

---

## 4. Giải pháp đề xuất
Tuân **RULE-03/I2**: giữ chữ ký hàm/props, thêm tham số optional. FE (I1), UTC ISO `Z` (I3), không mock (I5), test offline (I7).

### 4.0. Cửa sổ BE 1 tháng (yêu cầu bổ sung của người dùng)
- `core/config.py`: `DATA_WINDOW_DAYS = 30`, `ANALYSIS_WINDOW_DAYS = 30`, `CLUSTERING_WINDOW_DAYS = 30` — cập nhật comment `365 = 1 năm` → `30 = 1 tháng`.
- `docker-compose.yml`: 6 chỗ `${*_WINDOW_DAYS:-365}` → `:-30` (api/worker services).
- `analysis/service.py`: `DEFAULT_WINDOW_DAYS = 30`.
- `filtered.py` dùng `settings.ANALYSIS_WINDOW_DAYS` → tự động theo cấu hình mới; `clustering/service.py` dùng `settings.CLUSTERING_WINDOW_DAYS`; `ingestion/backfill.py` dùng `settings.DATA_WINDOW_DAYS`.
- Không đổi tên biến/mermaid config — env vẫn override được nếu cần.

### 4.1. Cửa sổ tháng (BE + FE)
- `analysis.py::get_seasonality`: thêm `start_time`/`end_time: str | None = Query(None)`; parse UTC (`_parse_utc` có sẵn); khi có filter truyền `start=`/`end=` vào `compute_filtered_metrics`.
- `earthquake-api.ts::getSeasonalityAnalysis`: đưa `start_time`/`end_time` vào `buildQuery` (cùng shape với `getTrendAnalysis` đã làm).
- `useOverviewData.ts`: `getSeasonalityAnalysis({ ...geoQuery(filter), ...window }, signal)`; bỏ `getMonthlyPeaks`.
- Range `day/week/month` hiện đã có `window` từ `resolveWindow(range)` — "theo tháng" nghĩa là dùng cửa sổ month mặc định khi không chọn range cụ thể; đổi range → effect deps `window.start_time/end_time` đã có → refetch.

### 4.2. Một biểu đồ chu kỳ
- `OverviewPage.tsx`: bỏ `monthlyBars` + instance thứ 2 của `OverviewSeasonalityChart`; giữ chu kỳ tuần (`seasonality`).
- `useOverviewData.ts`: bỏ `getMonthlyPeaks` khỏi Promise.allSettled + field `monthlyPeaks` khỏi state (giữ field optional nếu caller cũ dùng — I2).

### 4.3. Layout 3 hàng
- `OverviewPage.tsx` / `OverviewPage.css`:
  - Trend `ov-card--6`, Chu kỳ `ov-card--6` → hàng 1.
  - Severity `ov-card--6`, Forecast `ov-card--6` → hàng 2.
  - Ranking `ov-card--6`, Latest `ov-card--6` → hàng 3.
  - `.ov-card--wide` giữ alias cho caller cũ; thêm `.ov-card--6 { grid-column: span 6 }` (đã có).
  - `.ov-chart-row` trong ranking: `flex-direction: column` / `grid-template-columns: minmax(0,1fr)` → chart trên, bảng dưới (2 hàng trong cột). Giữ class cũ để không vỡ chỗ khác (I2).
  - Responsive: 6 cột tablet → span 6 vẫn là 1 card/hàng; mobile span 1.

### 4.4. Test (đồng thời khi §9 Approved — I7)
- BE: `apps/api/tests/unit/test_analysis_query_params.py` (hoặc file route tương ứng) — `/analysis/seasonality?country=X&start_time=...&end_time=...` trả đúng cửa sổ (data_points khác 365).
- FE: `apps/web/tests/overview-page.test.ts` — assert 3 hàng/6 card span, 1 `OverviewSeasonalityChart`, `.ov-chart-row` dọc, không còn `getMonthlyPeaks`; `overview-view.test.ts` giữ test cũ.
- Lệnh: BE `uv run python -m pytest <file>` + ruff; FE `pnpm build && pnpm test`; `notes_index.py --check`.

---

## 5. Phương án đã cân nhắc
### A: Chỉ đổi FE bỏ chart tháng, không truyền cửa sổ
Ưu: ít đổi. Nhược: chu kỳ vẫn tính trên 365 ngày — không đúng yêu cầu 1. **Không chọn.**

### B (chọn): BE nhận start/end cho đường lọc + FE truyền cửa sổ + layout 3 hàng
Ưu: đúng cửa sổ, một chart, layout rõ ràng, tận dụng tham số `start`/`end` có sẵn trong `compute_filtered_metrics`. Nhược: sửa 1 route BE + vài file FE. **Chọn.**

### C: Đổi `ANALYSIS_WINDOW_DAYS` toàn cục thành 30
Ưu: 1 dòng config. Nhược: ảnh hưởng mọi route phân tích, vượt phạm vi Overview. **Không chọn.**

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Trung bình | 1 route BE + 4 file FE + test 2 phía |
| Hiệu năng | Giảm | Bỏ 1 request monthly-peaks + 1 chart |
| Bảo trì / Open-Closed | Tốt | Tham số optional, class alias giữ cũ |
| Độ tin cậy | Tốt | Chu kỳ khớp khung thời gian đang chọn |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| `/analysis/seasonality` path snapshot không nhận start/end | Trung bình | Thấp | Chỉ thêm Query param; FastAPI bỏ qua param thừa ở path cũ, không đổi snapshot |
| Thiếu 14 ngày trong cửa sổ tháng → hệ số 0 | Cao | Thấp | Đây là hành vi insufficient có sẵn, không bịa số (I5) |
| Working tree timezone chặn nhánh/commit | Cao | Trung bình | Stage patch riêng như trước |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-24-overview-month-window-layout-thien.md`
- **Code test offline:** BE route test bổ sung; FE `overview-page.test.ts` bổ sung, `overview-view.test.ts` giữ cũ.
- **Cách kiểm chứng:** BE pytest + ruff; FE build + test; tay: đổi range → chu kỳ refetch theo tháng; chỉ 1 chart chu kỳ; 3 hàng card đúng thứ tự; ranking chart trên/bảng dưới.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-24
Comments: Người dùng xác nhận "Approved" và bổ sung: "đổi cửa sổ BE phân tích, phân cụm và data về 1 tháng thay vì lấy trên năm". Duyệt cả §4.0 (3 window config 365→30 + docker-compose + analysis service default), §4.1 (truyền cửa sổ seasonality), §4.2 (1 chart chu kỳ, bỏ monthly-peaks), §4.3 (layout 3 hàng, ranking 2 hàng dọc). `Overrides:` quyết định cửa sổ 365 ngày của `2026-11-12-analysis-four-patterns-son` và param seasonality của `2026-11-22-analysis-unsupported-query-params-thien`. Duyệt bởi thành viên đang thao tác (`thien`).
Scope of Rejection: -

---

## 10. Next Action
### Revision 2026-11-24
- Ghi §9 Approved theo chỉ thị chat, bổ sung yêu cầu đổi cửa sổ BE 365→30 ngày cho analysis/data/clustering (§4.0).
- Rẽ nhánh `fix/2026-11-24-overview-month-window-layout-thien`, sinh đồng thời `implemented/<id>/{plan.md,status.md}` + `testcase/<id>.md`; implement, test, validation, dừng **CHECKPOINT 1**.
