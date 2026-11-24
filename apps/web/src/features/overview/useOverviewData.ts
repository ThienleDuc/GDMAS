import { useCallback, useEffect, useState } from "react";
import type { SeasonalityResponse, TrendResponse } from "../../contracts/analysis.ts";
import type { ClassificationsResponse } from "../../contracts/classifications.ts";
import type { ClustersResponse } from "../../contracts/clusters.ts";
import type { EarthquakeItem, StatisticsResponse } from "../../contracts/earthquake.ts";
import type { PredictionsResponse } from "../../contracts/predictions.ts";
import type { CountryCatalogResponse, RegionCatalogResponse } from "../../contracts/geo-catalog.ts";
import type { MonthlyPeaksResponse } from "../../contracts/monthly-peaks.ts";
import { isApiEmptyEnvelope } from "../../contracts/common.ts";
import { geoQuery, type GeoFilter } from "../../contracts/geo-filter.ts";
import { ApiError } from "../../lib/api-client.ts";
import { useTimezone } from "../../contexts/timezone-context.tsx";
import {
  useEarthquakeInsights,
  type TimeWindow,
} from "../../hooks/useEarthquakeInsights.ts";
import {
  getClassifications,
  getEarthquakes,
  getPredictions,
  getSeasonalityAnalysis,
  getTrendAnalysis,
} from "../../services/earthquake-api.ts";
import { getCountryCatalog, getRegionCatalog } from "../../services/geo-catalog-api.ts";

interface OverviewState {
  trend: TrendResponse | null;
  seasonality: SeasonalityResponse | null;
  predictions: PredictionsResponse | null;
  classifications: ClassificationsResponse | null;
  latestEvents: EarthquakeItem[];
  countryCatalog: CountryCatalogResponse | null;
  regionCatalog: RegionCatalogResponse | null;
  monthlyPeaks: MonthlyPeaksResponse | null;
  /** Giữ field để tương thích type; request on-the-fly vô dụng đã bị bỏ. */
  seasonalityMonthly: SeasonalityResponse | null;
  loading: boolean;
  /** Card dưới fold đang tải phase 2 — khác với dữ liệu rỗng thật (I5). */
  secondaryLoading: boolean;
  error: string | null;
  unavailable: string[];
}

const INITIAL_STATE: OverviewState = {
  trend: null,
  seasonality: null,
  predictions: null,
  classifications: null,
  latestEvents: [],
  countryCatalog: null,
  regionCatalog: null,
  monthlyPeaks: null,
  seasonalityMonthly: null,
  loading: true,
  secondaryLoading: true,
  error: null,
  unavailable: [],
};

export interface OverviewData extends OverviewState {
  statistics: StatisticsResponse | null;
  clusters: ClustersResponse | null;
  refresh: () => void;
}

function isNotFound(reason: unknown): boolean {
  return reason instanceof ApiError && reason.status === 404;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Không tải được dữ liệu tổng quan.";
}

/** Chạy việc phụ sau khi phase 1 xong, không chặn paint. */
function scheduleIdle(callback: () => void): () => void {
  const scope = globalThis as typeof globalThis & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof scope.requestIdleCallback === "function") {
    const id = scope.requestIdleCallback(callback, { timeout: 500 });
    return () => scope.cancelIdleCallback?.(id);
  }
  const timer = globalThis.setTimeout(callback, 0);
  return () => globalThis.clearTimeout(timer);
}

