import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { resolveExamplesDir, SSE_FIXTURE_NAME } from "../contract-paths.ts";

/** Dựng bố cục thư mục giả với fixture đặt tại `fixtureRel`. */
function makeLayout(configRel: string, fixtureRel: string): { configDir: string; expected: string } {
  const root = mkdtempSync(join(tmpdir(), "gdmas-contract-paths-"));
  mkdirSync(join(root, configRel), { recursive: true });
  const fixtureDir = join(root, fixtureRel);
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(join(fixtureDir, SSE_FIXTURE_NAME), "{}", "utf8");
  return { configDir: join(root, configRel), expected: fixtureDir };
}

test("local monorepo — config apps/web tìm thấy ../../contracts/examples", () => {
  const { configDir, expected } = makeLayout("repo/apps/web", "repo/contracts/examples");
  assert.equal(resolveExamplesDir(configDir), expected);
});

test("docker dev — contracts mount tại /app/contracts", () => {
  const { configDir, expected } = makeLayout("container/app", "container/app/contracts/examples");
  // ../../contracts/examples từ /app → /contracts/examples (không tồn tại),
  // candidate ./contracts/examples mới là đường dẫn đúng.
  assert.equal(resolveExamplesDir(configDir), expected);
});

test("docker dev — contracts mount tại /contracts (clamp tại root)", () => {
  const existing = "/contracts/examples";
  const found = resolveExamplesDir("/app", (path) => path === join(existing, SSE_FIXTURE_NAME));
  assert.equal(found, existing);
});

test("fallback candidate đầu khi không có fixture nào tồn tại", () => {
  assert.equal(resolveExamplesDir("/app", () => false), resolve("/app", "../../contracts/examples"));
});

test("repo thật — fixture SSE hiện hữu từ apps/web", () => {
  const configDir = resolve(import.meta.dirname, "..");
  const examplesDir = resolveExamplesDir(configDir);
  assert.ok(existsSync(resolve(examplesDir, SSE_FIXTURE_NAME)), `thiếu fixture tại ${examplesDir}`);
});
