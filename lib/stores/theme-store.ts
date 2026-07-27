import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'hadx-cyber-luxury' | 'bento-telemetry' | 'visionos-spatial' | 'cyberpunk-terminal' | 'neumorphic-luxe';

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    border: string;
    accent: string;
  };
  glassBlur: number;
  borderGlow: boolean;
}

interface ThemeStore {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  getThemeConfig: (theme: ThemeType) => ThemeConfig;
}

const themeConfigs: Record<ThemeType, ThemeConfig> = {
  'hadx-cyber-luxury': {
    name: 'HADX Cyber-Luxury',
    colors: {
      primary: '#D4AF37',
      background: '#050505',
      surface: '#1a1a1a',
      foreground: '#FFFFFF',
      muted: '#999999',
      border: '#D4AF37',
      accent: '#D4AF37',
    },
    glassBlur: 25,
    borderGlow: true,
  },
  'bento-telemetry': {
    name: 'Bento Grid Telemetry',
    colors: {
      primary: '#00d9ff',
      background: '#0d0d0d',
      surface: '#3a3a3a',
      foreground: '#e0e0e0',
      muted: '#888888',
      border: '#00d9ff',
      accent: '#00d9ff',
    },
    glassBlur: 15,
    borderGlow: false,
  },
  'visionos-spatial': {
    name: 'VisionOS Spatial',
    colors: {
      primary: '#4a9eff',
      background: '#0a0e27',
      surface: '#1a2847',
      foreground: '#ffffff',
      muted: '#aabbcc',
      border: '#4a9eff',
      accent: '#4a9eff',
    },
    glassBlur: 20,
    borderGlow: false,
  },
  'cyberpunk-terminal': {
    name: 'Cyberpunk Terminal',
    colors: {
      primary: '#00ff00',
      background: '#000000',
      surface: '#111111',
      foreground: '#00ff00',
      muted: '#ffaa00',
      border: '#00ff00',
      accent: '#ffaa00',
    },
    glassBlur: 0,
    borderGlow: true,
  },
  'neumorphic-luxe': {
    name: 'Neumorphic Dark Luxe',
    colors: {
      primary: '#c9a961',
      background: '#1a1a1a',
      surface: '#252525',
      foreground: '#e8e8e8',
      muted: '#999999',
      border: '#c9a961',
      accent: '#c9a961',
    },
    glassBlur: 10,
    borderGlow: false,
  },
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: 'hadx-cyber-luxury',
      setTheme: (theme: ThemeType) => set({ currentTheme: theme }),
      getThemeConfig: (theme: ThemeType) => themeConfigs[theme],
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
