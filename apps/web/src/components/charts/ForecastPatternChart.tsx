import React from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyChartState } from "./EmptyChartState";
import { buildForecastBand, formatNumber, formatPercent } from "./chart-data";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STROKE,
  TOOLTIP_STYLE,
} from "./theme";
import type { ForecastBandPoint, ObservedPoint } from "./chart-data";
import type { PredictionMetrics } from "./types";
import { MetricChip, MetricChipRow } from "./ChartPanel";

interface ForecastPatternChartProps {
  metrics: PredictionMetrics;
  observed: ObservedPoint[];
  observedLabel: string;
}

interface ForecastTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ payload?: ForecastBandPoint }>;
}

const ForecastTooltip: React.FC<ForecastTooltipProps> = ({ active, label, payload }) => {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      {row.observed !== null ? (
        <div className="text-xs text-cyan-300">Quan sát thực tế: {row.observed}</div>
      ) : null}
      {row.predicted !== null ? (
        <>
          <div className="text-xs text-rose-300">Dự báo t+1: {formatNumber(row.predicted, 1)}</div>
          <div className="text-[11px] text-slate-400">
            Khoảng 95%: [{formatNumber(row.lower, 1)} – {formatNumber(row.upper, 1)}]
          </div>
        </>
      ) : null}
    </div>
  );
};

const METRIC_UNITS: Record<string, string> = {
  daily_earthquake_count: "sự kiện/ngày",
  event_count: "sự kiện/ngày",
};

export const ForecastPatternChart: React.FC<ForecastPatternChartProps> = ({
  metrics,
  observed,
  observedLabel,
}) => {
  const band = buildForecastBand(observed, metrics);
  const evaluation = metrics.evaluation_metrics;

  if (band.length === 0) {
    return (
      <EmptyChartState
        reason="Pattern 5 chưa có predicted_value hợp lệ trong CSDL."
        hint="Worker T5 cần chạy xong để sinh kết quả dự báo ngày t+1."
      />
    );
  }

  const unit = metrics.metric_name ? METRIC_UNITS[metrics.metric_name] ?? metrics.metric_name : "sự kiện/ngày";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3">
          <div className="text-[10px] uppercase tracking-wide text-rose-300/80">
            Dự báo ngày {metrics.target_date ?? "t+1"}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold text-rose-200">
              {formatNumber(metrics.predicted_value, 1)}
            </span>
            <span className="text-[11px] text-slate-400">{unit}</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Khoảng tin cậy 95%:{" "}
            <span className="font-mono text-slate-200">
              [{formatNumber(metrics.lower_bound, 1)} – {formatNumber(metrics.upper_bound, 1)}]
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Mô hình</div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-200">
            {metrics.model_name ?? "—"}
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-400">
            version: {metrics.model_version ?? "—"}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {evaluation?.confidence_level
              ? `Độ tin cậy: ${formatPercent(evaluation.confidence_level, 0)}`
              : "Độ tin cậy 95% (mặc định hợp đồng)"}
          </div>
        </div>
      </div>

      <MetricChipRow>
        <MetricChip
          label="MAE"
          value={formatNumber(evaluation?.mae, 2)}
          valueClassName="text-amber-300"
        />
        <MetricChip
          label="RMSE"
          value={formatNumber(evaluation?.rmse, 2)}
          valueClassName="text-orange-300"
        />
        <MetricChip label="Baseline MAE" value={formatNumber(evaluation?.baseline_mae, 2)} />
        <MetricChip label="Sinh lúc" value={metrics.generated_at ?? "—"} />
      </MetricChipRow>

      {!evaluation?.mae && !evaluation?.rmse ? (
        <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90">
          API hiện chưa trả sai số kiểm định (mae/rmse) cho Pattern 5. Hợp đồng khai báo các khóa này là
          optional trong <span className="font-mono">contracts/schemas/patterns.json</span> — không hiển thị
          số thay thế.
        </p>
      ) : null}

      <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-xs font-semibold text-slate-200">
            Quan sát thực tế vs dự báo t+1 (dải tin cậy 95%)
          </h4>
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-cyan-400" /> Quan sát ({observedLabel})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 border-t-2 border-dashed border-rose-400" /> Dự báo
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-rose-500/25 ring-1 ring-rose-500/50" /> CI 95%
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={270}>
          <ComposedChart data={band} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
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
              domain={["auto", "auto"]}
            />
            <Tooltip content={<ForecastTooltip />} />
            <Bar
              dataKey="ciBase"
              stackId="ci"
              fill="transparent"
              stroke="none"
              isAnimationActive={false}
            />
            <Bar
              dataKey="ciSpan"
              stackId="ci"
              fill="rgba(251, 113, 133, 0.22)"
              stroke="rgba(251, 113, 133, 0.55)"
              barSize={26}
              radius={[4, 4, 4, 4]}
            />
            <Line
              type="monotone"
              dataKey="observed"
              name="Quan sát thực tế"
              stroke={CHART_COLORS.cyan}
              strokeWidth={2}
              dot={{ r: 2.5, fill: CHART_COLORS.cyan }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="bridge"
              name="Dự báo t+1"
              stroke={CHART_COLORS.rose}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ r: 4, fill: CHART_COLORS.rose }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
