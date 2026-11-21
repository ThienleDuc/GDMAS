/**
 * Logic thuần cho trang "6 Patterns Phân tích" (T7.06–T7.09) — không React/DOM/Recharts.
 * Mọi mốc thời gian là UTC ISO 8601 `Z`; thiếu số liệu trả null/"—", không bịa số (I3/I5).
 */

import type { AnalysisInterval } from "../../contracts/common.ts";
import { toUtcIso } from "../../lib/formatters.ts";
import {
  buildForecastBand,
  formatCoefficient,
  formatNumber,
  isFiniteNumber,
  type ForecastBandPoint,
  type ObservedPoint,
} from "../../lib/transforms/chart-data.ts";
import type { PredictionMetrics, RiskLevel } from "../../lib/transforms/chart-types.ts";

/** Tên 6 nhóm phân tích bắt buộc — theo docs/yeucaubatbuoc.md §2 và docs/architecture.md §12. */
export const PATTERN_TITLES = [
  "Biểu diễn theo thời gian",
  "Phân tích xu hướng",
  "Phân tích chu kỳ",
  "Tương quan",
  "Hồi quy & Dự báo (ngày kế tiếp)",
  "Phân loại (ngày kế tiếp)",
] as const;

/** Nhãn tiếng Việt cho 5 biến đo đạc trong ma trận tương quan (SAD §5). */
const CORRELATION_LABELS: Record<string, string> = {
  magnitude: "Độ lớn",
  depth_km: "Độ sâu (km)",
  latitude: "Vĩ độ",
  longitude: "Kinh độ",
  daily_event_count: "Số sự kiện hằng ngày",
};

export function correlationVariableLabel(key: string): string {
  return CORRELATION_LABELS[key] ?? key;
}

/** Nhãn tiếng Việt cho tên chỉ số dự báo do BE trả về. */
const FORECAST_METRIC_LABELS: Record<string, string> = {
  event_count: "Số sự kiện",
  avg_magnitude: "Độ lớn trung bình",
  max_magnitude: "Độ lớn lớn nhất",
};

export function forecastMetricLabel(metric: string | null | undefined): string {
  if (!metric) return "—";
  return FORECAST_METRIC_LABELS[metric] ?? metric;
}

/** Nhãn 4 mức rủi ro theo tiếng Việt. */
const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: "Thấp",
  MEDIUM: "Trung bình",
  HIGH: "Cao",
  CRITICAL: "Rất cao",
};

export function riskLevelLabel(level: RiskLevel | null): string {
  return level ? (RISK_LEVEL_LABELS[level] ?? "—") : "—";
}

/** Giải thích ngắn gọn về ngày kế tiếp cho người dùng cuối. */
export const NEXT_DAY_EXPLANATION =
  'Ngày kế tiếp là ngày ngay sau mốc dữ liệu gần nhất — ví dụ dữ liệu đến 21/11 thì dự báo cho 22/11.';

export interface IntervalParams {
  interval: AnalysisInterval;
  start_time: string;
  end_time: string;
}

/** Cửa sổ UTC cho `/analysis/temporal` — month lùi đúng 1 tháng UTC. */
export function intervalToParams(interval: AnalysisInterval, now: Date = new Date()): IntervalParams {
  const start = new Date(now.getTime());
  if (interval === "day") start.setUTCHours(start.getUTCHours() - 24);
  else if (interval === "week") start.setUTCDate(start.getUTCDate() - 7);
  else start.setUTCMonth(start.getUTCMonth() - 1);
  return { interval, start_time: toUtcIso(start), end_time: toUtcIso(now) };
}

/** BE trả rỗng bằng 200 + {success:false,data:null,message} → null, không throw. */
export function metricsFor<T>(
  response: { success?: boolean; data?: T | null } | null | undefined,
): T | null {
  if (!response || response.success === false || response.data == null) return null;
  return response.data;
}

export interface CorrelationCell {
  row: number;
  col: number;
  x: string;
  y: string;
  value: number | null;
  label: string;
}

/** Chuyển ma trận thành ô giữ nguyên thứ tự `variables[]`; ô hỏng/null → "—". */
export function buildCorrelationCells(
  variables: readonly string[] | null | undefined,
  matrix: ReadonlyArray<ReadonlyArray<number | null>> | null | undefined,
): CorrelationCell[] {
  const names = variables ?? [];
  const rows = matrix ?? [];
  const cells: CorrelationCell[] = [];
  for (let row = 0; row < names.length; row += 1) {
    for (let col = 0; col < names.length; col += 1) {
      const raw = rows[row]?.[col];
      const value = isFiniteNumber(raw) ? Math.max(-1, Math.min(1, raw)) : null;
      cells.push({
        row,
        col,
        x: names[col] ?? "",
        y: names[row] ?? "",
        value,
        label: formatCoefficient(value),
      });
    }
  }
  return cells;
}

/** Thang phân kỳ 5 dải cho hệ số tương quan [-1, 1]; null/NaN → trung tính. */
export function correlationColor(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "#64748b";
  if (value <= -0.6) return "#0284c7";
  if (value < -0.2) return "#38bdf8";
  if (value <= 0.2) return "#94a3b8";
  if (value < 0.6) return "#fb923c";
  return "#dc2626";
}

/** Thiếu mae/rmse → thông điệp rõ ràng, không hiển thị số dự phòng. */
export function evaluationText(metrics: {
  mae?: number | null;
  rmse?: number | null;
} | null | undefined): string {
  const mae = metrics?.mae;
  const rmse = metrics?.rmse;
  if (!isFiniteNumber(mae) || !isFiniteNumber(rmse)) return "chưa có dữ liệu kiểm định";
  return `Sai số tuyệt đối trung bình ${formatNumber(mae, 3)} · Sai số căn quân phương ${formatNumber(rmse, 3)}`;
}

/** Dùng lại `buildForecastBand` đã sửa BUG-thien-001 (CI luôn lower ≤ predicted ≤ upper). */
export function forecastRows(
  prediction: PredictionMetrics | null | undefined,
  observed: readonly ObservedPoint[],
): ForecastBandPoint[] {
  return buildForecastBand(observed, prediction);
}

/** Thông điệp Empty State: ưu tiên do BE gửi, fallback rõ ràng. */
export function panelReason(message: string | undefined, fallback: string): string {
  return message?.trim() || fallback;
}

export type PanelState = "loading" | "error" | "empty" | "ready";

/** Nguồn duy nhất quyết định trạng thái 3 trạng thái của từng panel. */
export function statisticsView(input: {
  loading: boolean;
  error: unknown;
  hasData: boolean;
}): PanelState {
  if (input.loading) return "loading";
  if (input.error !== null && input.error !== undefined) return "error";
  if (!input.hasData) return "empty";
  return "ready";
}
