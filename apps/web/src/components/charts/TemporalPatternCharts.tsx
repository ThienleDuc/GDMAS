import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  usePlotArea,
} from "recharts";
import type { AnalysisInterval } from "../../contracts/common.ts";
import type { TemporalResponse } from "../../contracts/analysis.ts";
import type { TimezoneMode } from "../../lib/formatters.ts";
import { formatStatDate } from "../../features/statistics/statistics-view.ts";
import {
  buildHistogramBins,
  buildLineSeriesFromScatter,
} from "../../lib/transforms/chart-data.ts";
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

interface TemporalPatternChartsProps {
  data: TemporalResponse["data"] | null;
  interval: AnalysisInterval;
  onIntervalChange: (interval: AnalysisInterval) => void;
  /** Chế độ UTC/UTC+7 từ header — optional để caller cũ không vỡ (I2). */
  timezone?: TimezoneMode;
}

const INTERVALS: ReadonlyArray<{ value: AnalysisInterval; label: string }> = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

const SCATTER_MAGNITUDE_BANDS = [
  { label: "< 3,0", min: -Infinity, max: 3, color: "#3b65b8" },
  { label: "3,0–<4,0", min: 3, max: 4, color: "#42a5f5" },
  { label: "4,0–<5,0", min: 4, max: 5, color: "#a78bfa" },
  { label: "5,0–<6,0", min: 5, max: 6, color: "#fb923c" },
  { label: "≥ 6,0", min: 6, max: Infinity, color: "#f87171" },
];

function TemporalPlotMessage({ children }: { children: ReactNode }) {
  const plot = usePlotArea();
  if (!plot) return null;

  return (
    <foreignObject x={plot.x} y={plot.y} width={plot.width} height={plot.height} pointerEvents="none">
      <div className="relative size-full">{children}</div>
    </foreignObject>
  );
}

/** Pattern 1 — Line / Scatter / Histogram theo Ngày–Tuần–Tháng. */
export function TemporalPatternCharts({
  data,
  interval,
  onIntervalChange,
  timezone = "UTC+7",
}: TemporalPatternChartsProps) {
  const fromScatter = buildLineSeriesFromScatter(
    data?.scatter_plot,
    interval,
  ).map((point) => ({
    ...point,
    date: formatStatDate(point.date, timezone),
  }));
  const fromLine = (data?.line_chart ?? []).map((point) => ({
    date: formatStatDate(point.date, timezone),
    event_count: point.event_count,
    avg_magnitude: point.avg_magnitude ?? null,
    max_magnitude: point.max_magnitude ?? null,
  }));
  const lineData = fromLine.length > 0 ? fromLine : fromScatter;
  const bins = buildHistogramBins(data?.histogram?.magnitude_bins);
  const scatter = data?.scatter_plot ?? [];
  const hasEvents =
    (data?.stats?.data_points ?? 0) > 0 ||
    lineData.some(({ event_count }) => event_count > 0) ||
    scatter.length > 0 ||
    bins.some(({ count }) => count > 0);
  const emptyMessage = !hasEvents && (
    <p className="pointer-events-none absolute inset-x-6 top-1/2 z-10 m-0 -translate-y-1/2 text-center text-sm text-[var(--muted-foreground)]">
      <span className="inline-flex flex-col gap-1 bg-[var(--surface)] px-2 py-1">
        <span>
          Không có trận động đất nào được ghi nhận trong phạm vi đã chọn.
        </span>
        <span className="stat-note opacity-70">
          Thử chọn khoảng thời gian dài hơn hoặc đổi bộ lọc quốc gia, khu vực.
        </span>
      </span>
    </p>
  );

  return (
    <div className="stat-charts">
      <div className="stat-chart-row">
        <div className="stat-chart-row__main">
          <div
            className="stat-charts__toolbar"
            role="group"
            aria-label="Khoảng thời gian phân tích"
          >
            <span className="stat-charts__label">Chu kỳ</span>
            {INTERVALS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={interval === item.value}
                className={`stat-chip ${interval === item.value ? "is-active" : ""}`}
                onClick={() => onIntervalChange(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="stat-chart-block">
            <h3 className="stat-chart-block__title">
              Số sự kiện & độ lớn theo thời gian
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData} margin={CHART_MARGIN}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="date" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend {...CHART_LEGEND} />
                <Line
                  type="monotone"
                  dataKey="event_count"
                  name="Số sự kiện"
                  stroke="#4f46e5"
                  strokeWidth={CHART_LINE_WIDTH}
                  dot={CHART_DOT}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_magnitude"
                  name="Độ lớn TB"
                  stroke="#f97316"
                  strokeWidth={CHART_LINE_WIDTH}
                  dot={CHART_DOT}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="max_magnitude"
                  name="Độ lớn lớn nhất"
                  stroke="#e11d48"
                  strokeWidth={CHART_LINE_WIDTH}
                  dot={CHART_DOT}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Brush dataKey="date" height={24} stroke="var(--primary)" />
                {emptyMessage && <TemporalPlotMessage>{emptyMessage}</TemporalPlotMessage>}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-chart-block">
            <h3 className="stat-chart-block__title">
              Độ lớn theo độ sâu (tọa độ địa lý · giờ quốc tế)
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={CHART_MARGIN}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  type="number"
                  dataKey="magnitude"
                  name="Độ lớn"
                  {...CHART_AXIS}
                />
                <YAxis
                  type="number"
                  dataKey="depth_km"
                  name="Độ sâu (km)"
                  {...CHART_AXIS}
                  reversed
                />
                <Tooltip {...CHART_TOOLTIP} />
                <Legend
                  {...CHART_LEGEND}
                  content={() => (
                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[var(--muted-foreground)]">
                      <strong>Độ lớn</strong>
                      <ul
                        className="flex flex-wrap justify-center gap-x-3 gap-y-1"
                        aria-label="Các mức độ lớn"
                      >
                        {[...SCATTER_MAGNITUDE_BANDS]
                          .reverse()
                          .map(({ label, color }) => (
                            <li
                              key={label}
                              className="inline-flex items-center gap-1 whitespace-nowrap"
                            >
                              <span
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: color }}
                                aria-hidden="true"
                              />
                              {label}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                />
                {SCATTER_MAGNITUDE_BANDS.map(({ label, min, max, color }) => (
                  <Scatter
                    key={label}
                    name={label}
                    data={scatter.filter(
                      ({ magnitude }) => min <= magnitude && magnitude < max,
                    )}
                    fill={color}
                    fillOpacity={0.85}
                  />
                ))}
                {emptyMessage && <TemporalPlotMessage>{emptyMessage}</TemporalPlotMessage>}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-chart-block relative">
            <h3 className="stat-chart-block__title">
              Phân bố theo khoảng độ lớn
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={bins} margin={CHART_MARGIN}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="bin" {...CHART_AXIS} />
                <YAxis {...CHART_AXIS} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar
                  dataKey="count"
                  name="Số trận"
                  fill="#4f46e5"
                  fillOpacity={0.9}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            {emptyMessage}
          </div>
        </div>
        <ChartReadingGuide pattern="temporal" />
      </div>
    </div>
  );
}
