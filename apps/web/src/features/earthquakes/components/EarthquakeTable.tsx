import React from "react";
import type { EventRow } from "../earthquake-view.ts";

interface EarthquakeTableProps {
  rows: EventRow[];
  timezone: string;
}

export const EarthquakeTable: React.FC<EarthquakeTableProps> = ({ rows, timezone }) => (
  <div className="eq-table-card">
    <div className="ds-table-wrapper">
      <table className="ds-table">
      <thead>
        <tr>
          <th>Thời gian ({timezone})</th>
          <th>Địa điểm</th>
          <th className="numeric">Độ lớn</th>
          <th className="numeric">Độ sâu (km)</th>
          <th>Tọa độ WGS84</th>
          <th>Mã nguồn</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>{row.time}</td>
            <td>{row.place}</td>
            <td className="numeric">
              <span className={`ds-badge ${row.magnitude >= 5 ? "ds-badge-error" : "ds-badge-info"}`}>
                {row.magnitude.toFixed(1)}
              </span>
            </td>
            <td className="numeric">{row.depthKm.toFixed(1)}</td>
            <td>{row.coordinates}</td>
            <td>{row.source}</td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  </div>
);
