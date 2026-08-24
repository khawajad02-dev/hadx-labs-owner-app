import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useThemeStore, type ThemeType } from '@/lib/stores/theme-store';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { apiPut } from '@/lib/api-client';
import { OWNER_SESSION_KEY } from '@/constants/owner-api';

const THEME_OPTIONS: Array<{ id: ThemeType; name: string; description: string }> = [
  {
    id: 'hadx-cyber-luxury',
    name: 'HADX Cyber-Luxury',
    description: 'Deep black with luxury gold accents',
  },
  {
    id: 'bento-telemetry',
    name: 'Bento Grid Telemetry',
    description: 'Obsidian matte with cyan accents',
  },
  {
    id: 'visionos-spatial',
    name: 'VisionOS Spatial',
    description: 'Frosted glass with ambient blue',
  },
  {
    id: 'cyberpunk-terminal',
    name: 'Cyberpunk Terminal',
    description: 'Monospace green and gold',
  },
  {
    id: 'neumorphic-luxe',
    name: 'Neumorphic Dark Luxe',
    description: 'Soft shadows with gold accents',
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { currentTheme, setTheme } = useThemeStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const handleThemeChange = (themeId: ThemeType) => {
    setTheme(themeId);
  };

  const handleMaintenanceToggle = async (value: boolean) => {
    setMaintenanceLoading(true);
    try {
      await apiPut('/maintenance', { enabled: value });
      setMaintenanceMode(value);
      Alert.alert(
        'Success',
        `Maintenance mode ${value ? 'enabled' : 'disabled'}`
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update maintenance mode');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleResetSession = () => {
    Alert.alert(
      'Reset owner session',
      'Are you sure? You will need to request a new email sign-in code on next launch.',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(OWNER_SESSION_KEY);
              Alert.alert('Success', 'Owner session has been reset');
              router.replace('/security-vault');
            } catch (err) {
              Alert.alert('Error', 'Failed to reset owner session');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync(OWNER_SESSION_KEY);
              router.replace('/security-vault');
            } catch (err) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="p-4 gap-6 pb-20">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
              Settings
            </Text>
            <Text style={{ color: colors.muted }}>
              App Configuration
            </Text>
          </View>

          {/* Theme Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
              🎨 Theme
            </Text>
            <View className="gap-2">
              {THEME_OPTIONS.map((theme) => (
                <TouchableOpacity
                  key={theme.id}
                  onPress={() => handleThemeChange(theme.id)}
                  style={{
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: currentTheme === theme.id ? colors.primary : colors.border,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-semibold" style={{ color: colors.foreground }}>
                        {theme.name}
                      </Text>
                      <Text className="text-xs mt-1" style={{ color: colors.muted }}>
                        {theme.description}
                      </Text>
                    </View>
                    {currentTheme === theme.id && (
                      <Text className="text-lg" style={{ color: colors.primary }}>
                        ✓
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Store Control Section */}
          <View
            className="rounded-lg p-4 gap-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
              🏪 Store Control
            </Text>

            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text style={{ color: colors.foreground }} className="font-semibold">
                  Maintenance Mode
                </Text>
                <Text style={{ color: colors.muted }} className="text-sm mt-1">
                  Temporarily disable the store
                </Text>
              </View>
              <Switch
                value={maintenanceMode}
                onValueChange={handleMaintenanceToggle}
                disabled={maintenanceLoading}
              />
            </View>
          </View>

          {/* Security Section */}
          <View className="gap-3">
            <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
              🔐 Security
            </Text>

            <TouchableOpacity
              onPress={handleResetSession}
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.foreground }} className="font-semibold">
                Reset owner session
              </Text>
              <Text style={{ color: colors.muted }} className="text-sm mt-1">
                You will need a new email sign-in code on next launch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 1,
                borderColor: '#EF4444',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FCA5A5' }} className="font-semibold">
                🚪 Logout
              </Text>
              <Text style={{ color: '#FCA5A5' }} className="text-sm mt-1 opacity-75">
                Sign out from this device
              </Text>
            </TouchableOpacity>
          </View>

          {/* App Info Section */}
          <View
            className="rounded-lg p-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text className="text-lg font-semibold mb-3" style={{ color: colors.foreground }}>
              ℹ️ App Information
            </Text>

            <View className="gap-2">
              <View className="flex-row justify-between">
                <Text style={{ color: colors.muted }}>App Name</Text>
                <Text style={{ color: colors.foreground }} className="font-semibold">
                  HADX LABS Owner
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text style={{ color: colors.muted }}>Version</Text>
                <Text style={{ color: colors.foreground }} className="font-semibold">
                  1.0.0
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text style={{ color: colors.muted }}>Current Theme</Text>
                <Text style={{ color: colors.primary }} className="font-semibold">
                  {THEME_OPTIONS.find(t => t.id === currentTheme)?.name}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
