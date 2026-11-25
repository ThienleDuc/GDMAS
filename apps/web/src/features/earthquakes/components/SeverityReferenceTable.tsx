import React from "react";
import { SEVERITY_FOOTNOTE, SEVERITY_NOTES } from "../earthquake-insights.ts";

export const SeverityReferenceTable: React.FC = () => (
  <section className="eq-severity-inline" aria-label="Bảng ghi chú độ lớn và độ sâu">
    <h2 className="card-title">Đọc nhanh dữ liệu</h2>
    <p className="eq-severity-inline__intro">
      Độ lớn đo năng lượng giải phóng của trận động đất; giá trị càng cao thì rung lắc càng mạnh.
    </p>
    <table className="ds-table">
      <thead>
        <tr>
          <th>Khoảng</th>
          <th>Mức độ</th>
          <th>Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        {SEVERITY_NOTES.map((section) => (
          <React.Fragment key={section.group}>
            <tr className="eq-severity-inline__group">
              <th colSpan={3} scope="colgroup">{section.group}</th>
            </tr>
            {section.rows.map((row) => (
              <tr key={`${section.group}-${row.range}`}>
                <td>{row.range}</td>
                <td><span className={`ds-badge ${row.badgeClass}`}>{row.level}</span></td>
                <td>{row.note}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
    <p className="eq-severity-inline__footnote">{SEVERITY_FOOTNOTE}</p>
  </section>
);
