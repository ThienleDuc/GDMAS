import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "../src");
const layoutsRoot = join(sourceRoot, "layouts");
const layoutFiles = [
  "DashboardLayout.tsx",
  "FullscreenMapLayout.tsx",
  "ReportLayout.tsx",
] as const;

const readLayout = (file: string) => readFileSync(join(layoutsRoot, file), "utf8");

test("TC-01: layouts rely on the centralized CSS entry point, not per-layout imports", () => {
  for (const file of layoutFiles) {
    assert.doesNotMatch(readLayout(file), /import\s+["']\.\/layout\.css["']/u, `${file} does not import CSS individually`);
  }

  const layoutCssFiles = ["layout.css", "DashboardLayout.css", "FullscreenMapLayout.css", "ReportLayout.css"]
    .filter((file) => existsSync(join(layoutsRoot, file)));
  assert.deepEqual(layoutCssFiles, ["layout.css"]);
});

test("TC-02: shared stylesheet defines the three layout variants and semantic token usage", () => {
  const css = readFileSync(join(layoutsRoot, "layout.css"), "utf8");
  assert.match(css, /\.layout--dashboard/u);
  assert.match(css, /\.layout--fullscreen/u);
  assert.match(css, /\.layout--report/u);
  assert.match(css, /var\(--(?:background|surface|border|primary|space-|radius-|z-)/u);
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b/iu);
});

test("TC-03: index.css centrally imports Tailwind, design tokens, and layout styles", () => {
  const main = readFileSync(join(sourceRoot, "main.tsx"), "utf8");
  const index = readFileSync(join(sourceRoot, "styles/index.css"), "utf8");
  const globals = readFileSync(join(sourceRoot, "styles/globals.css"), "utf8");
  assert.match(main, /import\s+["']\.\/styles\/index\.css["']/u);
  assert.match(index, /@import\s+["']tailwindcss["']/u);
  assert.match(index, /@import\s+["']tw-animate-css["']/u);
  assert.match(index, /@import\s+["']\.\/globals\.css["']/u);
  assert.match(index, /@import\s+["']\.\.\/layouts\/layout\.css["']/u);
  assert.match(globals, /--primary/u);
  assert.match(globals, /\.dark\s*\{/u);
});

test("TC-04: report print interaction remains available and toolbar is excluded from print", () => {
  const report = readLayout("ReportLayout.tsx");
  const css = readFileSync(join(layoutsRoot, "layout.css"), "utf8");
  assert.match(report, /window\.print\(\)/u);
  assert.match(report, /layout__no-print/u);
  assert.match(css, /@media\s+print/u);
  assert.match(css, /\.layout__no-print\s*\{\s*display:\s*none/u);
});

test("TC-05: layout variants retain their shell and report content hooks", () => {
  const dashboard = readLayout("DashboardLayout.tsx");
  const fullscreen = readLayout("FullscreenMapLayout.tsx");
  const report = readLayout("ReportLayout.tsx");
  assert.match(dashboard, /layout--dashboard/u);
  assert.match(fullscreen, /layout--fullscreen/u);
  assert.match(fullscreen, /layout__viewport/u);
  assert.match(report, /layout--report/u);
  assert.match(report, /layout__report-document/u);
});
