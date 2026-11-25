/**
 * Test offline cho nút khoá Gemini trên aside nav + dialog nhập key (2026-11-24).
 * Không render DOM, không gọi mạng thật — đọc source tĩnh và mock fetch (I7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isGeminiModel } from "../src/features/statistics/ai-config.ts";
import { getAiCredentialsStatus, saveAiCredentials } from "../src/services/ai-settings-api.ts";

const src = resolve(import.meta.dirname, "../src");
const read = (path: string): string => readFileSync(resolve(src, path), "utf8");

test("TC-KEY-01: chỉ chấp nhận model Gemini", () => {
  assert.equal(isGeminiModel("gemini-2.0-flash"), true);
  assert.equal(isGeminiModel(" gemini-1.5-pro "), true);
  assert.equal(isGeminiModel("gpt-4o"), false);
  assert.equal(isGeminiModel("gemini-2.0-flash; rm -rf /"), false);
});

test("TC-KEY-02: nút SVG khoá nằm giữa countdown và theme toggle", () => {
  const layout = read("layouts/DashboardLayout.tsx");
  const footer = /<div className="layout__sidebar-footer">([\s\S]*?)<\/div>/u.exec(layout);
  assert.ok(footer, "phải có sidebar footer");
  assert.match(footer[1], /CompactRefreshCountdown/u);
  assert.match(footer[1], /AiKeyButton/u);
  assert.match(footer[1], /ThemeToggle/u);
  assert.ok(
    footer[1].indexOf("CompactRefreshCountdown") < footer[1].indexOf("AiKeyButton"),
    "nút khoá phải dưới đồng hồ",
  );
  assert.ok(
    footer[1].indexOf("AiKeyButton") < footer[1].indexOf("ThemeToggle"),
    "nút khoá phải trên nút đổi theme",
  );

  const button = read("layouts/header/AiKeyButton.tsx");
  assert.match(button, /<svg[\s\S]*?<circle[\s\S]*?<path/u);
  assert.match(button, /Cấu hình AI Gemini/u);
  assert.match(button, /<AiKeyDialog open=\{open\}/u);
});

test("TC-KEY-03: dialog có model + key, xác nhận, lưu browser 24h, không DB", () => {
  const dialog = read("layouts/header/AiKeyDialog.tsx");
  assert.match(dialog, /role="dialog"/u);
  assert.match(dialog, /placeholder="gemini-2\.0-flash"/u);
  assert.match(dialog, /type="password"/u);
  assert.match(dialog, /Xác nhận/u);
  assert.match(dialog, /Chỉ hỗ trợ Gemini/u);
  assert.match(dialog, /saveAiCredentials\(model\.trim\(\), apiKey\.trim\(\)\)/u);
  assert.match(dialog, /resolveCredential\(/u);
  assert.doesNotMatch(dialog, /nếu hợp lệ, model và key được ghi vào/u);
  const css = read("layouts/layout.css");
  assert.match(css, /\.layout__ai-key\s*\{/u);
  assert.match(css, /\.layout__ai-key:hover/u);
  assert.match(css, /\.ai-key-dialog__backdrop\s*\{/u);
});

test("TC-KEY-04: service gọi đúng endpoint BE (status + save)", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; body?: string }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), body: init?.body as string | undefined });
    return new Response(
      JSON.stringify({
        success: true,
        data: { configured: true, model: "gemini-2.0-flash", masked_key: "AIza****1234" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const status = await getAiCredentialsStatus();
    assert.equal(status.configured, true);
    assert.match(requests[0].url, /\/api\/v1\/ai\/credentials\/status$/u);

    const saved = await saveAiCredentials("gemini-2.0-flash", "AIza-secret123");
    assert.equal(saved.model, "gemini-2.0-flash");
    assert.match(requests[1].url, /\/api\/v1\/ai\/credentials$/u);
    const body = JSON.parse(requests[1].body ?? "{}") as Record<string, string>;
    assert.equal(body.model, "gemini-2.0-flash");
    assert.equal(body.api_key, "AIza-secret123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
