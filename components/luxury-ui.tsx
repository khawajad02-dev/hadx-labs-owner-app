import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useEffect, useRef } from "react";

import { useColors } from "@/hooks/use-colors";

function ThemeBackdrop() {
  const colors = useColors();
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, { toValue: 1, duration: Math.max(1600, colors.motion.floatDuration * 0.7), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(motion, { toValue: 0, duration: Math.max(1600, colors.motion.floatDuration * 0.7), easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [colors.motion.floatDuration, motion]);

  const drift = motion.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });
  const isBento = colors.themeId === "bento-telemetry";
  const isSpatial = colors.themeId === "visionos-spatial";
  const isTerminal = colors.themeId === "cyberpunk-terminal";
  const isNeumorphic = colors.themeId === "neumorphic-luxe";

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {isBento || isTerminal ? <View style={styles.sceneGrid}>{Array.from({ length: 8 }).map((_, index) => <View key={`h-${index}`} style={[styles.gridHorizontal, { top: `${(index + 1) * 11}%`, borderColor: `${colors.primary}12` }]} />)}{Array.from({ length: 5 }).map((_, index) => <View key={`v-${index}`} style={[styles.gridVertical, { left: `${(index + 1) * 17}%`, borderColor: `${colors.primary}12` }]} />)}</View> : null}
      {isSpatial ? <Animated.View style={[styles.spatialHalo, { backgroundColor: colors.primary, opacity: 0.09, transform: [{ translateX: drift }, { scale: 1.1 }] }]} /> : null}
      {isNeumorphic ? <View style={[styles.neumorphicHalo, { backgroundColor: colors.surface, shadowColor: colors.primary }]} /> : null}
      {isTerminal ? <Animated.View style={[styles.scanline, { backgroundColor: colors.primary, opacity: 0.18, transform: [{ translateY: drift }] }]} /> : null}
      {!isBento && !isSpatial && !isTerminal && !isNeumorphic ? <Animated.View style={[styles.cyberHalo, { borderColor: `${colors.accent}35`, transform: [{ rotate: drift }] }]} /> : null}
    </View>
  );
}

export function LuxuryScene({ children }: { children: ReactNode }) {
  const colors = useColors();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: colors.motion.floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: colors.motion.floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [colors.motion.floatDuration, drift]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-12, 14] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [8, -10] });

  return (
    <View style={[styles.scene, { backgroundColor: colors.background }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientOrb,
          {
            backgroundColor: colors.primary,
            opacity: 0.08,
            transform: [{ translateX }, { translateY }, { scale: 1.05 }],
          },
        ]}
      />
      <ThemeBackdrop />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientOrbSmall,
          {
            backgroundColor: colors.accent,
            opacity: 0.05,
            transform: [{ translateX: translateY }, { translateY: translateX }],
          },
        ]}
      />
      <View style={styles.sceneContent}>{children}</View>
    </View>
  );
}

export function LuxuryCard({
  children,
  style,
  accent = false,
  compact = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accent?: boolean;
  compact?: boolean;
}) {
  const colors = useColors();
  const id = accent ? "accentGlow" : "surfaceGlow";
  const radius = colors.themeId === "bento-telemetry" ? 15 : colors.themeId === "visionos-spatial" ? 30 : colors.themeId === "cyberpunk-terminal" ? 9 : colors.themeId === "neumorphic-luxe" ? 21 : 24;
  const contentPadding = colors.themeId === "bento-telemetry" ? 14 : colors.themeId === "visionos-spatial" ? 22 : colors.themeId === "cyberpunk-terminal" ? 12 : 18;

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        {
          borderRadius: radius,
          backgroundColor: colors.surface,
          borderColor: accent ? colors.primary : colors.border,
          shadowColor: colors.primary,
          shadowOpacity: accent ? colors.motion.glowOpacity * 0.18 : 0.12,
        },
        style,
      ]}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <RadialGradient id={id} cx="18%" cy="0%" rx="90%" ry="90%">
            <Stop offset="0%" stopColor={accent ? colors.accent : colors.primary} stopOpacity={0.2} />
            <Stop offset="55%" stopColor={colors.surface} stopOpacity={0.05} />
            <Stop offset="100%" stopColor={colors.surface} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={radius} fill={`url(#${id})`} />
      </Svg>
      <View style={[styles.cardContent, { padding: contentPadding }]}>{children}</View>
    </View>
  );
}

