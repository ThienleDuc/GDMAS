import { useMemo, useState } from "react";
import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../../features/earthquakes/region-filter.ts";
import { magnitudeToColor } from "../../lib/transforms/map-data.ts";
import type { RegionClusterRow } from "../../features/monitoring/region-clusters.ts";

interface MapRegionPanelProps {
  countries: string[];
  clusters: RegionClusterRow[];
  country: string;
  region: string;
  onCountryChange: (country: string) => void;
  onRegionChange: (region: string) => void;
  onClusterSelect: (cluster: RegionClusterRow) => void;
}

/** Panel lọc: QUỐC GIA = combobox có tìm kiếm, KHU VỰC = danh sách nút bấm. */
export function MapRegionPanel({
  countries,
  clusters,
  country,
  region,
  onCountryChange,
  onRegionChange,
  onClusterSelect,
}: MapRegionPanelProps) {
  const [countryQuery, setCountryQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cluster of clusters) {
      counts.set(cluster.country, (counts.get(cluster.country) ?? 0) + cluster.eventCount);
    }
    return counts;
  }, [clusters]);

  const normalized = countryQuery.trim().toLowerCase();
  const countryOptions = countries.filter((item) => item.toLowerCase().includes(normalized));
  const visibleClusters = clusters.filter(
    (item) => country === ALL_COUNTRIES || item.country === country,
  );

  const selectCountry = (value: string) => {
    onCountryChange(value);
    setCountryOpen(false);
    setCountryQuery("");
  };

  return (
    <section className="gm-region-panel" aria-label="Lọc theo quốc gia và khu vực">
      <h2 className="gm-region-panel__title">Khu vực giám sát</h2>

      <div className="gm-region-panel__group">
        <label className="gm-region-panel__label" htmlFor="gm-country-combo">Quốc gia</label>
        <div className="gm-region-combo">
          <input
            id="gm-country-combo"
            className="gm-region-combo__input"
            type="text"
            role="combobox"
            aria-expanded={countryOpen}
            aria-controls="gm-country-options"
            autoComplete="off"
            placeholder="Tìm quốc gia…"
            value={countryOpen ? countryQuery : country === ALL_COUNTRIES ? "Tất cả" : country}
            onFocus={() => {
              setCountryOpen(true);
              setCountryQuery("");
            }}
            onChange={(event) => {
              setCountryQuery(event.target.value);
              setCountryOpen(true);
            }}
            onBlur={() => window.setTimeout(() => setCountryOpen(false), 120)}
          />
          {countryOpen && (
            <ul className="gm-region-combo__options" id="gm-country-options" role="listbox">
              <li role="option" aria-selected={country === ALL_COUNTRIES}>
                <button type="button" onClick={() => selectCountry(ALL_COUNTRIES)}>Tất cả</button>
              </li>
              {countryOptions.map((item) => (
                <li key={item} role="option" aria-selected={country === item}>
                  <button type="button" onClick={() => selectCountry(item)}>
                    <span title={item}>{item}</span>
                    <span className="gm-region-combo__count">{countryCounts.get(item) ?? 0}</span>
                  </button>
                </li>
              ))}
              {countryOptions.length === 0 && (
                <li className="gm-region-combo__empty">Không tìm thấy quốc gia</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="gm-region-panel__group">
        <span className="gm-region-panel__label">Khu vực · cụm từ API (mô phỏng)</span>
        <div className="gm-region-panel__list" role="list">
          <button
            type="button"
            className={`gm-region-panel__item ${region === ALL_REGIONS ? "is-active" : ""}`}
            aria-pressed={region === ALL_REGIONS}
            onClick={() => onRegionChange(ALL_REGIONS)}
          >
            <span className="gm-region-panel__name">Tất cả khu vực</span>
          </button>
          {visibleClusters.map((cluster) => {
            const active = (country === ALL_COUNTRIES || country === cluster.country) && region === cluster.region;
            return (
              <button
                key={`${cluster.country}:${cluster.region}`}
                type="button"
                className={`gm-region-panel__item gm-region-panel__item--region ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => onClusterSelect(cluster)}
              >
                <i
                  className="gm-region-panel__dot"
                  style={{
                    backgroundColor:
                      cluster.avgMagnitude === null ? "#64748b" : magnitudeToColor(cluster.avgMagnitude),
                  }}
                  aria-hidden="true"
                />
                <span className="gm-region-panel__region-body">
                  <span className="gm-region-panel__name" title={cluster.region}>
                    {cluster.region}
                  </span>
                  {country === ALL_COUNTRIES && (
                    <span className="gm-region-panel__country" title={cluster.country}>
                      {cluster.country}
                    </span>
                  )}
                </span>
                <span
                  className="gm-region-panel__meta"
                  title={`${cluster.eventCount} sự kiện · độ lớn TB ${cluster.avgMagnitude ?? "—"}`}
                >
                  {cluster.eventCount} sự kiện · độ lớn trung bình {cluster.avgMagnitude ?? "—"}
                </span>
              </button>
            );
          })}
          {visibleClusters.length === 0 && (
            <span className="gm-region-panel__empty">Không có cụm phù hợp</span>
          )}
        </div>
      </div>
    </section>
  );
}
