/**
 * View model thuần cho trang Tổng quan — không React/DOM/network (I7).
 * Mọi mốc thời gian giữ nguyên UTC ISO 8601 `Z`; tọa độ WGS84; thiếu số liệu trả null/[]
 * và gắn cờ trung thực — không bịa số, không fallback mock (I3/I5).
 */

import type { SeasonalityResponse, TrendResponse } from "../../contracts/analysis.ts";
import type { ClassificationsResponse } from "../../contracts/classifications.ts";
import type { ClustersResponse } from "../../contracts/clusters.ts";
import type { EarthquakeItem, StatisticsResponse } from "../../contracts/earthquake.ts";
import type { PredictionsResponse } from "../../contracts/predictions.ts";
import { isFiniteNumber, normalizeRiskLabel, buildTrendSeries } from "../../lib/transforms/chart-data.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { countryFromPlace } from "../earthquakes/country-clusters.ts";
import { regionFromPlace } from "../earthquakes/region-filter.ts";

export interface KpiCard {
  key: string;
  label: string;
  value: number | null;
  hint: string;
  tone: "primary" | "info" | "warning" | "success";
}

export interface SeveritySlice {
  key: string;
  label: string;
  value: number;
}

export interface SeverityMix {
  slices: SeveritySlice[];
  partial: boolean;
}

export type SeverityTone = "high" | "medium" | "low";

export interface SeverityLabel {
  label: string;
  tone: SeverityTone;
}

/** Nhãn mức độ bằng tiếng Việt cho bảng xếp hạng/live feed — không phải cảnh báo chính thức. */
export function severityLabel(magnitude: number | null | undefined): SeverityLabel {
  if (!isFiniteNumber(magnitude)) return { label: "—", tone: "low" };
  if (magnitude >= 6) return { label: "Cao", tone: "high" };
  if (magnitude >= 5) return { label: "Trung bình", tone: "medium" };
  return { label: "Thấp", tone: "low" };
}

export interface RankRow {
  key: string;
  label: string;
  eventCount: number;
  avgMagnitude: number | null;
  maxMagnitude: number | null;
  clusterIds: number[];
}

export interface TrendRow {
  period: string;
  actual: number;
  trend: number | null;
  projected: boolean;
}

export interface TrendComparison {
  rows: TrendRow[];
  direction: string;
  rSquared: number | null;
}

export interface SeasonalityBar {
  label: string;
  factor: number;
  position: "above" | "below" | "average";
}

export interface LatestEventRow {
  id: number;
  time: string;
  place: string;
  magnitude: number;
  latitude: number;
  longitude: number;
}

export interface PredictionView {
  targetDate: string | null;
  predictedValue: number | null;
  lower: number | null;
  upper: number | null;
  riskLabel: string | null;
}

const DIRECTION_LABELS: Record<string, string> = {
  increasing: "Tăng",
  decreasing: "Giảm",
  stable: "Ổn định",
};

/** Nhãn rủi ro Pattern 6 bằng tiếng Việt — không để lộ LOW/MEDIUM/HIGH/CRITICAL. */
const RISK_LABELS: Record<string, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Rất cao",
};

export function riskLabelVietnamese(level: string | null): string | null {
  if (!level) return null;
  return RISK_LABELS[level] ?? level;
}

/** 4 KPI — giá trị lấy trực tiếp từ contract; thiếu → null (không trả 0 giả). */
export function buildKpis(
  statistics: StatisticsResponse | null,
  clusters: ClustersResponse | null,
): KpiCard[] {
  const data = statistics?.data;
  const avgMagnitude = isFiniteNumber(data?.avg_magnitude) ? data!.avg_magnitude! : null;

  return [
    {
      key: "total",
      label: "Tổng sự kiện",
      value: isFiniteNumber(data?.total_events) ? data!.total_events! : null,
      hint: avgMagnitude === null ? "Chưa có dữ liệu thống kê" : `Độ lớn TB M${avgMagnitude.toFixed(1)}`,
      tone: "primary",
    },
    {
      key: "recent24h",
      label: "24 giờ gần đây",
      value: isFiniteNumber(data?.recent_24h_count) ? data!.recent_24h_count! : null,
      hint: "Cửa sổ 24h tính theo UTC",
      tone: "info",
    },
    {
      key: "maxMagnitude",
      label: "Độ lớn cao nhất",
      value: isFiniteNumber(data?.max_magnitude) ? data!.max_magnitude! : null,
      hint: "Giá trị lớn nhất trong tập dữ liệu",
      tone: "warning",
    },
    {
      key: "clusters",
      label: "Cụm địa chấn",
      value: isFiniteNumber(clusters?.data?.clusters_count)
        ? clusters!.data!.clusters_count!
        : clusters?.data?.clusters
          ? clusters.data.clusters.length
          : null,
      hint: "Kết quả phân cụm DBSCAN gần nhất",
      tone: "success",
    },
  ];
}

