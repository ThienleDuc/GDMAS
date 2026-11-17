import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyChartState } from "./EmptyChartState";
import { buildSeasonalSeries, formatNumber, formatPercent } from "./chart-data";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "./theme";
import type { SeasonalityMetrics } from "./types";
import { MetricChip, MetricChipRow } from "./ChartPanel";

interface SeasonalityPatternChartProps {
  metrics: SeasonalityMetrics;
}

const INTERVAL_LABELS: Record<string, string> = {
  day: "Ngày",
  week: "Tuần",
  month: "Tháng",
};

export const SeasonalityPatternChart: React.FC<SeasonalityPatternChartProps> = ({ metrics }) => {
  const data = buildSeasonalSeries(metrics.components);
  const interpretation = metrics.components?.interpretation ?? "";

  if (data.length === 0) {
    return (
      <EmptyChartState
        reason={
          interpretation ||
          "Pattern 3 chưa có chu kỳ mùa vụ rõ ràng (cần ≥ 14 ngày cho chu kỳ tuần hoặc ≥ 24 tháng cho chu kỳ năm)."
        }
        hint="Hệ thống không mặc định có mùa vụ (P-03): chỉ hiển thị khi đủ dữ liệu phân rã."
      />
    );
  }

  const factors = data.map((point) => point.seasonal_factor);
  const min = Math.min(1, ...factors);
  const max = Math.max(1, ...factors);
  const padding = Math.max(0.01, (max - min) * 0.2);

  return (
    <div className="space-y-3">
      <MetricChipRow>
        <MetricChip
          label="Cường độ mùa vụ"
          value={formatPercent(metrics.components?.seasonality_strength, 1)}
          valueClassName="text-emerald-300"
        />
        <MetricChip label="Biên độ (amplitude)" value={formatNumber(metrics.amplitude, 4)} />
        <MetricChip
          label="Chu kỳ"
          value={metrics.cycle_hours ?? (metrics.period ? `${metrics.period} kỳ` : "—")}
        />
        <MetricChip
          label="Re-sampling"
          value={metrics.interval ? INTERVAL_LABELS[metrics.interval] ?? metrics.interval : "—"}
        />
        <MetricChip label="Phương sai dư" value={formatNumber(metrics.components?.residual_variance, 4)} />
        <MetricChip label="Số kỳ" value={formatNumber(metrics.data_points, 0)} />
      </MetricChipRow>

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-200">Seasonal line — hệ số mùa vụ theo kỳ</h4>
          <span className="text-[10px] text-slate-500">Đường 1.0 = mức trung bình</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="period_label"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              minTickGap={4}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              domain={[
                Number((min - padding).toFixed(3)),
                Number((max + padding).toFixed(3)),
              ]}
              tickFormatter={(value: number) => value.toFixed(2)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
            <ReferenceLine
              y={1}
              stroke={CHART_COLORS.slate}
              strokeDasharray="4 4"
              label={{ value: "1.0", position: "insideTopLeft", fill: "#94a3b8", fontSize: 10 }}
            />
            <Line
              type="monotone"
              dataKey="seasonal_factor"
              name="Hệ số mùa vụ"
              stroke={CHART_COLORS.emerald}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CHART_COLORS.emerald }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {interpretation ? (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs leading-relaxed text-emerald-200/90">
          <span className="font-semibold text-emerald-300">Diễn giải: </span>
          {interpretation}
        </div>
      ) : null}
    </div>
  );
};
