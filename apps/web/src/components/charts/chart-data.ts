/**
 * Lớp biến đổi dữ liệu thuần (không React, không I/O) cho 6 Patterns.
 *
 * Mục tiêu:
 * - Mọi phép gom nhóm thời gian dùng **UTC** (I3) — tuần bắt đầu Thứ 2, nhãn `YYYY-MM-DD`/`YYYY-MM`.
 * - Không bao giờ sinh số liệu thay thế: giá trị thiếu trả `null` hoặc `"—"`, không trả số dự phòng tĩnh (I5).
 * - Hàm thuần để kiểm thử offline 100% (`node --test`), xem `apps/web/tests/chart-data.test.ts`.
 */

import type {
  ClassificationMetrics,
  CorrelationMetrics,
  LineChartPoint,
  MagnitudeBin,
  PatternLike,
  PatternView,
  PredictionMetrics,
  RiskLevel,
  ScatterPoint,
  SeasonalLinePoint,
  SeasonalityComponents,
  SeasonalityMetrics,
  TemporalMetrics,
  TimeInterval,
  TrendMetrics,
  TrendSeriesPoint,
} from "./types.ts";

const EM_DASH = "—";

const RISK_ORDER: RiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const RISK_ALIASES: Record<string, RiskLevel> = {
  low: "LOW",
  "low activity": "LOW",
  quiet: "LOW",
  medium: "MEDIUM",
  moderate: "MEDIUM",
  normal: "MEDIUM",
  "medium activity": "MEDIUM",
  "normal activity": "MEDIUM",
  high: "HIGH",
  "high activity": "HIGH",
  elevated: "HIGH",
  critical: "CRITICAL",
  "critical activity": "CRITICAL",
  severe: "CRITICAL",
};

export interface DerivedLinePoint {
  date: string;
  event_count: number;
  avg_magnitude: number | null;
  max_magnitude: number | null;
}

export interface ObservedPoint {
  label: string;
  value: number;
}

export interface ForecastBandPoint {
  label: string;
  observed: number | null;
  predicted: number | null;
  lower: number | null;
  upper: number | null;
  ciBase: number | null;
  ciSpan: number | null;
  bridge: number | null;
}

export interface RiskBar {
  level: RiskLevel;
  probability: number;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Format số an toàn: thiếu/không hữu hạn → `"—"`, không thay bằng số dự phòng. */
export function formatNumber(value: unknown, digits = 2, unit = ""): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  return `${value.toFixed(digits)}${unit}`;
}

/** Hệ số tương quan luôn hiển thị đủ số chữ số (mặc định 4) để không làm tròn sai lệch. */
export function formatCoefficient(value: unknown, digits = 4): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  return value.toFixed(digits);
}

export function formatPercent(value: unknown, digits = 1): string {
  if (!isFiniteNumber(value)) return EM_DASH;
  return `${(value * 100).toFixed(digits)}%`;
}

/** Thứ 2 (00:00 UTC) của tuần chứa `value`. */
export function startOfIsoWeekUtc(value: Date): Date {
  const weekday = value.getUTCDay(); // 0 = Chủ nhật
  const diff = (weekday + 6) % 7; // Thứ 2 = 0
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() - diff),
  );
}

