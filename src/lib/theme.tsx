/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type StoredPreferences = {
  themeMode?: "light" | "dark" | "system";
  fontFamily?: "inter" | "geist" | "nunito-sans";
  themePreset?: "bw-light" | "bw-dark" | "light" | "dark";
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", toggleTheme: () => {} });

function loadStoredPreferences(): StoredPreferences {
  try {
    const raw = localStorage.getItem("upixel-preferences");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function resolveInitialTheme(): Theme {
  const prefs = loadStoredPreferences();
  if (prefs.themeMode === "light" || prefs.themeMode === "dark") return prefs.themeMode;
  const stored = localStorage.getItem("upixel-theme") as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyStoredPreferenceAttributes() {
  const prefs = loadStoredPreferences();
  const root = document.documentElement;
  if (prefs.fontFamily) root.setAttribute("data-font", prefs.fontFamily);
  if (prefs.themePreset) {
    const normalized = prefs.themePreset === "light" ? "bw-light" : prefs.themePreset === "dark" ? "bw-dark" : prefs.themePreset;
    root.setAttribute("data-theme-preset", normalized);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("upixel-theme", theme);
    applyStoredPreferenceAttributes();
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
