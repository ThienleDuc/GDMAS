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
} from "recharts";
import type { AnalysisInterval } from "../../contracts/common.ts";
import type { TemporalResponse } from "../../contracts/analysis.ts";
import type { TimezoneMode } from "../../lib/formatters.ts";
import { formatStatDate } from "../../features/statistics/statistics-view.ts";
import { buildHistogramBins, buildLineSeriesFromScatter } from "../../lib/transforms/chart-data.ts";
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

/** Pattern 1 — Line / Scatter / Histogram theo Ngày–Tuần–Tháng. */
export function TemporalPatternCharts({
  data,
  interval,
  onIntervalChange,
  timezone = "UTC+7",
}: TemporalPatternChartsProps) {
  const fromScatter = buildLineSeriesFromScatter(data?.scatter_plot, interval).map((point) => ({
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

  return (
    <div className="stat-charts">
      <div className="stat-chart-row">
      <div className="stat-chart-row__main">
      <div className="stat-charts__toolbar" role="group" aria-label="Khoảng thời gian phân tích">
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
        <h3 className="stat-chart-block__title">Số sự kiện & độ lớn theo thời gian</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={lineData} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="date" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} />
            <Tooltip {...CHART_TOOLTIP} />
            <Legend {...CHART_LEGEND} />
            <Line type="monotone" dataKey="event_count" name="Số sự kiện" stroke="#4f46e5" strokeWidth={CHART_LINE_WIDTH} dot={CHART_DOT} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="avg_magnitude" name="Độ lớn TB" stroke="#f97316" strokeWidth={CHART_LINE_WIDTH} dot={CHART_DOT} activeDot={{ r: 4 }} connectNulls={false} />
            <Line type="monotone" dataKey="max_magnitude" name="Độ lớn lớn nhất" stroke="#e11d48" strokeWidth={CHART_LINE_WIDTH} dot={CHART_DOT} activeDot={{ r: 4 }} connectNulls={false} />
            <Brush dataKey="date" height={24} stroke="var(--primary)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-chart-block">
        <h3 className="stat-chart-block__title">Độ lớn theo độ sâu (tọa độ địa lý · giờ quốc tế)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis type="number" dataKey="magnitude" name="Độ lớn" {...CHART_AXIS} />
            <YAxis type="number" dataKey="depth_km" name="Độ sâu (km)" {...CHART_AXIS} reversed />
            <Tooltip {...CHART_TOOLTIP} />
            <Scatter data={scatter} fill="#0891b2" fillOpacity={0.85} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-chart-block">
        <h3 className="stat-chart-block__title">Phân bố theo khoảng độ lớn</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={bins} margin={CHART_MARGIN}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="bin" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} />
            <Tooltip {...CHART_TOOLTIP} />
            <Bar dataKey="count" name="Số trận" fill="#4f46e5" fillOpacity={0.9} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      </div>
      <ChartReadingGuide pattern="temporal" />
      </div>
    </div>
  );
}
