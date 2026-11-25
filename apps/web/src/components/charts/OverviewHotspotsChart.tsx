import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDecimal3, severityLabel, type RankRow } from "../../features/overview/overview-view.ts";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme.ts";

interface OverviewHotspotsChartProps {
  rows: RankRow[];
  mode: "country" | "region";
  note?: string | null;
  onSelect?: (row: RankRow) => void;
}

/** C — "Động đất tập trung ở đâu?" — horizontal bar + bảng xếp hạng 4 cột. */
export function OverviewHotspotsChart({ rows, mode, note, onSelect }: OverviewHotspotsChartProps) {
  if (rows.length === 0) {
    return (
      <div className="ov-chart">
        {note && <p className="ov-chart__note">{note}</p>}
        <p className="ov-chart-empty">
          Chưa có dữ liệu xếp hạng theo {mode === "country" ? "quốc gia" : "khu vực"}.
        </p>
      </div>
    );
  }

  return (
    <div className="ov-chart-row">
      <div className="ov-chart">
        {note && <p className="ov-chart__note">{note}</p>}
        {/* Cao bằng bảng xếp hạng nhờ grid stretch của .ov-chart-row */}
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid {...CHART_GRID} horizontal={false} />
            <XAxis type="number" {...CHART_AXIS} allowDecimals={false} />
            <YAxis type="category" dataKey="label" {...CHART_AXIS} width={96} />
            <Tooltip {...CHART_TOOLTIP} />
            <Bar dataKey="eventCount" name="Số sự kiện" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="ds-table-wrapper ov-rank-table">
        <table className="ds-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{mode === "country" ? "Quốc gia" : "Khu vực"}</th>
              <th className="numeric">Số sự kiện</th>
              <th className="numeric">Độ lớn TB</th>
              <th className="numeric">Độ lớn cao nhất</th>
              <th>Mức độ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td><span className="ov-rank-index">{index + 1}</span></td>
                <td>
                  {onSelect ? (
                    <button type="button" className="ov-rank-link" title={row.label} onClick={() => onSelect(row)}>
                      {row.label}
                    </button>
                  ) : (
                    row.label
                  )}
                </td>
                <td className="numeric"><span className="ov-cell-count">{row.eventCount}</span></td>
                <td className="numeric">
                  <span className="ov-cell-mag">{formatDecimal3(row.avgMagnitude)}</span>
                </td>
                <td className="numeric">
                  <span className="ov-cell-mag">{formatDecimal3(row.maxMagnitude)}</span>
                </td>
                <td>
                  <span className={`ds-badge ${severityLabel(row.maxMagnitude).badgeClass}`}>
                    {severityLabel(row.maxMagnitude).label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
