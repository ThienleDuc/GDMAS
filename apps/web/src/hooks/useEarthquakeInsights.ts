import { useEffect, useState } from "react";
import { isApiEmptyEnvelope, type AnalysisInterval } from "../contracts/common.ts";
import type { StatisticsResponse } from "../contracts/earthquake.ts";
import type { TemporalResponse } from "../contracts/analysis.ts";
import type { ClustersResponse } from "../contracts/clusters.ts";
import { ApiError } from "../lib/api-client.ts";
import { geoQuery, type GeoFilter } from "../contracts/geo-filter.ts";
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

export function useEarthquakeInsights(
  interval: AnalysisInterval,
  refreshKey = 0,
  filter?: GeoFilter | null,
): EarthquakeInsightsState {
  const [state, setState] = useState<EarthquakeInsightsState>(INITIAL_STATE);

  useEffect(() => {
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null, unavailable: [] }));

    Promise.allSettled([
      getEarthquakeStatistics(controller.signal, filter),
      getTemporalAnalysis({ interval, ...geoQuery(filter) }, controller.signal),
      getClustersOptional(controller.signal),
    ])
      .then(([statisticsResult, temporalResult, clustersResult]) => {
        if (controller.signal.aborted) return;

        const unavailable: string[] = [];
        let error: ApiError | null = null;
        if (statisticsResult.status === "rejected") {
          if (isNotFound(statisticsResult.reason)) unavailable.push("GET /api/v1/statistics/earthquakes");
          else error = statisticsResult.reason instanceof ApiError ? statisticsResult.reason : new ApiError("Không tải được thống kê động đất.", 0);
        }
        if (temporalResult.status === "rejected") {
          if (isNotFound(temporalResult.reason)) unavailable.push("GET /api/v1/analysis/temporal");
          else error = temporalResult.reason instanceof ApiError ? temporalResult.reason : new ApiError("Không tải được dữ liệu thời gian.", 0);
        }
        if (clustersResult.status === "rejected") {
          if (isNotFound(clustersResult.reason)) unavailable.push("GET /api/v1/clusters");
          else if (!error) error = clustersResult.reason instanceof ApiError ? clustersResult.reason : new ApiError("Không tải được dữ liệu cụm.", 0);
        }

        setState({
          statistics:
            statisticsResult.status === "fulfilled" && !isApiEmptyEnvelope(statisticsResult.value)
              ? statisticsResult.value
              : null,
          temporal:
            temporalResult.status === "fulfilled" && !isApiEmptyEnvelope(temporalResult.value)
              ? temporalResult.value
              : null,
          clusters: clustersResult.status === "fulfilled" && clustersResult.value.data
            ? clustersResult.value.data
            : null,
          loading: false,
          error,
          unavailable: clustersResult.status === "fulfilled" && clustersResult.value.unavailable
            ? [...unavailable, "GET /api/v1/clusters"]
            : unavailable,
        });
      });

    return () => controller.abort();
  }, [interval, refreshKey, filter?.country, filter?.region]);

  return state;
}
