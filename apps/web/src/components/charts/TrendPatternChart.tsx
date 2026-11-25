import {
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendResponse } from "../../contracts/analysis.ts";
import { buildTrendSeries, formatNumber } from "../../lib/transforms/chart-data.ts";
import { ChartReadingGuide } from "./ChartReadingGuide.tsx";
import { resampleFreqLabel } from "./chart-guides.ts";
import {
  CHART_AXIS,
  CHART_DOT,
  CHART_GRID,
  CHART_LEGEND,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  CHART_TOOLTIP,
} from "./chart-theme.ts";

const DIRECTION_LABELS: Record<string, string> = {
  increasing: "Tăng",
  decreasing: "Giảm",
  stable: "Ổn định",
};

/** Pattern 2 — thực tế vs xu hướng sau re-sampling. */
export function TrendPatternChart({ data }: { data: TrendResponse["data"] | null }) {
  const rows = buildTrendSeries(data?.series);
  const direction = data?.trend_direction
    ? (DIRECTION_LABELS[data.trend_direction] ?? data.trend_direction)
    : "—";

  return (
    <div className="stat-charts">
    <div className="stat-chart-row">
    <div className="stat-chart-row__main">
      <div className="stat-metrics">
        <span>Độ dốc: <strong>{formatNumber(data?.slope, 4)}</strong></span>
        <span>Xu hướng: <strong>{direction}</strong></span>
        <span>Độ phù hợp mô hình: <strong>{formatNumber(data?.r_squared, 4)}</strong></span>
        <span>Chu kỳ lấy mẫu: <strong>{resampleFreqLabel(data?.resample_freq ?? null)}</strong></span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="period" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} />
          <Tooltip {...CHART_TOOLTIP} />
          <Legend {...CHART_LEGEND} />
          <Line type="monotone" dataKey="actual_value" name="Thực tế" stroke="#4f46e5" strokeWidth={CHART_LINE_WIDTH} dot={CHART_DOT} activeDot={{ r: 4 }} />
          <Line
            type="monotone"
            dataKey="trend_value"
            name="Xu hướng"
            stroke="#ea580c"
            strokeWidth={CHART_LINE_WIDTH}
            strokeDasharray="7 4"
            dot={CHART_DOT}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
          <Brush dataKey="period" height={24} stroke="var(--primary)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <ChartReadingGuide pattern="trend" />
    </div>
    </div>
  );
}
