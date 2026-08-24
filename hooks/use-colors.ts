import { useMemo } from "react";

import type { ThemeColorPalette } from "@/constants/theme";
import { useThemeStore } from "@/lib/stores/theme-store";

type LuxuryPalette = ThemeColorPalette & {
  success: string;
  warning: string;
  error: string;
  accent: string;
  themeName: string;
  themeDescription: string;
  motion: {
    floatDuration: number;
    glowOpacity: number;
    depth: number;
    scanline: boolean;
  };
};

export function useColors(): LuxuryPalette {
  const currentTheme = useThemeStore((state) => state.currentTheme);
  const getThemeConfig = useThemeStore((state) => state.getThemeConfig);

  return useMemo(() => {
    const config = getThemeConfig(currentTheme);
    const palette = config.colors;

    return {
      ...palette,
      text: palette.foreground,
      background: palette.background,
      tint: palette.primary,
      icon: palette.muted,
      tabIconDefault: palette.muted,
      tabIconSelected: palette.primary,
      border: palette.border,
      themeName: config.name,
      themeDescription: config.description,
      motion: config.motion,
    } as LuxuryPalette;
  }, [currentTheme, getThemeConfig]);
}
