/**
 * Bảng phân tích "chuyên gia" — sinh nhận xét/dự báo bằng QUY TẮC từ dữ liệu 6 pattern.
 * Cấu trúc báo cáo theo docs/analysis/insights-structure.md.
 * Thuần, offline, không gọi AI/mạng: nhận xét chỉ dùng số liệu có trong payload,
 * thiếu dữ liệu thì nói rõ "Chưa có", không suy diễn hay bịa số (I5/I7).
 */

import type {
  CorrelationResponse,
  SeasonalityResponse,
  TemporalResponse,
  TrendResponse,
} from "../../contracts/analysis.ts";
import {
  formatCoefficient,
  formatNumber,
  isFiniteNumber,
  normalizeRiskLabel,
  type ObservedPoint,
} from "../../lib/transforms/chart-data.ts";
import type { TimezoneMode } from "../../lib/formatters.ts";
import { formatStatDate } from "./statistics-view.ts";
import { correlationVariableLabel, riskLevelLabel } from "./statistics-view.ts";

/** Shape tối thiểu cần cho nhận xét — chịu cả 2 dạng payload (/predictions và /patterns). */
export interface ExpertPredictionInput {
  target_date?: string | null;
  predicted_value?: number | null;
  confidence_interval?: { lower?: number | null; upper?: number | null } | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  /** Mức tin cậy (0.95) và tên mô hình — dùng để ghi rõ cơ sở của khoảng. */
  confidence_level?: number | null;
  model_name?: string | null;
}

export interface ExpertClassificationInput {
  target_date?: string | null;
  predicted_label?: string | null;
}

export type InsightLevel = "info" | "watch" | "alert";

export interface ExpertInsight {
  id: string;
  pattern: string;
  title: string;
  comment: string;
  level: InsightLevel;
  /** Mốc dữ liệu đã dùng để đưa ra nhận xét — không tự suy thêm. */
  evidence: string[];
}

export interface ExpertReport {
  headline: string;
  summary: string;
  insights: ExpertInsight[];
  outlook: string;
  recommendations: string[];
  caveats: string[];
  dataSourceNote: string;
}

export interface ExpertInput {
  temporal: TemporalResponse["data"] | null;
  trend: TrendResponse["data"] | null;
  seasonality: SeasonalityResponse["data"] | null;
  correlation: CorrelationResponse["data"] | null;
  prediction: ExpertPredictionInput | null;
  classification: ExpertClassificationInput | null;
  observed: readonly ObservedPoint[];
}

const DATA_SOURCE_NOTE =
  "Nguồn: 6 nhóm dữ liệu đang hiển thị. Nhận xét được sinh tự động — không phải cảnh báo chính thức.";

const CAVEATS = [
  "Ma trận tương quan chỉ mô tả mối liên hệ — không suy diễn nhân quả.",
  "Dự báo cho ngày kế tiếp là ước lượng thống kê, có thể thay đổi khi có dữ liệu mới.",
  "Thiếu số liệu thì báo cáo ghi rõ 'Chưa có' — không dùng giá trị dự phòng.",
];

/** Pattern 1 — mức độ hoạt động trong cửa sổ đang xem. */
function temporalInsight(data: ExpertInput["temporal"]): ExpertInsight {
  const points = data?.line_chart ?? [];
  if (points.length === 0) {
    return {
      id: "temporal",
      pattern: "1",
      title: "Biểu diễn theo thời gian",
      comment: "Chưa có chuỗi thời gian trong cửa sổ này — không thể nhận xét mức độ hoạt động.",
      level: "info",
      evidence: [],
    };
  }

  const total = points.reduce(
    (sum, point) => sum + (isFiniteNumber(point.event_count) ? point.event_count : 0),
    0,
  );
  const maxMagnitude = points.reduce<number | null>((max, point) => {
    const value = point.max_magnitude;
    return isFiniteNumber(value) ? Math.max(max ?? value, value) : max;
  }, null);
  const strong = maxMagnitude !== null && maxMagnitude >= 6;

  return {
    id: "temporal",
    pattern: "1",
    title: "Biểu diễn theo thời gian",
    comment: `Cửa sổ đang xem ghi nhận ${total} sự kiện${
      maxMagnitude !== null ? `, độ lớn cao nhất ${formatNumber(maxMagnitude, 1)}` : ""
    }. ${strong ? "Xuất hiện sự kiện có độ lớn từ 6 trở lên — cần theo dõi thêm." : "Chưa ghi nhận sự kiện có độ lớn từ 6 trở lên trong cửa sổ này."}`,
    level: strong ? "watch" : "info",
    evidence: [
      `${points.length} kỳ thời gian`,
      `${total} sự kiện`,
      ...(maxMagnitude !== null ? [`Độ lớn lớn nhất ${formatNumber(maxMagnitude, 1)}`] : []),
    ],
  };
}

