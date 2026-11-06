/**
 * Các kiểu dữ liệu nội bộ dùng chung cho ứng dụng Frontend
 */

export interface FilterState {
  minMagnitude?: number;
  maxMagnitude?: number;
  startDate?: string;
  endDate?: string;
  minDepth?: number;
  maxDepth?: number;
}

export type TimeAggregation = "day" | "week" | "month";

