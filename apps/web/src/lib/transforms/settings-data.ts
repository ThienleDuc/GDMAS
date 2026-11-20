/**
 * Hàm đánh giá và chuẩn hoá dữ liệu giám sát 7 Terminals (Terminal 7 — Frontend)
 * theo quy định kiểm soát dữ liệu cũ docs/architecture.md §9.4.
 *
 * Chu kỳ chạy chuẩn:
 * - 5 phút (T2 Ingestion, T3 Analysis, T5 Prediction, T6 API):
 *   - > 15 phút: Cảnh báo Dữ liệu cũ (STALE)
 *   - > 60 phút: Cảnh báo Gián đoạn (INTERRUPTED)
 * - 1 ngày (T4 Clustering):
 *   - > 26 giờ: Cảnh báo Dữ liệu cũ (STALE)
 *   - > 48 giờ: Cảnh báo Gián đoạn (INTERRUPTED)
 */

import type { ServiceKey, ServiceStatus } from "../../contracts";

export type FreshnessState = "fresh" | "stale" | "interrupted" | "unknown";

export interface FreshnessResult {
  state: FreshnessState;
  label: string;
  badgeClass: string;
  diffMinutes: number | null;
}

/**
 * Đánh giá độ tươi mới của tiến trình dựa trên `last_run` và chu kỳ (cycle).
 * `now` nhận tham số ngoài để hỗ trợ test tất định offline.
 */
export function evaluateServiceFreshness(
  service: Partial<ServiceStatus> | null | undefined,
  now: Date = new Date()
): FreshnessResult {
  if (!service || !service.last_run) {
    return {
      state: "unknown",
      label: "Chưa có thông tin",
      badgeClass: "bg-muted text-muted-foreground border-border",
      diffMinutes: null,
    };
  }

  const lastRunMs = Date.parse(service.last_run);
  if (Number.isNaN(lastRunMs)) {
    return {
      state: "unknown",
      label: "Thời gian không hợp lệ",
      badgeClass: "bg-muted text-muted-foreground border-border",
      diffMinutes: null,
    };
  }

  const diffMs = now.getTime() - lastRunMs;
  const diffMinutes = Math.max(0, Math.floor(diffMs / (60 * 1000)));

  const isOneDayCycle = service.cycle === "1d" || service.cycle === "24h";

  if (isOneDayCycle) {
    // Chu kỳ 1 ngày (Clustering T4)
    if (diffMinutes > 48 * 60) {
      return {
        state: "interrupted",
        label: "Gián đoạn (>48h)",
        badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
        diffMinutes,
      };
    }
    if (diffMinutes > 26 * 60) {
      return {
        state: "stale",
        label: "Dữ liệu cũ (>26h)",
        badgeClass: "bg-warning-light text-warning-dark border-warning",
        diffMinutes,
      };
    }
    return {
      state: "fresh",
      label: "Hoạt động tốt",
      badgeClass: "bg-success-light text-success-dark border-success",
      diffMinutes,
    };
  }

  // Chu kỳ 5 phút (Ingestion T2, Analysis T3, Prediction T5, API T6)
  if (diffMinutes > 60) {
    return {
      state: "interrupted",
      label: "Gián đoạn (>60m)",
      badgeClass: "bg-destructive/10 text-destructive border-destructive/30",
      diffMinutes,
    };
  }
  if (diffMinutes > 15) {
    return {
      state: "stale",
      label: "Dữ liệu cũ (>15m)",
      badgeClass: "bg-warning-light text-warning-dark border-warning",
      diffMinutes,
    };
  }

  return {
    state: "fresh",
    label: "Hoạt động tốt",
    badgeClass: "bg-success-light text-success-dark border-success",
    diffMinutes,
  };
}

/** Định dạng khoảng thời gian trôi qua dễ đọc tiếng Việt */
export function formatElapsedMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) {
    return remMinutes > 0 ? `${hours} giờ ${remMinutes} phút trước` : `${hours} giờ trước`;
  }
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

/**
 * Danh sách 7 Terminals chuẩn theo kiến trúc GDMAS.
 */
export const TERMINAL_KEYS: ServiceKey[] = [
  "postgres",
  "ingestion",
  "analysis",
  "clustering",
  "prediction",
  "api",
  "frontend",
];

export const TERMINAL_SPECS: Record<
  ServiceKey,
  { name: string; terminalId: string; cycle: string; description: string }
> = {
  postgres: {
    name: "PostgreSQL 16",
    terminalId: "T1",
    cycle: "Luôn chạy",
    description: "Cơ sở dữ liệu trung tâm lưu trữ toàn bộ dữ liệu địa chấn và kết quả phân tích",
  },
  ingestion: {
    name: "Data Ingestion",
    terminalId: "T2",
    cycle: "5 phút",
    description: "Thu thập dữ liệu địa chấn tự động từ USGS API",
  },
  analysis: {
    name: "Data Analysis",
    terminalId: "T3",
    cycle: "5 phút",
    description: "Tính toán 4 patterns chuỗi thời gian (Temporal, Trend, Seasonality, Correlation)",
  },
  clustering: {
    name: "Spatial Clustering",
    terminalId: "T4",
    cycle: "1 ngày",
    description: "Gom cụm không gian theo mật độ bằng thuật toán DBSCAN",
  },
  prediction: {
    name: "Prediction & Classification",
    terminalId: "T5",
    cycle: "5 phút",
    description: "Dự báo cường độ/số lượng và phân loại mức độ rủi ro địa chấn thời điểm t+1",
  },
  api: {
    name: "FastAPI REST & SSE",
    terminalId: "T6",
    cycle: ":8000",
    description: "Cung cấp REST API và phát sự kiện thời gian thực Server-Sent Events",
  },
  frontend: {
    name: "React + Vite SPA",
    terminalId: "T7",
    cycle: ":3000",
    description: "Giao diện Dashboard, bản đồ GIS Dark Mode và báo cáo phân tích",
  },
};
