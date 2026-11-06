/**
 * Data Contracts giữa Backend FastAPI và Frontend React
 * Khớp 1:1 với contracts/schemas/
 */

export interface EarthquakeContract {
  id: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  place: string;
  status?: "reviewed" | "automatic";
}

export interface SSEEventPayload<T = unknown> {
  event: "earthquake_detected" | "heartbeat" | "alert";
  data: T;
  timestamp: string;
}

export interface PredictionContract {
  targetDate: string;
  predictedCount: number;
  confidenceLower: number;
  confidenceUpper: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