/** Pattern 2 — xu hướng sau re-sampling. */
function trendInsight(data: ExpertInput["trend"]): ExpertInsight {
  const direction = data?.trend_direction;
  if (!direction || (data?.series ?? []).length === 0) {
    return {
      id: "trend",
      pattern: "2",
      title: "Phân tích xu hướng",
      comment: "Chưa có chuỗi xu hướng hợp lệ để đánh giá.",
      level: "info",
      evidence: [],
    };
  }

  const directionText =
    direction === "increasing" ? "tăng" : direction === "decreasing" ? "giảm" : "ổn định";
  const r2 = isFiniteNumber(data.r_squared) ? formatNumber(data.r_squared, 2) : null;
  const weakFit = isFiniteNumber(data.r_squared) && (data.r_squared ?? 0) < 0.5;

  return {
    id: "trend",
    pattern: "2",
    title: "Phân tích xu hướng",
    comment: `Xu hướng ${directionText} sau re-sampling${
      r2 ? ` (độ phù hợp mô hình ${r2})` : ""
    }.${weakFit ? " Độ phù hợp mô hình thấp — cần thận trọng khi kết luận." : ""}`,
    level: direction === "increasing" ? "watch" : "info",
    evidence: [
      `Hướng: ${directionText}`,
      `${data.series.length} kỳ phân tích`,
      ...(r2 ? [`Độ phù hợp mô hình ${r2}`] : []),
      ...(isFiniteNumber(data.slope) ? [`Độ dốc ${formatNumber(data.slope, 4)}`] : []),
    ],
  };
}

/** Pattern 3 — phân tích chu kỳ (theo thuật ngữ thống nhất trên UI). */
function seasonalityInsight(data: ExpertInput["seasonality"]): ExpertInsight {
  const strength = data?.components?.seasonality_strength;
  const line = data?.components?.seasonal_line ?? [];
  if (line.length === 0) {
    return {
      id: "seasonality",
      pattern: "3",
      title: "Phân tích chu kỳ",
      comment: "Chưa có đủ chu kỳ để đánh giá tính chu kỳ của chuỗi dữ liệu.",
      level: "info",
      evidence: [],
    };
  }

  const strong = isFiniteNumber(strength) && strength >= 0.6;
  const value = isFiniteNumber(strength) ? formatNumber(strength, 2) : "—";
  const interpretation = data?.components?.interpretation?.trim();

  return {
    id: "seasonality",
    pattern: "3",
    title: "Phân tích chu kỳ",
    comment: `Độ mạnh chu kỳ ${value} — ${
      strong ? "tính chu kỳ tương đối rõ." : "tính chu kỳ yếu, chưa có bằng chứng chu kỳ rõ rệt."
    }${interpretation ? ` Diễn giải từ nguồn dữ liệu: ${interpretation}` : ""}`,
    level: strong ? "watch" : "info",
    evidence: [
      `${line.length} điểm chu kỳ`,
      `Độ mạnh ${value}`,
      ...(interpretation ? ["Có diễn giải kèm theo từ nguồn dữ liệu"] : []),
    ],
  };
}