/** Cơ cấu độ lớn — chỉ lấy field có thật; nếu thiếu nhóm nhỏ thì đánh dấu partial. */
export function buildSeverityMix(statistics: StatisticsResponse | null): SeverityMix {
  const data = statistics?.data;
  const known: ReadonlyArray<{ key: string; label: string; raw: unknown }> = [
    { key: "minor", label: "Dưới 5.0", raw: data?.minor_events_count },
    { key: "moderate", label: "5.0 – 5.9", raw: data?.moderate_events_count },
    { key: "strong", label: "Từ 6.0", raw: data?.strong_events_count },
  ];
  const slices = known
    .filter((item) => isFiniteNumber(item.raw))
    .map((item) => ({ key: item.key, label: item.label, value: Math.max(0, Math.trunc(item.raw as number)) }));

  return { slices, partial: slices.length < known.length };
}

/**
 * Quốc gia của cụm: chỉ tin `dominant_place`. BE chưa trả field này → "Khác",
 * không đoán từ `name` (tên demo tiếng Việt không khớp bộ pattern tiếng Anh).
 */
function countryOf(cluster: { dominant_place?: string | null }): string {
  return cluster.dominant_place?.trim() ? countryFromPlace(cluster.dominant_place) : "Khác";
}

interface AggregateGroup {
  key: string;
  rows: ReadonlyArray<{ eventCount: number; avg: number | null; max: number | null; clusterId: number }>;
}

function aggregateRows(entries: ReadonlyArray<AggregateGroup>): RankRow[] {
  return entries
    .map(({ key, rows }) => {
      let weightedSum = 0;
      let weight = 0;
      let maxMagnitude: number | null = null;
      for (const row of rows) {
        if (row.avg !== null) {
          weightedSum += row.avg * row.eventCount;
          weight += row.eventCount;
        }
        if (row.max !== null) maxMagnitude = Math.max(maxMagnitude ?? row.max, row.max);
      }
      return {
        key,
        label: key,
        eventCount: rows.reduce((sum, row) => sum + row.eventCount, 0),
        avgMagnitude: weight > 0 ? Number((weightedSum / weight).toFixed(2)) : null,
        maxMagnitude,
        clusterIds: rows.map((row) => row.clusterId),
      };
    })
    .sort((left, right) => right.eventCount - left.eventCount || left.label.localeCompare(right.label))
    .slice(0, 5);
}

/** Xếp hạng theo quốc gia (khi chưa chọn nước cụ thể). */
export function rankCountries(clusters: ClustersResponse | null): RankRow[] {
  const list = clusters?.data?.clusters ?? [];
  const groups = new Map<string, Array<{ eventCount: number; avg: number | null; max: number | null; clusterId: number }>>();

  for (const cluster of list) {
    const key = countryOf(cluster);
    const group = groups.get(key) ?? [];
    group.push({
      eventCount: isFiniteNumber(cluster.event_count) ? cluster.event_count : 0,
      avg: isFiniteNumber(cluster.avg_magnitude) ? cluster.avg_magnitude : null,
      max: isFiniteNumber(cluster.max_magnitude) ? cluster.max_magnitude : null,
      clusterId: cluster.cluster_id,
    });
    groups.set(key, group);
  }

  return aggregateRows([...groups].map(([key, rows]) => ({ key, rows })));
}

