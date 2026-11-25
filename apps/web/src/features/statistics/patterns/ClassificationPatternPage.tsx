import React from "react";
import { ClassificationPatternChart, PatternPanel } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/**
 * Module giữ lại để tương thích import cũ (RULE-03).
 * Pattern 6 hiện được gộp chung với Pattern 5 trong ForecastClassificationPatternPage.
 */
export const ClassificationPatternPage: React.FC = () => {
  const { classifications, classification, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`6. ${PATTERN_TITLES[5]}`}
      state={views.classification}
      reason={panelReason(classifications.data?.message, "Chưa có dữ liệu phân loại.")}
    >
      <div className="stat-layout stat-layout--stack">
        <ClassificationPatternChart data={classification} />
      </div>
    </PatternPanel>
  );
};
