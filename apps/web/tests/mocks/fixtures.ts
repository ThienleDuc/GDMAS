import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const contractsExamples = resolve(repoRoot, "contracts/examples");

function readExample<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(contractsExamples, filename), "utf8")) as T;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  metadata?: Record<string, unknown>;
}

export interface SseEventFixture {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  id?: string;
  retry?: number;
}

export const earthquakeFixture = () => readExample<Record<string, unknown>>("earthquake_sample.json");
export const patternsFixture = () => readExample<Record<string, unknown>>("patterns_sample.json");
export const analysisFixture = () => readExample<Record<string, unknown>>("analysis_sample.json");
export const healthFixture = () => readExample<ApiEnvelope<Record<string, unknown>>>("health_sample.json");
export const systemStatusFixture = () => readExample<ApiEnvelope<Record<string, unknown>>>("system_status_sample.json");
export const predictionsFixture = () => readExample<ApiEnvelope<Record<string, unknown>>>("predictions_sample.json");
export const classificationsFixture = () => readExample<ApiEnvelope<Record<string, unknown>>>("classifications_sample.json");
export const clustersFixture = () => readExample<ApiEnvelope<Record<string, unknown>>>("clusters_sample.json");
export const sseEventFixture = () => readExample<SseEventFixture>("sse-event_sample.json");

export function successEnvelope<T>(data: T, metadata?: Record<string, unknown>): ApiEnvelope<T> {
  return metadata ? { success: true, data, metadata } : { success: true, data };
}

export function errorEnvelope(code: string, message: string, details?: unknown) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}
