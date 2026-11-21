import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SeverityMix } from "../../features/overview/overview-view.ts";
import { CHART_TOOLTIP } from "./chart-theme.ts";

const SLICE_COLORS: Record<string, string> = {
  minor: "var(--primary)",
  moderate: "var(--chart-4)",
  strong: "var(--destructive)",
};

/** B — "Trong tổng số sự kiện, bao nhiêu là sự kiện mạnh?" */
export function OverviewSeverityChart({ data }: { data: SeverityMix }) {
  if (data.slices.length === 0) {
    return <p className="ov-chart-empty">Chưa có dữ liệu phân bố độ lớn.</p>;
  }

  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);
  const strong = data.slices.find((slice) => slice.key === "strong")?.value ?? 0;

  return (
    <div className="ov-chart">
      <p className="ov-chart__insight">
        {total > 0 && strong > 0
          ? `Sự kiện mạnh chiếm ${((strong / total) * 100).toFixed(0)}%`
          : "Chưa ghi nhận sự kiện mạnh"}
        {data.partial ? " · một số nhóm chưa có số liệu" : ""}
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data.slices}
            dataKey="value"
            nameKey="label"
            innerRadius={44}
            outerRadius={72}
            paddingAngle={2}
            stroke="var(--card)"
          >
            {data.slices.map((slice) => (
              <Cell key={slice.key} fill={SLICE_COLORS[slice.key] ?? "var(--muted)"} />
            ))}
          </Pie>
          <Tooltip {...CHART_TOOLTIP} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="ov-legend">
        {data.slices.map((slice) => (
          <li key={slice.key}>
            <span className="ov-legend__dot" style={{ background: SLICE_COLORS[slice.key] ?? "var(--muted)" }} />
            {slice.label}: <strong>{slice.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
