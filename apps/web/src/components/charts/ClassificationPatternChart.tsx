import { ChartReadingGuide } from "./ChartReadingGuide.tsx";
import {
  buildRiskBars,
  formatPercent,
  normalizeRiskLabel,
} from "../../lib/transforms/chart-data.ts";
import type { ClassificationMetrics } from "../../lib/transforms/chart-types.ts";

const RISK_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Rất cao",
};

/** Pattern 6 — nhãn rủi ro 4 mức + phân phối xác suất. */
export function ClassificationPatternChart({ data }: { data: ClassificationMetrics | null }) {
  const level = data?.predicted_label ? normalizeRiskLabel(data.predicted_label) : null;
  const bars = buildRiskBars(data?.probability_scores ?? null);

  return (
    <div className="stat-charts">
    <div className="stat-chart-row">
    <div className="stat-chart-row__main">
      <div className="stat-metrics">
        <span>Ngày dự báo: <strong>{data?.target_date ?? "—"}</strong></span>
        <span>Mức dự báo: <strong>{level ? (RISK_LABELS[level] ?? level) : "—"}</strong></span>
      </div>
      <div className="stat-risk-bars">
        {bars.length === 0 ? (
          <p className="stat-note">Không có phân phối xác suất hợp lệ từ máy chủ.</p>
        ) : (
          bars.map((bar) => (
            <div className="stat-risk-row" key={bar.level}>
              <span className="stat-risk-row__label">{RISK_LABELS[bar.level] ?? bar.level}</span>
              <span className="stat-risk-row__track">
                <span
                  className="stat-risk-row__fill"
                  style={{ width: `${Math.max(0, Math.min(100, bar.probability * 100))}%` }}
                />
              </span>
              <span className="stat-risk-row__value">{formatPercent(bar.probability, 1)}</span>
            </div>
          ))
        )}
      </div>
      <p className="stat-note">
        Dự báo cho ngày kế tiếp. Chỉ báo thống kê thử nghiệm — không phải cảnh báo chính thức.
      </p>
    </div>
    <ChartReadingGuide pattern="classification" />
    </div>
    </div>
  );
}
