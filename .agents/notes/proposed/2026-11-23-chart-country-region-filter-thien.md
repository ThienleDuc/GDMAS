# Proposal: Lọc biểu đồ & KPI theo quốc gia/khu vực (6 Patterns)

## Metadata
- ID: 2026-11-23-chart-country-region-filter-thien
- Author: agent | thien
- Created: 2026-11-23
- Type: feature
- Status: approved
- Priority: high
- Area: apps/api/src/gdmas/api/routes/, apps/api/src/gdmas/services/analysis/, apps/web/src/services/, apps/web/src/features/{earthquakes,overview,statistics}/
- Architecture Impact: docs/api/API.md §3.2/§3.3 — bổ sung query param `country`/`region` cho `/statistics/earthquakes`, `/analysis/*`, `/predictions`, `/classifications`; **response payload không đổi** (không sửa `contracts/schemas/*.json`), không đổi schema DB/migration.
- Related Docs:
  - docs/coding-rules.md
  - docs/api/API.md
  - docs/architecture/SAD.md
- Related Proposals:
  - Overrides: 2026-11-21-header-country-clock-refresh-thien — **chỉ riêng** quyết định §9 "KHÔNG sửa `apps/api/**`, KHÔNG mở rộng params API, số liệu giữ toàn cầu". Lý do: người dùng yêu cầu 2026-11-23 muốn 6 biểu đồ thay đổi thật theo phạm vi. Phần header/đồng hồ/chip của proposal cũ giữ nguyên.
  - 2026-11-22-be-country-region-derivation-thien — proposal tiền lệ: đã thêm cột `country`/`region` + `GET /earthquakes?country=&region=` + 2 endpoint catalog; proposal này **mở rộng cùng cơ chế** sang các route aggregate, không thay đổi những gì đã chốt.
- Related Bugs: none

---

## 1. Vấn đề
### Bối cảnh
Header/Map ghi `?country=&region=` (nguồn sự thật chung). Map lọc marker đúng; `GET /earthquakes` lọc đúng. Nhưng:
- `EarthquakesPage` dùng state local, phớt lờ URL và **không có lọc region**.
- `OverviewPage`: chỉ bảng "Điểm nóng" đổi theo country; KPI/xu hướng/chu kỳ/forecast vẫn toàn cầu dù subtitle hiện "Đang xem: …".
- `StatisticsPage`: 6 biểu đồ đọc snapshot tổng hợp, **không đổi dù một điểm** khi đổi quốc gia/khu vực.

### Vấn đề
Người dùng chọn quốc gia/khu vực nhưng hầu hết biểu đồ & KPI vẫn hiển thị số toàn cầu → gây hiểu nhầm và không đáp ứng mô hình "xem toàn cầu" theo phạm vi.

### Ảnh hưởng
Ba trang T7.01/T7.06 và dashboard chính bị sai kỳ vọng lọc; chip lọc trở thành trang trí.

---

## 2. Hiện trạng
- BE đã có cột `country`/`region` trên `earthquake_events` (+ index), migration `002_add_country_region` head, helper derive `services/ingestion/geo.py`.
- `services/analysis/patterns.py` là module thuần 628 dòng: `prepare_events(records) -> DataFrame`, `compute_temporal`, `compute_trend_bundle`, `compute_seasonality`, `compute_correlation`, `build_analysis_snapshot`.
- `services/prediction/inference.py`: `build_series`, `forecast_next` (cần `MIN_OBSERVED=10`), `classify_next` — artifact ARIMA huấn luyện toàn cầu, cached.
- Route `/analysis/*` chỉ đọc bảng `analysis_results` (snapshot T3); `/statistics`, `/predictions`, `/classifications` chỉ aggregate/đọc bảng tổng hợp — **chưa có param lọc**.
- FE service `earthquake-api.ts` hiện cố tình **không forward** param cho các route aggregate (`analysis-query-params.test.ts` khóa hành vi này).

---

## 3. Mục tiêu
- **Mục tiêu:**
  1. Thêm `country`/`region` optional cho `/statistics/earthquakes`, `/analysis/{temporal,trend,seasonality,correlation}`, `/predictions`, `/classifications` — khi có filter, tính **on-the-fly từ sự kiện đã lọc** bằng hàm thuần hiện có; **không truyền filter → đường cũ đọc snapshot y hệt**.
  2. FE forward filter tới các route trên; refetch khi `?country=&region=` đổi.
  3. `EarthquakesPage` đồng bộ URL, lọc cả country **và** region (thêm select khu vực); `OverviewPage` lọc dữ liệu item-level và bỏ nhãn "toàn cầu" khi đang lọc; `StatisticsLayout` thêm chọn region + refetch.
  4. Không đổi response schema, không migration, không worker, không SSE.
- **Không nằm trong mục tiêu (Out of Scope):**
  - Lưu snapshot riêng theo quốc gia (cần migration + T3/T5 ghi nhiều bản) — proposal riêng.
  - Train lại mô hình ARIMA/classifier theo quốc gia — proposal riêng.
  - Tính lại `clustering_summary` (T4 còn placeholder) và lọc SSE realtime — proposal riêng.
  - Đụng `contracts/schemas/*.json`, `001_`/`002_` migration, `main.py`, `AGENTS.md`.

---

