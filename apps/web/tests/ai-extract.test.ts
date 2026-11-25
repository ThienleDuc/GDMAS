/**
 * Test offline cho luồng trích xuất AI trong Statistics (2026-11-24).
 * Không gọi mạng thật: inject input/fetch/cache; kiểm tra không bịa số, fallback
 * câu trả lời chuẩn và vòng đời cache 24h (I7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildExpertReport, type ExpertInput } from "../src/features/statistics/ai-insights.ts";
import { buildSafetyAdvice } from "../src/features/statistics/earthquake-safety.ts";
import {
  AI_SYSTEM_PROMPT,
  buildAiPrompt,
  buildStandardAnswer,
  onlyUsesKnownNumbers,
  runAiExtraction,
} from "../src/features/statistics/ai-extract.ts";
import {
  answerScopeKey,
  CREDENTIAL_CACHE_KEY,
  DEFAULT_AI_MODEL,
  readAiConfig,
  resolveCredential,
} from "../src/features/statistics/ai-config.ts";
import { AI_CACHE_TTL_MS, createAiCache, type AiStore } from "../src/features/statistics/ai-storage.ts";

const input: ExpertInput = {
  temporal: {
    interval: "day",
    line_chart: [{ date: "2026-11-20", event_count: 12, max_magnitude: 6.2 }],
    scatter_plot: [],
    histogram: { magnitude_bins: [] },
  },
  trend: {
    resample_freq: "W",
    metric: "count",
    series: [{ period: "2026-11", actual_value: 10, trend_value: 11 }],
    trend_direction: "increasing",
    r_squared: 0.72,
  },
  seasonality: {
    components: {
      seasonal_line: [{ cycle_index: 1, period_label: "Tháng 1", seasonal_factor: 1.2 }],
      seasonality_strength: 0.8,
    },
  },
  correlation: {
    variables: ["magnitude", "depth_km"],
    matrix: [
      [1, 0.82],
      [0.82, 1],
    ],
    method: "pearson",
  },
  prediction: {
    target_date: "2026-11-22",
    predicted_value: 50,
    confidence_interval: { lower: 40, upper: 60 },
  },
  classification: { target_date: "2026-11-22", predicted_label: "Critical" },
  observed: [{ label: "2026-11-21", value: 30 }],
};

const report = buildExpertReport(input, "UTC+7");
const standard = buildStandardAnswer(report);
const config = { model: DEFAULT_AI_MODEL, baseUrl: "https://be.test", apiKey: "test-key" };
const params = { geo: { country: null, region: null }, interval: "week" as const, timezone: "UTC+7" as const };
const scopeKey = answerScopeKey({ ...config, country: null, region: null, timezone: "UTC+7", interval: "week" });

function aiFetch(content: string): typeof fetch {
  return (async () =>
    new Response(JSON.stringify({ success: true, data: { text: content } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
}

test("TC-AI-01: bộ câu trả lời chuẩn phủ 5 phần + 6 nhóm, dùng số liệu thật", () => {
  for (const heading of [
    "[Tổng quan]",
    "[Nhận xét theo 6 nhóm]",
    "[Triển vọng ngày kế tiếp]",
    "[Khuyến nghị]",
    "[Lưu ý phương pháp]",
  ]) {
    assert.ok(standard.includes(heading), `thiếu ${heading}`);
  }
  for (let pattern = 1; pattern <= 6; pattern += 1) {
    assert.match(standard, new RegExp(`^${pattern}\\. `, "mu"));
  }
  assert.match(standard, /6\.2/u);
  assert.match(standard, /50[,.]0/u);
  assert.match(standard, /không phải cảnh báo chính thức/u);
  assert.doesNotMatch(standard, /999/u);
});

test("TC-AI-02: chặn số liệu bịa — mọi token số phải có trong bản chuẩn", () => {
  assert.equal(onlyUsesKnownNumbers("Có 12 sự kiện, độ lớn 6.2", standard), true);
  assert.equal(onlyUsesKnownNumbers("Có 999 sự kiện", standard), false);
  assert.equal(onlyUsesKnownNumbers("Dự báo 50.7", standard), false);
});

test("TC-AI-03: prompt gửi bản chuẩn làm nguồn sự thật, yêu cầu dễ hiểu", () => {
  const prompt = buildAiPrompt(standard);
  assert.match(prompt, /NGUỒN SỰ THẬT/u);
  assert.match(prompt, /6 PATTERN CỦA WEB/u);
  assert.match(prompt, /người không chuyên/u);
  assert.match(prompt, /dễ hiểu, trực quan/u);
  assert.ok(prompt.includes(standard));
  assert.match(AI_SYSTEM_PROMPT, /giải thích cho người không chuyên/u);
  assert.match(AI_SYSTEM_PROMPT, /câu ngắn/u);
  assert.match(AI_SYSTEM_PROMPT, /biểu diễn theo thời gian/u);
  assert.match(AI_SYSTEM_PROMPT, /phân loại/u);
  assert.match(AI_SYSTEM_PROMPT, /KHÔNG thêm, sửa/u);
  assert.match(AI_SYSTEM_PROMPT, /ngoài 6 pattern/u);
});

test("TC-AI-04: không có key → dùng câu trả lời chuẩn, không gọi fetch", async () => {
  let called = false;
  const result = await runAiExtraction(
    params,
    { ...config, apiKey: "" },
    {
      input,
      scopeKey,
      fetchImpl: (async () => {
        called = true;
        throw new Error("không được gọi");
      }) as unknown as typeof fetch,
    },
  );
  assert.equal(called, false);
  assert.equal(result.source, "standard");
  assert.equal(result.answer, standard);
  assert.match(result.note, /key Gemini trong trình duyệt/u);
});

test("TC-AI-05: AI trả đúng số liệu → dùng câu trả lời AI", async () => {
  const aiText = "Tổng quan: 12 sự kiện, độ lớn cao nhất 6.2. Các nhóm 1 đến 6 đều được đề cập.";
  const result = await runAiExtraction(params, config, {
    input,
    scopeKey,
    fetchImpl: aiFetch(aiText),
  });
  assert.equal(result.source, "ai");
  assert.equal(result.answer, aiText);
});

test("TC-AI-06: AI bịa số → fallback câu trả lời chuẩn", async () => {
  const result = await runAiExtraction(params, config, {
    input,
    scopeKey,
    fetchImpl: aiFetch("Dự báo 99.9 chắc chắn xảy ra"),
  });
  assert.equal(result.source, "standard");
  assert.equal(result.answer, standard);
  assert.match(result.note, /ngoài nguồn/u);
});

test("TC-AI-07: lỗi mạng → fallback câu trả lời chuẩn", async () => {
  const result = await runAiExtraction(params, config, {
    input,
    scopeKey,
    fetchImpl: (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch,
  });
  assert.equal(result.source, "standard");
  assert.match(result.note, /Không gọi được AI/u);
});

test("TC-AI-08: cache hết hạn đúng 24h, đổi phạm vi đổi khoá", () => {
  const data = new Map<string, string>();
  const store: AiStore = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  const cache = createAiCache(store);
  const t0 = Date.UTC(2026, 10, 24);
  cache.write("answer:x", { answer: standard }, t0);
  assert.equal(cache.remainingMs("answer:x", t0), AI_CACHE_TTL_MS);
  assert.equal(cache.read("answer:x", t0 + AI_CACHE_TTL_MS - 1)?.answer, standard);
  assert.equal(cache.read("answer:x", t0 + AI_CACHE_TTL_MS), null);

  const base = { country: "Japan", region: "all", timezone: "UTC+7", interval: "week" };
  const key1 = answerScopeKey({ ...base, model: config.model });
  const key2 = answerScopeKey({ ...base, model: "gpt-4o" });
  const key3 = answerScopeKey({ ...base, country: "USA", model: config.model });
  assert.notEqual(key1, key2);
  assert.notEqual(key1, key3);
});

test("TC-AI-09: config đọc env, thiếu thì lấy mặc định", () => {
  assert.deepEqual(readAiConfig({}), {
    model: DEFAULT_AI_MODEL,
    baseUrl: "http://localhost:8000",
    apiKey: "",
  });
  const custom = readAiConfig({
    VITE_AI_MODEL: "  gemini-1.5-pro  ",
    VITE_API_BASE_URL: "https://be.test/",
    VITE_AI_API_KEY: "phải-bị-bỏ-qua",
  });
  assert.equal(custom.model, "gemini-1.5-pro");
  assert.equal(custom.baseUrl, "https://be.test");
  assert.equal(custom.apiKey, "");
});

test("TC-AI-10: panel có nút trích xuất, ẩn khi có cache và có thông báo chung", () => {
  const root = resolve(import.meta.dirname, "../src");
  const panel = readFileSync(resolve(root, "features/statistics/ExpertInsightsPanel.tsx"), "utf8");
  assert.match(panel, /Trích xuất nhận xét AI/u);
  assert.match(panel, /Trích xuất lại/u);
  assert.match(panel, /setConfirming\(true\)/u);
  assert.match(panel, /Kết quả trước đó sẽ bị ghi đè/u);
  assert.match(panel, /aiCache\.read<ExtractedAnswer>/u);
  assert.match(panel, /aiCache\.write\(scopeKey, answer\)/u);
  assert.match(panel, /Nội dung AI chỉ được lưu tạm thời/u);
  assert.doesNotMatch(panel, /localStorage\/session/u);
  assert.doesNotMatch(panel, /Không ghi vào database/u);
  assert.match(panel, /nút khoá ở aside nav/u);
  const envExample = readFileSync(resolve(root, "../.env.example"), "utf8");
  assert.match(envExample, /VITE_AI_MODEL=/u);
  assert.doesNotMatch(envExample, /VITE_AI_API_KEY=/u);
  const rootEnvExample = readFileSync(resolve(root, "../../../.env.example"), "utf8");
  assert.match(rootEnvExample, /GEMINI_MODEL=/u);
  assert.match(rootEnvExample, /GEMINI_API_KEY=/u);
});

test("TC-AI-11: API key lưu cache 24h, hết hạn thì không dùng lại", () => {
  const data = new Map<string, string>();
  const store: AiStore = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
  const cache = createAiCache(store);
  resolveCredential(config, cache);
  const cached = cache.read<{ apiKey: string }>(CREDENTIAL_CACHE_KEY);
  assert.equal(cached?.apiKey, "test-key");

  const t0 = Date.now();
  cache.write(CREDENTIAL_CACHE_KEY, cached, t0);
  assert.equal(cache.read(CREDENTIAL_CACHE_KEY, t0 + AI_CACHE_TTL_MS), null);
  assert.equal(resolveCredential({ ...config, apiKey: "" }, cache).apiKey, "");
});

test("TC-AI-12: hộp Tổng quan trống, chứa nội dung AI sau trích xuất", () => {
  const panel = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/ExpertInsightsPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /stat-ai__summary-slot/u);
  assert.match(panel, /\{cached\.answer\}/u);
  assert.match(panel, /Chưa có nội dung AI/u);
  assert.doesNotMatch(panel, /report\.headline/u);
  assert.doesNotMatch(panel, /report\.summary/u);
});

test("TC-AI-13: panel chỉ còn hộp AI — bỏ Triển vọng/Khuyến nghị/Lưu ý", () => {
  const panel = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/ExpertInsightsPanel.tsx"),
    "utf8",
  );
  assert.doesNotMatch(panel, /sectionTitle\("insights"\)/u);
  assert.doesNotMatch(panel, /sectionTitle\("outlook"\)/u);
  assert.doesNotMatch(panel, /sectionTitle\("recommendations"\)/u);
  assert.doesNotMatch(panel, /sectionTitle\("caveats"\)/u);
  assert.match(panel, /sectionTitle\("summary"\)/u);
  const css = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/StatisticsPage.css"),
    "utf8",
  );
  const notice = /\.stat-ai__notice\s*\{([\s\S]*?)\}/u.exec(css);
  assert.ok(notice, "phải có rule .stat-ai__notice");
  assert.doesNotMatch(notice[1], /border-left/u);
});

test("TC-AI-14: câu trả lời AI thân thiện, xuống dòng vẫn được giữ nếu đúng số liệu", async () => {
  const friendly =
    "Hôm nay hệ thống thấy 12 trận, trận mạnh nhất độ lớn 6.2 — đủ để thấy rung lắc nhẹ.\n\n" +
    "Xu hướng đang đi lên nhưng độ tin cậy chưa cao, cứ theo dõi thêm vài ngày.\n" +
    "Chu kỳ khá rõ; hai chỉ số cùng tăng giảm, nhưng đó chỉ là liên hệ, không phải nguyên nhân.\n" +
    "Ngày mai dự báo nhỉnh hơn hôm nay; nhóm nguy cơ vẫn cần để mắt.";
  const result = await runAiExtraction(params, config, {
    input,
    scopeKey,
    fetchImpl: aiFetch(friendly),
  });
  assert.equal(result.source, "ai");
  assert.equal(result.answer, friendly);
  assert.match(result.answer, /\n/u);
});

test("TC-AI-15: dữ liệu trích xuất theo filter quốc gia/khu vực + cửa sổ đang xem", () => {
  const source = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/ai-extract.ts"),
    "utf8",
  );
  assert.match(source, /const geo = geoQuery\(params\.geo\)/u);
  assert.match(source, /const window = intervalToParams\(params\.interval\)/u);
  assert.match(source, /getTemporalAnalysis\([\s\S]{0,120}\.\.\.geo, \.\.\.window/u);
  for (const call of [
    "getTrendAnalysis",
    "getSeasonalityAnalysis",
    "getCorrelationAnalysis",
    "getPredictions",
    "getClassifications",
  ]) {
    assert.match(source, new RegExp(`${call}\\(`, "u"));
  }
});

test("TC-AI-16: khuyến nghị an toàn do hệ thống tạo, theo mức độ lớn", () => {
  const strong = buildSafetyAdvice(input);
  assert.equal(strong.level, "alert");
  assert.match(strong.title, /động đất mạnh/u);
  assert.match(strong.items.join(" "), /cúi thấp/u);
  assert.match(strong.items.join(" "), /sóng thần/u);
  assert.ok(strong.sources.some((s) => s.includes("usgs.gov")));
  assert.match(strong.disclaimer, /ngoài phân tích và dự báo/u);

  const moderateInput = {
    ...input,
    temporal: {
      ...input.temporal!,
      line_chart: [{ date: "2026-11-20", event_count: 3, max_magnitude: 5.1 }],
    },
    classification: null,
  };
  assert.equal(buildSafetyAdvice(moderateInput).level, "watch");
  assert.equal(
    buildSafetyAdvice({ ...input, temporal: null, classification: null }).level,
    "info",
  );

  // Không đưa số liệu vào lời khuyên để tránh nhầm với dữ liệu phân tích.
  for (const advice of [strong, buildSafetyAdvice(moderateInput)]) {
    assert.doesNotMatch(advice.items.join(" "), /\d/u);
  }
});

test("TC-AI-17: prompt cấm AI đưa lời khuyên an toàn; fallback vẫn có advice", async () => {
  assert.match(AI_SYSTEM_PROMPT, /Không đưa lời khuyên an toàn/u);
  const result = await runAiExtraction(params, { ...config, apiKey: "" }, {
    input,
    scopeKey,
  });
  assert.equal(result.source, "standard");
  assert.ok(result.advice);
  assert.equal(result.advice?.level, "alert");
  assert.doesNotMatch(result.answer, /cúi thấp/u, "lời khuyên không nằm trong câu AI");
});

test("TC-AI-18: panel có khu vực khuyến nghị an toàn tách biệt", () => {
  const panel = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/ExpertInsightsPanel.tsx"),
    "utf8",
  );
  assert.match(panel, /cached\?\.advice/u);
  assert.match(panel, /stat-ai__safety/u);
  assert.match(panel, /Ngoài phân tích AI/u);
  assert.match(panel, /cached\.advice\.sources\.join/u);
  const css = readFileSync(
    resolve(import.meta.dirname, "../src/features/statistics/StatisticsPage.css"),
    "utf8",
  );
  assert.match(css, /\.stat-ai__safety\s*\{/u);
});
