import React from "react";
import type { EarthquakeItem, StatisticsResponse } from "../../../contracts/earthquake.ts";
import { formatNumber } from "../../../lib/transforms/chart-data.ts";
import { AsyncStatePanel } from "./AsyncStatePanel.tsx";
import { MagnitudeHistogramChart } from "./MagnitudeHistogramChart.tsx";

interface EarthquakeInsightsProps {
  statistics: StatisticsResponse | null;
  items: EarthquakeItem[];
  countries: string[];
  selectedCountry: string;
  onCountryChange: (country: string) => void;
  /** Khu vực — optional để giữ tương thích caller cũ (I2). */
  regions?: string[];
  selectedRegion?: string;
  onRegionChange?: (region: string) => void;
  loading: boolean;
  error: string | null;
  unavailable: string[];
  onRetry: () => void;
}

function KpiCard({ label, value, unit }: { label: string; value: number | null | undefined; unit?: string }) {
  return (
    <div className="kpi-card dashboard-card">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value">{formatNumber(value, 1, unit)}</p>
    </div>
  );
}

export const EarthquakeInsights: React.FC<EarthquakeInsightsProps> = ({
  statistics,
  items,
  selectedCountry,
  selectedRegion = "all",
  loading,
  error,
  unavailable,
  onRetry,
}) => {
  if (loading) return <AsyncStatePanel state="loading" />;
  if (error) return <AsyncStatePanel state="error" message={error} onRetry={onRetry} />;
  if (!statistics && items.length === 0) {
    return (
      <AsyncStatePanel
        state="empty"
        message={unavailable.length ? `BE chưa triển khai: ${unavailable.join(", ")}` : undefined}
      />
    );
  }

  const stats = statistics?.data;

  return (
    <div className="eq-overview">
      {/* Bộ lọc quốc gia/khu vực dùng chung nằm ở header — histogram chỉ đọc ngữ cảnh. */}
      <MagnitudeHistogramChart
        items={items}
        countries={[]}
        selectedCountry={selectedCountry}
        selectedRegion={selectedRegion}
      />
      <div className="eq-overview__kpis">
        <KpiCard label="Tổng số trận" value={stats?.total_events} />
        <KpiCard label="Trong 24 giờ" value={stats?.recent_24h_count} />
        <KpiCard label="Độ lớn trung bình" value={stats?.avg_magnitude} />
        <KpiCard label="Độ lớn lớn nhất" value={stats?.max_magnitude} />
      </div>
      {unavailable.length > 0 && (
        <p className="text-caption">Một số nguồn chưa có dữ liệu: {unavailable.join(", ")}.</p>
      )}
    </div>
  );
};
