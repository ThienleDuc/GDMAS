import { Fragment } from "react";
import { ChartReadingGuide } from "./ChartReadingGuide.tsx";
import type { CorrelationResponse } from "../../contracts/analysis.ts";
import {
  buildCorrelationCells,
  correlationColor,
  correlationVariableLabel,
} from "../../features/statistics/statistics-view.ts";

/** Pattern 4 — heatmap 5×5, tooltip hệ số Pearson, không suy diễn nhân quả. */
export function CorrelationHeatmap({ data }: { data: CorrelationResponse["data"] | null }) {
  const variables = data?.variables ?? [];
  const cells = buildCorrelationCells(variables, data?.matrix);

  return (
    <div className="stat-chart-row">
    <div className="stat-chart-row__main">
    <div className="stat-heatmap">
      <div
        className="stat-heatmap__grid"
        style={{ gridTemplateColumns: `140px repeat(${variables.length}, minmax(0, 1fr))` }}
      >
        <span />
        {variables.map((variable) => (
          <span key={`col-${variable}`} className="stat-heatmap__axis">
            {correlationVariableLabel(variable)}
          </span>
        ))}
        {variables.map((rowVariable, row) => (
          <Fragment key={`row-${rowVariable}`}>
            <span className="stat-heatmap__axis">{correlationVariableLabel(rowVariable)}</span>
            {cells
              .filter((cell) => cell.row === row)
              .map((cell) => (
                <span
                  key={`${cell.row}-${cell.col}`}
                  className="stat-heatmap__cell"
                  style={{ backgroundColor: correlationColor(cell.value) }}
                  title={`${correlationVariableLabel(cell.y)} và ${correlationVariableLabel(cell.x)}: hệ số ${cell.label}`}
                >
                  {cell.label}
                </span>
              ))}
          </Fragment>
        ))}
      </div>
      {data?.note && <p className="stat-note">{data.note}</p>}
      <p className="stat-note">Ma trận tương quan — không suy diễn nhân quả.</p>
    </div>
    </div>
    <ChartReadingGuide pattern="correlation" />
    </div>
  );
}
