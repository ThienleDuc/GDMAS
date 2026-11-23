/** Test offline: khoảng tin cậy phải nêu rõ mức (%) và cơ sở (mô hình). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatPrediction } from "../src/features/overview/overview-view.ts";

const src = resolve(import.meta.dirname, "../src");

const prediction = {
  success: true as const,
  data: {
    target_date: "2026-11-24",
    predicted_value: 5.1,
    confidence_interval: { lower: 3.2, upper: 7.4 },
    confidence_level: 0.95,
    model_name: "ARIMA",
  },
};

test("TC-01: formatPrediction giữ mức tin cậy & tên mô hình", () => {
  const view = formatPrediction(prediction, null);
  assert.equal(view.confidenceLevel, 0.95);
  assert.equal(view.modelName, "ARIMA");
  assert.equal(view.lower, 3.2);
  assert.equal(view.upper, 7.4);
});

test("TC-02: payload thiếu → null, không bịa 95%", () => {
  const view = formatPrediction(
    { success: true, data: { target_date: "2026-11-24", predicted_value: 5 } },
    null,
  );
  assert.equal(view.confidenceLevel, null);
  assert.equal(view.modelName, null);
});

test("TC-03: UI Overview ghi rõ mức & cơ sở", () => {
  const page = readFileSync(resolve(src, "features/overview/OverviewPage.tsx"), "utf8");
  assert.match(page, /Khoảng tin cậy/u);
  assert.match(page, /Math\.round\(forecast\.confidenceLevel \* 100\)/u);
  assert.match(page, /Dựa trên mô hình \{forecast\.modelName\}/u);
});

test("TC-04: AI insights ghi rõ mức & cơ sở", () => {
  const source = readFileSync(resolve(src, "features/statistics/ai-insights.ts"), "utf8");
  assert.match(source, /confidenceLabel/u);
  assert.match(source, /modelLabel/u);
  assert.doesNotMatch(source, /khoảng tin cậy 95%/u);
});
