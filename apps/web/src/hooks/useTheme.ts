import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  nextTheme,
  persistTheme,
  readStoredTheme,
  resolveInitialTheme,
  resolveSystemTheme,
  type ThemeMode,
} from "../lib/theme.ts";

function getSystemPreference(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export interface UseThemeResult {
  mode: ThemeMode;
  toggle: () => void;
}

export function useTheme(): UseThemeResult {
  const [mode, setMode] = useState<ThemeMode>(() =>
    resolveInitialTheme(readStoredTheme(), getSystemPreference()),
  );

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  useEffect(() => {
    if (readStoredTheme() !== null || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setMode(resolveSystemTheme(event.matches));
    media.addEventListener?.("change", handleChange);
    return () => media.removeEventListener?.("change", handleChange);
  }, []);

  const toggle = useCallback(() => {
    setMode((current) => {
      const next = nextTheme(current);
      persistTheme(next);
      return next;
    });
  }, []);

  return { mode, toggle };
}
