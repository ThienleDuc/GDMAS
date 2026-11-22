import { useCallback, useEffect, useState } from "react";
import type { SeasonalityResponse, TrendResponse } from "../../contracts/analysis.ts";
import type { ClassificationsResponse } from "../../contracts/classifications.ts";
import type { ClustersResponse } from "../../contracts/clusters.ts";
import type { EarthquakeItem, StatisticsResponse } from "../../contracts/earthquake.ts";
import type { PredictionsResponse } from "../../contracts/predictions.ts";
import { isApiEmptyEnvelope } from "../../contracts/common.ts";
import { ApiError } from "../../lib/api-client.ts";
import { useEarthquakeInsights } from "../../hooks/useEarthquakeInsights.ts";
import {
  getClassifications,
  getEarthquakes,
  getPredictions,
  getSeasonalityAnalysis,
  getTrendAnalysis,
} from "../../services/earthquake-api.ts";

interface OverviewState {
  trend: TrendResponse | null;
  seasonality: SeasonalityResponse | null;
  predictions: PredictionsResponse | null;
  classifications: ClassificationsResponse | null;
  latestEvents: EarthquakeItem[];
  loading: boolean;
  error: string | null;
  unavailable: string[];
}

const INITIAL_STATE: OverviewState = {
  trend: null,
  seasonality: null,
  predictions: null,
  classifications: null,
  latestEvents: [],
  loading: true,
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

/** Gom dữ liệu trang tổng quan: tất cả endpoint có sẵn, chịu được 404/DB rỗng. */
export function useOverviewData(): OverviewData {
  const insights = useEarthquakeInsights("day");
  const [state, setState] = useState<OverviewState>(INITIAL_STATE);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    // API.md §3.3: BE /analysis/trend chỉ nhận resample_freq/metric; seasonality không nhận param.
    // Không gửi cửa sổ 14 ngày giả — BE vốn bỏ qua các param thời gian này.
    setState((previous) => ({ ...previous, loading: true, error: null, unavailable: [] }));

    Promise.allSettled([
      getTrendAnalysis({ resample_freq: "D" }, controller.signal),
      getSeasonalityAnalysis({}, controller.signal),
      getPredictions(controller.signal),
      getClassifications(controller.signal),
      getEarthquakes({ limit: 5, sort_by: "event_time", order: "desc" }, controller.signal),
    ])
      .then(([trend, seasonality, predictions, classifications, events]) => {
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

        setState({
          trend: pick(trend, "GET /api/v1/analysis/trend"),
          seasonality: pick(seasonality, "GET /api/v1/analysis/seasonality"),
          predictions: pick(predictions, "GET /api/v1/predictions"),
          classifications: pick(classifications, "GET /api/v1/classifications"),
          latestEvents: latest,
          loading: false,
          error,
          unavailable,
        });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({ ...previous, loading: false, error: errorMessage(reason) }));
        }
      });

    return () => controller.abort();
  }, [refreshKey]);

  return {
    ...state,
    statistics: insights.statistics,
    clusters: insights.clusters,
    loading: state.loading || insights.loading,
    error: state.error ?? insights.error?.message ?? null,
    unavailable: [...insights.unavailable, ...state.unavailable],
    refresh,
  };
}
