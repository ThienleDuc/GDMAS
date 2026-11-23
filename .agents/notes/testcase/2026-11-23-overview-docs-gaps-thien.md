# Testcase: Bổ sung các điểm còn thiếu theo docs trên trang Tổng quan

## Metadata
- ID: 2026-11-23-overview-docs-gaps-thien
- Mode: single-file-test
- Proposal: none
- Target: apps/web/src/features/overview/{OverviewPage.tsx,overview-view.ts,useOverviewData.ts,OverviewPage.css}, apps/web/src/components/charts/Overview{Severity,Seasonality,Trend}Chart.tsx
- Test File: apps/web/tests/overview-docs-gaps.test.ts, apps/web/tests/monthly-peaks.test.ts; bổ sung apps/api/tests/unit/test_analysis_filtered.py
- Author: agent | thien
- Created: 2026-11-23
- Status: passed
- Related Bugs: none

---

## 1. Mục tiêu & Ràng buộc
Sửa 8 điểm audit còn thiếu theo `docs/yeucaubatbuoc.md`, `docs/api/API.md` §3.5, proposal `2026-11-21-overview-dashboard-thien`: I2 (giữ hook/props), I5 (không mock), I7 (offline).

| TC | Đối tượng | Kết quả | Trạng thái |
|---|---|---|---|
| 01 | Error state | Banner `role="alert"` đọc `data.error` + nút `data.refresh` | PASS |
| 02 | `database_cleared` | `useDatabaseResetFromEvent(sse.data)` → `refreshVersion` vào effect fetch; banner Empty | PASS |
| 03 | SSE live feed | `applySseLatestEvent` đưa `earthquake_detected/alert` vào đầu bảng, dedup theo id | PASS |
| 04 | Chart B | PieChart → thanh xếp chồng `stackId="severity"` | PASS |
| 05 | Chart D | "Khung giờ cao điểm" → "Chu kỳ cao điểm" (BE trả tháng/thứ) | PASS |
| 06 | Chart A | Bỏ text "14 ngày" (BE không nhận param cửa sổ) | PASS |
| 07 | Ranking click | `navigate(APP_ROUTES.MONITORING)` sau `setSelection` | PASS |
| 08 | KPI cụm | Hint "· toàn cục" khi chưa lọc quốc gia | PASS |
| 09 | Cao điểm theo tháng | Endpoint `/statistics/monthly-peaks` (count 12 tháng, lọc country/region) | PASS |
| 10 | `seasonality?interval=month` | Ép chu kỳ 12 tháng; <24 tháng → `insufficient_data` (không bịa) | PASS |
| 11 | Biểu đồ tháng trên Overview | Đặt dưới biểu đồ tuần, ưu tiên count, fallback decomposition | PASS |
| 12 | Cửa sổ 1 năm | `DATA_WINDOW_DAYS=365`; backfill FDSN 13 cửa sổ; monthly-peaks có đủ 12 tháng | PASS |
| 13 | Env mô hình trong .env | `ANALYSIS/CLUSTERING_WINDOW_DAYS`, `CLUSTERING_EPS_KM/MIN_SAMPLES`, `BACKFILL_*`, `PREDICTION_MIN_OBSERVED` — config.py + .env(.example) + compose + setup.md | PASS |
| 14 | Chu kỳ theo §1.2 ASCII | Ingestion 300s / Analysis 300s / Prediction 300s / Clustering 86400s; 4 runner đều đọc settings (cluster runner đã bỏ hardcode) | PASS |
| 15 | Bộ lọc Ngày/Tuần/Tháng | `?range=day\|week\|month`, `resolveWindow` áp cho statistics/trend/temporal/catalog | PASS |
| 16 | 2 biểu đồ chu kỳ giữ nguyên | seasonality + monthly-peaks KHÔNG nhận cửa sổ, nằm chung card `ov-card--cycles` | PASS |
| 17 | Trải ngang chart Hotspots | `ov-card--wide` chiếm `1 / -1`, khắc phục khoảng trống 6 cột | PASS |
| 18 | Bảng & biểu đồ cùng hàng | `.ov-chart-row` grid 5fr/7fr, responsive 1 cột | PASS |
| 19 | Chú giải màu chu kỳ | `ov-season-legend` 3 mục (cao/trung bình/thấp) — giải thích cột thấp nhất lại sáng | PASS |
| 20 | SSE qua Vite proxy | `/api` proxy thêm `proxyTimeout: 0`, `timeout: 0`, `xfwd: true` — không tự đóng kết nối SSE dài | PASS |
| 21 | 3 cột xếp hạng có số thật | Catalog `/countries` & `/regions` trả `avg_magnitude`/`max_magnitude`; FE map vào `RankRow` | PASS |
| 22 | Chart rộng hơn | `.ov-chart-row` đổi 5fr/7fr → 7fr/5fr | PASS |
| 23 | Chart cao bằng bảng | `align-items: stretch`, `ResponsiveContainer height="100%"`, flex fill | PASS |
| 24 | Ranking quốc gia lọc Ngày/Tuần/Tháng | `/countries` & `/regions` nhận `start_time/end_time`; avg/max tính trong cửa sổ; FE truyền `window` | PASS |
| 25 | Màu chu kỳ theo ngưỡng | Cao = `destructive`, Trung bình = `muted`, Thấp = `chart-3`; legend đổi nhãn | PASS |
| 26 | Cột chu kỳ hiển thị để so sánh | `Cell style.fill` dùng CSS var, `minPointSize`, height 200; giữ nguyên 7 ngày/12 tháng | PASS |
| 27 | Cột thiếu số liệu hạ về 0 | BE insufficient vẫn trả 7 cột `factor=0`; `/monthly-peaks` trả 12 tháng; FE `padWeekdaysTo7` + `buildMonthlyBars` không bỏ cột, không bịa số | PASS |
| 28 | Phạm vi cột theo lọc | `applyWeekdayWindow`: day chỉ giữ cột hôm nay, week giữ T2→hôm nay; `applyMonthWindow`: chỉ tháng hiện tại trở về trước có số, tháng tương lai = 0 | PASS |
| 29 | KPI cụm theo quốc gia | `/clusters` nhận `country`/`region`, lọc theo `dominant_place`, `clusters_count` phản ánh số sau lọc; FE truyền filter | PASS |
| 30 | Lazy-load 4 page | `App.tsx`: Overview/Monitoring/Earthquakes/Statistics đều `React.lazy` + Suspense riêng; test chặn import tĩnh | PASS |

