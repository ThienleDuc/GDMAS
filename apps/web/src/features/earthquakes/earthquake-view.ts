/**
 * Logic thuần cho trang Danh mục động đất (T7.03) — không React/DOM, test offline.
 * Nguồn: docs/api/API.md §3.2, docs/task/thien.md T7.03.
 * Quy ước I3: mọi `start_time`/`end_time` tạo ra ở đây đều là UTC ISO 8601 có hậu tố Z.
 */

import type {
  EarthquakeItem,
  EarthquakeListResponse,
  QueryEarthquakeParams,
} from "../../contracts/earthquake.ts";
import { formatEventTime, formatWgs84Point, toUtcIso, type TimezoneMode } from "../../lib/formatters.ts";
import { getEarthquakes } from "../../services/earthquake-api.ts";

export type DateRangePreset = "day" | "week" | "month";
export type ViewState = "loading" | "error" | "empty" | "ready";

export const DEFAULT_PAGE_SIZE = 20;
export const RANGE_PRESETS: ReadonlyArray<{ value: DateRangePreset; label: string }> = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
];

export interface EarthquakeFilters {
  range: DateRangePreset;
  minMagnitude?: number;
  maxMagnitude?: number;
  minDepth?: number;
  maxDepth?: number;
  sortBy?: "event_time" | "magnitude" | "depth_km";
  order?: "asc" | "desc";
}

/** Khoảng thời gian kết thúc tại `now` (UTC), bắt đầu theo preset. */
export function resolveWindow(
  range: DateRangePreset,
  now: Date = new Date(),
): { start_time: string; end_time: string } {
  const end = new Date(now.getTime());
  let start: Date;
  if (range === "day") {
    start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === "week") {
    start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    start = new Date(end.getTime());
    start.setUTCMonth(start.getUTCMonth() - 1);
  }
  return { start_time: toUtcIso(start), end_time: toUtcIso(end) };
}

/** Ánh xạ filter UI → QueryEarthquakeParams chuẩn API.md §3.2. */
export function buildEarthquakeQuery(
  filters: EarthquakeFilters,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
  now: Date = new Date(),
): QueryEarthquakeParams {
  const { start_time, end_time } = resolveWindow(filters.range, now);
  return {
    page,
    limit,
    start_time,
    end_time,
    min_magnitude: filters.minMagnitude,
    max_magnitude: filters.maxMagnitude,
    min_depth: filters.minDepth,
    max_depth: filters.maxDepth,
    sort_by: filters.sortBy ?? "event_time",
    order: filters.order ?? "desc",
  };
}

export interface ViewInput {
  loading: boolean;
  error: unknown;
  /** Chỉ cần độ dài để phân biệt Empty/Ready; nhận cả entity lẫn row đã format. */
  data: ReadonlyArray<unknown>;
}

/** Ưu tiên loading → error → empty → ready; error/empty không bị che bởi dữ liệu cũ. */
export function deriveViewState(input: ViewInput): ViewState {
  if (input.loading) return "loading";
  if (input.error !== null && input.error !== undefined) return "error";
  if (input.data.length === 0) return "empty";
  return "ready";
}

export interface EventRow {
  id: number;
  time: string;
  place: string;
  magnitude: number;
  depthKm: number;
  coordinates: string;
  source: string;
}

/** Format một dòng bảng; không bao giờ thay số thiếu bằng giá trị dự phòng. */
export function formatEventRow(item: EarthquakeItem, mode: TimezoneMode = "UTC"): EventRow {
  return {
    id: item.id,
    time: formatEventTime(item.event_time, mode),
    place: item.place || "—",
    magnitude: item.magnitude,
    depthKm: item.depth_km,
    coordinates: formatWgs84Point(item.latitude, item.longitude),
    source: item.source_event_id || item.source || "—",
  };
}

export interface FetchPageResult {
  data: EarthquakeItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Fetch một trang dữ liệu thật. `fetcher` inject được để test offline (I7);
 * mặc định dùng service T7.02 đã validate UTC/WGS84.
 */
export async function fetchPage(
  params: QueryEarthquakeParams,
  fetcher: (
    params: QueryEarthquakeParams,
    signal?: AbortSignal,
  ) => Promise<EarthquakeListResponse> = getEarthquakes,
  signal?: AbortSignal,
): Promise<FetchPageResult> {
  const response = await fetcher(params, signal);
  const metadata = response.metadata;
  return {
    data: response.data,
    total: metadata?.total ?? response.data.length,
    page: metadata?.page ?? params.page ?? 1,
    totalPages: metadata?.total_pages ?? 1,
  };
}
