import React from "react";
import type { CountryClusterSummary } from "../../../contracts/country-clusters.ts";
import { formatNumber } from "../../../lib/transforms/chart-data.ts";

interface CountryClusterChartProps {
  clusters: CountryClusterSummary[];
  selectedCountry: string;
  onCountryChange: (country: string) => void;
}

export const CountryClusterChart: React.FC<CountryClusterChartProps> = ({
  clusters,
  selectedCountry,
  onCountryChange,
}) => {
  const visible = selectedCountry === "all" ? clusters : clusters.filter((item) => item.country === selectedCountry);
  const max = Math.max(1, ...visible.map((item) => item.eventCount));

  return (
    <section className="dashboard-card eq-country-chart" aria-label="Cụm động đất theo quốc gia">
      <header className="eq-country-chart__heading">
        <h2 className="card-title">Cụm theo quốc gia</h2>
        <select
          className="ds-select"
          aria-label="Lọc quốc gia"
          value={selectedCountry}
          onChange={(event) => onCountryChange(event.target.value)}
        >
          <option value="all">Tất cả</option>
          {clusters.map((item) => (
            <option key={item.country} value={item.country}>{item.country}</option>
          ))}
        </select>
      </header>
      {visible.length ? (
        <div className="eq-country-chart__bars" role="img" aria-label="Số sự kiện theo quốc gia">
          {visible.map((item) => (
            <div className="eq-country-chart__row" key={item.country}>
              <span className="eq-country-chart__label">{item.country}</span>
              <span className="eq-country-chart__track">
                <span className="eq-country-chart__fill" style={{ width: `${(item.eventCount / max) * 100}%` }} />
              </span>
              <span className="eq-country-chart__value">{formatNumber(item.eventCount, 0)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-caption">Không có dữ liệu cụm theo quốc gia.</p>
      )}
    </section>
  );
};
