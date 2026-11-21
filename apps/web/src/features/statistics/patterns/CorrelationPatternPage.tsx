import React from "react";
import { CorrelationHeatmap, PatternPanel } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/** Layout 4 — ma trận tương quan chiếm toàn chiều rộng. */
export const CorrelationPatternPage: React.FC = () => {
  const { correlation, correlationData, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`4. ${PATTERN_TITLES[3]}`}
      state={views.correlation}
      reason={panelReason(correlation.data?.message, "Chưa có dữ liệu tương quan.")}
    >
      <div className="stat-layout stat-layout--stack">
        <CorrelationHeatmap data={correlationData} />
      </div>
    </PatternPanel>
  );
};
