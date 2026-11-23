import { ALL_COUNTRIES } from "../../features/earthquakes/country-filter.ts";
import { ALL_REGIONS } from "../../features/earthquakes/region-filter.ts";
import { magnitudeToColor } from "../../lib/transforms/map-data.ts";
import type { RegionClusterRow } from "../../features/monitoring/region-clusters.ts";
import { regionKey } from "../../features/monitoring/region-catalog-view.ts";

interface MapRegionPanelProps {
  /** Giữ optional để tương thích caller cũ — quốc gia giờ lấy từ header/URL (I2). */
  countries?: string[];
  onCountryChange?: (country: string) => void;
  /** Danh mục khu vực do BE suy từ place (fallback vẫn là clusters). */
  regions?: string[];
  clusters: RegionClusterRow[];
  country: string;
  region: string;
  onRegionChange: (region: string) => void;
  onClusterSelect: (cluster: RegionClusterRow) => void;
}

/** Panel lọc KHU VỰC — quốc gia lấy từ combobox trên header, không lặp lại ở đây. */
export function MapRegionPanel({
  regions = [],
  clusters,
  country,
  region,
  onRegionChange,
  onClusterSelect,
}: MapRegionPanelProps) {
  const seenClusterRegions = new Set<string>();
  // Mỗi khu vực chỉ hiện 1 lần — gộp biến thể theo khoá normalize (trim + casefold).
  const visibleClusters = clusters.filter((item) => {
    if (country !== ALL_COUNTRIES && item.country !== country) return false;
    const key = regionKey(item.region);
    if (seenClusterRegions.has(key)) return false;
    seenClusterRegions.add(key);
    return true;
  });
  const seenExtraRegions = new Set<string>();
  // Khu vực BE trả thêm mà cụm chưa có — vẫn cho phép chọn lọc, nhưng không nhân bản.
  const extraRegions = regions.filter((name) => {
    const key = regionKey(name);
    if (seenExtraRegions.has(key)) return false;
    seenExtraRegions.add(key);
    return !visibleClusters.some((cluster) => regionKey(cluster.region) === key);
  });

  return (
    <section className="gm-region-panel" aria-label="Lọc theo quốc gia và khu vực">
      <h2 className="gm-region-panel__title">Khu vực giám sát</h2>

      <div className="gm-region-panel__group">
        <span className="gm-region-panel__label">Khu vực</span>
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
          {extraRegions.map((name) => (
            <button
              key={`region:${name}`}
              type="button"
              className={`gm-region-panel__item gm-region-panel__item--region ${region === name ? "is-active" : ""}`}
              aria-pressed={region === name}
              onClick={() => onRegionChange(name)}
            >
              <span className="gm-region-panel__region-body">
                <span className="gm-region-panel__name" title={name}>{name}</span>
              </span>
            </button>
          ))}
          {visibleClusters.length === 0 && extraRegions.length === 0 && (
            <span className="gm-region-panel__empty">Không có cụm phù hợp</span>
          )}
        </div>
      </div>
    </section>
  );
}
