import { useEffect, useState } from "react";
import { isApiEmptyEnvelope, type AnalysisInterval } from "../contracts/common.ts";
import type { StatisticsResponse } from "../contracts/earthquake.ts";
import type { TemporalResponse } from "../contracts/analysis.ts";
import type { ClustersResponse } from "../contracts/clusters.ts";
import { ApiError } from "../lib/api-client.ts";
import { geoQuery, type GeoFilter, type NumericFilter } from "../contracts/geo-filter.ts";
import { getClustersOptional, getEarthquakeStatistics, getTemporalAnalysis } from "../services/earthquake-api.ts";

export interface EarthquakeInsightsState {
  statistics: StatisticsResponse | null;
  temporal: TemporalResponse | null;
  clusters: ClustersResponse | null;
  loading: boolean;
  error: ApiError | null;
  unavailable: string[];
}

const INITIAL_STATE: EarthquakeInsightsState = {
  statistics: null,
  temporal: null,
  clusters: null,
  loading: true,
  error: null,
  unavailable: [],
};

function isNotFound(reason: unknown): boolean {
  return reason instanceof ApiError && reason.status === 404;
}

export interface TimeWindow {
  start_time?: string;
  end_time?: string;
}

/** Mặc định giữ nguyên hành vi cũ (I2) — page có thể tắt nguồn không dùng. */
export interface EarthquakeInsightsOptions {
  includeTemporal?: boolean;
  includeClusters?: boolean;
  /** Lọc số cho KPI statistics (Danh mục) — không ảnh hưởng temporal/clusters. */
  numeric?: NumericFilter;
}

export function useEarthquakeInsights(
  interval: AnalysisInterval,
  refreshKey = 0,
  filter?: GeoFilter | null,
  window?: TimeWindow | null,
  options?: EarthquakeInsightsOptions,
): EarthquakeInsightsState {
  const includeTemporal = options?.includeTemporal !== false;
  const includeClusters = options?.includeClusters !== false;
  const numeric = options?.numeric;
  const [state, setState] = useState<EarthquakeInsightsState>(INITIAL_STATE);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null, unavailable: [] }));

    Promise.allSettled([
      getEarthquakeStatistics(controller.signal, filter, window, numeric),
      includeTemporal
        ? getTemporalAnalysis({ interval, ...geoQuery(filter), ...window }, controller.signal)
        : Promise.resolve(null),
      includeClusters
        ? getClustersOptional(controller.signal, filter)
        : Promise.resolve(null),
    ])
      .then(([statisticsResult, temporalResult, clustersResult]) => {
        if (controller.signal.aborted) return;

        const unavailable: string[] = [];
        let error: ApiError | null = null;
        if (statisticsResult.status === "rejected") {
          if (isNotFound(statisticsResult.reason)) unavailable.push("GET /api/v1/statistics/earthquakes");
          else error = statisticsResult.reason instanceof ApiError ? statisticsResult.reason : new ApiError("Không tải được thống kê động đất.", 0);
        }
        if (includeTemporal && temporalResult.status === "rejected") {
          if (isNotFound(temporalResult.reason)) unavailable.push("GET /api/v1/analysis/temporal");
          else error = temporalResult.reason instanceof ApiError ? temporalResult.reason : new ApiError("Không tải được dữ liệu thời gian.", 0);
        }
        if (includeClusters && clustersResult.status === "rejected") {
          if (isNotFound(clustersResult.reason)) unavailable.push("GET /api/v1/clusters");
          else if (!error) error = clustersResult.reason instanceof ApiError ? clustersResult.reason : new ApiError("Không tải được dữ liệu cụm.", 0);
        }

        setState({
          statistics:
            statisticsResult.status === "fulfilled" && !isApiEmptyEnvelope(statisticsResult.value)
              ? statisticsResult.value
              : null,
          temporal:
            includeTemporal &&
            temporalResult.status === "fulfilled" &&
            !isApiEmptyEnvelope(temporalResult.value)
              ? temporalResult.value
              : null,
          clusters:
            includeClusters &&
            clustersResult.status === "fulfilled" &&
            clustersResult.value?.data
              ? clustersResult.value.data
              : null,
          loading: false,
          error,
          unavailable:
            includeClusters &&
            clustersResult.status === "fulfilled" &&
            clustersResult.value?.unavailable
              ? [...unavailable, "GET /api/v1/clusters"]
              : unavailable,
        });
      });

    return () => controller.abort();
  }, [
    interval,
    refreshKey,
    filter?.country,
    filter?.region,
    window?.start_time,
    window?.end_time,
    numeric?.min_magnitude,
    numeric?.max_magnitude,
    numeric?.min_depth,
    numeric?.max_depth,
    includeTemporal,
    includeClusters,
  ]);

  return state;
}