function parseUtcDate(timestamp: string | null | undefined): Date | null {
  if (typeof timestamp !== "string" || !timestamp.trim()) return null;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Khóa gom nhóm theo UTC:
 * - `day` → `YYYY-MM-DD`
 * - `week` → `YYYY-MM-DD` của Thứ 2 đầu tuần
 * - `month` → `YYYY-MM`
 */
export function bucketKeyUtc(
  timestamp: string | null | undefined,
  interval: TimeInterval,
): string | null {
  const date = parseUtcDate(timestamp);
  if (!date) return null;
  if (interval === "month") return date.toISOString().slice(0, 7);
  if (interval === "week") return startOfIsoWeekUtc(date).toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

/** Re-bucket `scatter_plot` (depth/magnitude/timestamp) thành line chart theo khung thời gian. */
export function buildLineSeriesFromScatter(
  points: readonly ScatterPoint[] | null | undefined,
  interval: TimeInterval,
): DerivedLinePoint[] {
  const buckets = new Map<
    string,
    { count: number; magnitudeSum: number; magnitudeCount: number; maxMagnitude: number | null }
  >();

  for (const point of points ?? []) {
    const key = bucketKeyUtc(point?.timestamp, interval);
    if (!key) continue;
    const bucket =
      buckets.get(key) ?? { count: 0, magnitudeSum: 0, magnitudeCount: 0, maxMagnitude: null };
    bucket.count += 1;
    if (isFiniteNumber(point.magnitude)) {
      bucket.magnitudeSum += point.magnitude;
      bucket.magnitudeCount += 1;
      bucket.maxMagnitude =
        bucket.maxMagnitude === null
          ? point.magnitude
          : Math.max(bucket.maxMagnitude, point.magnitude);
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      event_count: bucket.count,
      avg_magnitude:
        bucket.magnitudeCount > 0
          ? roundTo(bucket.magnitudeSum / bucket.magnitudeCount, 2)
          : null,
      max_magnitude: bucket.maxMagnitude === null ? null : roundTo(bucket.maxMagnitude, 2),
    }));
}

/** Histogram bin độ lớn — giữ thứ tự backend, bỏ bin không hợp lệ, không tự sinh bin. */
export function buildHistogramBins(
  bins: readonly MagnitudeBin[] | null | undefined,
): MagnitudeBin[] {
  return (bins ?? [])
    .filter((bin) => bin && typeof bin.bin === "string" && isFiniteNumber(bin.count))
    .map((bin) => ({ bin: bin.bin, count: Math.max(0, Math.trunc(bin.count)) }));
}

/** Chuỗi trend: giữ `trend_value = null` (không thay bằng 0), bỏ dòng không có kỳ/giá trị thực. */
export function buildTrendSeries(
  series: readonly TrendSeriesPoint[] | null | undefined,
): Array<{ period: string; actual_value: number; trend_value: number | null; is_complete: boolean }> {
  return (series ?? [])
    .filter(
      (point) =>
        point &&
        typeof point.period === "string" &&
        point.period.trim().length > 0 &&
        isFiniteNumber(point.actual_value),
    )
    .map((point) => ({
      period: point.period,
      actual_value: point.actual_value,
      trend_value: isFiniteNumber(point.trend_value) ? point.trend_value : null,
      is_complete: point.is_complete !== false,
    }));
}

/** Seasonal line: chỉ vẽ điểm có `seasonal_factor` hữu hạn. */
export function buildSeasonalSeries(
  components: SeasonalityComponents | null | undefined,
): Array<{ period_label: string; seasonal_factor: number; seasonal_effect: number | null }> {
  return (components?.seasonal_line ?? [])
    .filter(
      (point: SeasonalLinePoint) =>
        point &&
        typeof point.period_label === "string" &&
        isFiniteNumber(point.seasonal_factor),
    )
    .map((point) => ({
      period_label: point.period_label,
      seasonal_factor: point.seasonal_factor,
      seasonal_effect: isFiniteNumber(point.seasonal_effect) ? point.seasonal_effect : null,
    }));
}

/** Lịch sử quan sát từ Pattern 2 (ưu tiên) — lấy tối đa `limit` kỳ gần nhất. */
export function toObservedFromTrend(
  series: readonly TrendSeriesPoint[] | null | undefined,
  limit = 24,
): ObservedPoint[] {
  const rows = (series ?? [])
    .filter(
      (point) =>
        point &&
        typeof point.period === "string" &&
        isFiniteNumber(point.actual_value),
    )
    .map((point) => ({ label: point.period, value: point.actual_value }));
  return rows.slice(-limit);
}

/** Lịch sử quan sát từ Pattern 1 line chart (fallback khi Pattern 2 rỗng). */
export function toObservedFromLineChart(
  points: readonly LineChartPoint[] | null | undefined,
  limit = 24,
): ObservedPoint[] {
  const rows = (points ?? [])
    .filter(
      (point) =>
        point &&
        typeof point.date === "string" &&
        isFiniteNumber(point.event_count),
    )
    .map((point) => ({ label: point.date, value: point.event_count }));
  return rows.slice(-limit);
}

/**
 * Dựng dữ liệu biểu đồ dự báo t+1:
 * - lịch sử quan sát (line liền),
 * - điểm dự báo + dải tin cậy (bar nổi từ `lower` đến `upper`),
 * - `bridge` nối điểm thực cuối cùng tới điểm dự báo (nét đứt).
 *
 * Trả `[]` khi không có `predicted_value` hữu hạn — component hiển thị Empty State.
 */
export function buildForecastBand(
  observed: readonly ObservedPoint[] | null | undefined,
  prediction: PredictionMetrics | null | undefined,
): ForecastBandPoint[] {
  const predicted = isFiniteNumber(prediction?.predicted_value)
    ? prediction.predicted_value
    : null;
  if (predicted === null) return [];

  const rows: ForecastBandPoint[] = [];
  for (const point of observed ?? []) {
    if (!isFiniteNumber(point?.value)) continue;
    rows.push({
      label: String(point.label ?? ""),
      observed: point.value,
      predicted: null,
      lower: point.value,
      upper: point.value,
      ciBase: null,
      ciSpan: null,
      bridge: null,
    });
  }

  const rawLower = isFiniteNumber(prediction?.lower_bound) ? prediction.lower_bound : predicted;
  const rawUpper = isFiniteNumber(prediction?.upper_bound) ? prediction.upper_bound : predicted;
  const lower = Math.min(rawLower, rawUpper, predicted);
  const upper = Math.max(rawLower, rawUpper, predicted);
  const forecastLabel =
    typeof prediction?.target_date === "string" && prediction.target_date.trim()
      ? prediction.target_date
      : "t+1";

  if (rows.length > 0) {
    rows[rows.length - 1].bridge = rows[rows.length - 1].observed;
  }

  rows.push({
    label: forecastLabel,
    observed: null,
    predicted,
    lower,
    upper,
    ciBase: lower,
    ciSpan: roundTo(upper - lower, 4),
    bridge: predicted,
  });

  return rows;
}

/** Chuẩn hóa nhãn rủi ro từ nhiều biến thể BE (`Normal Activity`, `MEDIUM`, `critical`…). */
export function normalizeRiskLabel(raw: unknown): RiskLevel | null {
  if (typeof raw !== "string") return null;
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  return RISK_ALIASES[key] ?? null;
}

/**
 * Phân phối xác suất 4 lớp rủi ro (đã sắp xếp LOW → CRITICAL).
 * - Bỏ khóa lạ và giá trị không hữu hạn/âm.
 * - Tự chuẩn hóa về tổng 1 nếu BE trả phần trăm hoặc tổng lệch.
 */
export function buildRiskBars(
  scores: Record<string, number> | null | undefined,
): RiskBar[] {
  if (!isRecord(scores)) return [];

  const collected = new Map<RiskLevel, number>();
  for (const [rawKey, rawValue] of Object.entries(scores)) {
    const level = normalizeRiskLabel(rawKey);
    if (!level || !isFiniteNumber(rawValue) || rawValue < 0) continue;
    collected.set(level, (collected.get(level) ?? 0) + rawValue);
  }
  if (collected.size === 0) return [];

  let max = 0;
  for (const value of collected.values()) max = Math.max(max, value);
  const scale = max > 1 ? (max <= 100 ? 100 : max) : 1;

  const scaled = new Map<RiskLevel, number>();
  let total = 0;
  for (const [level, value] of collected.entries()) {
    const normalizedValue = value / scale;
    scaled.set(level, normalizedValue);
    total += normalizedValue;
  }
  if (total <= 0) {
    return RISK_ORDER.filter((level) => scaled.has(level)).map((level) => ({
      level,
      probability: 0,
    }));
  }

  return RISK_ORDER.filter((level) => scaled.has(level)).map((level) => ({
    level,
    probability: roundTo((scaled.get(level) ?? 0) / total, 4),
  }));
}

function readInsufficientReason(metrics: Record<string, unknown>): string {
  const components = isRecord(metrics.components) ? metrics.components : null;
  const interpretation =
    components && typeof components.interpretation === "string"
      ? components.interpretation.trim()
      : "";
  if (interpretation) return interpretation;
  const note = typeof metrics.note === "string" ? metrics.note.trim() : "";
  return note || "Không đủ mẫu dữ liệu để tính pattern này.";
}

/**
 * Quyết định pattern có dữ liệu để vẽ hay không — nguồn duy nhất cho Empty State.
 * Không bao giờ trả `available: true` cho `PENDING`, thiếu bản ghi hoặc `insufficient_data`.
 */
export function resolvePatternView(pattern?: PatternLike | null): PatternView {
  if (!pattern) {
    return {
      available: false,
      reason: "Chưa có bản ghi pattern trong CSDL (worker chưa chạy hoặc dữ liệu đã bị xóa).",
      metrics: {},
    };
  }

  const metrics = isRecord(pattern.metrics) ? pattern.metrics : {};

  if (pattern.status !== "COMPUTED") {
    return {
      available: false,
      reason: "PENDING — worker chưa tính toán pattern này.",
      metrics: {},
    };
  }

  if (metrics.status === "insufficient_data") {
    return { available: false, reason: readInsufficientReason(metrics), metrics };
  }

  return { available: true, reason: "", metrics };
}

/** Tiện ích ép kiểu metrics thô sang typed view (service hiện giữ `Record<string, any>`). */
export function asTemporal(metrics: Record<string, unknown>): TemporalMetrics {
  return metrics as TemporalMetrics;
}

export function asTrend(metrics: Record<string, unknown>): TrendMetrics {
  return metrics as TrendMetrics;
}

export function asSeasonality(metrics: Record<string, unknown>): SeasonalityMetrics {
  return metrics as SeasonalityMetrics;
}

export function asCorrelation(metrics: Record<string, unknown>): CorrelationMetrics {
  return metrics as CorrelationMetrics;
}

export function asPrediction(metrics: Record<string, unknown>): PredictionMetrics {
  return metrics as PredictionMetrics;
}

export function asClassification(metrics: Record<string, unknown>): ClassificationMetrics {
  return metrics as ClassificationMetrics;
}
