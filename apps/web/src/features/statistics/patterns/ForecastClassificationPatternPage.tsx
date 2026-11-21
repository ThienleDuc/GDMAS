import React from "react";
import { ClassificationPatternChart, ForecastPatternChart, PatternPanel } from "../../../components/charts/index.ts";
import { PATTERN_TITLES, panelReason } from "../statistics-view.ts";
import { useStatisticsData } from "../statistics-data.tsx";
import type { PanelState } from "../statistics-view.ts";

/** Gộp Pattern 5 & 6 — cả hai cùng nói về ngày kế tiếp (t+1). */
function combineState(a: PanelState, b: PanelState): PanelState {
  if (a === "loading" || b === "loading") return "loading";
  if (a === "error" || b === "error") return "error";
  if (a === "empty" && b === "empty") return "empty";
  return "ready";
}

export const ForecastClassificationPatternPage: React.FC = () => {
  const { predictions, classifications, prediction, classification, observed, views } =
    useStatisticsData();

  const state = combineState(views.forecast, views.classification);
  const reason =
    panelReason(predictions.data?.message, "") || panelReason(classifications.data?.message, "") ||
    "Chưa có dữ liệu dự báo hoặc phân loại cho ngày kế tiếp.";

  return (
    <PatternPanel
      title={`5 & 6. ${PATTERN_TITLES[4]} · ${PATTERN_TITLES[5]}`}
      state={state}
      reason={reason}
    >
      <div className="stat-layout stat-layout--stack">
        <ForecastPatternChart prediction={prediction} observed={observed} />
        <ClassificationPatternChart data={classification} />
      </div>
    </PatternPanel>
  );
};
