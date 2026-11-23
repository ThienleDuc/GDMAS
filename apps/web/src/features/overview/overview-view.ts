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
import type { SSEEventPayload } from "../../contracts/sse.ts";
import type { MonthlyPeaksResponse } from "../../contracts/monthly-peaks.ts";
import type { CountryCatalogResponse, RegionCatalogResponse } from "../../contracts/geo-catalog.ts";
import { isFiniteNumber, normalizeRiskLabel, buildTrendSeries } from "../../lib/transforms/chart-data.ts";
import { ALL_COUNTRIES } from "../earthquakes/country-filter.ts";
import { countryFromPlace } from "../earthquakes/country-clusters.ts";
import { regionFromPlace } from "../earthquakes/region-filter.ts";
import type { DateRangePreset } from "../earthquakes/earthquake-view.ts";
import {
  DEPTH_BANDS,
  MAGNITUDE_BANDS,
  SEVERITY_FOOTNOTE,
} from "../earthquakes/earthquake-insights.ts";

export { SEVERITY_FOOTNOTE };

/**
 * Số thập phân hiển thị thống nhất: đúng 3 chữ số sau dấu chấm (dùng dấu chấm theo yêu cầu).
 * Số nguyên giữ nguyên để không tạo ra "120.000" giả; null/NaN → "—" (I3/I5).
 */
export function formatDecimal3(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  const numeric = value as number;
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3);
}

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
  /** Badge class của earthquakes — dùng để ánh xạ màu biểu đồ/legend. */
  badgeClass: string;
}

export interface SeverityMix {
  slices: SeveritySlice[];
  partial: boolean;
}

export type SeverityTone = "very_low" | "low" | "medium" | "high" | "very_high";
export type DepthTone = "shallow" | "mid" | "deep";

export interface SeverityLabel {
  label: string;
  tone: SeverityTone;
  badgeClass: string;
}

export interface DepthLabel {
  label: string;
  tone: DepthTone;
  badgeClass: string;
}

const MAGNITUDE_TONES: readonly SeverityTone[] = ["very_low", "low", "medium", "high", "very_high"];
const DEPTH_TONES: readonly DepthTone[] = ["shallow", "mid", "deep"];

/**
 * Nhãn 5 mức độ lớn — tái dùng label + badgeClass từ `MAGNITUDE_BANDS` của earthquakes (nguồn quy ước duy nhất).
 * Ngưỡng số khớp các khoảng Rất nhẹ / Nhẹ / Trung bình / Mạnh / Rất mạnh.
 */
export function severityLabel(magnitude: number | null | undefined): SeverityLabel {
  if (!isFiniteNumber(magnitude)) return { label: "—", tone: "low", badgeClass: "ds-badge-neutral" };
  const index = magnitude < 3 ? 0 : magnitude < 5 ? 1 : magnitude < 6 ? 2 : magnitude < 7 ? 3 : 4;
  return {
    label: MAGNITUDE_BANDS[index].level,
    tone: MAGNITUDE_TONES[index],
    badgeClass: MAGNITUDE_BANDS[index].badgeClass,
  };
}

/** Nhãn 3 mức độ sâu — tái dùng `DEPTH_BANDS` của earthquakes; thiếu số liệu trả "—" (I5). */
export function depthLabel(depthKm: number | null | undefined): DepthLabel {
  if (!isFiniteNumber(depthKm)) return { label: "—", tone: "mid", badgeClass: "ds-badge-neutral" };
  const index = depthKm < 70 ? 0 : depthKm <= 300 ? 1 : 2;
  return {
    label: DEPTH_BANDS[index].level,
    tone: DEPTH_TONES[index],
    badgeClass: DEPTH_BANDS[index].badgeClass,
  };
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
  /** Độ sâu từ API/SSE — null khi nguồn không trả (không bịa số khi hiển thị). */
  depth_km: number | null;
  latitude: number;
  longitude: number;
}

