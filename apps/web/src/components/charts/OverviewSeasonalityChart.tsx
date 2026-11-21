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

const BAR_COLORS: Record<SeasonalityBar["position"], string> = {
  above: "var(--chart-4)",
  below: "var(--chart-2)",
  average: "var(--muted)",
};

/** D — "Khung giờ nào hoạt động cao hơn bình thường?" — baseline 1.0 = mức trung bình. */
export function OverviewSeasonalityChart({ data }: { data: SeasonalityBar[] }) {
  if (data.length === 0) {
    return <p className="ov-chart-empty">Chưa đủ dữ liệu chu kỳ để xác định khung giờ cao điểm.</p>;
  }

  const peak = data.reduce((best, item) => (item.factor > best.factor ? item : best), data[0]);

  return (
    <div className="ov-chart">
      <p className="ov-chart__insight">
        Cao điểm <strong>{peak.label}</strong> · hệ số {peak.factor.toFixed(2)} (1.00 = trung bình)
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="label" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} domain={[0, "auto"]} />
          <Tooltip {...CHART_TOOLTIP} />
          <ReferenceLine y={1} stroke="var(--primary)" strokeDasharray="5 4" />
          <Bar dataKey="factor" name="Hệ số mùa vụ" radius={[4, 4, 0, 0]}>
            {data.map((item) => (
              <Cell key={item.label} fill={BAR_COLORS[item.position]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
