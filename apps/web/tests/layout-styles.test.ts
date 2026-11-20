import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "../src");
const layoutsRoot = join(sourceRoot, "layouts");
const layoutFile = "DashboardLayout.tsx";

const readLayout = (file: string) => readFileSync(join(layoutsRoot, file), "utf8");

test("TC-01: layout duy nhất dùng CSS entry point tập trung, không import CSS riêng", () => {
  assert.doesNotMatch(readLayout(layoutFile), /import\s+["']\.\/layout\.css["']/u);

  const cssFiles = ["layout.css", "DashboardLayout.css", "FullscreenMapLayout.css", "ReportLayout.css"]
    .filter((file) => existsSync(join(layoutsRoot, file)));
  assert.deepEqual(cssFiles, ["layout.css"]);
});

test("TC-02: stylesheet định nghĩa đúng shell aside + nội dung và dùng design token", () => {
  const css = readFileSync(join(layoutsRoot, "layout.css"), "utf8");
  assert.match(css, /\.layout--dashboard/u);
  assert.match(css, /\.layout__sidebar/u);
  assert.match(css, /\.layout__content/u);
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

test("TC-04: layout có aside điều hướng và vùng chứa nội dung qua Outlet", () => {
  const layout = readLayout(layoutFile);
  assert.match(layout, /<aside[\s\S]*?layout__sidebar/u);
  assert.match(layout, /NAV_ITEMS/u);
  assert.match(layout, /<Outlet\s*\/>/u);
  assert.match(layout, /layout__content/u);
});

test("TC-05: không còn tham chiếu tới layout fullscreen/report cũ", () => {
  assert.ok(!existsSync(join(layoutsRoot, "FullscreenMapLayout.tsx")));
  assert.ok(!existsSync(join(layoutsRoot, "ReportLayout.tsx")));

  const css = readFileSync(join(layoutsRoot, "layout.css"), "utf8");
  assert.doesNotMatch(css, /layout--fullscreen|layout--report|layout__overlay|layout__report/u);

  const barrel = readFileSync(join(layoutsRoot, "index.ts"), "utf8");
  assert.match(barrel, /DashboardLayout/u);
  assert.doesNotMatch(barrel, /FullscreenMapLayout|ReportLayout/u);

  const app = readFileSync(join(sourceRoot, "app/App.tsx"), "utf8");
  assert.doesNotMatch(app, /FullscreenMapLayout|ReportLayout/u);
  assert.equal((app.match(/element=\{<DashboardLayout \/>\}/gu) ?? []).length, 1);
});
