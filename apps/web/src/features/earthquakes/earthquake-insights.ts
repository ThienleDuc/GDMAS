/**
 * Pure helpers for EarthquakesPage insight items — no React/DOM/network.
 * Sources: docs/yeucaubatbuoc.md §2/§5.2, docs/architecture/SAD.md §5.
 */

import type { AnalysisInterval } from "../../contracts/common.ts";
import type { EarthquakeItem, StatisticsResponse } from "../../contracts/earthquake.ts";
import type { DateRangePreset } from "./earthquake-view.ts";

export interface SeverityBand {
  range: string;
  level: string;
  description: string;
  badgeClass: string;
}

/** Tham khảo cho người không chuyên; không phải cảnh báo chính thức hay dữ liệu API. */
export const SEVERITY_FOOTNOTE =
  "Bảng chỉ mang tính tham khảo để hiểu dữ liệu, không phải cảnh báo động đất chính thức.";

export const MAGNITUDE_BANDS: readonly SeverityBand[] = [
  { range: "Dưới 3.0", level: "Rất nhẹ", description: "Không cảm nhận rõ", badgeClass: "ds-badge-success" },
  { range: "3.0 – 4.9", level: "Nhẹ", description: "Cảm nhận rõ", badgeClass: "ds-badge-info" },
  { range: "5.0 – 5.9", level: "Trung bình", description: "Thiệt hại nhẹ", badgeClass: "ds-badge-warning" },
  { range: "6.0 – 6.9", level: "Mạnh", description: "Thiệt hại đáng kể", badgeClass: "ds-badge-error" },
  { range: "Từ 7.0", level: "Rất mạnh", description: "Thiệt hại nghiêm trọng", badgeClass: "ds-badge-error" },
];

export const DEPTH_BANDS: readonly SeverityBand[] = [
  { range: "Dưới 70 km", level: "Nông", description: "Rung lắc mạnh hơn.", badgeClass: "ds-badge-warning" },
  { range: "70 – 300 km", level: "Trung bình", description: "Tùy độ lớn.", badgeClass: "ds-badge-info" },
  { range: "Trên 300 km", level: "Sâu", description: "Yếu hơn ở mặt đất.", badgeClass: "ds-badge-success" },
];

/** Short labels for the inline note table next to the data table. */
export const SEVERITY_NOTES: ReadonlyArray<{
  group: string;
  rows: ReadonlyArray<{ range: string; level: string; note: string; badgeClass: string }>;
}> = [
  {
    group: "Độ lớn",
    rows: MAGNITUDE_BANDS.map((band) => ({
      range: band.range,
      level: band.level,
      note: band.description.split(",")[0].split(".")[0],
      badgeClass: band.badgeClass,
    })),
  },
  {
    group: "Độ sâu",
    rows: DEPTH_BANDS.map((band) => ({
      range: band.range,
      level: band.level,
      note: band.description.split(",")[0].split(".")[0],
      badgeClass: band.badgeClass,
    })),
  },
];

export function mapRangeToInterval(range: DateRangePreset): AnalysisInterval {
  return range === "day" ? "day" : range === "week" ? "week" : "month";
}

/**
 * Tính 4 KPI từ chính tập sự kiện đã lọc đầy đủ (khoảng thời gian, độ lớn, độ sâu, quốc gia, khu vực).
 * Dùng chung cho histogram và KPI để chúng luôn ăn cùng một bộ lọc — không phụ thuộc việc BE
 * `/statistics` có hỗ trợ tham số độ lớn/độ sâu hay không (I3/I5: vẫn là dữ liệu API thật).
 */
export function buildCatalogStatistics(
  items: readonly EarthquakeItem[],
  total: number,
  now: Date = new Date(),
): StatisticsResponse {
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const magnitudes = items.map((item) => item.magnitude).filter((value) => Number.isFinite(value));
  const sum = magnitudes.reduce((acc, value) => acc + value, 0);
  const avg = magnitudes.length ? sum / magnitudes.length : 0;
  const max = magnitudes.length ? Math.max(...magnitudes) : 0;

  return {
    success: true,
    data: {
      total_events: total,
      strong_events_count: items.filter((item) => item.magnitude >= 6).length,
      moderate_events_count: items.filter((item) => item.magnitude >= 5 && item.magnitude < 6).length,
      minor_events_count: items.filter((item) => item.magnitude < 3).length,
      recent_24h_count: items.filter((item) => Date.parse(item.event_time) >= cutoff).length,
      avg_magnitude: Number(avg.toFixed(2)),
      max_magnitude: Number(max.toFixed(2)),
      latest_event_time: items[0]?.event_time,
      time_series_preview: [],
    },
  };
}

/** Parse raw input to finite number; null for empty/invalid values. */
export function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function formatStepValue(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** Apply one +/- step with clamping; never returns NaN or a value outside bounds. */
export function stepValue(
  raw: string,
  direction: 1 | -1,
  step: number,
  min: number,
  max?: number,
): string {
  const current = parseNumericInput(raw) ?? min;
  let next = current + direction * Math.max(0, step);
  if (next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return formatStepValue(next);
}
