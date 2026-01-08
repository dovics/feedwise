"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { ThemeSettings, DEFAULT_READING_SETTINGS } from "@/types/reader";
import { generateThemeColors } from "@/lib/color-utils";

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (settings: ThemeSettings) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeSettings() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_READING_SETTINGS);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchThemeSettings = async () => {
      if (!session?.user) {
        setSettings(DEFAULT_READING_SETTINGS);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/reading-settings");
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch theme settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchThemeSettings();
    }
  }, [session, status]);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const themeColors = generateThemeColors(settings.backgroundColor, settings.textColor);

    root.style.setProperty('--theme-background', themeColors.background);
    root.style.setProperty('--theme-surface', themeColors.surface);
    root.style.setProperty('--theme-surface-transparent', themeColors.surfaceTransparent);
    root.style.setProperty('--theme-hover', themeColors.hover);
    root.style.setProperty('--theme-input', themeColors.input);
    root.style.setProperty('--theme-border', themeColors.border);
    root.style.setProperty('--theme-border-subtle', themeColors.borderSubtle);
    root.style.setProperty('--theme-text-primary', themeColors.textPrimary);
    root.style.setProperty('--theme-text-secondary', themeColors.textSecondary);
    root.style.setProperty('--theme-text-muted', themeColors.textMuted);
    root.style.setProperty('--theme-accent', themeColors.accent);
    root.style.setProperty('--theme-accent-hover', themeColors.accentHover);
    root.style.setProperty('--theme-shadow', themeColors.shadow);
    root.style.setProperty('--theme-focus-ring', themeColors.focusRing);

    root.style.setProperty('--background-color', settings.backgroundColor);
    root.style.setProperty('--text-color', settings.textColor);
    root.style.setProperty('--font-family', settings.fontFamily);
    root.style.setProperty('--font-size', `${settings.fontSize}px`);
    root.style.setProperty('--line-height', settings.lineHeight.toString());
  }, [settings, mounted]);

  const updateSettings = (newSettings: ThemeSettings) => {
    setSettings(newSettings);
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}
