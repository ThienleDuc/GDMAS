/**
 * Trích xuất nhận xét AI cho 6 pattern Statistics.
 * Nguyên tắc: mọi con số đưa cho AI đều đến từ buildExpertReport() (quy tắc, dữ liệu thật).
 * AI chỉ được diễn đạt lại — nếu trả số liệu ngoài nguồn thì dùng bộ câu trả lời chuẩn (I5/I7).
 */

import type { AnalysisInterval } from "../../contracts/common.ts";
import { geoQuery, type GeoFilter } from "../../contracts/geo-filter.ts";
import type { TimezoneMode } from "../../lib/formatters.ts";
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
import { buildExpertReport, type ExpertInput, type ExpertReport, type InsightLevel } from "./ai-insights.ts";
import { buildSafetyAdvice, type SafetyAdvice } from "./earthquake-safety.ts";
import { intervalToParams, metricsFor } from "./statistics-view.ts";
import type { AiConfig } from "./ai-config.ts";

const LEVEL_LABELS: Record<InsightLevel, string> = {
  info: "Thông tin",
  watch: "Theo dõi",
  alert: "Chú ý",
};

export interface AiExtractionParams {
  geo: GeoFilter;
  interval: AnalysisInterval;
  timezone: TimezoneMode;
}

export interface ExtractedAnswer {
  answer: string;
  source: "ai" | "standard";
  note: string;
  scopeKey: string;
  model: string;
  savedAt: number;
  /** Khuyến nghị an toàn do hệ thống thêm — nằm ngoài câu trả lời của mô hình. */
  advice?: SafetyAdvice;
}

/**
 * Nạp đủ 6 nguồn dữ liệu — không dùng dữ liệu đang có trong context vì provider chỉ
 * fetch pattern đang active. Parameter của từng endpoint được giữ Y HỆT chart đang hiển thị:
 * quốc gia/khu vực (geoQuery) cho cả 6; cửa sổ Ngày/Tuần/Tháng (intervalToParams) cho
 * temporal; trend/seasonality/correlation/predictions theo chart tương ứng.
 * Một endpoint lỗi → để null, báo cáo ghi "Chưa có" (I5).
 */
export async function fetchAllExpertInput(
  params: AiExtractionParams,
  signal?: AbortSignal,
): Promise<ExpertInput> {
  const geo = geoQuery(params.geo);
  const window = intervalToParams(params.interval);
  const [temporalRes, trendRes, seasonalityRes, correlationRes, predictionsRes, classificationsRes] =
    await Promise.allSettled([
      getTemporalAnalysis(
        { ...geo, ...window, timezone: params.timezone, interval: "day" },
        signal,
      ),
      getTrendAnalysis(
        { ...geo, resample_freq: "W", metric: "count" },
        signal,
      ),
      getSeasonalityAnalysis(geo, signal),
      getCorrelationAnalysis(geo, signal),
      getPredictions(signal, params.geo),
      getClassifications(signal, params.geo),
    ]);

  const value = <T>(result: PromiseSettledResult<T>): T | null =>
    result.status === "fulfilled" ? result.value : null;

  const temporalData = metricsFor(value(temporalRes));
  const trendData = metricsFor(value(trendRes));
  const predictionData = metricsFor(value(predictionsRes));
  const classificationData = metricsFor(value(classificationsRes));
  const fromTrend = toObservedFromTrend(trendData?.series);

  return {
    temporal: temporalData,
    trend: trendData,
    seasonality: metricsFor(value(seasonalityRes)),
    correlation: metricsFor(value(correlationRes)),
    prediction: predictionData
      ? asPrediction(predictionData as unknown as Record<string, unknown>)
      : null,
    classification: classificationData
      ? asClassification(classificationData as unknown as Record<string, unknown>)
      : null,
    observed: fromTrend.length > 0 ? fromTrend : toObservedFromLineChart(temporalData?.line_chart),
  };
}

/** Bộ câu trả lời chuẩn: 5 phần / 6 nhóm, chỉ dùng số liệu có trong report. */
export function buildStandardAnswer(report: ExpertReport): string {
  const sections: string[] = [
    `[Tổng quan]\n${report.headline}\n${report.summary}`,
    `[Nhận xét theo 6 nhóm]\n${report.insights
      .map((insight) => {
        const evidence = insight.evidence.length > 0 ? insight.evidence.join("; ") : "Chưa có dữ liệu";
        return `${insight.pattern}. ${insight.title} (${LEVEL_LABELS[insight.level]}): ${insight.comment}\n   Dữ liệu: ${evidence}`;
      })
      .join("\n")}`,
    `[Triển vọng ngày kế tiếp]\n${report.outlook}`,
    `[Khuyến nghị]\n${report.recommendations.map((item) => `- ${item}`).join("\n")}`,
    `[Lưu ý phương pháp]\n${report.caveats.map((item) => `- ${item}`).join("\n")}\n${report.dataSourceNote}`,
  ];
  return sections.join("\n\n");
}

