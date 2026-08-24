import { useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { CyberOrb, LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { ScreenContainer } from "@/components/screen-container";
import { OWNER_AUTH_BASE_URL, OWNER_SESSION_KEY } from "@/constants/owner-api";
import { useColors } from "@/hooks/use-colors";

type LoginStep = "email" | "code";

async function readError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function SecurityVaultScreen() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const requestCode = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Enter the HADX LABS owner email address.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${OWNER_AUTH_BASE_URL}/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!response.ok) throw new Error(await readError(response, "Could not send a sign-in code."));
      const body = await response.json();
      if (typeof body?.challenge !== "string" || !body.challenge) throw new Error("The server did not return a valid sign-in challenge.");
      setEmail(normalizedEmail);
      setChallenge(body.challenge);
      setCode("");
      setStep("code");
      setNotice("A six-digit code is on its way. It expires in 10 minutes.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reach secure owner login.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${OWNER_AUTH_BASE_URL}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code: code.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response, "That code is invalid or expired."));
      const body = await response.json();
      if (typeof body?.app_session_id !== "string" || !body.app_session_id) throw new Error("The server did not return a valid owner session.");
      await SecureStore.setItemAsync(OWNER_SESSION_KEY, body.app_session_id);
      router.replace("/(tabs)");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not verify the owner sign-in code.");
    } finally {
      setLoading(false);
    }
  };

  const resetToEmail = () => {
    setStep("email");
    setChallenge("");
    setCode("");
    setError("");
    setNotice("");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}><CyberOrb size={112} /><Text style={[styles.brandEyebrow, { color: colors.primary }]}>HADX LABS / PRIVATE ACCESS</Text><Text style={[styles.title, { color: colors.foreground }]}>Owner control room</Text><Text style={[styles.subtitle, { color: colors.muted }]}>A secure, quiet place to run the atelier.</Text></View>
          <LuxuryCard accent style={styles.authCard}>
            <View style={styles.authHeader}><SectionHeading eyebrow={step === "email" ? "SIGN IN" : "VERIFY ACCESS"} title={step === "email" ? "Welcome back" : "Check your inbox"} detail={step === "email" ? "Use your owner email. No Master Key is required." : `Enter the latest code sent to ${email}.`} /><StatusPill label={step === "email" ? "Secure" : "Code sent"} tone={step === "email" ? "success" : "warning"} /></View>
            {step === "email" ? <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.muted }]}>OWNER EMAIL</Text><TextInput autoCapitalize="none" autoCorrect={false} editable={!loading} keyboardType="email-address" value={email} onChangeText={(value) => { setEmail(value); setError(""); }} placeholder="owner@hadxlabs.com" placeholderTextColor={`${colors.muted}B3`} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><LuxuryButton label="Send sign-in code" onPress={() => void requestCode()} loading={loading} variant="primary" /></View> : <View style={styles.fieldGroup}><Text style={[styles.fieldLabel, { color: colors.muted }]}>SIX-DIGIT CODE</Text><TextInput autoCapitalize="none" editable={!loading} keyboardType="number-pad" maxLength={6} value={code} onChangeText={(value) => { setCode(value.replace(/\D/g, "")); setError(""); }} placeholder="000000" placeholderTextColor={`${colors.muted}B3`} style={[styles.codeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} /><LuxuryButton label="Open owner dashboard" onPress={() => void verifyCode()} loading={loading} variant="primary" /><LuxuryButton label="Use a different email" onPress={resetToEmail} variant="ghost" disabled={loading} /></View>}
            {notice ? <Text style={[styles.notice, { color: colors.success }]}>{notice}</Text> : null}
            {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          </LuxuryCard>
          <Text style={[styles.footnote, { color: colors.muted }]}>Only a short-lived server session is stored on this device. The admin secret never enters the APK.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 24 },
  brand: { alignItems: "center", gap: 8 },
  brandEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.2, marginTop: 4 },
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  authCard: { gap: 18 },
  authHeader: { gap: 10 },
  fieldGroup: { gap: 11 },
  fieldLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 1.8 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 15 },
  codeInput: { minHeight: 66, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontSize: 26, fontWeight: "900", letterSpacing: 8, textAlign: "center" },
  notice: { fontSize: 12, lineHeight: 18 },
  error: { fontSize: 12, lineHeight: 18 },
  footnote: { fontSize: 11, lineHeight: 18, textAlign: "center" },
});