/** Xếp hạng theo khu vực trong quốc gia đã chọn (khi header đang lọc country). */
export function rankRegionsForCountry(clusters: ClustersResponse | null, country: string): RankRow[] {
  if (country === ALL_COUNTRIES || !country.trim()) return rankCountries(clusters);

  const groups = new Map<string, Array<{ eventCount: number; avg: number | null; max: number | null; clusterId: number }>>();
  for (const cluster of clusters?.data?.clusters ?? []) {
    const place = cluster.dominant_place?.trim();
    if (!place || countryOf(cluster) !== country) continue;
    const key = regionFromPlace(place, country);
    const group = groups.get(key) ?? [];
    group.push({
      eventCount: isFiniteNumber(cluster.event_count) ? cluster.event_count : 0,
      avg: isFiniteNumber(cluster.avg_magnitude) ? cluster.avg_magnitude : null,
      max: isFiniteNumber(cluster.max_magnitude) ? cluster.max_magnitude : null,
      clusterId: cluster.cluster_id,
    });
    groups.set(key, group);
  }

  return aggregateRows([...groups].map(([key, rows]) => ({ key, rows })));
}

/** So sánh thực tế vs đường xu hướng; kỳ chưa trọn vẹn được gắn cờ projected. */
export function buildTrendComparison(trend: TrendResponse | null): TrendComparison {
  const data = trend?.data;
  const rows: TrendRow[] = buildTrendSeries(data?.series).map((point) => ({
    period: point.period,
    actual: point.actual_value,
    trend: point.trend_value,
    projected: !point.is_complete,
  }));
  const rawDirection = data?.trend_direction;
  return {
    rows,
    direction: rawDirection ? (DIRECTION_LABELS[rawDirection] ?? rawDirection) : "—",
    rSquared: isFiniteNumber(data?.r_squared) ? data!.r_squared! : null,
  };
}

/** Seasonality: baseline 1.0 = mức trung bình; chỉ vẽ hệ số hữu hạn. */
export function buildSeasonalityBars(seasonality: SeasonalityResponse | null): SeasonalityBar[] {
  return (seasonality?.data?.components?.seasonal_line ?? [])
    .filter((point) => point && typeof point.period_label === "string" && isFiniteNumber(point.seasonal_factor))
    .map((point) => ({
      label: point.period_label,
      factor: point.seasonal_factor,
      position:
        point.seasonal_factor > 1.05 ? "above" : point.seasonal_factor < 0.95 ? "below" : "average",
    }));
}

/** 5 sự kiện mới nhất — sort theo UTC, giữ nguyên tọa độ WGS84. */
export function buildLatestEvents(items: readonly EarthquakeItem[] | null | undefined): LatestEventRow[] {
  return (items ?? [])
    .filter((item) => item && Number.isFinite(Date.parse(item.event_time)) && isFiniteNumber(item.magnitude))
    .slice()
    .sort((left, right) => Date.parse(right.event_time) - Date.parse(left.event_time))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      time: item.event_time,
      place: item.place?.trim() || "Khác",
      magnitude: item.magnitude,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
}

/** Dự báo t+1 — chuẩn hoá nhãn rủi ro, giữ khoảng tin cậy nếu BE trả. */
export function formatPrediction(
  predictions: PredictionsResponse | null,
  classifications: ClassificationsResponse | null,
): PredictionView {
  const data = predictions?.data;
  const lower = isFiniteNumber(data?.confidence_interval?.lower)
    ? data!.confidence_interval!.lower
    : isFiniteNumber(data?.lower_bound)
      ? data!.lower_bound!
      : null;
  const upper = isFiniteNumber(data?.confidence_interval?.upper)
    ? data!.confidence_interval!.upper
    : isFiniteNumber(data?.upper_bound)
      ? data!.upper_bound!
      : null;

  return {
    targetDate: data?.target_date ?? null,
    predictedValue: isFiniteNumber(data?.predicted_value) ? data!.predicted_value! : null,
    lower,
    upper,
    riskLabel: riskLabelVietnamese(normalizeRiskLabel(classifications?.data?.predicted_label)),
  };
}
