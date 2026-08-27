import { useEffect, useState, type ReactNode } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { CyberOrb, LuxuryButton, LuxuryCard } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import {
  usePrivacyStore,
  type CredentialKind,
} from "@/lib/stores/privacy-store";

const PATTERN_DOTS = [
  { x: 28, y: 28 }, { x: 88, y: 28 }, { x: 148, y: 28 },
  { x: 28, y: 88 }, { x: 88, y: 88 }, { x: 148, y: 88 },
  { x: 28, y: 148 }, { x: 88, y: 148 }, { x: 148, y: 148 },
] as const;

function PatternPad({
  disabled,
  onChange,
  resetKey,
}: {
  disabled: boolean;
  onChange: (pattern: string) => void;
  resetKey: string;
}) {
  const [path, setPath] = useState<number[]>([]);

  useEffect(() => {
    setPath([]);
  }, [resetKey]);

  const dotAt = (x: number, y: number) => {
    const index = PATTERN_DOTS.findIndex((dot) => Math.hypot(dot.x - x, dot.y - y) <= 22);
    return index >= 0 ? index : null;
  };

  const addDot = (x: number, y: number) => {
    if (disabled) return;
    const index = dotAt(x, y);
    if (index === null) return;
    setPath((current) => {
      if (current.includes(index)) return current;
      const next = [...current, index];
      onChange(next.join(""));
      return next;
    });
  };

  return (
    <View
      accessibilityLabel="Draw your HADX app unlock pattern on the nine dots"
      accessibilityRole="adjustable"
      onStartShouldSetResponder={() => !disabled}
      onResponderGrant={(event) => addDot(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      onResponderMove={(event) => addDot(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      style={[styles.patternPad, disabled && styles.patternDisabled]}
    >
      {path.slice(1).map((dotIndex, segmentIndex) => {
        const from = PATTERN_DOTS[path[segmentIndex]];
        const to = PATTERN_DOTS[dotIndex];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        const angle = `${Math.atan2(dy, dx) * (180 / Math.PI)}deg`;
        return <View key={`${path[segmentIndex]}-${dotIndex}`} style={[styles.patternLine, { left: from.x, top: from.y - 2, width: length, transform: [{ rotate: angle }] }]} />;
      })}
      {PATTERN_DOTS.map((dot, index) => (
        <View key={index} style={[styles.patternDot, { left: dot.x - 13, top: dot.y - 13 }, path.includes(index) && styles.patternDotActive]} />
      ))}
    </View>
  );
}

function CredentialModal({
  visible,
  title,
  detail,
  submitLabel,
  credentialKind,
  allowKindChange,
  onKindChange,
  onSubmit,
  onBiometric,
  biometricEnabled,
  busy,
  error,
  onClose,
  resetKey,
}: {
  visible: boolean;
  title: string;
  detail: string;
  submitLabel: string;
  credentialKind: CredentialKind;
  allowKindChange?: boolean;
  onKindChange?: (kind: CredentialKind) => void;
  onSubmit: (value: string) => void;
  onBiometric?: () => void;
  biometricEnabled?: boolean;
  busy?: boolean;
  error: string;
  onClose?: () => void;
  resetKey: string;
}) {
  const colors = useColors();
  const [value, setValue] = useState("");
  const isPattern = credentialKind === "pattern";

  useEffect(() => {
    setValue("");
  }, [visible, resetKey]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalKeyboard}>
          <LuxuryCard accent style={styles.modalCard}>
            <View style={styles.modalOrb}><CyberOrb size={76} /></View>
            <Text style={[styles.modalEyebrow, { color: colors.primary }]}>HADX / PRIVACY CORE</Text>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.modalDetail, { color: colors.muted }]}>{detail}</Text>

            {allowKindChange ? (
              <View style={styles.kindRow}>
                {(["pattern", "password"] as CredentialKind[]).map((kind) => (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityState={{ selected: credentialKind === kind }}
                    onPress={() => onKindChange?.(kind)}
                    style={[styles.kindButton, { borderColor: credentialKind === kind ? colors.primary : colors.border, backgroundColor: credentialKind === kind ? `${colors.primary}22` : "transparent" }]}
                  >
                    <Text style={[styles.kindText, { color: credentialKind === kind ? colors.primary : colors.muted }]}>{kind === "pattern" ? "Pattern" : "Password"}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {isPattern ? (
              <>
                <PatternPad disabled={Boolean(busy)} resetKey={resetKey} onChange={setValue} />
                <Text style={[styles.patternHint, { color: colors.muted }]}>{value ? `${value.length} dot${value.length === 1 ? "" : "s"} connected. Press the button below.` : "Draw any pattern across the dots, then press the button below."}</Text>
              </>
            ) : (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                editable={!busy}
                keyboardType="default"
                maxLength={72}
                onChangeText={setValue}
                onSubmitEditing={() => onSubmit(value)}
                placeholder="Create your private app password"
                placeholderTextColor={`${colors.muted}B3`}
                returnKeyType="done"
                secureTextEntry
                value={value}
                style={[styles.credentialInput, { backgroundColor: `${colors.background}DD`, borderColor: colors.border, color: colors.foreground }]}
              />
            )}

            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
            {onBiometric && biometricEnabled ? <LuxuryButton label="Use fingerprint / face" onPress={onBiometric} loading={busy} variant="secondary" /> : null}
            <LuxuryButton label={submitLabel} onPress={() => onSubmit(value)} loading={busy} variant="primary" />
            {onClose ? <LuxuryButton label="Not now" onPress={onClose} disabled={busy} variant="ghost" /> : null}
          </LuxuryCard>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function PrivacyGate({ children }: { children: ReactNode }) {
  const {
    isLocked,
    isRevealed,
    hasCredential,
    credentialKind,
    biometricEnabled,
    appLockEnabled,
    isInitializing,
    revealRequested,
    initialize,
    setCredential,
    unlockWithCredential,
    unlockWithBiometric,
    revealWithCredential,
    revealWithBiometric,
    clearRevealRequest,
  } = usePrivacyStore();
  const [setupKind, setSetupKind] = useState<CredentialKind>("pattern");
  const [setupError, setSetupError] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [revealError, setRevealError] = useState("");
  const [revealModal, setRevealModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [setupPattern, setSetupPattern] = useState<string | null>(null);
  const [patternSetupStep, setPatternSetupStep] = useState<"draw" | "confirm">("draw");
  const [patternResetKey, setPatternResetKey] = useState("pattern-0");

  useEffect(() => {
    void initialize();
    const safetyTimer = setTimeout(() => {
      if (usePrivacyStore.getState().isInitializing) {
        usePrivacyStore.setState({ isInitializing: false, isLocked: true, isRevealed: false });
      }
    }, 2200);
    return () => clearTimeout(safetyTimer);
  }, [initialize]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        usePrivacyStore.getState().hideSensitive();
        usePrivacyStore.getState().lock();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!revealRequested || isLocked || isInitializing || busy) return;
    clearRevealRequest();
    setRevealError("");
    if (!biometricEnabled) {
      setRevealModal(true);
      return;
    }
    setBusy(true);
    void (async () => {
      const success = await revealWithBiometric();
      if (!success) {
        setRevealError("Biometric check was cancelled. Use your saved app credential instead.");
        setRevealModal(true);
      }
      setBusy(false);
    })();
  }, [busy, clearRevealRequest, isInitializing, isLocked, biometricEnabled, revealRequested, revealWithBiometric]);

  const submitSetup = async (secret: string) => {
    const normalized = secret.trim();
    const valid = setupKind === "pattern" ? /^[0-8]{1,9}$/.test(normalized) && new Set(normalized).size === normalized.length : normalized.length >= 8;
    if (!valid) {
      setSetupError(setupKind === "pattern" ? "Draw a pattern, release your finger, then press OK." : "Use at least 8 characters for your app password.");
      return;
    }
    if (setupKind === "pattern" && !setupPattern) {
      setSetupPattern(normalized);
      setPatternSetupStep("confirm");
      setPatternResetKey(`pattern-${Date.now()}`);
      setSetupError("Pattern captured. Draw the exact same pattern again, then press Done.");
      return;
    }
    if (setupKind === "pattern" && setupPattern !== normalized) {
      setSetupPattern(null);
      setPatternSetupStep("draw");
      setPatternResetKey(`pattern-${Date.now()}`);
      setSetupError("Patterns do not match. Draw the same pattern you used first, then press OK.");
      return;
    }
    setBusy(true);
    setSetupError("");
    try {
      await setCredential(normalized, setupKind);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Could not save your app credential.");
    } finally {
      setBusy(false);
    }
  };

  const submitUnlock = async (secret: string) => {
    if (!secret.trim()) {
      setUnlockError("Enter your saved app credential.");
      return;
    }
    setBusy(true);
    setUnlockError("");
    const success = await unlockWithCredential(secret);
    setBusy(false);
    if (!success) setUnlockError("That credential does not match this Owner App.");
  };

  const submitReveal = async (secret: string) => {
    if (!secret.trim()) {
      setRevealError("Enter your saved app credential to reveal private data.");
      return;
    }
    setBusy(true);
    setRevealError("");
    const success = await revealWithCredential(secret);
    setBusy(false);
    if (success) setRevealModal(false);
    else setRevealError("That credential does not match this Owner App.");
  };

  const biometricUnlock = async () => {
    setBusy(true);
    setUnlockError("");
    const success = await unlockWithBiometric();
    setBusy(false);
    if (!success) setUnlockError("Biometric unlock was not completed. Use your saved app credential.");
  };

  const biometricReveal = async () => {
    setBusy(true);
    setRevealError("");
    const success = await revealWithBiometric();
    setBusy(false);
    if (success) setRevealModal(false);
    else setRevealError("Biometric check was not completed. Use your saved app credential.");
  };

  if (isInitializing) {
    return <View style={styles.loadingGate}><Text style={styles.loadingText}>Securing HADX control room…</Text></View>;
  }

  return (
    <View style={styles.gateRoot}>
      {children}
      <CredentialModal
        visible={!hasCredential}
        title="Set your app lock"
        detail="Choose a saved HADX pattern or password. This is separate from your phone lock and is stored only on this device."
        submitLabel={setupKind === "pattern" ? (patternSetupStep === "draw" ? "OK — save pattern" : "Done — open app") : "Save private lock"}
        credentialKind={setupKind}
        allowKindChange
        onKindChange={(kind) => { setSetupKind(kind); setSetupPattern(null); setPatternSetupStep("draw"); setPatternResetKey(`pattern-${Date.now()}`); setSetupError(""); }}
        onSubmit={(value) => void submitSetup(value)}
        busy={busy}
        error={setupError}
        resetKey={patternResetKey}
      />
      <CredentialModal
        visible={hasCredential && appLockEnabled && isLocked}
        title="Unlock Owner App"
        detail={`Use your saved ${credentialKind === "pattern" ? "pattern" : "password"}. Sensitive dashboard data stays hidden until you use the eye control.`}
        submitLabel="Unlock dashboard"
        credentialKind={credentialKind || "password"}
        onSubmit={(value) => void submitUnlock(value)}
        onBiometric={biometricUnlock}
        biometricEnabled={biometricEnabled}
        busy={busy}
        error={unlockError}
        resetKey={`unlock-${credentialKind || "password"}-${unlockError}`}
      />
      <CredentialModal
        visible={revealModal && !isRevealed}
        title="Reveal private data"
        detail="Confirm with your saved app credential. Your revenue, orders, products, clients, and delivery details will become visible until you hide them again."
        submitLabel="Reveal sensitive data"
        credentialKind={credentialKind || "password"}
        onSubmit={(value) => void submitReveal(value)}
        onBiometric={biometricReveal}
        biometricEnabled={biometricEnabled}
        busy={busy}
        error={revealError}
        onClose={() => setRevealModal(false)}
        resetKey={`reveal-${credentialKind || "password"}-${revealError}`}
      />
    </View>
  );
}

export function SensitiveValue({ children, revealed, style }: { children: ReactNode; revealed: boolean; style?: any }) {
  if (revealed) return <Text style={style}>{children}</Text>;
  return (
    <View style={styles.maskedValue} accessible accessibilityLabel="Sensitive value hidden">
      <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFillObject} />
      <Text style={[style, styles.maskedText]}>••••••</Text>
    </View>
  );
}

export function PrivacyEyeButton() {
  const colors = useColors();
  const { isRevealed, requestReveal, hideSensitive } = usePrivacyStore();
  return (
    <Pressable
      accessibilityLabel={isRevealed ? "Hide sensitive Owner App data" : "Reveal sensitive Owner App data"}
      accessibilityRole="button"
      onPress={() => {
        if (isRevealed) hideSensitive();
        else requestReveal();
      }}
      style={({ pressed }) => [styles.eyeButton, { borderColor: `${colors.primary}AA`, backgroundColor: `${colors.background}CC` }, pressed && styles.eyePressed]}
    >
      <MaterialIcons name={isRevealed ? "visibility-off" : "visibility"} size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gateRoot: { flex: 1 },
  loadingGate: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050505" },
  loadingText: { color: "#D4AF37", fontSize: 13, letterSpacing: 1.2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalKeyboard: { width: "100%", maxWidth: 440 },
  modalCard: { gap: 13, padding: 22 },
  modalOrb: { alignSelf: "center", width: 82, height: 82, alignItems: "center", justifyContent: "center" },
  modalEyebrow: { textAlign: "center", fontSize: 10, fontWeight: "900", letterSpacing: 2.2 },
  modalTitle: { textAlign: "center", fontSize: 26, fontWeight: "900" },
  modalDetail: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  kindRow: { flexDirection: "row", gap: 8 },
  kindButton: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  kindText: { fontSize: 13, fontWeight: "800" },
  credentialInput: { minHeight: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 15, fontSize: 15 },
  patternPad: { width: 204, height: 204, alignSelf: "center", borderRadius: 28, borderWidth: 1, borderColor: "rgba(212,175,55,0.34)", backgroundColor: "rgba(0,0,0,0.28)" },
  patternDisabled: { opacity: 0.55 },
  patternLine: { position: "absolute", height: 4, borderRadius: 2, backgroundColor: "#D4AF37", transformOrigin: "left center" },
  patternDot: { position: "absolute", width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "rgba(212,175,55,0.72)", backgroundColor: "rgba(10,10,10,0.86)" },
  patternDotActive: { backgroundColor: "#D4AF37", borderColor: "#FFF3B0", shadowColor: "#D4AF37", shadowOpacity: 0.85, shadowRadius: 8, elevation: 5 },
  patternHint: { textAlign: "center", fontSize: 12, lineHeight: 17 },
  error: { fontSize: 12, lineHeight: 18 },
  maskedValue: { minWidth: 56, minHeight: 20, overflow: "hidden", justifyContent: "center" },
  maskedText: { color: "#9B8A62", opacity: 0.7 },
  eyeButton: { position: "absolute", right: -5, top: -6, width: 30, height: 30, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", zIndex: 5 },
  eyePressed: { transform: [{ scale: 0.94 }], opacity: 0.78 },
  eyeIcon: { fontSize: 19, fontWeight: "900" },
});
