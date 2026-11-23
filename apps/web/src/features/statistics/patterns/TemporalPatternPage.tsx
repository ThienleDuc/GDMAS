import React from "react";
import { PatternPanel, TemporalPatternCharts } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";

/** Layout 1 — 3 biểu đồ xếp dọc toàn chiều rộng, thanh chu kỳ ở đầu. */
export const TemporalPatternPage: React.FC = () => {
  const { timezone, interval, setInterval, temporal, temporalData, views } = useStatisticsData();

  return (
    <PatternPanel
      title={`1. ${PATTERN_TITLES[0]}`}
      state={views.temporal}
      reason={panelReason(temporal.data?.message, "Chưa có dữ liệu phân tích thời gian.")}
    >
      <div className="stat-layout stat-layout--stack">
        <TemporalPatternCharts data={temporalData} interval={interval} onIntervalChange={setInterval} timezone={timezone} />
      </div>
    </PatternPanel>
  );
};