export interface PredictionView {
  targetDate: string | null;
  predictedValue: number | null;
  lower: number | null;
  upper: number | null;
  /** Mức tin cậy do BE trả (0.95 → 95%); null khi payload không có. */
  confidenceLevel: number | null;
  /** Tên mô hình tạo ra khoảng — "dựa trên cái gì". */
  modelName: string | null;
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

/**
 * Badge class cho mức rủi ro — ánh xạ sang palette earthquakes (I2):
 * Thấp → success, Trung bình → warning, Cao/Rất cao → error. Nhãn lạ → neutral.
 */
export function riskBadgeClass(label: string | null): string {
  switch (label) {
    case "Thấp":
      return "ds-badge-success";
    case "Trung bình":
      return "ds-badge-warning";
    case "Cao":
    case "Rất cao":
      return "ds-badge-error";
    default:
      return "ds-badge-neutral";
  }
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
      hint: avgMagnitude === null ? "Chưa có dữ liệu thống kê" : `Độ lớn TB M${formatDecimal3(avgMagnitude)}`,
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
  // `/statistics` chỉ trả 3 field — giữ 3 nhóm thật, không tự chia 5 nhóm giả (I5).
  const known: ReadonlyArray<{ key: string; label: string; raw: unknown; badgeClass: string }> = [
    {
      key: "minor",
      label: `${MAGNITUDE_BANDS[0].level} + ${MAGNITUDE_BANDS[1].level}`,
      raw: data?.minor_events_count,
      badgeClass: MAGNITUDE_BANDS[0].badgeClass,
    },
    {
      key: "moderate",
      label: MAGNITUDE_BANDS[2].level,
      raw: data?.moderate_events_count,
      badgeClass: MAGNITUDE_BANDS[2].badgeClass,
    },
    {
      key: "strong",
      label: `${MAGNITUDE_BANDS[3].level} + ${MAGNITUDE_BANDS[4].level}`,
      raw: data?.strong_events_count,
      badgeClass: MAGNITUDE_BANDS[3].badgeClass,
    },
  ];
  const slices = known
    .filter((item) => isFiniteNumber(item.raw))
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: Math.max(0, Math.trunc(item.raw as number)),
      badgeClass: item.badgeClass,
    }));

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

/**
 * Đưa sự kiện SSE (`earthquake_detected`/`earthquake_alert`) vào đầu bảng 5 sự kiện.
 * Dùng đúng field marker của BE (`id`, `event_time`, WGS84); sai/thiếu → giữ nguyên danh sách.
 */
export function applySseLatestEvent(
  rows: readonly LatestEventRow[],
  payload: SSEEventPayload | null | undefined,
): LatestEventRow[] {
  if (!payload || (payload.event !== "earthquake_detected" && payload.event !== "earthquake_alert")) {
    return [...rows];
  }
  const data = payload.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return [...rows];
  const record = data as Record<string, unknown>;
  const time = typeof record.event_time === "string" ? record.event_time : "";
  const magnitude = Number(record.magnitude);
  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  const id = Number(record.id);
  if (
    !Number.isFinite(Date.parse(time)) ||
    !Number.isFinite(magnitude) ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(id)
  ) {
    return [...rows];
  }
  const row: LatestEventRow = {
    id,
    time,
    place: typeof record.place === "string" && record.place.trim() ? record.place.trim() : "Khác",
    magnitude,
    depth_km: Number.isFinite(Number(record.depth_km)) ? Number(record.depth_km) : null,
    latitude,
    longitude,
  };
  return [row, ...rows.filter((item) => item.id !== row.id)].slice(0, 5);
}

/**
 * Chuyển số sự kiện/tháng thành hệ số so với mức trung bình (baseline 1.0).
 * Tháng không có dữ liệu bị bỏ qua — không bịa hệ số 0 hoặc mùa vụ (I5).
 */
export function buildMonthlyBars(payload: MonthlyPeaksResponse | null | undefined): SeasonalityBar[] {
  const rows = payload?.data ?? [];
  const active = rows.filter((row) => row.count > 0);
  const mean = active.length > 0 ? active.reduce((sum, row) => sum + row.count, 0) / active.length : 0;
  // Luôn 12 cột: tháng không có dữ liệu từ BE → hệ số 0 (không bỏ cột, không bịa số).
  return Array.from({ length: 12 }, (_, index) => {
    const row = rows[index];
    const count = row?.month === index + 1 ? row.count : 0;
    const factor = count > 0 && mean > 0 ? Number((count / mean).toFixed(4)) : 0;
    return {
      label: row?.label ?? `Tháng ${index + 1}`,
      factor,
      position: factor > 1.05 ? "above" : factor > 0 && factor < 0.95 ? "below" : factor === 0 ? "below" : "average",
    };
  });
}

