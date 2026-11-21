import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, MapPinned, Radio } from "lucide-react";
import { APP_ROUTES } from "../../app/routes.tsx";
import {
  OverviewHotspotsChart,
  OverviewSeasonalityChart,
  OverviewSeverityChart,
  OverviewTrendChart,
} from "../../components/charts/index.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { useCatalogSelection } from "../earthquakes/useCatalogSelection.ts";
import { useSseMarkers } from "../monitoring/sse-context.ts";
import { formatEventTime, formatWgs84Point, getStoredTimezone } from "../../lib/formatters.ts";
import {
  buildKpis,
  buildLatestEvents,
  buildSeasonalityBars,
  buildSeverityMix,
  buildTrendComparison,
  formatPrediction,
  rankRegionsForCountry,
  severityLabel,
  type RankRow,
} from "./overview-view.ts";
import { useOverviewData } from "./useOverviewData.ts";

/** Trang Tổng quan (Home `/`) — Bento dashboard từ API thật, không mock. */
export const OverviewPage: React.FC = () => {
  const data = useOverviewData();
  const { country, setSelection } = useCatalogSelection();
  const sse = useSseMarkers();
  const timezone = getStoredTimezone();

  const kpis = useMemo(() => buildKpis(data.statistics, data.clusters), [data.statistics, data.clusters]);
  const severity = useMemo(() => buildSeverityMix(data.statistics), [data.statistics]);
  const trend = useMemo(() => buildTrendComparison(data.trend), [data.trend]);
  const seasonality = useMemo(() => buildSeasonalityBars(data.seasonality), [data.seasonality]);
  const ranking = useMemo(() => rankRegionsForCountry(data.clusters, country), [data.clusters, country]);
  const latest = useMemo(() => buildLatestEvents(data.latestEvents), [data.latestEvents]);
  const prediction = useMemo(
    () => formatPrediction(data.predictions, data.classifications),
    [data.predictions, data.classifications],
  );

  const isCountryMode = country === ALL_COUNTRIES;
  const rankingNote = data.clusters?.data?.clusters?.length
    ? data.clusters.data.clusters.every((cluster) => !cluster.dominant_place?.trim())
      ? "BE chưa trả địa danh cho cụm — các cụm chưa rõ được gộp chung vào nhóm «Khác»."
      : null
    : null;

  const handleRankSelect = (row: RankRow) => {
    setSelection(isCountryMode ? row.key : country, isCountryMode ? "all" : row.key);
  };

  return (
    <section className="ov-page" aria-label="Trang tổng quan hệ thống">
      <header className="ov-hero">
        <div className="ov-hero__copy">
          <p className="ov-eyebrow">GDMAS · Trung tâm giám sát</p>
          <h1 className="ov-hero__title">Tổng quan địa chấn</h1>
          <p className="ov-hero__subtitle">
            {new Intl.DateTimeFormat("vi-VN", {
              timeZone: timezone === "UTC" ? "UTC" : "Asia/Ho_Chi_Minh",
              dateStyle: "full",
            }).format(new Date())}
            {isCountryMode ? " · Phạm vi: toàn cầu" : ` · Đang xem: ${country}`}
          </p>
        </div>
        <div className="ov-hero__actions">
          <span className={`ov-live ${sse?.isConnected ? "is-live" : ""}`}>
            <Radio className="h-4 w-4" aria-hidden="true" />
            {sse?.isConnected ? "SSE trực tiếp" : "Đang kết nối SSE…"}
          </span>
          <Link className="ov-cta" to={APP_ROUTES.MONITORING}>
            <MapPinned className="h-4 w-4" aria-hidden="true" /> Bản đồ trực tiếp
          </Link>
          <Link className="ov-cta ov-cta--ghost" to={APP_ROUTES.STATISTICS}>
            <Activity className="h-4 w-4" aria-hidden="true" /> 6 nhóm phân tích
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {!isCountryMode && (
        <p className="ov-global-note">
          Bộ lọc quốc gia đang bật — các KPI thống kê vẫn là số liệu toàn cục (API không nhận param country).
        </p>
      )}
      {data.unavailable.length > 0 && (
        <p className="ov-global-note">
          Một số nguồn chưa có dữ liệu: {data.unavailable.join(", ")}.
        </p>
      )}
      {data.error && <p className="ov-global-note ov-global-note--error">{data.error}</p>}

      {data.loading && !data.statistics ? (
        <div className="ov-skeleton" role="status" aria-label="Đang tải dữ liệu tổng quan">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="ov-skeleton__card" />
          ))}
        </div>
      ) : (
        <div className="ov-grid">
          <div className="ov-kpis">
            {kpis.map((card) => (
              <article className="ov-kpi" key={card.key}>
                <p className="ov-kpi__label">{card.label}</p>
                <p className={`ov-kpi__value ov-kpi__value--${card.tone}`}>
                  {card.value === null ? "—" : card.value.toLocaleString("vi-VN")}
                </p>
                <p className="ov-kpi__hint">{card.hint}</p>
              </article>
            ))}
          </div>

          <article className="ov-card ov-card--8">
            <OverviewTrendChart data={trend} />
          </article>

          <article className="ov-card ov-card--4">
            <OverviewSeverityChart data={severity} />
          </article>

          <article className="ov-card ov-card--6">
            <OverviewHotspotsChart
              rows={ranking}
              mode={isCountryMode ? "country" : "region"}
              note={rankingNote}
              onSelect={handleRankSelect}
            />
          </article>

          <article className="ov-card ov-card--6">
            <OverviewSeasonalityChart data={seasonality} />
          </article>

          <article className="ov-card ov-card--8">
            {latest.length === 0 ? (
              <p className="ov-chart-empty">Chưa có sự kiện nào trong dữ liệu.</p>
            ) : (
              <div className="ds-table-wrapper">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Thời gian ({timezone})</th>
                      <th>Địa điểm</th>
                      <th className="numeric">Độ lớn</th>
                      <th>Mức độ</th>
                      <th>Tọa độ WGS84</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((event) => (
                      <tr key={event.id}>
                        <td><span className="ov-cell-time">{formatEventTime(event.time, timezone)}</span></td>
                        <td><span className="ov-cell-place">{event.place}</span></td>
                        <td className="numeric"><span className="ov-cell-mag">{event.magnitude.toFixed(1)}</span></td>
                        <td>
                          {(() => {
                            const severity = severityLabel(event.magnitude);
                            return (
                              <span className={`ov-severity ov-severity--${severity.tone}`}>
                                {severity.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td><span className="ov-cell-coord">{formatWgs84Point(event.latitude, event.longitude)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link className="ov-inline-link" to={APP_ROUTES.EARTHQUAKES}>
              Xem toàn bộ danh mục <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </article>

          <article className="ov-card ov-card--4">
            <div className="ov-forecast">
              <p className="ov-forecast__value">
                {prediction.predictedValue === null ? "—" : prediction.predictedValue.toLocaleString("vi-VN")}
              </p>
              <p className="ov-forecast__meta">
                Khoảng tin cậy:{" "}
                {prediction.lower !== null && prediction.upper !== null ? (
                  <span className="ov-forecast__highlight">
                    {prediction.lower} – {prediction.upper}
                  </span>
                ) : (
                  "Chưa có khoảng tin cậy"
                )}
              </p>
              <p className="ov-forecast__meta">
                Mức rủi ro:{" "}
                <strong className="ov-forecast__highlight">{prediction.riskLabel ?? "—"}</strong>
              </p>
              {prediction.targetDate && (
                <p className="ov-forecast__meta">
                  Ngày mục tiêu (UTC):{" "}
                  <span className="ov-forecast__highlight">{prediction.targetDate}</span>
                </p>
              )}
              <p className="ov-chart__note">
                Dự báo cho ngày kế tiếp — không so sánh trực tiếp với số liệu 24h thực tế (khác cửa sổ thời gian).
              </p>
            </div>
          </article>
        </div>
      )}
    </section>
  );
};