export const AI_SYSTEM_PROMPT =
  "Bạn là chuyên gia địa chấn đang giải thích cho người không chuyên ở Việt Nam. " +
  "Hãy viết tự nhiên, dễ hiểu, câu ngắn, có hình ảnh quen thuộc; giải thích ngắn gọn thuật ngữ khi dùng đến " +
  "(ví dụ R² là mức độ tin cậy của đường xu hướng, tương quan chỉ là hai chỉ số cùng biến động, " +
  "khoảng tin cậy là vùng giá trị có thể xảy ra, độ lớn là sức mạnh trận động đất). " +
  "Không cần giữ nguyên cấu trúc 5 phần hay đánh số 1–6 — hãy kể mạch lạc: hiện ra sao, có gì đáng chú ý, " +
  "ngày kế tiếp thế nào và cần lưu ý gì. NHƯNG phải đề cập đủ nội dung của cả 6 nhóm: " +
  "biểu diễn theo thời gian, xu hướng, chu kỳ, tương quan, dự báo định lượng, phân loại. " +
  "Giữ nguyên mọi con số, ngày tháng, tên mô hình và mức độ có trong dữ liệu — KHÔNG thêm, sửa hay ước lượng số khác. " +
  "Nhóm nào ghi 'Chưa có' thì nói nhẹ nhàng là dữ liệu chưa đủ, không suy diễn. " +
  "Không suy diễn nhân quả từ tương quan, không đưa ra cảnh báo chính thức hay khuyến nghị y tế/khẩn cấp, " +
  "không nhắc đến hệ thống/API/key/cache hay chủ đề ngoài 6 pattern đang phân tích. " +
  "Không đưa lời khuyên an toàn hay hướng dẫn thoát hiểm — hệ thống sẽ thêm riêng phần đó ngoài câu trả lời của bạn. " +
  "Trả văn bản thuần tiếng Việt, có thể xuống dòng cho dễ đọc, không dùng markdown.";

export function buildAiPrompt(standardAnswer: string): string {
  return `DỮ LIỆU ĐÃ TÍNH TỪ 6 PATTERN CỦA WEB (NGUỒN SỰ THẬT — đừng thêm số liệu mới):\n${standardAnswer}\n\nDựa vào dữ liệu trên, hãy viết lại cho người không chuyên: dễ hiểu, trực quan, vẫn đủ ý của cả 6 nhóm và giữ nguyên mọi con số.`;
}

/** Kiểm tra AI không bịa số: mọi token số phải có trong bản chuẩn (I5). */
export function onlyUsesKnownNumbers(answer: string, source: string): boolean {
  const numbers = (text: string): string[] => text.match(/\d+(?:[.,]\d+)?/gu) ?? [];
  const allowed = new Set(numbers(source));
  return numbers(answer).every((token) => allowed.has(token));
}

export interface AiRequestDeps {
  fetchImpl?: typeof fetch;
}

/** Gọi BE /ai/generate — BE đối chiếu key browser với .env rồi gọi Gemini. */
export async function requestAiAnswer(
  config: AiConfig,
  prompt: string,
  signal: AbortSignal | undefined,
  deps: AiRequestDeps = {},
): Promise<string> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const base = config.baseUrl.replace(/\/+$/u, "");
  const url = `${base}/api/v1/ai/generate`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      system: AI_SYSTEM_PROMPT,
      model: config.model,
      api_key: config.apiKey,
    }),
    signal,
  });
  const body = (await response.json()) as {
    data?: { text?: string };
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(body.error?.message ?? `AI HTTP ${response.status}`);
  const content = body.data?.text?.trim();
  if (!content) throw new Error("AI trả về nội dung rỗng");
  return content;
}

export interface RunExtractionOptions extends AiRequestDeps {
  signal?: AbortSignal;
  scopeKey: string;
  now?: number;
  /** Test/offline: truyền sẵn 6 nguồn để không cần fetch mạng. */
  input?: ExpertInput;
}

/** Điều phối: nạp 6 nguồn → báo cáo chuẩn → gọi AI (nếu có key) → trả kết quả an toàn. */
export async function runAiExtraction(
  params: AiExtractionParams,
  config: AiConfig,
  options: RunExtractionOptions,
): Promise<ExtractedAnswer> {
  const input = options.input ?? (await fetchAllExpertInput(params, options.signal));
  const report = buildExpertReport(input, params.timezone);
  const standardAnswer = buildStandardAnswer(report);
  // Khuyến nghị an toàn do quy tắc tạo từ dữ liệu thật — KHÔNG nằm trong prompt gửi AI.
  const advice = buildSafetyAdvice(input);
  const base = {
    source: "standard" as const,
    scopeKey: options.scopeKey,
    model: config.model,
    savedAt: options.now ?? Date.now(),
    advice,
  };

  if (!config.apiKey) {
    return {
      ...base,
      answer: standardAnswer,
      note: "Chưa lưu key Gemini trong trình duyệt — đang dùng bộ câu trả lời chuẩn (quy tắc, dữ liệu thật).",
    };
  }

  try {
    const raw = await requestAiAnswer(
      config,
      buildAiPrompt(standardAnswer),
      options.signal,
      { fetchImpl: options.fetchImpl },
    );
    if (!onlyUsesKnownNumbers(raw, standardAnswer)) {
      return {
        ...base,
        answer: standardAnswer,
        note: "AI trả số liệu ngoài nguồn — đã dùng bộ câu trả lời chuẩn để tránh bịa số.",
      };
    }
    return {
      ...base,
      source: "ai",
      answer: raw,
      note: "Câu trả lời được sinh bởi AI từ báo cáo chuẩn 6 pattern, không thêm số liệu.",
    };
  } catch (reason) {
    if (options.signal?.aborted) throw reason;
    return {
      ...base,
      answer: standardAnswer,
      note: `Không gọi được AI (${reason instanceof Error ? reason.message : "lỗi không xác định"}) — đã dùng bộ câu trả lời chuẩn.`,
    };
  }
}
