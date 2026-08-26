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
}) {
  const colors = useColors();
  const [value, setValue] = useState("");
  const isPattern = credentialKind === "pattern";

  useEffect(() => {
    if (!visible) setValue("");
  }, [visible]);

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

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              editable={!busy}
              keyboardType={isPattern ? "number-pad" : "default"}
              maxLength={isPattern ? 9 : 72}
              onChangeText={(next) => setValue(isPattern ? next.replace(/[^1-9]/g, "") : next)}
              onSubmitEditing={() => onSubmit(value)}
              placeholder={isPattern ? "Join 4–9 dots, e.g. 14789" : "Create your private app password"}
              placeholderTextColor={`${colors.muted}B3`}
              returnKeyType="done"
              secureTextEntry={!isPattern}
              value={value}
              style={[styles.credentialInput, { backgroundColor: `${colors.background}DD`, borderColor: colors.border, color: colors.foreground, letterSpacing: isPattern ? 4 : 0 }]}
            />

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
    if (!biometricEnabled) {
      setRevealError("");
      setRevealModal(true);
      return;
    }
    let active = true;
    setBusy(true);
    void revealWithBiometric().then((success) => {
      if (!active) return;
      if (!success) {
        setRevealError("Biometric check was cancelled. Use your saved app credential instead.");
        setRevealModal(true);
      }
      setBusy(false);
    });
    return () => {
      active = false;
    };
  }, [busy, clearRevealRequest, isInitializing, isLocked, biometricEnabled, revealRequested, revealWithBiometric]);

  const submitSetup = async (secret: string) => {
    const normalized = secret.trim();
    const valid = setupKind === "pattern" ? /^[1-9]{4,9}$/.test(normalized) && new Set(normalized).size >= 4 : normalized.length >= 8;
    if (!valid) {
      setSetupError(setupKind === "pattern" ? "Use at least 4 different pattern dots." : "Use at least 8 characters for your app password.");
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
        submitLabel="Save private lock"
        credentialKind={setupKind}
        allowKindChange
        onKindChange={(kind) => { setSetupKind(kind); setSetupError(""); }}
        onSubmit={(value) => void submitSetup(value)}
        busy={busy}
        error={setupError}
      />
      <CredentialModal
        visible={hasCredential && isLocked}
        title="Unlock Owner App"
        detail={`Use your saved ${credentialKind === "pattern" ? "pattern" : "password"}. Sensitive dashboard data stays hidden until you use the eye control.`}
        submitLabel="Unlock dashboard"
        credentialKind={credentialKind || "password"}
        onSubmit={(value) => void submitUnlock(value)}
        onBiometric={biometricUnlock}
        biometricEnabled={biometricEnabled}
        busy={busy}
        error={unlockError}
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
  error: { fontSize: 12, lineHeight: 18 },
  maskedValue: { minWidth: 56, minHeight: 20, overflow: "hidden", justifyContent: "center" },
  maskedText: { color: "#9B8A62", opacity: 0.7 },
  eyeButton: { position: "absolute", right: -5, top: -6, width: 30, height: 30, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center", zIndex: 5 },
  eyePressed: { transform: [{ scale: 0.94 }], opacity: 0.78 },
  eyeIcon: { fontSize: 19, fontWeight: "900" },
});
