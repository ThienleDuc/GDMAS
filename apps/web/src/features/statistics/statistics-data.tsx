/**
 * Context nạp dữ liệu 6 nguồn phân tích MỘT LẦN tại sublayout.
 * Các pattern con chỉ đọc — chuyển giữa các route không refetch lại.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CorrelationResponse, SeasonalityResponse, TemporalResponse, TrendResponse } from "../../contracts/analysis.ts";
import type { AnalysisInterval } from "../../contracts/common.ts";
import type { ClassificationsResponse } from "../../contracts/classifications.ts";
import type { PredictionsResponse } from "../../contracts/predictions.ts";
import {
  asClassification,
  asPrediction,
  toObservedFromLineChart,
  toObservedFromTrend,
} from "../../lib/transforms/chart-data.ts";
import {
  getClassifications,
  getCorrelationAnalysis,
  getPredictions,
  getSeasonalityAnalysis,
  getTemporalAnalysis,
  getTrendAnalysis,
} from "../../services/earthquake-api.ts";
import { intervalToParams, metricsFor, statisticsView, type PanelState } from "./statistics-view.ts";

export interface PanelData<T> {
  loading: boolean;
  error: unknown;
  data: T | null;
}

export interface StatisticsData {
  interval: AnalysisInterval;
  setInterval: (value: AnalysisInterval) => void;
  temporal: PanelData<TemporalResponse>;
  trend: PanelData<TrendResponse>;
  seasonality: PanelData<SeasonalityResponse>;
  correlation: PanelData<CorrelationResponse>;
  predictions: PanelData<PredictionsResponse>;
  classifications: PanelData<ClassificationsResponse>;
  temporalData: TemporalResponse["data"] | null;
  trendData: TrendResponse["data"] | null;
  seasonalityData: SeasonalityResponse["data"] | null;
  correlationData: CorrelationResponse["data"] | null;
  prediction: ReturnType<typeof asPrediction> | null;
  classification: ReturnType<typeof asClassification> | null;
  observed: ReturnType<typeof toObservedFromTrend>;
  views: Record<"temporal" | "trend" | "seasonality" | "correlation" | "forecast" | "classification", PanelState>;
}

const StatisticsContext = createContext<StatisticsData | null>(null);

function usePanel<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: React.DependencyList): PanelData<T> {
  const [state, setState] = useState<PanelData<T>>({ loading: true, error: null, data: null });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, error: null }));
    void fetcher(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ loading: false, error: null, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ loading: false, error, data: null });
      });
    return () => controller.abort();
    // fetcher được tạo lại mỗi render; only deps quyết định refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

export const StatisticsDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interval, setInterval] = useState<AnalysisInterval>("week");
  const window = useMemo(() => intervalToParams(interval), [interval]);

  const temporal = usePanel<TemporalResponse>(
    (signal) =>
      getTemporalAnalysis({ interval, start_time: window.start_time, end_time: window.end_time }, signal),
    [interval, window],
  );
  const trend = usePanel<TrendResponse>(
    (signal) => getTrendAnalysis({ resample_freq: "W", metric: "count" }, signal),
    [],
  );
  const seasonality = usePanel<SeasonalityResponse>((signal) => getSeasonalityAnalysis({}, signal), []);
  const correlation = usePanel<CorrelationResponse>((signal) => getCorrelationAnalysis({}, signal), []);
  const predictions = usePanel<PredictionsResponse>((signal) => getPredictions(signal), []);
  const classifications = usePanel<ClassificationsResponse>((signal) => getClassifications(signal), []);

  const temporalData = metricsFor(temporal.data);
  const trendData = metricsFor(trend.data);
  const seasonalityData = metricsFor(seasonality.data);
  const correlationData = metricsFor(correlation.data);
  const predictionData = metricsFor(predictions.data);
  const classificationData = metricsFor(classifications.data);

  const prediction = predictionData ? asPrediction(predictionData as unknown as Record<string, unknown>) : null;
  const classification = classificationData
    ? asClassification(classificationData as unknown as Record<string, unknown>)
    : null;

  const observed = useMemo(() => {
    const fromTrend = toObservedFromTrend(trendData?.series);
    return fromTrend.length > 0 ? fromTrend : toObservedFromLineChart(temporalData?.line_chart);
  }, [trendData, temporalData]);

  const value = useMemo<StatisticsData>(
    () => ({
      interval,
      setInterval,
      temporal,
      trend,
      seasonality,
      correlation,
      predictions,
      classifications,
      temporalData,
      trendData,
      seasonalityData,
      correlationData,
      prediction,
      classification,
      observed,
      views: {
        temporal: statisticsView({ loading: temporal.loading, error: temporal.error, hasData: Boolean(temporalData) }),
        trend: statisticsView({ loading: trend.loading, error: trend.error, hasData: Boolean(trendData) }),
        seasonality: statisticsView({ loading: seasonality.loading, error: seasonality.error, hasData: Boolean(seasonalityData) }),
        correlation: statisticsView({ loading: correlation.loading, error: correlation.error, hasData: Boolean(correlationData) }),
        forecast: statisticsView({
          loading: predictions.loading,
          error: predictions.error,
          hasData: prediction !== null && Number.isFinite(prediction.predicted_value),
        }),
        classification: statisticsView({
          loading: classifications.loading,
          error: classifications.error,
          hasData: classification !== null && Boolean(classification.predicted_label),
        }),
      },
    }),
    [
      interval,
      temporal,
      trend,
      seasonality,
      correlation,
      predictions,
      classifications,
      temporalData,
      trendData,
      seasonalityData,
      correlationData,
      prediction,
      classification,
      observed,
    ],
  );

  return <StatisticsContext.Provider value={value}>{children}</StatisticsContext.Provider>;
};

export function useStatisticsData(): StatisticsData {
  const value = useContext(StatisticsContext);
  if (!value) throw new Error("useStatisticsData phải dùng trong StatisticsDataProvider");
  return value;
}
