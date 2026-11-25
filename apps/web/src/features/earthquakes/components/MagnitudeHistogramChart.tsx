import React from "react";
import type { EarthquakeItem } from "../../../contracts/earthquake.ts";
import { ALL_COUNTRIES } from "../country-filter.ts";
import { ALL_REGIONS } from "../region-filter.ts";
import { buildMagnitudeHistogram } from "../magnitude-histogram.ts";

interface MagnitudeHistogramChartProps {
  items: EarthquakeItem[];
  countries?: string[];
  selectedCountry: string;
  onCountryChange?: (country: string) => void;
  /** Optional — giữ tương thích caller cũ (I2). Bộ lọc quốc gia/khu vực nay nằm ở header dùng chung. */
  regions?: string[];
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
}

/**
 * Phân bố theo độ lớn — dữ liệu đã được lọc theo `?country=&region=` từ header
 * (xem EarthquakesPage `chartFiltered`). Không render select cục bộ để tránh nhân bản bộ lọc.
 */
export const MagnitudeHistogramChart: React.FC<MagnitudeHistogramChartProps> = ({
  items,
  selectedCountry,
  selectedRegion = ALL_REGIONS,
}) => {
  const bins = buildMagnitudeHistogram(items);
  const max = Math.max(1, ...bins.map((item) => item.count));
  const hasCountry = selectedCountry !== ALL_COUNTRIES;
  const hasRegion = selectedRegion !== ALL_REGIONS;

  return (
    <section className="dashboard-card eq-country-chart" aria-label="Phân bố số trận theo độ lớn">
      <header className="eq-country-chart__heading">
        <h2 className="card-title">Phân bố theo độ lớn</h2>
        {(hasCountry || hasRegion) && (
          <span className="eq-country-chart__context" title="Bộ lọc dùng chung từ header">
            {hasCountry ? selectedCountry : "Tất cả quốc gia"}
            {hasRegion ? ` · ${selectedRegion}` : ""}
          </span>
        )}
      </header>
      <p className="text-caption">{items.length} trận</p>
      {items.length ? (
        <div className="eq-country-chart__bars" role="img" aria-label="Số trận theo từng khoảng độ lớn">
          {bins.map((item, index) => (
            <div className="eq-country-chart__row" key={item.bin}>
              <span className="eq-country-chart__label">{item.bin}</span>
              <span className="eq-country-chart__track">
                <span
                  className="eq-country-chart__fill"
                  style={{ width: `${(item.count / max) * 100}%`, animationDelay: `${index * 60}ms` }}
                />
              </span>
              <span className="eq-country-chart__value">{item.count} · {item.ratio}%</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-caption">Không có dữ liệu để phân bố.</p>
      )}
    </section>
  );
};
