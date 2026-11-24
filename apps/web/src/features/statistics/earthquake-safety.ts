/**
 * Khuyến nghị an toàn khi động đất — do HỆ THỐNG thêm, nằm NGOÀI phân tích/dự báo của AI.
 * Nội dung là hướng dẫn an toàn chung, không phải dự báo hay cảnh báo chính thức.
 * Không đưa số liệu vào câu chữ để tránh nhầm với dữ liệu phân tích (I5).
 */

import type { ExpertInput } from "./ai-insights.ts";
import { isFiniteNumber } from "../../lib/transforms/chart-data.ts";

export type SafetyLevel = "info" | "watch" | "alert";

export interface SafetyAdvice {
  level: SafetyLevel;
  title: string;
  intro: string;
  items: string[];
  sources: string[];
  disclaimer: string;
}

/** Độ lớn lớn nhất quan sát được ở Pattern 1 — số liệu thật, không suy diễn. */
export function maxObservedMagnitude(input: ExpertInput): number | null {
  const points = input.temporal?.line_chart ?? [];
  let max: number | null = null;
  for (const point of points) {
    const value = point.max_magnitude;
    if (isFiniteNumber(value)) max = Math.max(max ?? value, value);
  }
  return max;
}

const SOURCES = [
  "USGS — Drop, Cover, and Hold On: usgs.gov/faqs/what-should-you-do-during-earthquake-drop-cover-hold",
  "Earthquake Country Alliance — Seven Steps to Earthquake Safety: earthquakeountryalliance.org",
  "FEMA/ready.gov — Earthquakes: ready.gov/earthquakes",
  "American Red Cross — Earthquake Safety: redcross.org",
  "NOAA — Tsunami Safety: tsunami.gov",
];

const COMMON = [
  "Chuẩn bị sẵn túi khẩn cấp: nước, đèn pin, radio, thuốc cá nhân và bản sao giấy tờ.",
  "Thỏa thuận trước một điểm hẹn với người thân khi mất liên lạc.",
  "Chỉ nghe thông báo từ cơ quan chức năng địa phương; không tin đồn.",
];

const WHILE_SHAKING = "Khi còn rung lắc: cúi thấp, che đầu gáy và bám chặt vào chân bàn hoặc cột vững; không chạy ra cửa, không dùng thang máy.";
const AFTER_SHAKING = "Sau khi rung ngừng: đi cầu thang, nếu ngửi mùi gas thì không bật công tắc hay dùng lửa, sơ tán và báo cơ quan chức năng.";

/**
 * Chọn mức khuyến nghị từ dữ liệu thật: độ lớn quan sát (Pattern 1) và nhóm phân loại (Pattern 6).
 * Đây là ngưỡng quy tắc cố định, KHÔNG phải nhận định của mô hình.
 */
export function buildSafetyAdvice(input: ExpertInput): SafetyAdvice {
  const max = maxObservedMagnitude(input);
  const label = String(input.classification?.predicted_label ?? "").toUpperCase();
  const highRisk = label.includes("HIGH") || label.includes("CRITICAL");
  const strong = (max !== null && max >= 6) || highRisk;
  const moderate = max !== null && max >= 5;

  const base = {
    sources: SOURCES,
    disclaimer:
      "Khuyến nghị này do hệ thống thêm vào, nằm ngoài phân tích và dự báo của mô hình AI; không phải cảnh báo chính thức. Hãy tuân theo chỉ dẫn của cơ quan chức năng địa phương.",
  };

  if (strong) {
    return {
      ...base,
      level: "alert",
      title: "Khuyến nghị an toàn khi động đất mạnh",
      intro: "Dữ liệu đang cho thấy hoạt động đáng chú ý — hãy chuẩn bị và phản ứng đúng cách:",
      items: [
        WHILE_SHAKING,
        "Nếu đang ở ngoài trời: lùi vào chỗ trống, tránh tòa nhà, cột điện, cây cối và biển báo.",
        AFTER_SHAKING,
        "Nếu ở gần biển và rung lắc kéo dài hoặc có tín hiệu sóng thần: đi lên cao ngay, không ra bờ biển quan sát.",
        ...COMMON,
      ],
    };
  }

  if (moderate && max !== null) {
    return {
      ...base,
      level: "watch",
      title: "Khuyến nghị an toàn khi hoạt động địa chấn tăng",
      intro: "Chủ động chuẩn bị để ứng phó nếu rung lắc xảy ra:",
      items: [
        "Biết trước lối thoát và chỗ an toàn trong nhà; dọn đồ dễ rơi khỏi đầu giường và kệ cao.",
        WHILE_SHAKING,
        AFTER_SHAKING,
        ...COMMON,
      ],
    };
  }

  return {
    ...base,
    level: "info",
    title: "Khuyến nghị an toàn chung",
    intro: "Dù hoạt động hiện tại bình thường, chuẩn bị trước vẫn là cách tốt nhất:",
    items: [
      "Xác định chỗ an toàn và lối thoát ở nhà, nơi làm việc.",
      "Cất đồ nặng ở kệ thấp, không treo đồ phía trên giường.",
      WHILE_SHAKING,
      ...COMMON,
    ],
  };
}
