import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeverityMix } from "../../features/overview/overview-view.ts";
import { CHART_TOOLTIP } from "./chart-theme.ts";

const SLICE_COLORS: Record<string, string> = {
  minor: "var(--primary)",
  moderate: "var(--chart-4)",
  strong: "var(--destructive)",
};

/** B — "Trong tổng số sự kiện, bao nhiêu là sự kiện mạnh?" — thanh xếp chồng (proposal §3). */
export function OverviewSeverityChart({ data }: { data: SeverityMix }) {
  if (data.slices.length === 0) {
    return <p className="ov-chart-empty">Chưa có dữ liệu phân bố độ lớn.</p>;
  }

  const total = data.slices.reduce((sum, slice) => sum + slice.value, 0);
  const strong = data.slices.find((slice) => slice.key === "strong")?.value ?? 0;
  const stacked = {
    label: "Tỷ lệ",
    ...Object.fromEntries(data.slices.map((slice) => [slice.key, slice.value])),
  };

  return (
    <div className="ov-chart">
      <p className="ov-chart__insight">
        {total > 0 && strong > 0
          ? `Sự kiện mạnh chiếm ${((strong / total) * 100).toFixed(0)}%`
          : "Chưa ghi nhận sự kiện mạnh"}
        {data.partial ? " · một số nhóm chưa có số liệu" : ""}
      </p>
      <ResponsiveContainer width="100%" height={72}>
        <BarChart data={[stacked]} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <XAxis type="number" hide domain={[0, total || 1]} />
          <YAxis type="category" dataKey="label" hide />
          <Tooltip {...CHART_TOOLTIP} />
          {data.slices.map((slice) => (
            <Bar
              key={slice.key}
              dataKey={slice.key}
              name={slice.label}
              stackId="severity"
              barSize={22}
              fill={SLICE_COLORS[slice.key] ?? "var(--muted)"}
            />
          ))}
        </BarChart>
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
