import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { EmptyChartState } from "./EmptyChartState";
import {
  buildHistogramBins,
  buildLineSeriesFromScatter,
  formatNumber,
  isFiniteNumber,
} from "./chart-data";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID_STROKE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_STYLE,
} from "./theme";
import type { TimeInterval, TemporalMetrics } from "./types";

const INTERVALS: Array<{ value: TimeInterval; label: string }> = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

interface TemporalPatternChartsProps {
  metrics: TemporalMetrics;
  interval: TimeInterval;
  onIntervalChange: (interval: TimeInterval) => void;
}

const ChartBox: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <div className="rounded-lg border border-slate-800/80 bg-slate-950/50 p-3">
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h4 className="text-xs font-semibold text-slate-200">{title}</h4>
      {hint ? <span className="text-[10px] text-slate-500">{hint}</span> : null}
    </div>
    {children}
  </div>
);

export const TemporalPatternCharts: React.FC<TemporalPatternChartsProps> = ({
  metrics,
  interval,
  onIntervalChange,
}) => {
  const serverLine = metrics.interval === interval ? metrics.line_chart ?? [] : [];
  const lineData = serverLine.length
    ? serverLine
        .filter((point) => point && typeof point.date === "string" && isFiniteNumber(point.event_count))
        .map((point) => ({
          date: point.date,
          event_count: point.event_count,
          max_magnitude: isFiniteNumber(point.max_magnitude) ? point.max_magnitude : null,
          avg_magnitude: isFiniteNumber(point.avg_magnitude) ? point.avg_magnitude : null,
        }))
    : buildLineSeriesFromScatter(metrics.scatter_plot, interval);

  const scatterData = (metrics.scatter_plot ?? []).filter(
    (point) =>
      point &&
      typeof point.timestamp === "string" &&
      isFiniteNumber(point.magnitude) &&
      isFiniteNumber(point.depth_km),
  );

  const bins = buildHistogramBins(metrics.histogram?.magnitude_bins);

  if (lineData.length === 0 && scatterData.length === 0 && bins.length === 0) {
    return (
      <EmptyChartState
        reason="Pattern 1 đã COMPUTED nhưng payload không có line_chart / scatter_plot / histogram."
        hint="Kiểm tra lại worker T3 hoặc chạy khởi tạo dữ liệu demo."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-400 sm:grid-cols-4">
          <span>
            Mẫu: <strong className="text-cyan-300">{formatNumber(metrics.data_points, 0)}</strong>
          </span>
          <span>
            Độ sâu TB: <strong className="text-slate-200">{formatNumber(metrics.avg_depth, 1, " km")}</strong>
          </span>
          <span>
            Độ lớn TB: <strong className="text-indigo-300">{formatNumber(metrics.avg_magnitude, 2)}</strong>
          </span>
          <span>
            Độ lớn max: <strong className="text-amber-300">{formatNumber(metrics.max_magnitude, 2)}</strong>
          </span>
        </div>

        <div
          role="group"
          aria-label="Chọn khung thời gian"
          className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1"
        >
          {INTERVALS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={interval === option.value}
              onClick={() => onIntervalChange(option.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                interval === option.value
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ChartBox
        title="Line chart — số lượng & độ lớn theo thời gian"
        hint={metrics.interval === interval ? "Dữ liệu resample từ worker T3" : "Re-bucket UTC từ scatter_plot"}
      >
        <ResponsiveContainer width="100%" height={235}>
          <ComposedChart data={lineData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              minTickGap={18}
            />
            <YAxis
              yAxisId="count"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="magnitude"
              orientation="right"
              tick={AXIS_TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
              domain={[0, "auto"]}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="event_count"
              name="Số sự kiện"
              stroke={CHART_COLORS.cyan}
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="magnitude"
              type="monotone"
              dataKey="max_magnitude"
              name="Độ lớn max"
              stroke={CHART_COLORS.amber}
              strokeWidth={1.6}
              dot={false}
            />
            <Line
              yAxisId="magnitude"
              type="monotone"
              dataKey="avg_magnitude"
              name="Độ lớn TB"
              stroke={CHART_COLORS.indigo}
              strokeWidth={1.4}
              strokeDasharray="5 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartBox
          title="Scatter — phân tán độ sâu × độ lớn"
          hint={`${scatterData.length} điểm`}
        >
          {scatterData.length === 0 ? (
            <EmptyChartState reason="Không có điểm scatter_plot trong payload Pattern 1." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="depth_km"
                  name="Độ sâu (km)"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="magnitude"
                  name="Độ lớn"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  domain={[0, "auto"]}
                />
                <ZAxis type="number" dataKey="magnitude" range={[40, 180]} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={TOOLTIP_LABEL_STYLE}
                  itemStyle={TOOLTIP_ITEM_STYLE}
                  cursor={{ strokeDasharray: "3 3", stroke: "#475569" }}
                />
                <Scatter
                  name="Sự kiện"
                  data={scatterData}
                  fill={CHART_COLORS.cyan}
                  fillOpacity={0.65}
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </ChartBox>

        <ChartBox title="Histogram — phân phối tần suất theo độ lớn" hint={`${bins.length} khoảng`}>
          {bins.length === 0 ? (
            <EmptyChartState reason="Không có magnitude_bins trong payload Pattern 1." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bins} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="bin"
                  tick={AXIS_TICK}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={40}
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
                  cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                />
                <Bar
                  dataKey="count"
                  name="Số sự kiện"
                  fill={CHART_COLORS.sky}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartBox>
      </div>
    </div>
  );
};
