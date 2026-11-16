# Thư Mục Biểu Đồ 6 Patterns Chuỗi Thời Gian (Time-Series Charts)

Thư mục này chứa các component trực quan hóa 6 patterns chuỗi thời gian theo yêu cầu bắt buộc của đồ án:
1. **Biểu diễn thời gian:** Line chart, Scatter plot, Histogram theo Ngày/Tuần/Tháng.
2. **Xu hướng (Trend):** Đường trend sau re-sampling.
3. **Mùa vụ (Seasonality):** Chu kỳ lặp lại theo mùa.
4. **Ma trận tương quan (Correlation Matrix):** Heatmap đa biến.
5. **Dự báo định lượng (t+1):** Dự báo số lượng động đất kèm khoảng tin cậy.
6. **Phân loại rủi ro (t+1):** Nhãn phân loại mức độ hoạt động địa chấn.

## Danh mục component

| Tệp | Vai trò |
|---|---|
| `index.ts` | Barrel export dùng bởi `StatisticsPage.tsx`. |
| `types.ts` | Typed view optional cho `metrics` 6 pattern (nguồn: `contracts/schemas/patterns.json`). |
| `theme.ts` | Bảng màu Dark Mode, style trục/tooltip, `RISK_COLORS`, `correlationColor`, `correlationTextColor`. |
| `chart-data.ts` | Hàm thuần: gom nhóm UTC (`bucketKeyUtc`, `buildLineSeriesFromScatter`), `buildHistogramBins`, `buildTrendSeries`, `buildSeasonalSeries`, `buildForecastBand`, `buildRiskBars`, `resolvePatternView`, `formatNumber`, `formatCoefficient`, `formatPercent`. |
| `ChartPanel.tsx` | Khung panel chung (badge `COMPUTED`/`PENDING`/thiếu bản ghi, period, thuật toán) + `MetricChip`/`MetricChipRow`; tự render `EmptyChartState` khi pattern không khả dụng. |
| `EmptyChartState.tsx` | Empty State bắt buộc khi `PENDING` / thiếu bản ghi / `insufficient_data` — không có số liệu thay thế. |
| `TemporalPatternCharts.tsx` | Pattern 1 — Line (count + max/avg magnitude 2 trục), Scatter (`depth_km` × `magnitude`), Histogram `magnitude_bins`, segmented control Ngày/Tuần/Tháng. |
| `TrendPatternChart.tsx` | Pattern 2 — `actual_value` vs `trend_value` + Recharts `Brush` zoom, chip `slope`/`trend_direction`/`r_squared`/`p_value`. |
| `SeasonalityPatternChart.tsx` | Pattern 3 — `components.seasonal_line`, cường độ mùa vụ, biên độ, `interpretation`. |
| `CorrelationHeatmap.tsx` | Pattern 4 — lưới CSS 5×5 accessible (`role="grid"`), thang màu phân kỳ, tooltip + panel live hiển thị Pearson 4 chữ số. |
| `ForecastPatternChart.tsx` | Pattern 5 — quan sát vs dự báo t+1, dải tin cậy 95% (`lower_bound`–`upper_bound`), `model_name`, `mae`/`rmse` (optional). |
| `ClassificationPatternChart.tsx` | Pattern 6 — nhãn rủi ro LOW/MEDIUM/HIGH/CRITICAL, phân phối xác suất 4 lớp, disclaimer thống kê thử nghiệm. |

## Quy ước

- Dữ liệu **chỉ** đến từ `GET /api/v1/patterns`; hợp đồng tại [`contracts/schemas/patterns.json`](../../../../../contracts/schemas/patterns.json), mock offline tại [`contracts/examples/patterns_sample.json`](../../../../../contracts/examples/patterns_sample.json). Mock **không** import vào runtime.
- Mọi timestamp hiển thị/gom nhóm theo **UTC**; tọa độ theo **WGS84** (`latitude`, `longitude`).
- Khi pattern `PENDING` hoặc CSDL rỗng: hiển thị `EmptyChartState`, tuyệt đối không dùng số liệu dự phòng tĩnh.
- Component mới phải giữ layout **Dark Mode** hiện có (I5) và không hardcode mock thay API thật.

## Kiểm thử

```bash
cd apps/web && pnpm test    # node --test tests/*.test.ts → 12 test offline (chart-data)
cd apps/web && pnpm build   # tsc -b && vite build
```

Đặc tả kiểm thử: `.agents/notes/testcase/2026-11-16-six-patterns-chart-components-thien.md`.
