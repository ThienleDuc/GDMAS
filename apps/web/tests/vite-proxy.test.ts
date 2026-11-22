import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";
import { resolveSseUrl } from "../src/lib/sse.ts";

const repoRoot = resolve(import.meta.dirname, "../../..");
const read = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), "utf8");

test("TC-01: Vite config có proxy opt-in cho /api tới VITE_API_PROXY_TARGET", () => {
  const source = read("apps/web/vite.config.ts");
  assert.match(source, /VITE_API_PROXY_TARGET/u);
  assert.match(source, /proxy:\s*apiProxyTarget/u);
  assert.match(source, /["']\/api["']\s*:\s*\{\s*target:\s*apiProxyTarget,\s*changeOrigin:\s*true/u);
});

test("TC-02: docker-compose dùng cùng origin + proxy tới service api", () => {
  const compose = read("docker-compose.yml");
  assert.match(compose, /VITE_API_BASE_URL:\s*\$\{VITE_API_BASE_URL:-\/\}/u);
  assert.match(compose, /VITE_API_PROXY_TARGET:\s*\$\{VITE_API_PROXY_TARGET:-http:\/\/api:8000\}/u);
});

test("TC-03: .env.example ghi chú biến proxy (không commit secret)", () => {
  const example = read("apps/web/.env.example");
  assert.match(example, /VITE_API_PROXY_TARGET=/u);
  assert.match(example, /VITE_API_BASE_URL=http:\/\/localhost:8000/u);
});

test("TC-04: base URI tương đối → SSE cùng origin, không có localhost:8000", () => {
  for (const base of ["/", ""]) {
    assert.equal(resolveSseUrl("/api/v1/events/stream", base), "/api/v1/events/stream");
    assert.equal(resolveSseUrl("/api/v1/stream/earthquakes", base), "/api/v1/stream/earthquakes");
  }
});

test("TC-05: base tuyệt đối cũ vẫn giữ nguyên (RULE-03, local chạy host)", () => {
  assert.equal(
    resolveSseUrl("/api/v1/events/stream", "http://localhost:8000"),
    "http://localhost:8000/api/v1/events/stream",
  );
});
