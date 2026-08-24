import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { OWNER_AUTH_BASE_URL, OWNER_SESSION_KEY } from "@/constants/owner-api";

type LoginStep = "email" | "code";

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export default function SecurityVaultScreen() {
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
      setError("Enter the email address used for the HADX LABS owner account.");
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

      if (!response.ok) {
        throw new Error(await readError(response, "Could not send a sign-in code."));
      }

      const body = await response.json();
      if (typeof body?.challenge !== "string" || !body.challenge) {
        throw new Error("The server did not return a valid sign-in challenge.");
      }

      setEmail(normalizedEmail);
      setChallenge(body.challenge);
      setCode("");
      setStep("code");
      setNotice("A six-digit code has been sent to your email. It expires in 10 minutes.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not reach the secure HADX owner login.",
      );
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

      if (!response.ok) {
        throw new Error(await readError(response, "That code is invalid or expired."));
      }

      const body = await response.json();
      if (typeof body?.app_session_id !== "string" || !body.app_session_id) {
        throw new Error("The server did not return a valid owner session.");
      }

      await SecureStore.setItemAsync(OWNER_SESSION_KEY, body.app_session_id);
      router.replace("/(tabs)");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Could not verify the owner sign-in code.",
      );
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
    <ScreenContainer containerClassName="bg-black" className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <View style={{ gap: 28 }}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <Text style={{ color: "#D4AF37", fontSize: 38, fontWeight: "800" }}>HADX</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 28, fontWeight: "800", textAlign: "center" }}>
                Owner Dashboard
              </Text>
              <Text style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 22, textAlign: "center" }}>
                Sign in securely with a one-time code. No Master Key is required.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "rgba(26, 26, 26, 0.9)",
                borderColor: "#D4AF37",
                borderRadius: 20,
                borderWidth: 1,
                padding: 24,
                gap: 18,
              }}
            >
              {step === "email" ? (
                <>
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: "#D4AF37", fontSize: 14, fontWeight: "700" }}>
                      Owner email
                    </Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                      keyboardType="email-address"
                      onChangeText={(value) => {
                        setEmail(value);
                        setError("");
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor="#666666"
                      style={{
                        backgroundColor: "#050505",
                        borderColor: "#6B5A20",
                        borderRadius: 10,
                        borderWidth: 1,
                        color: "#FFFFFF",
                        fontSize: 16,
                        paddingHorizontal: 14,
                        paddingVertical: 13,
                      }}
                      value={email}
                    />
                  </View>
                  <TouchableOpacity
                    disabled={loading}
                    onPress={requestCode}
                    style={{
                      alignItems: "center",
                      backgroundColor: loading ? "#6B6B6B" : "#D4AF37",
                      borderRadius: 10,
                      paddingVertical: 14,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#050505" />
                    ) : (
                      <Text style={{ color: "#050505", fontSize: 16, fontWeight: "800" }}>
                        Send sign-in code
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: "#D4AF37", fontSize: 14, fontWeight: "700" }}>
                      Six-digit code
                    </Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 19 }}>
                      Check {email} and enter the latest code.
                    </Text>
                    <TextInput
                      autoCapitalize="none"
                      editable={!loading}
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(value) => {
                        setCode(value.replace(/\D/g, ""));
                        setError("");
                      }}
                      placeholder="000000"
                      placeholderTextColor="#666666"
                      style={{
                        backgroundColor: "#050505",
                        borderColor: "#6B5A20",
                        borderRadius: 10,
                        borderWidth: 1,
                        color: "#FFFFFF",
                        fontSize: 24,
                        fontWeight: "700",
                        letterSpacing: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        textAlign: "center",
                      }}
                      value={code}
                    />
                  </View>
                  <TouchableOpacity
                    disabled={loading}
                    onPress={verifyCode}
                    style={{
                      alignItems: "center",
                      backgroundColor: loading ? "#6B6B6B" : "#D4AF37",
                      borderRadius: 10,
                      paddingVertical: 14,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#050505" />
                    ) : (
                      <Text style={{ color: "#050505", fontSize: 16, fontWeight: "800" }}>
                        Open owner dashboard
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity disabled={loading} onPress={resetToEmail}>
                    <Text style={{ color: "#D4AF37", fontSize: 14, textAlign: "center" }}>
                      Use a different email
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {notice ? <Text style={{ color: "#86EFAC", fontSize: 13, lineHeight: 19 }}>{notice}</Text> : null}
              {error ? <Text style={{ color: "#FCA5A5", fontSize: 13, lineHeight: 19 }}>{error}</Text> : null}
            </View>

            <Text style={{ color: "#6B7280", fontSize: 12, lineHeight: 18, textAlign: "center" }}>
              The app stores only the server-issued session token in Android SecureStore. The server admin secret never enters the app.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
