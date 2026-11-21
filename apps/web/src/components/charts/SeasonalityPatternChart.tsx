import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeasonalityResponse } from "../../contracts/analysis.ts";
import { buildSeasonalSeries, formatPercent } from "../../lib/transforms/chart-data.ts";
import { ChartReadingGuide } from "./ChartReadingGuide.tsx";
import { resampleFreqLabel } from "./chart-guides.ts";
import {
  CHART_AXIS,
  CHART_GRID,
  CHART_LEGEND,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  CHART_TOOLTIP,
} from "./chart-theme.ts";

/** Pattern 3 — phân tích chu kỳ; giữ nguyên diễn giải của BE. */
export function SeasonalityPatternChart({ data }: { data: SeasonalityResponse["data"] | null }) {
  const rows = buildSeasonalSeries(data?.components);
  const strength = formatPercent(data?.components?.seasonality_strength, 1);
  const interpretation = data?.components?.interpretation?.trim();

  return (
    <div className="stat-charts">
    <div className="stat-chart-row">
    <div className="stat-chart-row__main">
      <div className="stat-metrics">
        <span>Độ mạnh chu kỳ: <strong>{strength}</strong></span>
        <span>Chu kỳ lấy mẫu: <strong>{resampleFreqLabel(data?.resample_freq ?? null)}</strong></span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={CHART_MARGIN}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="period_label" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} />
          <Tooltip {...CHART_TOOLTIP} />
          <Legend {...CHART_LEGEND} />
          <Line
            type="monotone"
            dataKey="seasonal_factor"
            name="Hệ số chu kỳ"
            stroke="#0284c7"
            strokeWidth={CHART_LINE_WIDTH}
            dot={{ r: 3.5, fill: "#0284c7", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
      {interpretation && <p className="stat-note">{interpretation}</p>}
    </div>
    <ChartReadingGuide pattern="seasonality" />
    </div>
    </div>
  );
}
