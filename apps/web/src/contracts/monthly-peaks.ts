/** Đếm sự kiện theo tháng từ GET /api/v1/statistics/monthly-peaks (UTC, I3). */

export interface MonthlyPeak {
  month: number;
  label: string;
  count: number;
}

export interface MonthlyPeaksResponse {
  success: boolean;
  data: MonthlyPeak[];
}
