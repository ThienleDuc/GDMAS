import React from "react";
import { PatternPanel, TrendPatternChart } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/** Layout 2 — biểu đồ xu hướng chiếm toàn chiều rộng. */
export const TrendPatternPage: React.FC = () => {
  const { trend, trendData, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`2. ${PATTERN_TITLES[1]}`}
      state={views.trend}
      reason={panelReason(trend.data?.message, "Chưa có dữ liệu xu hướng.")}
    >
      <div className="stat-layout stat-layout--stack">
        <TrendPatternChart data={trendData} />
      </div>
    </PatternPanel>
  );
};
