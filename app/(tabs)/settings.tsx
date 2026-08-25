import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { OWNER_SESSION_KEY } from "@/constants/owner-api";
import { THEME_CONFIGS, useThemeStore, type ThemeType } from "@/lib/stores/theme-store";
import { Linking } from "react-native";

const THEME_OPTIONS = Object.entries(THEME_CONFIGS).map(([id, config]) => ({
  id: id as ThemeType,
  ...config,
}));

const OWNER_APP_DOWNLOAD_URL = "https://github.com/khawajad02-dev/hadx-labs-owner-app/releases/latest";

function PresetPreview({ themeId, selected }: { themeId: ThemeType; selected: boolean }) {
  const config = THEME_CONFIGS[themeId];
  return (
    <View style={[styles.preview, { backgroundColor: config.colors.background, borderColor: selected ? config.colors.primary : config.colors.border }]}>
      <View style={[styles.previewGlow, { backgroundColor: config.colors.primary, opacity: config.motion.glowOpacity * 0.22 }]} />
      <View style={[styles.previewCore, { backgroundColor: config.colors.primary, shadowColor: config.colors.primary }]}>
        <View style={[styles.previewCoreHighlight, { backgroundColor: config.colors.accent }]} />
      </View>
      <View style={[styles.previewRing, { borderColor: config.colors.accent }]} />
      {config.motion.scanline ? <View style={[styles.scanline, { backgroundColor: config.colors.accent }]} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { currentTheme, setTheme } = useThemeStore();
  const openStorefront = async () => {
    try {
      await Linking.openURL("https://hadx-labs.vercel.app");
    } catch (error) {
      console.error("Storefront open failed:", error);
      Alert.alert("Could not open storefront", "Please try again when the connection is restored.");
    }
  };

  const openOwnerAppDownload = async () => {
    try {
      await Linking.openURL(OWNER_APP_DOWNLOAD_URL);
    } catch (error) {
      console.error("Owner App download page open failed:", error);
      Alert.alert("Could not open install page", "Please scan the QR code again when the connection is restored.");
    }
  };

  const handleResetSession = () => {
    Alert.alert("Reset owner session", "You will need a new email sign-in code on next launch.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset session",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync(OWNER_SESSION_KEY);
            router.replace("/security-vault");
          } catch (error) {
            console.error("Reset session failed:", error);
            Alert.alert("Could not reset session", "Please try again.");
          }
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Log out of Owner App", "Your server session will be removed from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          try {
            await SecureStore.deleteItemAsync(OWNER_SESSION_KEY);
            router.replace("/security-vault");
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Could not log out", "Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SectionHeading
          eyebrow="CONTROL ROOM / PREFERENCES"
          title="Settings"
          detail="Shape the mood, motion and operating state of HADX LABS."
        />

        <LuxuryCard accent style={styles.currentCard}>
          <View style={styles.currentRow}>
            <View style={styles.currentCopy}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>ACTIVE EXPERIENCE</Text>
              <Text style={[styles.currentTitle, { color: colors.foreground }]}>{colors.themeName}</Text>
              <Text style={[styles.currentDetail, { color: colors.muted }]}>{colors.themeDescription}</Text>
            </View>
            <StatusPill label="Live" tone="success" />
          </View>
        </LuxuryCard>

        <SectionHeading eyebrow="MOTION LAB" title="3D animation presets" detail="Each preset changes the palette, depth and movement of the whole app." />
        <View style={styles.presetList}>
          {THEME_OPTIONS.map((theme) => {
            const selected = currentTheme === theme.id;
            return (
              <Pressable
                key={theme.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setTheme(theme.id)}
                style={({ pressed }) => [styles.presetPressable, pressed && styles.presetPressed]}
              >
                <View style={[styles.presetCard, { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
                  <PresetPreview themeId={theme.id} selected={selected} />
                  <View style={styles.presetCopy}>
                    <View style={styles.presetTitleRow}>
                      <Text style={[styles.presetName, { color: colors.foreground }]}>{theme.name}</Text>
                      {selected ? <Text style={[styles.check, { color: colors.primary }]}>✓</Text> : null}
                    </View>
                    <Text style={[styles.presetDescription, { color: colors.muted }]}>{theme.description}</Text>
                    <Text style={[styles.presetMeta, { color: selected ? colors.primary : colors.muted }]}>
                      {theme.id === "bento-telemetry" ? "BENTO GRID / MODULAR" : theme.id === "visionos-spatial" ? "SPATIAL GLASS / FLOATING" : theme.id === "cyberpunk-terminal" ? "TERMINAL / EVENT STREAM" : theme.id === "neumorphic-luxe" ? "TACTILE / SOFT DEPTH" : "OBSIDIAN / CYBER CORE"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionHeading eyebrow="STORE PRESENCE" title="Operating state" detail="Controls that affect the public storefront." />
        <LuxuryCard compact>
          <View style={styles.controlCopy}>
            <Text style={[styles.controlTitle, { color: colors.foreground }]}>Public storefront</Text>
            <Text style={[styles.controlDetail, { color: colors.muted }]}>Open the live HADX LABS experience in your browser.</Text>
          </View>
          <LuxuryButton label="Open live storefront" onPress={() => void openStorefront()} variant="primary" style={styles.storeButton} />
        </LuxuryCard>

        <SectionHeading eyebrow="DEVICE DISTRIBUTION" title="Install on another phone" detail="Scan this QR code to open the latest Owner App release." />
        <LuxuryCard accent style={styles.qrCard}>
          <View style={styles.qrFrame}>
            <Image source={require("@/assets/images/owner-app-download-qr.png")} style={styles.qrImage} resizeMode="contain" accessibilityLabel="QR code for the latest HADX LABS Owner App release" />
          </View>
          <Text style={[styles.qrTitle, { color: colors.foreground }]}>HADX OWNER APP</Text>
          <Text style={[styles.qrDetail, { color: colors.muted }]}>Scan with the other phone. Android will open the release page, where the APK can be downloaded and installed with the phone’s permission.</Text>
          <LuxuryButton label="Open install page" onPress={() => void openOwnerAppDownload()} variant="secondary" style={styles.qrButton} />
        </LuxuryCard>

        <SectionHeading eyebrow="DEVICE SECURITY" title="Session controls" detail="Your server secret never lives in this app." />
        <View style={styles.securityActions}>
          <LuxuryButton label="Request a new sign-in" onPress={handleResetSession} variant="secondary" />
          <LuxuryButton label="Log out this device" onPress={handleLogout} variant="danger" />
        </View>

        <LuxuryCard compact>
          <Text style={[styles.infoEyebrow, { color: colors.primary }]}>HADX LABS OWNER</Text>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Luxury control, without the clutter.</Text>
          <Text style={[styles.infoDetail, { color: colors.muted }]}>Version 1.1 · {colors.themeName}</Text>
        </LuxuryCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 18 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.4 },
  currentCard: { minHeight: 130 },
  currentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  currentCopy: { flex: 1, gap: 6 },
  currentTitle: { fontSize: 21, fontWeight: "900" },
  currentDetail: { fontSize: 13, lineHeight: 19 },
  presetList: { gap: 10 },
  presetPressable: { borderRadius: 20 },
  presetPressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  presetCard: { minHeight: 112, borderRadius: 20, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 14 },
  preview: { width: 84, height: 84, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  previewGlow: { position: "absolute", width: 74, height: 74, borderRadius: 37 },
  previewCore: { width: 34, height: 34, borderRadius: 17, alignItems: "flex-start", justifyContent: "flex-start", shadowOpacity: 0.7, shadowRadius: 12, elevation: 7 },
  previewCoreHighlight: { width: 9, height: 9, borderRadius: 5, marginTop: 6, marginLeft: 7, opacity: 0.85 },
  previewRing: { position: "absolute", width: 62, height: 62, borderRadius: 31, borderWidth: 1, opacity: 0.5 },
  scanline: { position: "absolute", height: 1, width: 64, top: 41, opacity: 0.55 },
  presetCopy: { flex: 1, gap: 6 },
  presetTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  presetName: { flex: 1, fontSize: 15, fontWeight: "900" },
  check: { fontSize: 20, fontWeight: "900" },
  presetDescription: { fontSize: 12, lineHeight: 17 },
  presetMeta: { fontSize: 9, fontWeight: "800", letterSpacing: 1.2 },
  storeButton: { marginTop: 14 },
  controlCopy: { flex: 1, gap: 5 },
  controlTitle: { fontSize: 15, fontWeight: "800" },
  controlDetail: { fontSize: 12, lineHeight: 18 },
  qrCard: { alignItems: "center", paddingVertical: 20 },
  qrFrame: { width: 206, height: 206, borderRadius: 24, padding: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  qrImage: { width: 188, height: 188 },
  qrTitle: { marginTop: 15, fontSize: 14, fontWeight: "900", letterSpacing: 1.8 },
  qrDetail: { marginTop: 7, textAlign: "center", fontSize: 12, lineHeight: 18 },
  qrButton: { marginTop: 15, minWidth: 190 },
  securityActions: { gap: 10 },
  infoEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.2, marginBottom: 8 },
  infoTitle: { fontSize: 17, fontWeight: "900", marginBottom: 5 },
  infoDetail: { fontSize: 12 },
});
