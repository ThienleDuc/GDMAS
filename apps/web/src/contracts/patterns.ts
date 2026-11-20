/**
 * Hợp đồng `GET /api/v1/patterns` — nguồn 6 Patterns cho trang Thống kê (T7).
 * Nguồn: contracts/schemas/patterns.json, contracts/README.md §3.3.
 * `status = PENDING` hoặc `success: false` → FE chỉ hiển thị Empty State (không fallback mock).
 */

import type { ClusteringSummary } from "./clusters.ts";

export interface PatternItem {
  id: string;
  name: string;
  type: string;
  status: "COMPUTED" | "PENDING";
  /** Chưa siết type theo từng pattern ở tầng service; component dùng typed view. */
  metrics: Record<string, unknown>;
  period: string;
}

export interface PatternsResponse {
  success: boolean;
  total_patterns: number;
  patterns: PatternItem[];
  clustering_summary?: ClusteringSummary | null;
  message?: string;
  last_updated?: string;
}