## 2. Lệnh & Kết quả
```bash
cd apps/web && pnpm test && pnpm build
```
- **Ngày chạy cuối:** 2026-11-23
- **Kết quả:** BE `.venv/bin/python -m pytest -q` **366/366 PASS** + ruff sạch; FE `pnpm test` **287/287 PASS**, `pnpm build` OK; `docker compose config --quiet` OK; `notes_index.py --check` OK.
- **Runtime:** backfill `DATA_WINDOW_DAYS=365` → 13 cửa sổ FDSN, **+27.767 sự kiện**, tổng 37.248; `/statistics/monthly-peaks` → 12 tháng đều có số (Tháng 11: 7.215, Tháng 10: 4.734…). `/analysis/seasonality?interval=month` vẫn `insufficient_data` — đúng chu kỳ năm cần ≥24 tháng theo `patterns.py`; biểu đồ tháng dùng count nên không bị ảnh hưởng. Mặc định vẫn 7 điểm theo thứ.
- Container đã `docker compose up -d --force-recreate`, biến mới có trong `gdmas-api` env; `/health` 200.
- Bộ lọc cửa sổ runtime: `/statistics/earthquakes` all `37250` → `?start_time=` (7 ngày) `1770`; `/analysis/trend?resample_freq=D&start_time=…` → success, 8 điểm; `/analysis/seasonality` vẫn 7 điểm (không đổi theo cửa sổ).
- Không test nào bị xoá/skip; `chart-region-filter.test.ts` TC-05 chỉ cập nhật assertion theo lời gọi `useOverviewData({country,region}, dbReset.refreshVersion)`.

## 3. Ghi chú
- Không khôi phục `ov-global-note` (đã bỏ theo PR #52); banner error mới dùng class `ov-notice` riêng.
- Không mở `EventSource` thứ 2 — dùng chung `useSseMarkers()` của shell (I1).