/** Pattern 4 — cặp biến tương quan mạnh nhất (không suy diễn nhân quả). */
function correlationInsight(data: ExpertInput["correlation"]): ExpertInsight {
  const variables = data?.variables ?? [];
  const matrix = data?.matrix ?? [];
  let best: { x: string; y: string; value: number } | null = null;

  for (let row = 0; row < variables.length; row += 1) {
    for (let col = row + 1; col < variables.length; col += 1) {
      const value = matrix[row]?.[col];
      if (!isFiniteNumber(value)) continue;
      if (best === null || Math.abs(value) > Math.abs(best.value)) {
        best = { x: variables[col], y: variables[row], value };
      }
    }
  }

  if (!best) {
    return {
      id: "correlation",
      pattern: "4",
      title: "Tương quan",
      comment: "Chưa có ma trận tương quan hợp lệ để nhận xét.",
      level: "info",
      evidence: [],
    };
  }

  const strong = Math.abs(best.value) >= 0.6;
  const xLabel = correlationVariableLabel(best.x);
  const yLabel = correlationVariableLabel(best.y);
  const coefficient = formatCoefficient(best.value);

  return {
    id: "correlation",
    pattern: "4",
    title: "Tương quan",
    comment: `Cặp biến liên hệ chặt nhất: ${yLabel} và ${xLabel} (hệ số ${coefficient}). ${
      strong ? "Mối liên hệ đáng chú ý nhưng không khẳng định nhân quả." : "Mức độ liên hệ nhìn chung thấp."
    }`,
    level: strong ? "watch" : "info",
    evidence: [
      `${variables.length} biến trong ma trận`,
      `${yLabel} và ${xLabel}: hệ số ${coefficient}`,
      ...(data?.sample_size ? [`${data.sample_size} mẫu`] : []),
    ],
  };
}

/** Pattern 5 — dự báo ngày kế tiếp so với quan sát gần nhất. */
function forecastInsight(
  data: ExpertInput["prediction"],
  observed: readonly ObservedPoint[],
  mode: TimezoneMode = "UTC+7",
): ExpertInsight {
  if (!isFiniteNumber(data?.predicted_value)) {
    return {
      id: "forecast",
      pattern: "5",
      title: "Hồi quy & Dự báo",
      comment: "Chưa có giá trị dự báo định lượng cho ngày kế tiếp.",
      level: "info",
      evidence: [],
    };
  }

  const predicted = data.predicted_value;
  const rawLower = isFiniteNumber(data.confidence_interval?.lower)
    ? (data.confidence_interval?.lower as number)
    : isFiniteNumber(data.lower_bound)
      ? (data.lower_bound as number)
      : predicted;
  const rawUpper = isFiniteNumber(data.confidence_interval?.upper)
    ? (data.confidence_interval?.upper as number)
    : isFiniteNumber(data.upper_bound)
      ? (data.upper_bound as number)
      : predicted;
  const lower = Math.min(rawLower, rawUpper, predicted);
  const upper = Math.max(rawLower, rawUpper, predicted);

  const last = observed.length > 0 ? observed[observed.length - 1]?.value : null;
  const rising = isFiniteNumber(last) && (predicted ?? 0) > (last ?? 0);
  const target = data.target_date?.trim() ? formatStatDate(data.target_date, mode) : "ngày kế tiếp";
  // Nêu rõ mức tin cậy và cơ sở (mô hình) thay vì chỉ ghi một đoạn số.
  const confidenceLabel = isFiniteNumber(data.confidence_level)
    ? `${Math.round((data.confidence_level as number) * 100)}%`
    : "mức chưa xác định";
  const modelLabel = data.model_name?.trim() || "mô hình dự báo";

  return {
    id: "forecast",
    pattern: "5",
    title: "Hồi quy & Dự báo",
    comment: `Dự báo cho ${target}: ${formatNumber(predicted, 1)} (khoảng tin cậy ${confidenceLabel} theo ${modelLabel}: ${formatNumber(
      lower,
      1,
    )} – ${formatNumber(upper, 1)}).${
      isFiniteNumber(last) ? ` Cao hơn quan sát gần nhất (${formatNumber(last, 1)})` : ""
    } ${rising ? "— xu hướng tăng nhẹ." : "— không vượt quan sát gần nhất."}`,
    level: rising ? "watch" : "info",
    evidence: [
      `Ngày dự báo ${target}`,
      `Giá trị ${formatNumber(predicted, 1)}`,
      `Khoảng tin cậy ${confidenceLabel} theo ${modelLabel}: ${formatNumber(lower, 1)} – ${formatNumber(upper, 1)}`,
      ...(isFiniteNumber(last) ? [`Quan sát gần nhất ${formatNumber(last, 1)}`] : []),
    ],
  };
}

