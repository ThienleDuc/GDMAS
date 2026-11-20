import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import {
  applyTheme,
  nextTheme,
  persistTheme,
  readStoredTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type ThemeRoot,
  type ThemeStorage,
} from "../src/lib/theme.ts";

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage: ThemeStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  return { storage, values };
}

function createRoot() {
  const classes = new Set<string>();
  const root: ThemeRoot = {
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
    style: { colorScheme: "" },
  };
  return { root, classes };
}

test("TC-01: stored choice takes precedence over system preference", () => {
  assert.equal(resolveInitialTheme("dark", false), "dark");
  assert.equal(resolveInitialTheme("light", true), "light");
});

test("TC-02–TC-03: missing or invalid storage falls back to system", () => {
  assert.equal(resolveInitialTheme(null, true), "dark");
  assert.equal(resolveInitialTheme(undefined, false), "light");
  assert.equal(resolveInitialTheme("sepia", true), "dark");
});

test("TC-04: nextTheme toggles light and dark", () => {
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "light");
});

test("TC-05: applyTheme updates root class, color-scheme and transition class", () => {
  const { root, classes } = createRoot();
  applyTheme("dark", root);
  assert.equal(classes.has("dark"), true);
  assert.equal(classes.has("theme-transition"), true);
  assert.equal(root.style?.colorScheme, "dark");
  applyTheme("light", root);
  assert.equal(classes.has("dark"), false);
  assert.equal(root.style?.colorScheme, "light");
});

test("TC-06: storage failure is safely ignored", () => {
  const storage: ThemeStorage = {
    getItem: () => { throw new Error("storage disabled"); },
    setItem: () => { throw new Error("storage disabled"); },
  };
  assert.equal(readStoredTheme(storage), null);
  assert.doesNotThrow(() => persistTheme("dark", storage));
  assert.equal(resolveInitialTheme(readStoredTheme(storage), false), "light");
  assert.equal(THEME_STORAGE_KEY, "gdmas_theme_mode");
});

test("TC-07–TC-08: shell is Light First without toggle and unnecessary UI copy is removed", () => {
  const root = resolve(import.meta.dirname, "../src");
  const layout = readFileSync(resolve(root, "layouts/DashboardLayout.tsx"), "utf8");
  const app = readFileSync(resolve(root, "app/App.tsx"), "utf8");
  const earthquakePage = readFileSync(resolve(root, "features/earthquakes/EarthquakesPage.tsx"), "utf8");

  assert.doesNotMatch(layout, /useTheme|layout__theme-toggle|<svg/u);
  assert.doesNotMatch(layout, /theme_mode|applyTheme/u);
  assert.doesNotMatch(layout, /PostgreSQL Connected|FastAPI, PostgreSQL|Disaster Monitoring/u);
  assert.doesNotMatch(app, /globals\.css|Giao diện đang được tái cấu trúc/u);
  assert.doesNotMatch(earthquakePage, /GET \/api\/v1\/earthquakes|chu kỳ cập nhật|Giao diện không dùng dữ liệu mẫu/u);
});
