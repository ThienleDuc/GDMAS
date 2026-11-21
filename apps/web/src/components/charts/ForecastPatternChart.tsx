import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  evaluationText,
  forecastMetricLabel,
  forecastRows,
  NEXT_DAY_EXPLANATION,
} from "../../features/statistics/statistics-view.ts";
import { ChartReadingGuide } from "./ChartReadingGuide.tsx";
import {
  CHART_AXIS,
  CHART_DOT,
  CHART_GRID,
  CHART_LEGEND,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  CHART_TOOLTIP,
} from "./chart-theme.ts";
import type { ObservedPoint } from "../../lib/transforms/chart-data.ts";
import type { PredictionMetrics } from "../../lib/transforms/chart-types.ts";

interface ForecastPatternChartProps {
  prediction: PredictionMetrics | null;
  observed: readonly ObservedPoint[];
}

/** Pattern 5 — quan sát vs dự báo ngày kế tiếp, dải tin cậy 95%. */
export function ForecastPatternChart({ prediction, observed }: ForecastPatternChartProps) {
  const rows = forecastRows(prediction, observed);

  return (
    <div className="stat-charts">
    <div className="stat-chart-row">
    <div className="stat-chart-row__main">
      <div className="stat-metrics">
        <span>Ngày dự báo: <strong>{prediction?.target_date ?? "—"}</strong></span>
        <span>
          Chỉ số dự báo:{" "}
          <strong>{forecastMetricLabel(prediction?.forecasted_metric ?? prediction?.metric_name ?? null)}</strong>
        </span>
        <span>Mô hình: <strong>{prediction?.model_name ?? "—"}</strong></span>
        <span>Kiểm định: <strong>{evaluationText(prediction?.evaluation_metrics)}</strong></span>
      </div>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="label" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} />
          <Tooltip {...CHART_TOOLTIP} />
          <Legend {...CHART_LEGEND} />
          <Area dataKey="upper" name="Cận trên khoảng tin cậy 95%" stroke="none" fill="#4f46e5" fillOpacity={0.18} />
          <Area dataKey="lower" name="Cận dưới khoảng tin cậy 95%" stroke="none" fill="transparent" fillOpacity={0} />
          <Line dataKey="observed" name="Giá trị quan sát" stroke="#4f46e5" strokeWidth={CHART_LINE_WIDTH} dot={CHART_DOT} activeDot={{ r: 4 }} connectNulls={false} />
          <Line dataKey="bridge" name="Đường nối sang dự báo" stroke="#64748b" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={false} />
          <Line dataKey="predicted" name="Dự báo ngày kế tiếp" stroke="#e11d48" strokeWidth={3} dot={{ r: 5, fill: "#e11d48", strokeWidth: 0 }} activeDot={{ r: 6 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="stat-note">
        {NEXT_DAY_EXPLANATION} Dữ liệu quan sát và dự báo được phân biệt rõ; khoảng tin cậy 95%.
      </p>
    </div>
    <ChartReadingGuide pattern="forecast" />
    </div>
    </div>
  );
}