export function LuxuryButton({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  loading = false,
  style,
  labelStyle,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const colors = useColors();
  const buttonRadius = colors.themeId === "bento-telemetry" ? 12 : colors.themeId === "visionos-spatial" ? 20 : colors.themeId === "cyberpunk-terminal" ? 7 : colors.themeId === "neumorphic-luxe" ? 22 : 16;
  const palette = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary, textColor: colors.background },
    secondary: { backgroundColor: colors.surface, borderColor: colors.border, textColor: colors.foreground },
    ghost: { backgroundColor: "transparent", borderColor: colors.border, textColor: colors.accent },
    danger: { backgroundColor: "#351A1A", borderColor: colors.error, textColor: "#FFD1CC" },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderRadius: buttonRadius,
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled || loading ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {icon ? <View style={styles.buttonIcon}>{icon}</View> : null}
      <Text style={[styles.buttonLabel, { color: palette.textColor }, labelStyle]}>
        {loading ? "Working…" : label}
      </Text>
    </Pressable>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  const colors = useColors();
  const headingSize = colors.themeId === "bento-telemetry" ? 23 : colors.themeId === "cyberpunk-terminal" ? 24 : colors.themeId === "visionos-spatial" ? 31 : 28;
  return (
    <View style={styles.headingRow}>
      <View style={styles.headingCopy}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
        <Text style={[styles.headingTitle, { color: colors.foreground, fontSize: headingSize }]}>{title}</Text>
        {detail ? <Text style={[styles.headingDetail, { color: colors.muted }]}>{detail}</Text> : null}
      </View>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "danger" | "neutral" }) {
  const colors = useColors();
  const toneColor = {
    success: colors.success,
    warning: colors.warning,
    danger: colors.error,
    neutral: colors.muted,
  }[tone];

  return (
    <View style={[styles.statusPill, { backgroundColor: `${toneColor}18`, borderColor: `${toneColor}66` }]}>
      <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
      <Text style={[styles.statusText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

export function CyberOrb({ size = 96 }: { size?: number }) {
  const colors = useColors();
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: colors.motion.floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: colors.motion.floatDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [colors.motion.floatDuration, float]);

  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [2, -5] });
  const inner = size * 0.44;

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY }] }} accessibilityLabel="HADX Cyber Orb">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="orbCore" cx="38%" cy="28%" r="72%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.98} />
            <Stop offset="35%" stopColor={colors.primary} stopOpacity={0.85} />
            <Stop offset="78%" stopColor="#5A3A0B" stopOpacity={0.9} />
            <Stop offset="100%" stopColor="#080706" stopOpacity={1} />
          </RadialGradient>
          <RadialGradient id="orbHalo" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.26} />
            <Stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="48" fill="url(#orbHalo)" />
        <Circle cx="50" cy="50" r="34" fill="url(#orbCore)" stroke={colors.accent} strokeOpacity={0.8} strokeWidth="1.2" />
        <Circle cx="50" cy="50" r="40" fill="none" stroke={colors.primary} strokeOpacity={0.5} strokeWidth="1" strokeDasharray="2 5" />
        <Circle cx="50" cy="50" r="44" fill="none" stroke={colors.accent} strokeOpacity={0.25} strokeWidth="0.7" />
        <G fill="none" stroke={colors.accent} strokeLinecap="round">
          <Path d="M18 47 C27 19, 73 15, 84 44" strokeWidth="1" strokeOpacity={0.55} />
          <Path d="M18 57 C33 83, 71 86, 84 55" strokeWidth="0.8" strokeOpacity={0.42} />
          <Path d="M50 18 C37 34, 37 65, 50 82" strokeWidth="0.7" strokeOpacity={0.3} />
        </G>
        <Circle cx="39" cy="34" r="5" fill="#FFF4C6" opacity={0.66} />
        <Circle cx="39" cy="34" r="10" fill="none" stroke="#FFF4C6" strokeOpacity={0.14} strokeWidth="5" />
        <Circle cx="50" cy="50" r={inner * 0.1} fill={colors.foreground} opacity={0.7} />
      </Svg>
    </Animated.View>
  );
}

export function MiniSparkline({ values, color }: { values: number[]; color?: string }) {
  const colors = useColors();
  const stroke = color ?? colors.primary;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = 30 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width="100%" height="36" viewBox="0 0 100 36" preserveAspectRatio="none">
      <Path d={`M ${points}`} fill="none" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: "hidden" },
  sceneGrid: { ...StyleSheet.absoluteFillObject },
  gridHorizontal: { position: "absolute", left: 0, right: 0, borderTopWidth: 1 },
  gridVertical: { position: "absolute", top: 0, bottom: 0, borderLeftWidth: 1 },
  spatialHalo: { position: "absolute", width: 420, height: 420, borderRadius: 210, top: -180, right: -160 },
  neumorphicHalo: { position: "absolute", width: 280, height: 280, borderRadius: 140, bottom: -170, right: -80, opacity: 0.14, shadowOpacity: 0.7, shadowRadius: 40, elevation: 8 },
  scanline: { position: "absolute", left: 0, right: 0, height: 2, top: "42%" },
  cyberHalo: { position: "absolute", width: 360, height: 360, borderRadius: 180, borderWidth: 1, top: -170, right: -150, opacity: 0.8 },
  sceneContent: { flex: 1 },
  ambientOrb: { position: "absolute", width: 300, height: 300, borderRadius: 150, top: -130, right: -120 },
  ambientOrbSmall: { position: "absolute", width: 210, height: 210, borderRadius: 105, bottom: 50, left: -120 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 26,
    elevation: 6,
  },
  cardCompact: { borderRadius: 18 },
  cardContent: { padding: 18 },
  button: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonIcon: { alignItems: "center", justifyContent: "center" },
  buttonLabel: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headingCopy: { flex: 1, gap: 4 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.4, textTransform: "uppercase" },
  headingTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  headingDetail: { fontSize: 13, lineHeight: 19 },
  statusPill: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
});