/** Gom dữ liệu trang tổng quan theo 2 phase — giảm tải & phân biệt Loading/Empty. */
export function useOverviewData(
  filter?: GeoFilter | null,
  refreshVersion = 0,
  window?: TimeWindow | null,
): OverviewData {
  // Múi giờ từ header — BE bucket ngày trend theo UTC/UTC+7 để không lệch 1 ngày (I3).
  const { timezone } = useTimezone();
  // Phase 1 cần statistics + clusters cho KPI; temporal không ai đọc → tắt.
  const insights = useEarthquakeInsights("day", 0, filter, window, {
    includeTemporal: false,
  });
  const [state, setState] = useState<OverviewState>(INITIAL_STATE);
  const [refreshKey, setRefreshKey] = useState(0);
  const [secondaryEnabled, setSecondaryEnabled] = useState(false);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  // Đổi filter/range hoặc SSE reset → nạp lại từ phase 1.
  useEffect(() => {
    setSecondaryEnabled(false);
  }, [
    refreshKey,
    refreshVersion,
    filter?.country,
    filter?.region,
    window?.start_time,
    window?.end_time,
    timezone,
  ]);

  // Phase 1 — critical: trend (above-fold) + 5 sự kiện mới nhất.
  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({
      ...previous,
      loading: true,
      secondaryLoading: true,
      error: null,
      unavailable: [],
    }));

    Promise.allSettled([
      getTrendAnalysis(
        { resample_freq: "D", ...geoQuery(filter), ...window, timezone },
        controller.signal,
      ),
      getEarthquakes(
        {
          limit: 10,
          sort_by: "event_time",
          order: "desc",
          ...geoQuery(filter),
          ...window,
        },
        controller.signal,
      ),
    ])
      .then(([trend, events]) => {
        if (controller.signal.aborted) return;
        const unavailable: string[] = [];
        let error: string | null = null;

        const pick = <T extends { success?: boolean }>(
          result: PromiseSettledResult<T>,
          endpoint: string,
        ): T | null => {
          if (result.status === "rejected") {
            if (isNotFound(result.reason)) unavailable.push(endpoint);
            else if (!error) error = errorMessage(result.reason);
            return null;
          }
          return isApiEmptyEnvelope(result.value) ? null : result.value;
        };

        const latest =
          events.status === "fulfilled" && Array.isArray(events.value?.data)
            ? events.value.data
            : (() => {
                if (events.status === "rejected") {
                  if (isNotFound(events.reason)) unavailable.push("GET /api/v1/earthquakes");
                  else if (!error) error = errorMessage(events.reason);
                }
                return [];
              })();

        setState((previous) => ({
          ...previous,
          trend: pick(trend, "GET /api/v1/analysis/trend"),
          latestEvents: latest,
          loading: false,
          error,
          unavailable,
        }));
        return scheduleIdle(() => {
          if (!controller.signal.aborted) setSecondaryEnabled(true);
        });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            ...previous,
            loading: false,
            error: errorMessage(reason),
          }));
        }
      });

    return () => controller.abort();
  }, [
    refreshKey,
    refreshVersion,
    filter?.country,
    filter?.region,
    window?.start_time,
    window?.end_time,
    timezone,
  ]);

  // Phase 2 — secondary: catalog, chu kỳ (1 tháng), forecast (dưới fold).
  useEffect(() => {
    if (!secondaryEnabled) return;
    const controller = new AbortController();
    setState((previous) => ({ ...previous, secondaryLoading: true }));

    Promise.allSettled([
      getSeasonalityAnalysis({ ...geoQuery(filter), ...window }, controller.signal),
      getPredictions(controller.signal, filter),
      getClassifications(controller.signal, filter),
      getCountryCatalog(controller.signal, window),
      getRegionCatalog(filter?.country ?? undefined, controller.signal, window),
    ])
      .then(
        ([seasonality, predictions, classifications, countries, regions]) => {
          if (controller.signal.aborted) return;

          const unavailable: string[] = [];
          let error: string | null = null;
          const pick = <T extends { success?: boolean }>(
            result: PromiseSettledResult<T>,
            endpoint: string,
          ): T | null => {
            if (result.status === "rejected") {
              if (isNotFound(result.reason)) unavailable.push(endpoint);
              else if (!error) error = errorMessage(result.reason);
              return null;
            }
            return isApiEmptyEnvelope(result.value) ? null : result.value;
          };

          setState((previous) => ({
            ...previous,
            seasonality: pick(seasonality, "GET /api/v1/analysis/seasonality"),
            predictions: pick(predictions, "GET /api/v1/predictions"),
            classifications: pick(classifications, "GET /api/v1/classifications"),
            countryCatalog:
              countries.status === "fulfilled" && Array.isArray(countries.value?.data)
                ? countries.value
                : null,
            regionCatalog:
              regions.status === "fulfilled" && Array.isArray(regions.value?.data)
                ? regions.value
                : null,
            monthlyPeaks: null, // Không còn gọi /statistics/monthly-peaks (giữ field tương thích — I2).
            secondaryLoading: false,
            error: previous.error ?? error,
            unavailable: [...previous.unavailable, ...unavailable],
          }));
        },
      )
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            ...previous,
            secondaryLoading: false,
            error: previous.error ?? errorMessage(reason),
          }));
        }
      });

    return () => controller.abort();
  }, [
    secondaryEnabled,
    refreshKey,
    refreshVersion,
    filter?.country,
    filter?.region,
    window?.start_time,
    window?.end_time,
  ]);

  return {
    ...state,
    statistics: insights.statistics,
    clusters: insights.clusters,
    loading: state.loading || insights.loading || state.secondaryLoading,
    error: state.error ?? insights.error?.message ?? null,
    unavailable: [...insights.unavailable, ...state.unavailable],
    refresh,
  };
}
