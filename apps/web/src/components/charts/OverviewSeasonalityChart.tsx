import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SeasonalityBar } from "../../features/overview/overview-view.ts";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme.ts";

// Ngưỡng màu: Cao = đỏ (destructive), Trung bình = xám, Thấp = xanh (chart-3).
const BAR_COLORS: Record<SeasonalityBar["position"], string> = {
  above: "var(--destructive)",
  average: "var(--muted)",
  below: "var(--chart-3)",
};

const LEVEL_LABELS: Record<SeasonalityBar["position"], string> = {
  above: "Cao",
  average: "Trung bình",
  below: "Thấp",
};

/** D — "Chu kỳ nào (tháng/thứ) hoạt động cao hơn bình thường?" — baseline 1.0 = trung bình. */
export function OverviewSeasonalityChart({ data }: { data: SeasonalityBar[] }) {
  if (data.length === 0) {
    return <p className="ov-chart-empty">Chưa đủ dữ liệu chu kỳ để xác định chu kỳ cao điểm.</p>;
  }

  const peak = data.reduce((best, item) => (item.factor > best.factor ? item : best), data[0]);

  return (
    <div className="ov-chart">
      <p className="ov-chart__insight">
        Chu kỳ cao điểm <strong>{peak.label}</strong> · hệ số {peak.factor.toFixed(2)} (1.00 = trung bình)
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="label" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} domain={[0, "auto"]} allowDecimals={false} />
          <Tooltip {...CHART_TOOLTIP} />
          <ReferenceLine y={1} style={{ stroke: "var(--primary)" }} strokeDasharray="5 4" />
          <Bar dataKey="factor" name="Hệ số mùa vụ" radius={[4, 4, 0, 0]} minPointSize={3}>
            {data.map((item) => (
              <Cell key={item.label} style={{ fill: BAR_COLORS[item.position] }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <ul className="ov-season-legend" aria-label="Chú giải màu chu kỳ">
        <li>
          <span className="ov-season-legend__dot" style={{ background: BAR_COLORS.above }} />
          {LEVEL_LABELS.above}
        </li>
        <li>
          <span className="ov-season-legend__dot" style={{ background: BAR_COLORS.average }} />
          {LEVEL_LABELS.average}
        </li>
        <li>
          <span className="ov-season-legend__dot" style={{ background: BAR_COLORS.below }} />
          {LEVEL_LABELS.below}
        </li>
      </ul>
    </div>
  );
}
