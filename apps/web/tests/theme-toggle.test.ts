/**
 * Test offline cho Dark Mode + toggle header — .agents/notes/testcase/2026-11-21-darkmode-toggle-thien.md
 * Không render DOM, không gọi mạng; chỉ đọc tệp tĩnh (I7).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../src");
const testsRoot = resolve(import.meta.dirname);

const globalsCss = readFileSync(resolve(root, "styles/globals.css"), "utf8");
const layoutCss = readFileSync(resolve(root, "layouts/layout.css"), "utf8");
const toggle = readFileSync(resolve(root, "layouts/header/ThemeToggle.tsx"), "utf8");
const actions = readFileSync(resolve(root, "layouts/header/HeaderActions.tsx"), "utf8");
const themeLib = readFileSync(resolve(root, "lib/theme.ts"), "utf8");
const useTheme = readFileSync(resolve(root, "hooks/useTheme.ts"), "utf8");
const oldThemeTest = readFileSync(resolve(testsRoot, "theme.test.ts"), "utf8");

const darkBlock = globalsCss.match(/\.dark\s*\{([\s\S]*?)\}/u)?.[1] ?? "";

test("TC-01: light-first được giữ nguyên", () => {
  assert.match(globalsCss, /:root\s*\{[\s\S]{0,60}color-scheme:\s*light/u);
  assert.doesNotMatch(globalsCss, /LIGHT MODE ONLY/u);
});

test("TC-02: khối .dark tồn tại với color-scheme dark", () => {
  assert.ok(darkBlock.length > 0);
  assert.match(darkBlock, /color-scheme:\s*dark/u);
});

test("TC-03: mọi token ngữ nghĩa mẫu đều được override trong .dark", () => {
  const tokens = [
    "--background",
    "--foreground",
    "--card",
    "--primary",
    "--muted",
    "--border",
    "--surface",
    "--sidebar",
    "--chart-1",
    "--shadow-md",
    "--accent",
    "--ring",
  ];
  for (const token of tokens) {
    assert.match(darkBlock, new RegExp(`${token}\\s*:`, "u"), `thiếu ${token} trong .dark`);
  }
});

test("TC-04: toggle dùng useTheme, icon SVG và a11y", () => {
  assert.match(toggle, /useTheme/u);
  assert.match(toggle, /\btoggle\b/u);
  assert.match(toggle, /<Sun\b/u);
  assert.match(toggle, /<Moon\b/u);
  assert.match(toggle, /aria-pressed/u);
  assert.match(toggle, /aria-label/u);
  assert.match(toggle, /<button/u);
});

test("TC-05: toggle đã dời từ HeaderActions sang footer aside", () => {
  const layout = readFileSync(resolve(root, "layouts/DashboardLayout.tsx"), "utf8");
  assert.doesNotMatch(actions, /<ThemeToggle/u, "HeaderActions không còn render ThemeToggle");
  const countdownIndex = layout.indexOf("<CompactRefreshCountdown");
  const toggleIndex = layout.indexOf("<ThemeToggle");
  assert.ok(countdownIndex >= 0, "thiếu CompactRefreshCountdown");
  assert.ok(toggleIndex > countdownIndex, "ThemeToggle phải đứng dưới countdown ở aside");
});

test("TC-06: CSS toggle dùng design token và reduced-motion", () => {
  assert.match(layoutCss, /\.header-theme-toggle\s*\{/u);
  assert.match(layoutCss, /\.header-theme-toggle:focus-visible/u);
  assert.match(layoutCss, /prefers-reduced-motion/u);
  assert.match(layoutCss, /var\(--accent\)/u);
  assert.match(layoutCss, /var\(--ring\)/u);
});

test("TC-07: helper theme và hook cũ giữ nguyên chữ ký", () => {
  assert.match(themeLib, /export type ThemeMode/u);
  assert.match(themeLib, /export function applyTheme/u);
  assert.match(themeLib, /export function nextTheme/u);
  assert.match(useTheme, /export function useTheme/u);
  assert.match(useTheme, /return \{ mode, toggle \}/u);
});

test("TC-08: bộ test theme cũ không bị xóa/sửa assertion", () => {
  assert.match(oldThemeTest, /TC-01/u);
  assert.match(oldThemeTest, /TC-04/u);
  assert.match(oldThemeTest, /TC-05/u);
  assert.match(oldThemeTest, /doesNotMatch\(layout, \/useTheme\|layout__theme-toggle/u);
});
