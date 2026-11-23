import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const sourceRoot = join(import.meta.dirname, "../src");
const layoutsRoot = join(sourceRoot, "layouts");
const layoutFile = "DashboardLayout.tsx";

const readLayout = (file: string) => readFileSync(join(layoutsRoot, file), "utf8");
const readLayoutCss = () => readFileSync(join(layoutsRoot, "layout.css"), "utf8");

test("TC-01: layout duy nhất dùng CSS entry point tập trung, không import CSS riêng", () => {
  assert.doesNotMatch(readLayout(layoutFile), /import\s+["']\.\/layout\.css["']/u);

  const cssFiles = ["layout.css", "DashboardLayout.css", "FullscreenMapLayout.css", "ReportLayout.css"]
    .filter((file) => existsSync(join(layoutsRoot, file)));
  assert.deepEqual(cssFiles, ["layout.css"]);
});

test("TC-02: stylesheet định nghĩa đúng shell aside + nội dung và dùng design token", () => {
  const css = readLayoutCss();
  assert.match(css, /\.layout--dashboard/u);
  assert.match(css, /\.layout__sidebar/u);
  assert.match(css, /\.layout__content/u);
  assert.match(css, /var\(--(?:background|surface|border|primary|space-|radius-|z-)/u);
  assert.match(css, /--sidebar-width/u);
  assert.match(css, /--header-height/u);
  assert.doesNotMatch(css, /layout__theme-toggle|theme-transition|layout__clock|layout__database-state/u);
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
  assert.match(index, /Space\+Grotesk/u);
  assert.match(index, /JetBrains\+Mono/u);
  assert.doesNotMatch(index, /family=Inter/u);
  assert.match(globals, /--primary/u);
  assert.match(globals, /color-scheme:\s*light/u);
  assert.match(globals, /"Space Grotesk"/u);
  assert.match(globals, /"JetBrains Mono"/u);
  assert.doesNotMatch(globals, /"Inter"/u);
  // Dark Mode đã được bổ sung (proposal 2026-11-21-darkmode-toggle-thien): giờ kỳ vọng có .dark.
  assert.match(globals, /\.dark\s*\{[\s\S]{0,80}color-scheme:\s*dark/u);
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

  const css = readLayoutCss();
  assert.doesNotMatch(css, /layout--fullscreen|layout--report|layout__overlay|layout__report/u);

  const barrel = readFileSync(join(layoutsRoot, "index.ts"), "utf8");
  assert.match(barrel, /DashboardLayout/u);
  assert.doesNotMatch(barrel, /FullscreenMapLayout|ReportLayout/u);

  const app = readFileSync(join(sourceRoot, "app/App.tsx"), "utf8");
  assert.doesNotMatch(app, /FullscreenMapLayout|ReportLayout/u);
  assert.equal((app.match(/element=\{<DashboardLayout \/>\}/gu) ?? []).length, 1);
});

test("TC-06: breadcrumb dùng nhãn tiếng Việt, không để lộ slug route", () => {
  const layout = readLayout(layoutFile);
  assert.match(layout, /routeLabel\(location\.pathname\)/u);
  assert.doesNotMatch(layout, /pathname\.replace\(["']\/["'],\s*["']{2}\)/u);
  assert.match(layout, /layout__breadcrumb-current/u);
});

test("TC-07: aside rail cố định — không toggle, không tự thu", () => {
  const layout = readLayout(layoutFile);
  // APP_ROUTES giờ chỉ dùng để thêm class `layout__content--map` (fit chiều cao),
  // không còn dùng để tự thu aside — giữ nguyên ý nghĩa TC-07.
  assert.doesNotMatch(layout, /sidebarOpen|setSidebarOpen|<Menu|<X\b/u);
  assert.match(layout, /APP_ROUTES\.MONITORING \? "layout__content--map"/u);
  assert.match(layout, /<aside className="layout__sidebar app-sidebar">/u);
  assert.match(layout, /aria-label=\{item\.label\}/u);

  const css = readLayoutCss();
  assert.doesNotMatch(css, /is-collapsed/u);
  assert.match(css, /--sidebar-width-collapsed/u);
});

test("TC-08: hover/focus hiện card nhãn + badge Live cùng một hàng", () => {
  const layout = readLayout(layoutFile);
  assert.match(layout, /layout__nav-popover/u);
  assert.match(layout, /role="tooltip"/u);
  assert.match(layout, /layout__nav-popover-head/u);
  assert.match(layout, /layout__nav-popover-head[\s\S]{0,220}layout__nav-badge/u);
  assert.doesNotMatch(layout, /layout__nav-popover-desc/u);

  const css = readLayoutCss();
  assert.match(css, /\.layout__nav-popover\s*\{[^}]*position:\s*absolute/u);
  assert.match(css, /\.layout__nav-popover\s*\{[^}]*left:\s*calc\(100%\s*\+\s*var\(--space-1\)\)/u);
  assert.match(css, /\.layout__nav-popover\s*\{[^}]*width:\s*max-content/u);
  assert.doesNotMatch(css, /\.layout__nav-popover\s*\{[^}]*width:\s*180px/u);
  assert.match(css, /\.layout__nav-popover-head\s*\{[^}]*align-items:\s*center/u);
  assert.match(css, /:hover\s+\.layout__nav-popover/u);
  assert.match(css, /:focus-visible\s+\.layout__nav-popover/u);
  assert.match(css, /z-index:\s*var\(--z-tooltip\)/u);
});

test("TC-09: vùng nội dung dùng toàn bộ chiều rộng", () => {
  const css = readLayoutCss();
  assert.match(css, /\.layout__content\s*\{[^}]*width:\s*100%/u);
  assert.doesNotMatch(css, /\.layout__content\s*\{[^}]*var\(--content-max-width\)/u);
  assert.doesNotMatch(css, /margin-inline:\s*auto/u);
});

test("TC-10: header actions chứa 3 widget dùng design token, không hardcode màu", () => {
  const layout = readLayout(layoutFile);
  assert.match(layout, /<HeaderActions\s/u);
  assert.doesNotMatch(layout, /APP_ROUTES\.(REPORTS|SETTINGS)/u);

  const css = readLayoutCss();
  assert.match(css, /\.layout__header-actions/u);
  assert.match(css, /\.layout__header-widget/u);
  assert.match(css, /\.layout__filter-chip/u);
  assert.match(css, /\.header-clock-toggle/u);
  assert.match(css, /\.layout__refresh-toast\s*\{[^}]*position:\s*fixed/u);
  assert.match(css, /\.layout__refresh-toast\s*\{[^}]*z-index:\s*var\(--z-toast\)/u);
  assert.match(css, /\.layout__refresh-toast\s*\{[^}]*bottom:\s*var\(--space-8\)/u);
  assert.match(css, /\.layout__refresh-toast\s*\{[^}]*left:\s*50%/u);
  assert.match(css, /\.layout__refresh-toast\s*\{[^}]*transform:\s*translateX\(-50%\)/u);
  assert.doesNotMatch(css, /\.layout__refresh-toast\s*\{[^}]*(?:top:|right:)/u);
  assert.match(css, /\.layout__refresh-toast-text/u);
  assert.match(css, /--countdown-progress/u);
  assert.match(css, /--toast-progress/u);
  assert.match(css, /@keyframes gdmas-toast-in/u);
  assert.match(css, /prefers-reduced-motion/u);
  assert.match(css, /\.layout__header-widget\s*\{[^}]*background:\s*var\(--card\)/u);
  assert.doesNotMatch(css, /#[\da-f]{3,8}\b/iu);
});
