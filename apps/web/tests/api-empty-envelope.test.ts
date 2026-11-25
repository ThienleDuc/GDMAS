/**
 * Unit test offline — guard envelope rỗng của GET /api/v1/patterns.
 * Testcase: .agents/notes/testcase/2026-11-22-patterns-empty-envelope-guard-thien.md
 *
 * Chạy: cd apps/web && node --test tests/api-empty-envelope.test.ts
 */

import assert from "node:assert/strict";
import test from "node:test";
import { isApiEmptyEnvelope } from "../src/contracts/common.ts";
import { getClustersOptional, getPatterns } from "../src/services/earthquake-api.ts";

const PATTERNS_EMPTY = {
  success: false,
  total_patterns: 0,
  patterns: [],
  message: "CSDL TRỐNG: Chưa có dữ liệu 6 patterns.",
};

const ENVELOPE_EMPTY = {
  success: false,
  data: null,
  message: "Chưa có kết quả Pattern 'trend'.",
};

const ERROR_ENVELOPE = {
  success: false,
  error: { code: "DATABASE_ERROR", message: "Lỗi CSDL." },
};

function mockJson(payload: unknown, status = 200): void {
  globalThis.fetch = async () => new Response(JSON.stringify(payload), { status });
}

test("TC-01 — aggregate rỗng /patterns (không có data) là empty envelope hợp lệ", () => {
  assert.equal(isApiEmptyEnvelope(PATTERNS_EMPTY), true);
});

test("TC-02 — envelope rỗng cũ {data:null} vẫn hợp lệ", () => {
  assert.equal(isApiEmptyEnvelope(ENVELOPE_EMPTY), true);
});

test("TC-03 — error envelope không bị nuốt", () => {
  assert.equal(isApiEmptyEnvelope(ERROR_ENVELOPE), false);
});

test("TC-04 — shape thiếu patterns / có data lạ không được chấp nhận", () => {
  assert.equal(isApiEmptyEnvelope({ success: false, total_patterns: 0, message: "x" }), false);
  assert.equal(
    isApiEmptyEnvelope({ ...PATTERNS_EMPTY, data: {} }),
    false,
    "payload aggregate rỗng nhưng có khóa data là shape không documented",
  );
  assert.equal(isApiEmptyEnvelope(null), false);
});

test("TC-05 — getPatterns() trả payload rỗng thay vì ném ApiError", async () => {
  const originalFetch = globalThis.fetch;
  mockJson(PATTERNS_EMPTY);
  try {
    const result = await getPatterns();
    assert.equal(result.success, false);
    assert.equal(result.total_patterns, 0);
    assert.deepEqual(result.patterns, []);
    assert.equal(result.message, PATTERNS_EMPTY.message);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("TC-06 — regression: /clusters 404 + /patterns rỗng → giữ unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/v1/clusters")) {
      return new Response(JSON.stringify({ detail: "Not Found" }), { status: 404 });
    }
    return new Response(JSON.stringify(PATTERNS_EMPTY), { status: 200 });
  };
  try {
    const result = await getClustersOptional();
    assert.equal(result.unavailable, true);
    assert.equal(result.data, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