## 4. Giải pháp đề xuất
1. **Helper read-only mới** `apps/api/src/gdmas/services/analysis/filtered.py` (tên gợi ý):
   - `load_filtered_events_df(db, country, region, *, as_of) -> pd.DataFrame` — query đúng 6 cột `EVENT_COLUMNS` + `WHERE country/region`, `prepare_events`.
   - `build_filtered_analysis(df, kind, **params) -> dict` — gọi đúng hàm thuần tương ứng (temporal/trend_bundle/seasonality/correlation), trả metrics đã `sanitize_for_json`, reused `build()` reshape của route.
   - `build_filtered_forecast(db, country, region, now) -> dict` — `build_series` + `forecast_next` + `classify_next`; khi không đủ `MIN_OBSERVED` → empty `insufficient_data`, **không bịa số**.
2. **Routes**: mỗi route thêm `Query(None)` cho `country`/`region`; branch: `None,None` → `_respond()`/aggregate cũ; có filter → helper mới. Giữ nguyên default, chữ ký hàm cũ (I2).
3. **FE**: mở rộng signature 7 service hàm (tham số optional, default không gửi); 3 hook/page truyền `country`/`region` từ `useCatalogSelection`; `EarthquakesPage` bỏ state local; `StatisticsLayout` thêm region select (`getRegionCatalog`).
4. **Test**: cập nhật `analysis-query-params.test.ts` (giờ cho phép param khi truyền), `earthquakes-insights.test.ts` (giữ tên `chartFiltered`/prop), test BE route lọc, test FE plumbing; không test nào bị xoá/skip.

Tuân **I1** (không nhúng worker vào `main.py`), **I2** (chỉ thêm param/default), **I3** (UTC/WGS84, payload không đổi), **I4** (không đụng migration), **I5** (không mock thay API thật), **I6**, **I7** (testcase + test offline).

---

## 5. Phương án đã cân nhắc
### Phương án A: FE tự cắt payload aggregate
Ưu: không đụng BE. Nhược: số tổng hợp không có item thô để tính lại đúng `scipy`/`statsmodels`, sai bản chất. **Không chọn**.
### Phương án B: lưu snapshot riêng theo quốc gia (migration + T3/T5)
Ưu: nhanh khi đọc, đúng mô hình riêng. Nhược: migration mới, worker ghi N bản, train lại artifact — quá lớn. **Không chọn** (tách proposal riêng).
### Phương án C: tính on-the-fly với hàm thuần có sẵn
Ưu: không migration/worker, tái dùng 100% công thức, default path giữ nguyên. Nhược: tốn CPU khi có filter (giảm thiểu bằng cache theo `(country, region, day)` nếu cần). **Chọn**.

---

## 6. Đánh đổi
| Khía cạnh | Tác động | Lý do |
|---|---|---|
| Độ phức tạp | Cao | 7 route + helper + 3 page + test |
| Hiệu năng | Trung bình | seasonal_decompose trên ~9.4k event/request; có cache + chỉ khi có filter |
| Bảo trì / Open-Closed | Tốt | Hàm thuần dùng chung T3 và T6; không nhân bản công thức |
| Độ tin cậy | Trung bình | P5/P6 artifact toàn cầu + `MIN_OBSERVED=10` → Empty State cho quốc gia nhỏ (đúng, không bịa) |

---

## 7. Rủi ro
| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Dự báo quốc gia nhỏ trả `insufficient_data` | Cao | Trung bình | Hiển thị Empty State, ghi rõ artifact toàn cầu; không bịa số |
| CPU tính lại mỗi request | Trung bình | Trung bình | Cache in-memory theo `(country, region, kind, day)`; default path vẫn đọc snapshot |
| Test cũ chặn query param | Chắc chắn | Thấp | Cập nhật assertion theo param optional; giữ nguyên test count |
| FE refetch loop khi đổi URL | Trung bình | Thấp | Dùng `AbortController` + dependency đúng |

---

## 8. Cách kiểm chứng & Tệp test dự kiến
- **Đặc tả testcase sinh đồng thời:** `.agents/notes/testcase/2026-11-23-chart-country-region-filter-thien.md` *(từ `_TEMPLATE.md`)*
- **Code test tự động offline:**
  - `apps/api/tests/unit/test_analysis_filtered.py` *(mới)*
  - `apps/api/tests/unit/test_statistics_route.py` *(bổ sung)*
  - `apps/api/tests/unit/test_prediction_routes.py` *(bổ sung)*
  - `apps/web/tests/chart-region-filter.test.ts` *(mới)* + cập nhật `analysis-query-params.test.ts`, `earthquakes-insights.test.ts`
- **Cách kiểm chứng:** `cd apps/api && uv run pytest` (dùng `.venv/bin/python -m pytest` nếu `uv run` không spawn); `ruff check/format`; `cd apps/web && pnpm test && pnpm build`; `notes_index.py --check`; curl thật `?country=Japan` so với default.

---

## 9. Human Review
Decision: Approved
Reviewer: thien
Review Date: 2026-11-23
Comments: Người dùng chọn rõ phương án "Bao gồm cả 6 biểu đồ Thống kê" trong câu hỏi 2026-11-23 (đã nêu rõ phương án này cần sửa BE), nên chấp thuận `Overrides:` cho quyết định "giữ số liệu toàn cầu" của proposal `2026-11-21-header-country-clock-refresh-thien`. Phạm vi giới hạn ở on-the-fly, không migration/worker.
Scope of Rejection: -

---

## 10. Next Action
§9 Approved → `build-implementation`: tạo đồng thời `implemented/<id>/{plan,status}.md` + testcase, code theo RULE-03 & I1–I7, validation, dừng CHECKPOINT 1.
