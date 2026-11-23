import React, { useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { pathWithSelection } from "../earthquakes/catalog-selection.ts";
import {
  RANGE_PRESETS,
  resolveWindow,
  type DateRangePreset,
} from "../earthquakes/earthquake-view.ts";
import { useSseMarkers } from "../monitoring/sse-context.ts";
import { useDatabaseResetFromEvent } from "../../hooks/useDatabaseReset.ts";
import { formatEventTime, formatWgs84Point } from "../../lib/formatters.ts";
import { useTimezone } from "../../contexts/timezone-context.tsx";
import {
  applySseLatestEvent,
  buildKpis,
  buildLatestEvents,
  buildSeasonalityBars,
  buildSeverityMix,
  applyWeekdayWindow,
  buildTrendComparison,
  depthLabel,
  formatDecimal3,
  formatPrediction,
  padWeekdaysTo7,
  SEVERITY_FOOTNOTE,
  rankFromCountryCatalog,
  rankFromRegionCatalog,
  rankRegionsForCountry,
  riskBadgeClass,
  severityLabel,
  type RankRow,
} from "./overview-view.ts";
import { useOverviewData } from "./useOverviewData.ts";

/** Trang Tổng quan (Home `/`) — Bento dashboard từ API thật, không mock. */
export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { country, region, setSelection, withSelection } = useCatalogSelection();
  const sse = useSseMarkers();
  // Dùng chung luồng SSE của shell — tự reset/refetch khi CSDL xoá rồi phục hồi (Demo §4).
  const dbReset = useDatabaseResetFromEvent(sse?.data ?? null);
  // Cửa sổ Ngày/Tuần/Tháng lưu trên URL — áp cho mọi biểu đồ trừ 2 biểu đồ chu kỳ.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRange = searchParams.get("range");
  const range: DateRangePreset =
    rawRange === "day" || rawRange === "week" || rawRange === "month" ? rawRange : "month";
  const window = useMemo(() => resolveWindow(range), [range]);
  const setRange = (value: DateRangePreset) => {
    const next = new URLSearchParams(searchParams);
    next.set("range", value);
    setSearchParams(next, { replace: true });
  };
  const data = useOverviewData({ country, region }, dbReset.refreshVersion, window);
  const { timezone } = useTimezone();

  const kpis = useMemo(() => buildKpis(data.statistics, data.clusters), [data.statistics, data.clusters]);
  const severity = useMemo(() => buildSeverityMix(data.statistics), [data.statistics]);
  const trend = useMemo(() => buildTrendComparison(data.trend), [data.trend]);
  const seasonality = useMemo(
    () => applyWeekdayWindow(padWeekdaysTo7(buildSeasonalityBars(data.seasonality)), range),
    [data.seasonality, range],
  );
  // Ưu tiên danh mục sự kiện thật (có count); fallback cụm cũ khi catalog rỗng (I2/I5).
  const ranking = useMemo(() => {
    const fromCatalog =
      country === ALL_COUNTRIES
        ? rankFromCountryCatalog(data.countryCatalog)
        : rankFromRegionCatalog(data.regionCatalog);
    return fromCatalog.length > 0 ? fromCatalog : rankRegionsForCountry(data.clusters, country);
  }, [country, data.countryCatalog, data.regionCatalog, data.clusters]);
  const latest = useMemo(
    () => applySseLatestEvent(buildLatestEvents(data.latestEvents), sse?.data ?? null),
    [data.latestEvents, sse?.data],
  );
  const prediction = useMemo(
    () => formatPrediction(data.predictions, data.classifications),
    [data.predictions, data.classifications],
  );

  const isCountryMode = country === ALL_COUNTRIES;
  // Chưa chọn quốc gia cụ thể → card vẫn hiện nhưng mọi giá trị là "—" (không dùng số toàn cục — I5).
  const forecast = useMemo(
    () =>
      isCountryMode
        ? {
            ...prediction,
            predictedValue: null,
            lower: null,
            upper: null,
            confidenceLevel: null,
            modelName: null,
            riskLabel: null,
            targetDate: null,
          }
        : prediction,
    [isCountryMode, prediction],
  );
  const rankingNote = data.clusters?.data?.clusters?.length
    ? data.clusters.data.clusters.every((cluster) => !cluster.dominant_place?.trim())
      ? "BE chưa trả địa danh cho cụm — các cụm chưa rõ được gộp chung vào nhóm «Khác»."
      : null
    : null;

  const handleRankSelect = (row: RankRow) => {
    // Truyền selection mới trực tiếp — tránh stale closure của `withSelection`.
    const nextCountry = isCountryMode ? row.key : country;
    const nextRegion = isCountryMode ? "all" : row.key;
    setSelection(nextCountry, nextRegion);
    navigate(pathWithSelection(APP_ROUTES.MONITORING, { country: nextCountry, region: nextRegion }));
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
            {isCountryMode
              ? " · Phạm vi: toàn cầu"
              : ` · Đang xem: ${country}${region !== "all" ? ` / ${region}` : ""}`}
          </p>
        </div>
        <div className="ov-hero__actions">
          <div className="ov-range" role="group" aria-label="Lọc cửa sổ thời gian">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`ov-range__button ${range === preset.value ? "is-active" : ""}`}
                aria-pressed={range === preset.value}
                onClick={() => setRange(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <span className={`ov-live ${sse?.isConnected ? "is-live" : ""}`}>
            <Radio className="h-4 w-4" aria-hidden="true" />
            {sse?.isConnected ? "SSE trực tiếp" : "Đang kết nối SSE…"}
          </span>
          <Link className="ov-cta" to={withSelection(APP_ROUTES.MONITORING)}>
            <MapPinned className="h-4 w-4" aria-hidden="true" /> Bản đồ trực tiếp
          </Link>
          <Link className="ov-cta ov-cta--ghost" to={withSelection(APP_ROUTES.STATISTICS)}>
            <Activity className="h-4 w-4" aria-hidden="true" /> 6 nhóm phân tích
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {dbReset.isCleared && !data.loading && (
        <p className="ov-notice" role="status">
          Cơ sở dữ liệu vừa được xoá — đang hiển thị trạng thái rỗng, sẽ tự cập nhật khi có dữ liệu mới.
        </p>
      )}
      {data.error && !data.loading && (
        <p className="ov-notice ov-notice--error" role="alert">
          Một số nguồn chưa tải được: {data.error}
          <button type="button" className="ov-notice__retry" onClick={data.refresh}>
            Thử lại
          </button>
        </p>
      )}

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
                  {formatDecimal3(card.value)}
                </p>
                <p className="ov-kpi__hint">
                  {card.key === "clusters" && isCountryMode ? `${card.hint} · toàn cục` : card.hint}
                </p>
              </article>
            ))}
          </div>

          {data.secondaryLoading && (
            <p className="ov-secondary-status" role="status">
              Đang tải thêm dữ liệu xếp hạng, chu kỳ và dự báo…
            </p>
          )}

          <article className="ov-card ov-card--6">
            <OverviewTrendChart data={trend} />
          </article>
          <article className="ov-card ov-card--6">
            <h2 className="ov-card__label">Chu kỳ hoạt động · 7 ngày</h2>
            {data.secondaryLoading ? (
              <p className="ov-chart-empty">Đang tải dữ liệu chu kỳ…</p>
            ) : (
              <OverviewSeasonalityChart data={seasonality} />
            )}
          </article>
          <article className="ov-card ov-card--6">
            <OverviewSeverityChart data={severity} />
          </article>
          <article className="ov-card ov-card--6">
            <h2 className="ov-card__label">Dự báo ngày tiếp theo</h2>
            {data.secondaryLoading ? (
              <p className="ov-chart-empty">Đang tải dự báo…</p>
            ) : (
            <div className="ov-forecast">
              <p className="ov-forecast__value">
                {formatDecimal3(forecast.predictedValue)}
              </p>
              <p className="ov-forecast__meta">
                Khoảng tin cậy{" "}
                {forecast.confidenceLevel !== null
                  ? `${Math.round(forecast.confidenceLevel * 100)}%`
                  : "(chưa xác định mức)"}
                :{" "}
                {forecast.lower !== null && forecast.upper !== null ? (
                  <span className="ov-forecast__highlight">
                    {formatDecimal3(forecast.lower)} – {formatDecimal3(forecast.upper)}
                  </span>
                ) : (
                  "Chưa có khoảng tin cậy"
                )}
              </p>
              {forecast.modelName && (
                <p className="ov-forecast__basis">Dựa trên mô hình {forecast.modelName}</p>
              )}
              <p className="ov-forecast__meta">
                Mức rủi ro:{" "}
                <strong className={`ds-badge ${riskBadgeClass(forecast.riskLabel)}`}>
                  {forecast.riskLabel ?? "—"}
                </strong>
              </p>
              {forecast.targetDate && (
                <p className="ov-forecast__meta">
                  Ngày mục tiêu (UTC):{" "}
                  <span className="ov-forecast__highlight">{forecast.targetDate}</span>
                </p>
              )}
              <p className="ov-chart__note">
                Dự báo cho ngày kế tiếp — không so sánh trực tiếp với số liệu 24h thực tế (khác cửa sổ thời gian).
              </p>
            </div>
            )}
          </article>
          <article className="ov-card ov-card--5">
            <h2 className="ov-card__label">Động đất tập trung ở đâu?</h2>
            {data.secondaryLoading ? (
              <p className="ov-chart-empty">Đang tải dữ liệu xếp hạng…</p>
            ) : (
              <OverviewHotspotsChart
                rows={ranking}
                mode={isCountryMode ? "country" : "region"}
                note={rankingNote}
                onSelect={handleRankSelect}
              />
            )}
          </article>
          <article className="ov-card ov-card--7">
            <h2 className="ov-card__label">Danh mục động đất gần đây</h2>
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
                      <th>Độ sâu</th>
                      <th>Tọa độ WGS84</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latest.map((event) => (
                      <tr key={event.id}>
                        <td><span className="ov-cell-time" title={formatEventTime(event.time, timezone)}>{formatEventTime(event.time, timezone)}</span></td>
                        <td><span className="ov-cell-place" title={event.place}>{event.place}</span></td>
                        <td className="numeric"><span className="ov-cell-mag" title={formatDecimal3(event.magnitude)}>{formatDecimal3(event.magnitude)}</span></td>
                        <td>
                          {(() => {
                            const severity = severityLabel(event.magnitude);
                            return (
                              <span className={`ds-badge ${severity.badgeClass}`} title={severity.label}>
                                {severity.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td><span className={`ds-badge ${depthLabel(event.depth_km).badgeClass}`} title={depthLabel(event.depth_km).label}>{depthLabel(event.depth_km).label}</span></td>
                        <td><span className="ov-cell-coord" title={formatWgs84Point(event.latitude, event.longitude)}>{formatWgs84Point(event.latitude, event.longitude)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="ov-severity-footnote">{SEVERITY_FOOTNOTE}</p>
            <Link className="ov-inline-link" to={withSelection(APP_ROUTES.EARTHQUAKES)}>
              Xem toàn bộ danh mục <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </article>
        </div>
      )}
    </section>
  );
};