/** Đảm bảo biểu đồ tuần luôn có đủ 7 cột — ngày BE không trả thì hệ số 0. */
export function padWeekdaysTo7(rows: readonly SeasonalityBar[]): SeasonalityBar[] {
  return Array.from({ length: 7 }, (_, index) => {
    const label = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"][index];
    const row = rows.find((item) => item.label === label);
    return row ?? { label, factor: 0, position: "below" as const };
  });
}

const ZERO_BAR = { factor: 0, position: "below" as const };

/**
 * Biểu đồ tuần: giữ đủ 7 cột, nhưng chỉ các ngày trong phạm vi được chọn giữ số từ BE.
 * - `day`: chỉ ngày hiện tại.
 * - `week`: Thứ 2 → hôm nay (các ngày tương lai trong tuần = 0, không tự bịa).
 * - `month`: giữ nguyên (xem biểu đồ tháng).
 */
export function applyWeekdayWindow(
  rows: readonly SeasonalityBar[],
  range: DateRangePreset,
  now: Date = new Date(),
): SeasonalityBar[] {
  // JS getDay(): 0=CN..6=T7; mảng 0=Thứ 2..6=Chủ nhật.
  const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
  return rows.map((row, index) => {
    if (range === "month") return row;
    const visible = range === "day" ? index === todayIndex : index <= todayIndex;
    return visible ? row : { ...row, ...ZERO_BAR };
  });
}

/** Biểu đồ tháng: giữ đủ 12 cột, tháng sau tháng hiện tại = 0 (chưa có số liệu). */
export function applyMonthWindow(
  rows: readonly SeasonalityBar[],
  now: Date = new Date(),
): SeasonalityBar[] {
  const currentMonth = now.getMonth() + 1;
  return rows.map((row, index) => (index + 1 <= currentMonth ? row : { ...row, ...ZERO_BAR }));
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
      depth_km: isFiniteNumber(item.depth_km) ? item.depth_km : null,
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
    confidenceLevel: isFiniteNumber(data?.confidence_level) ? data!.confidence_level! : null,
    modelName: data?.model_name?.trim() || null,
    riskLabel: riskLabelVietnamese(normalizeRiskLabel(classifications?.data?.predicted_label)),
  };
}

/** Số mục tối đa hiển thị trên bảng xếp hạng (top N) — không render toàn bộ danh mục. */
export const TOP_RANK_LIMIT = 5;

/**
 * Xếp hạng từ danh mục quốc gia do BE suy từ `place` (GET /earthquakes/countries).
 * Catalog chỉ có `count` — để `avgMagnitude`/`maxMagnitude = null` thay vì bịa số (I5).
 * Chỉ lấy top N theo số sự kiện giảm dần.
 */
export function rankFromCountryCatalog(
  payload: CountryCatalogResponse | null | undefined,
  limit: number = TOP_RANK_LIMIT,
): RankRow[] {
  if (!Array.isArray(payload?.data)) return [];
  return [...payload.data]
    .filter((row) => Boolean(row.country?.trim()))
    .sort((left, right) => right.count - left.count || left.country.localeCompare(right.country))
    .slice(0, limit)
    .map((row) => ({
      key: row.country,
      label: row.country,
      eventCount: row.count,
      avgMagnitude: isFiniteNumber(row.avg_magnitude) ? row.avg_magnitude! : null,
      maxMagnitude: isFiniteNumber(row.max_magnitude) ? row.max_magnitude! : null,
      clusterIds: [],
    }));
}

/** Xếp hạng khu vực trong quốc gia từ GET /earthquakes/regions?country=... (top N). */
export function rankFromRegionCatalog(
  payload: RegionCatalogResponse | null | undefined,
  limit: number = TOP_RANK_LIMIT,
): RankRow[] {
  if (!Array.isArray(payload?.data)) return [];
  return [...payload.data]
    .filter((row) => Boolean(row.region?.trim()))
    .sort((left, right) => right.count - left.count || left.region.localeCompare(right.region))
    .slice(0, limit)
    .map((row) => ({
      key: row.region,
      label: row.region,
      eventCount: row.count,
      avgMagnitude: isFiniteNumber(row.avg_magnitude) ? row.avg_magnitude! : null,
      maxMagnitude: isFiniteNumber(row.max_magnitude) ? row.max_magnitude! : null,
      clusterIds: [],
    }));
}
