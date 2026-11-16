import React from "react";
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
import { EmptyChartState } from "./EmptyChartState";
import { buildTrendSeries, formatNumber } from "./chart-data";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "./theme";
import type { TrendMetrics } from "./types";
import { MetricChip, MetricChipRow } from "./ChartPanel";

const DIRECTION_LABELS: Record<string, string> = {
  increasing: "Tăng (Upward)",
  decreasing: "Giảm (Downward)",
  stable: "Ổn định (Stable)",
};

const INTERVAL_LABELS: Record<string, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
};

interface TrendPatternChartProps {
  metrics: TrendMetrics;
}

export const TrendPatternChart: React.FC<TrendPatternChartProps> = ({ metrics }) => {
  const series = buildTrendSeries(metrics.series);

  if (series.length === 0) {
    return (
      <EmptyChartState
        reason="Pattern 2 đã COMPUTED nhưng series rỗng — chưa đủ kỳ dữ liệu để re-sampling."
        hint="Cần tối thiểu 3 kỳ đầy đủ (tuần hoặc tháng) để hồi quy xu hướng."
      />
    );
  }

  const directionLabel =
    metrics.direction ??
    (metrics.trend_direction ? DIRECTION_LABELS[metrics.trend_direction] : undefined) ??
    "—";

  return (
    <div className="space-y-3">
      <MetricChipRow>
        <MetricChip
          label="Độ dốc (slope)"
          value={formatNumber(metrics.slope, 4)}
          valueClassName="text-indigo-300"
        />
        <MetricChip
          label="Xu hướng"
          value={directionLabel}
          valueClassName="text-amber-300"
        />
        <MetricChip label="R²" value={formatNumber(metrics.r_squared, 3)} />
        <MetricChip label="p-value" value={formatNumber(metrics.p_value, 4)} />
        <MetricChip
          label="Re-sampling"
          value={metrics.interval ? INTERVAL_LABELS[metrics.interval] ?? metrics.interval : "—"}
        />
        <MetricChip label="Kỳ đầy đủ" value={formatNumber(metrics.complete_periods, 0)} />
        <MetricChip label="Tổng kỳ" value={formatNumber(metrics.data_points, 0)} />
        <MetricChip label="Cửa sổ MA" value={formatNumber(metrics.moving_average_window, 0)} />
      </MetricChipRow>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-200">
            Giá trị thực tế vs đường xu hướng (Moving Average)
          </h4>
          <span className="text-[10px] text-slate-500">Kéo thanh dưới để zoom</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="period"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              minTickGap={16}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line
              type="monotone"
              dataKey="actual_value"
              name="Giá trị thực tế"
              stroke={CHART_COLORS.cyan}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CHART_COLORS.cyan }}
            />
            <Line
              type="monotone"
              dataKey="trend_value"
              name="Xu hướng (trend_value)"
              stroke={CHART_COLORS.indigo}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls={false}
            />
            <Brush
              dataKey="period"
              height={22}
              travellerWidth={8}
              stroke={CHART_COLORS.sky}
              fill="#0b1220"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {metrics.status === "insufficient_data" ? (
        <p className="text-[11px] text-amber-300/90">
          Chưa đủ 3 kỳ đầy đủ để xác định xu hướng có ý nghĩa thống kê.
        </p>
      ) : null}
    </div>
  );
};
