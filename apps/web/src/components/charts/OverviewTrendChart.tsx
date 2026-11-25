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
import type { TrendComparison } from "../../features/overview/overview-view.ts";
import { CHART_AXIS, CHART_GRID, CHART_LINE_WIDTH, CHART_MARGIN, CHART_TOOLTIP } from "./chart-theme.ts";

/** A — "Số động đất đang tăng hay giảm, độ tin cậy thế nào?" */
export function OverviewTrendChart({ data }: { data: TrendComparison }) {
  if (data.rows.length === 0) {
    return <p className="ov-chart-empty">Chưa đủ dữ liệu để so sánh xu hướng theo ngày.</p>;
  }

  const projected = data.rows.filter((row) => row.projected).length;

  return (
    <div className="ov-chart">
      <p className="ov-chart__insight">
        Xu hướng <strong>{data.direction}</strong>
        {data.rSquared !== null ? ` · độ phù hợp ${data.rSquared.toFixed(2)}` : ""}
        {projected > 0 ? ` · ${projected} kỳ chưa trọn` : ""}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.rows} margin={CHART_MARGIN}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="period" {...CHART_AXIS} />
          <YAxis {...CHART_AXIS} allowDecimals={false} />
          <Tooltip {...CHART_TOOLTIP} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Line
            type="monotone"
            dataKey="actual"
            name="Thực tế"
            stroke="var(--primary)"
            strokeWidth={CHART_LINE_WIDTH}
            dot={{ r: 2.5, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="trend"
            name="Xu hướng"
            stroke="var(--chart-4)"
            strokeWidth={CHART_LINE_WIDTH}
            strokeDasharray="6 4"
            dot={{ r: 2, strokeWidth: 0 }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
