import React from "react";
import type { EarthquakeItem } from "../../../contracts/earthquake.ts";
import { buildMagnitudeHistogram } from "../magnitude-histogram.ts";

interface MagnitudeHistogramChartProps {
  items: EarthquakeItem[];
  countries: string[];
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  /** Optional — giữ tương thích caller cũ (I2). */
  regions?: string[];
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
}

export const MagnitudeHistogramChart: React.FC<MagnitudeHistogramChartProps> = ({
  items,
  countries,
  selectedCountry,
  onCountryChange,
  regions = [],
  selectedRegion = "all",
  onRegionChange,
}) => {
  const bins = buildMagnitudeHistogram(items);
  const max = Math.max(1, ...bins.map((item) => item.count));

  return (
    <section className="dashboard-card eq-country-chart" aria-label="Phân bố số trận theo độ lớn">
      <header className="eq-country-chart__heading">
        <h2 className="card-title">Phân bố theo độ lớn</h2>
        <select
          className="ds-select"
          aria-label="Lọc theo quốc gia"
          value={selectedCountry}
          onChange={(event) => onCountryChange(event.target.value)}
        >
          <option value="all">Tất cả quốc gia</option>
          {countries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        {onRegionChange && (
          <select
            className="ds-select"
            aria-label="Lọc theo khu vực"
            value={selectedRegion}
            onChange={(event) => onRegionChange(event.target.value)}
            disabled={selectedCountry === "all" || regions.length === 0}
          >
            <option value="all">Tất cả khu vực</option>
            {regions.map((region) => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
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
