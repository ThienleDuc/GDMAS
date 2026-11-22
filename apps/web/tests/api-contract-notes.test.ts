/** Test source offline cho ghi chú hợp đồng GAP-10/11 — không gọi mạng. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");

test("TC-01 — time_series_preview[].time là nhãn HH:MM, không parse ISO", () => {
  const source = readFileSync(
    resolve(root, "apps/web/src/contracts/earthquake.ts"),
    "utf8",
  );
  assert.match(source, /HH:MM/u);
  assert.match(source, /KHÔNG phải mốc ISO 8601/u);
  assert.match(source, /không parse bằng new Date\(\)/u);
});

test("TC-02 — API.md mô tả đúng empty /patterns (không có data)", () => {
  const api = readFileSync(resolve(root, "docs/api/API.md"), "utf8");
  assert.match(api, /Ngoại lệ `GET \/api\/v1\/patterns`/u);
  assert.match(api, /không có khóa `data`/u);
  assert.match(api, /"total_patterns": 0, "patterns": \[\]/u);
});
