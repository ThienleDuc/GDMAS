import React, { useMemo, useState } from "react";
import { buildExpertReport, type InsightLevel } from "./ai-insights.ts";
import { sectionTitle } from "./insight-structure.ts";
import { useStatisticsData } from "./statistics-data.tsx";

const LEVEL_LABELS: Record<InsightLevel, string> = {
  info: "Thông tin",
  watch: "Theo dõi",
  alert: "Chú ý",
};

/** Bảng phân tích chuyên gia nổi trên header sublayout — dùng chung dữ liệu 6 pattern. */
export const ExpertInsightsPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const {
    temporalData,
    trendData,
    seasonalityData,
    correlationData,
    prediction,
    classification,
    observed,
  } = useStatisticsData();

  const report = useMemo(
    () =>
      buildExpertReport({
        temporal: temporalData,
        trend: trendData,
        seasonality: seasonalityData,
        correlation: correlationData,
        prediction,
        classification,
        observed,
      }),
    [temporalData, trendData, seasonalityData, correlationData, prediction, classification, observed],
  );

  return (
    <div className={`stat-ai ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="stat-ai__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Thu bảng phân tích" : "Phân tích chuyên gia"}
      </button>

      {open && (
        <section className="stat-ai__panel" aria-label="Bảng phân tích chuyên gia">
          <header className="stat-ai__header">
            <div>
              <h2 className="stat-ai__title">Nhận xét chuyên gia</h2>
              <p className="stat-ai__subtitle">Tổng hợp từ 6 nhóm phân tích</p>
            </div>
            <button
              type="button"
              className="stat-ai__close"
              aria-label="Thu bảng phân tích"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("summary")}</h3>
            <p className="stat-ai__headline">{report.headline}</p>
            <p className="stat-ai__text">{report.summary}</p>
          </section>

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("insights")}</h3>
            <ul className="stat-ai__list">
              {report.insights.map((insight) => (
                <li className="stat-ai__item" key={insight.id}>
                  <span className="stat-ai__item-head">
                    <span className="stat-ai__pattern">{insight.pattern}</span>
                    <strong className="stat-ai__item-title">{insight.title}</strong>
                    <span className={`stat-ai__level stat-ai__level--${insight.level}`}>
                      {LEVEL_LABELS[insight.level]}
                    </span>
                  </span>
                  <p className="stat-ai__comment">{insight.comment}</p>
                  {insight.evidence.length > 0 && (
                    <ul className="stat-ai__evidence">
                      {insight.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("outlook")}</h3>
            <p className="stat-ai__text">{report.outlook}</p>
          </section>

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("recommendations")}</h3>
            <ul className="stat-ai__bullets">
              {report.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="stat-ai__section">
            <h3 className="stat-ai__section-title">{sectionTitle("caveats")}</h3>
            <ul className="stat-ai__bullets">
              {report.caveats.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="stat-ai__note">{report.dataSourceNote}</p>
          </section>
        </section>
      )}
    </div>
  );
};
