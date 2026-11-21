import React from "react";
import { ForecastPatternChart, PatternPanel } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/**
 * Module giữ lại để tương thích import cũ (RULE-03).
 * Pattern 5 hiện được gộp chung với Pattern 6 trong ForecastClassificationPatternPage.
 */
export const ForecastPatternPage: React.FC = () => {
  const { predictions, prediction, observed, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`5. ${PATTERN_TITLES[4]}`}
      state={views.forecast}
      reason={panelReason(predictions.data?.message, "Chưa có dữ liệu dự báo.")}
    >
      <div className="stat-layout stat-layout--stack">
        <div className="stat-layout__summary">
          <span className="stat-layout__summary-item">
            Ngày dự báo: <strong>{prediction?.target_date ?? "—"}</strong>
          </span>
          <span className="stat-layout__summary-item">
            Giá trị dự báo: <strong>{prediction?.predicted_value ?? "—"}</strong>
          </span>
        </div>
        <ForecastPatternChart prediction={prediction} observed={observed} />
      </div>
    </PatternPanel>
  );
};
