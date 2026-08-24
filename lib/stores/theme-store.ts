import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeType =
  | "hadx-cyber-luxury"
  | "bento-telemetry"
  | "visionos-spatial"
  | "cyberpunk-terminal"
  | "neumorphic-luxe";

export interface ThemeConfig {
  name: string;
  description: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    border: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  motion: {
    floatDuration: number;
    glowOpacity: number;
    depth: number;
    scanline: boolean;
  };
}

export const THEME_CONFIGS: Record<ThemeType, ThemeConfig> = {
  "hadx-cyber-luxury": {
    name: "HADX Cyber-Luxury",
    description: "Obsidian depth, champagne gold and a breathing cyber core.",
    colors: {
      primary: "#D7B34B",
      background: "#070707",
      surface: "#151313",
      foreground: "#FFF8E7",
      muted: "#9B9385",
      border: "#6D5724",
      accent: "#F2D98B",
      success: "#69D6A3",
      warning: "#E9B95D",
      error: "#E67D72",
    },
    motion: { floatDuration: 4400, glowOpacity: 0.8, depth: 1, scanline: false },
  },
  "bento-telemetry": {
    name: "Bento Grid Telemetry",
    description: "Crisp instrument panels with cyan telemetry pulses.",
    colors: {
      primary: "#7DE8F2",
      background: "#071013",
      surface: "#102026",
      foreground: "#E9FEFF",
      muted: "#8DA9AE",
      border: "#225761",
      accent: "#C6FBFF",
      success: "#62E6A6",
      warning: "#F4C76E",
      error: "#F18181",
    },
    motion: { floatDuration: 3200, glowOpacity: 0.65, depth: 0.8, scanline: true },
  },
  "visionos-spatial": {
    name: "VisionOS Spatial",
    description: "Cool spatial glass with soft blue atmospheric movement.",
    colors: {
      primary: "#9CC7FF",
      background: "#080E1A",
      surface: "#14243A",
      foreground: "#F4F8FF",
      muted: "#9BAEC4",
      border: "#345B87",
      accent: "#D7E8FF",
      success: "#70DDB1",
      warning: "#EBC56A",
      error: "#E98989",
    },
    motion: { floatDuration: 5200, glowOpacity: 0.5, depth: 1.15, scanline: false },
  },
  "cyberpunk-terminal": {
    name: "Cyberpunk Terminal",
    description: "Low-light command center with restrained scanline motion.",
    colors: {
      primary: "#8AF56B",
      background: "#030604",
      surface: "#0B120D",
      foreground: "#E9FFE4",
      muted: "#7F9D7C",
      border: "#2C6B2A",
      accent: "#FFD36B",
      success: "#8AF56B",
      warning: "#FFD36B",
      error: "#FF7B7B",
    },
    motion: { floatDuration: 2600, glowOpacity: 0.7, depth: 0.7, scanline: true },
  },
  "neumorphic-luxe": {
    name: "Neumorphic Dark Luxe",
    description: "Tactile shadow depth with calm gold interaction feedback.",
    colors: {
      primary: "#D2B46A",
      background: "#151515",
      surface: "#242424",
      foreground: "#F4F0E7",
      muted: "#A29C91",
      border: "#51462F",
      accent: "#F0DCA2",
      success: "#78D6A8",
      warning: "#E9BD69",
      error: "#E78178",
    },
    motion: { floatDuration: 6000, glowOpacity: 0.35, depth: 1.25, scanline: false },
  },
};

interface ThemeStore {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  getThemeConfig: (theme: ThemeType) => ThemeConfig;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: "hadx-cyber-luxury",
      setTheme: (theme) => set({ currentTheme: theme }),
      getThemeConfig: (theme) => THEME_CONFIGS[theme],
    }),
    {
      name: "theme-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
