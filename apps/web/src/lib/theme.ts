/** Theme mode helpers shared by the app shell. */

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "gdmas_theme_mode";

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface ThemeRoot {
  classList: {
    add(name: string): void;
    remove(name: string): void;
  };
  style?: { colorScheme: string };
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value === "light" || value === "dark";
}

export function resolveInitialTheme(
  stored: string | null | undefined,
  prefersDark: boolean,
): ThemeMode {
  return isThemeMode(stored) ? stored : prefersDark ? "dark" : "light";
}

export function readStoredTheme(storage?: ThemeStorage): string | null {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    return target?.getItem(THEME_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function persistTheme(mode: ThemeMode, storage?: ThemeStorage): void {
  try {
    const target = storage ?? (typeof localStorage === "undefined" ? undefined : localStorage);
    target?.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Private browsing or storage restrictions should not prevent theme switching.
  }
}

export function nextTheme(current: ThemeMode): ThemeMode {
  return current === "dark" ? "light" : "dark";
}

export function applyTheme(mode: ThemeMode, root?: ThemeRoot): void {
  const target = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
  if (!target) return;
  target.classList.add("theme-transition");
  if (mode === "dark") {
    target.classList.add("dark");
  } else {
    target.classList.remove("dark");
  }
  if (target.style) target.style.colorScheme = mode;
}

export function resolveSystemTheme(prefersDark: boolean): ThemeMode {
  return prefersDark ? "dark" : "light";
}
