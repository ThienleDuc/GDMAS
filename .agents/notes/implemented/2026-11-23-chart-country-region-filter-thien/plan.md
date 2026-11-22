# Implementation Plan: Lọc biểu đồ & KPI theo quốc gia/khu vực

## Metadata
- ID: 2026-11-23-chart-country-region-filter-thien
- Proposal: .agents/notes/proposed/2026-11-23-chart-country-region-filter-thien.md
- Approved By: thien
- Approved At: 2026-11-23
- Implementer: agent | thien
- Status: in_progress

---

## 1. Mục tiêu
Cho phép `?country=&region=` trên các route aggregate (statistics, analysis, predictions, classifications) tính on-the-fly từ sự kiện đã lọc bằng hàm thuần có sẵn; FE forward filter và refetch; EarthquakesPage đồng bộ URL + lọc cả region; Overview/Statistics phản ánh phạm vi.

---

## 2. Phạm vi
### In Scope
- `apps/api/src/gdmas/services/analysis/filtered.py` *(mới — helper read-only)*
- `apps/api/src/gdmas/api/routes/analysis.py`
- `apps/api/src/gdmas/api/routes/statistics.py`
- `apps/api/src/gdmas/api/routes/predictions.py`
- `apps/api/tests/unit/test_analysis_filtered.py` *(mới)*
- `apps/api/tests/fixtures/quality_contracts.json` *(refresh snapshot OpenAPI — không xoá/skip test)*
- `apps/web/src/contracts/geo-filter.ts` *(mới)*
- `apps/web/src/contracts/earthquake.ts` *(thêm country/region vào QueryEarthquakeParams)*
- `apps/web/src/services/earthquake-api.ts` *(tham số optional)*
- `apps/web/src/hooks/useEarthquakeInsights.ts`
- `apps/web/src/features/overview/useOverviewData.ts`
- `apps/web/src/features/overview/OverviewPage.tsx`
- `apps/web/src/features/earthquakes/EarthquakesPage.tsx`
- `apps/web/src/features/earthquakes/components/EarthquakeInsights.tsx`
- `apps/web/src/features/earthquakes/components/MagnitudeHistogramChart.tsx`
- `apps/web/src/features/statistics/statistics-data.tsx`
- `apps/web/src/features/statistics/StatisticsLayout.tsx`
- `apps/web/src/features/statistics/StatisticsPage.css`
- `apps/web/tests/chart-region-filter.test.ts` *(mới)*
- `apps/web/tests/analysis-query-params.test.ts` *(cập nhật assertion, không xoá test)*
- `.agents/notes/testcase/2026-11-23-chart-country-region-filter-thien.md` *(đặc tả sinh đồng thời)*
- `docs/api/API.md` §3.2/§3.3

### Out of Scope
- `contracts/schemas/*.json`, `apps/api/alembic/versions/001_*` & `002_*` (I4), `apps/api/src/gdmas/main.py` (I1), `AGENTS.md`
- Worker T3/T5, artifact mô hình, clustering_summary (T4), SSE realtime, migration mới

---

## 3. Các bước
### Step 1 — Helper BE read-only
`filtered.py`: query 6 cột + filter country/region → `prepare_events`; build metrics qua `compute_temporal`/`compute_trend_bundle`/`compute_seasonality`/`compute_correlation`; forecast/classify qua `inference.build_series/forecast_next/classify_next` với guard `MIN_OBSERVED`.

### Step 2 — Routes aggregate
Thêm `country`/`region: Query(None)` vào 4 nhóm route; `None,None` → đường cũ; có filter → helper. Giữ response shape.

### Step 3 — Statistics KPI
Nhân câu lọc vào 8 query + `_time_series_24h` của `statistics.py`.

### Step 4 — FE service/hooks
Mở rộng signature 7 hàm trong `earthquake-api.ts` (optional, không gửi khi không truyền); hooks/page truyền filter + AbortController.

### Step 5 — EarthquakesPage & Overview & Statistics UI
`useCatalogSelection` làm nguồn sự thật; select region; bỏ nhãn "toàn cầu" khi đang lọc; Statistics thêm region select.

### Step 6 — Test & validation
BE pytest + ruff; FE test + build; notes check; curl đối chiếu default vs `?country=Japan`.

---

## 4. Thay đổi dữ liệu / API / cấu hình
- Query param mới (optional): `country`, `region` cho `/statistics/earthquakes`, `/analysis/*`, `/predictions`, `/classifications`.
- **Không đổi payload/schema/migration.**

---

## 5. Validation (nhẹ) & Kiểm chứng Testcase bắt buộc
- [x] Đã tạo đặc tả testcase tại `.agents/notes/testcase/<id>.md`
- [ ] Đã tạo và chạy pass file unit test offline
- [ ] `cd apps/api && .venv/bin/python -m pytest -q`
- [ ] `cd apps/api && .venv/bin/ruff check . && .venv/bin/ruff format --check .`
- [ ] `cd apps/web && pnpm test && pnpm build`
- [ ] `python3 scripts/notes_index.py --check`
- [ ] `docs/api/API.md` cập nhật
- [ ] Kiểm chứng: default == snapshot cũ; `?country=Japan` trả số khác

---

## 6. Rủi ro khi làm
P5/P6 artifact toàn cầu + `MIN_OBSERVED` → Empty State; CPU tính lại → cache; test cũ chặn param → cập nhật assertion.

## 7. Rollback
Revert commit/PR; FE vẫn chạy vì API param optional và response không đổi.

## 8. Ghi chú
`Overrides:` đã ghi trong proposal; SSE/clustering/mô hình riêng nằm ngoài phạm vi.