/** Pattern 6 — nhóm rủi ro dự báo. */
function classificationInsight(
  data: ExpertInput["classification"],
  mode: TimezoneMode = "UTC+7",
): ExpertInsight {
  const level = normalizeRiskLabel(data?.predicted_label);
  if (!level) {
    return {
      id: "classification",
      pattern: "6",
      title: "Phân loại",
      comment: "Chưa có nhãn phân loại hợp lệ cho ngày kế tiếp.",
      level: "info",
      evidence: [],
    };
  }

  const high = level === "HIGH" || level === "CRITICAL";
  const label = riskLevelLabel(level);
  return {
    id: "classification",
    pattern: "6",
    title: "Phân loại",
    comment: `Nhóm hoạt động dự báo: ${label}. ${
      high ? "Mức cao — cần theo dõi sát diễn biến." : "Mức nằm trong vùng quan sát bình thường."
    }`,
    level: high ? "alert" : "info",
    evidence: [
      `Ngày dự báo ${data?.target_date?.trim() ? formatStatDate(data.target_date, mode) : "ngày kế tiếp"}`,
      `Nhóm ${label}`,
      `Nhãn gốc ${data?.predicted_label ?? "—"}`,
    ],
  };
}

/** Tổng hợp 6 nhận xét thành báo cáo đầy đủ 5 phần theo tài liệu cấu trúc. */
export function buildExpertReport(input: ExpertInput, mode: TimezoneMode = "UTC+7"): ExpertReport {
  const insights = [
    temporalInsight(input.temporal),
    trendInsight(input.trend),
    seasonalityInsight(input.seasonality),
    correlationInsight(input.correlation),
    forecastInsight(input.prediction, input.observed, mode),
    classificationInsight(input.classification, mode),
  ];

  const hasAlert = insights.some((item) => item.level === "alert");
  const hasWatch = insights.some((item) => item.level === "watch");
  const headline = hasAlert
    ? "Cần chú ý: có tín hiệu mức cao trong dữ liệu phân tích."
    : hasWatch
      ? "Một số chỉ số đang cho thấy diễn biến đáng theo dõi."
      : "Dữ liệu hiện tại chưa cho thấy tín hiệu bất thường.";

  const filled = insights.filter((item) => item.evidence.length > 0);
  const summary =
    `Báo cáo tổng hợp ${insights.length} nhóm phân tích, trong đó ${filled.length} nhóm có dữ liệu để nhận xét. ` +
    (hasAlert
      ? "Nhóm phân loại đang ở mức cao, cần đối chiếu với diễn biến thực tế."
      : hasWatch
        ? "Một số chỉ số (cường độ, xu hướng hoặc dự báo) đang vượt ngưỡng quan sát."
        : "Các chỉ số chính nằm trong vùng quan sát bình thường.");

  const forecast = insights.find((item) => item.id === "forecast");
  const classification = insights.find((item) => item.id === "classification");
  const outlook = `Triển vọng ngày kế tiếp: ${forecast?.comment ?? ""} ${classification?.comment ?? ""}`.trim();

  const recommendations: string[] = [];
  if (hasAlert) recommendations.push("Đối chiếu ngay nhãn phân loại với diễn biến thực tế trên bản đồ giám sát.");
  if (insights.find((item) => item.id === "temporal")?.level === "watch") {
    recommendations.push("Kiểm tra lại các sự kiện cường độ cao trong danh mục động đất.");
  }
  if (insights.find((item) => item.id === "forecast")?.level === "watch") {
    recommendations.push("Theo dõi sát giá trị dự báo ngày kế tiếp khi dữ liệu mới được cập nhật.");
  }
  if (insights.find((item) => item.id === "correlation")?.level === "watch") {
    recommendations.push("Tăng số mẫu trước khi kết luận về mối liên hệ giữa các biến đo đạc.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Tiếp tục theo dõi chu kỳ cập nhật của các luồng phân tích.");
  }

  return {
    headline,
    summary,
    insights,
    outlook,
    recommendations,
    caveats: CAVEATS,
    dataSourceNote: DATA_SOURCE_NOTE,
  };
}
