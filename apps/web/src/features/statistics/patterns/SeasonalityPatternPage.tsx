import React from "react";
import { PatternPanel, SeasonalityPatternChart } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/** Layout 3 — biểu đồ chu kỳ chiếm toàn chiều rộng; diễn giải BE nằm ngay dưới chart. */
export const SeasonalityPatternPage: React.FC = () => {
  const { seasonality, seasonalityData, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`3. ${PATTERN_TITLES[2]}`}
      state={views.seasonality}
      reason={panelReason(seasonality.data?.message, "Chưa có dữ liệu chu kỳ.")}
    >
      <div className="stat-layout stat-layout--stack">
        <SeasonalityPatternChart data={seasonalityData} />
      </div>
    </PatternPanel>
  );
};
