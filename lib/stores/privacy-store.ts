import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

const APP_CREDENTIAL_KEY = "hadx_owner_app_credential_v2";
const LEGACY_APP_CREDENTIAL_KEY = "hadx_owner_app_credential_v1";
const BIOMETRIC_OPT_IN_KEY = "hadx_owner_biometric_enabled_v1";

export type CredentialKind = "password" | "pattern";

type StoredCredential = {
  kind: CredentialKind;
  salt: string;
  digest: string;
};

interface PrivacyState {
  isLocked: boolean;
  isRevealed: boolean;
  hasCredential: boolean;
  credentialKind: CredentialKind | null;
  biometricEnabled: boolean;
  isInitializing: boolean;
  revealRequested: boolean;

  initialize: () => Promise<void>;
  setCredential: (secret: string, kind: CredentialKind) => Promise<void>;
  unlockWithCredential: (secret: string) => Promise<boolean>;
  authenticateBiometric: (promptMessage: string) => Promise<boolean>;
  unlockWithBiometric: () => Promise<boolean>;
  revealWithCredential: (secret: string) => Promise<boolean>;
  revealWithBiometric: () => Promise<boolean>;
  requestReveal: () => void;
  clearRevealRequest: () => void;
  hideSensitive: () => void;
  lock: () => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  resetPrivacy: () => Promise<void>;
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function digest(secret: string, kind: CredentialKind, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `HADX_OWNER_APP_V1|${kind}|${salt}|${secret}`,
  );
}

async function readStoredCredential(): Promise<StoredCredential | null> {
  const raw = await readValue(APP_CREDENTIAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCredential>;
    if ((parsed.kind !== "password" && parsed.kind !== "pattern") || !parsed.salt || !parsed.digest) return null;
    return { kind: parsed.kind, salt: parsed.salt, digest: parsed.digest };
  } catch {
    return null;
  }
}

export async function getBiometricAvailability(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  isLocked: true,
  isRevealed: false,
  hasCredential: false,
  credentialKind: null,
  biometricEnabled: false,
  isInitializing: true,
  revealRequested: false,

  initialize: async () => {
    try {
      const withTimeout = <T,>(promise: Promise<T>, fallback: T) => Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), 1800)),
      ]);
      const [credential, biometric] = await Promise.all([
        withTimeout(readStoredCredential(), null),
        withTimeout(readValue(BIOMETRIC_OPT_IN_KEY), null),
      ]);
      set({
        hasCredential: !!credential,
        credentialKind: credential?.kind ?? null,
        biometricEnabled: biometric === "true",
        isLocked: true,
        // Never persist sensitive details as visible across an app restart.
        isRevealed: false,
        isInitializing: false,
      });
    } catch (error) {
      console.error("[Privacy] Initialization failed:", error);
      set({ isInitializing: false, isLocked: true, isRevealed: false });
    }
  },

  setCredential: async (secret, kind) => {
    const normalized = secret.trim();
    if (!normalized) throw new Error("A password or pattern is required.");
    const salt = Crypto.randomUUID();
    const stored: StoredCredential = { kind, salt, digest: await digest(normalized, kind, salt) };
    await writeValue(APP_CREDENTIAL_KEY, JSON.stringify(stored));
    const biometricAvailable = await getBiometricAvailability();
    if (biometricAvailable) await writeValue(BIOMETRIC_OPT_IN_KEY, "true");
    set({ hasCredential: true, credentialKind: kind, biometricEnabled: biometricAvailable, isLocked: false, isRevealed: false });
  },

  unlockWithCredential: async (secret) => {
    const stored = await readStoredCredential();
    if (!stored) return false;
    const input = secret.trim();
    if (!input) return false;
    const inputDigest = await digest(input, stored.kind, stored.salt);
    const valid = inputDigest === stored.digest;
    if (valid) set({ isLocked: false, isRevealed: false });
    return valid;
  },

  authenticateBiometric: async (promptMessage) => {
    if (Platform.OS === "web") return false;
    try {
      const available = await getBiometricAvailability();
      if (!available) return false;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use app credential",
        disableDeviceFallback: true,
        cancelLabel: "Cancel",
      });
      return result.success;
    } catch (error) {
      console.error("[Privacy] Biometric prompt failed:", error);
      return false;
    }
  },

  unlockWithBiometric: async () => {
    if (!get().biometricEnabled) return false;
    const success = await get().authenticateBiometric("Unlock HADX Owner App");
    if (success) set({ isLocked: false, isRevealed: false });
    return success;
  },

  revealWithCredential: async (secret) => {
    if (get().isLocked) return false;
    const valid = await get().unlockWithCredential(secret);
    if (valid) set({ isLocked: false, isRevealed: true });
    return valid;
  },

  revealWithBiometric: async () => {
    if (get().isLocked || !get().biometricEnabled) return false;
    const success = await get().authenticateBiometric("Reveal sensitive HADX data");
    if (success) set({ isRevealed: true });
    return success;
  },

  requestReveal: () => set({ revealRequested: true }),
  clearRevealRequest: () => set({ revealRequested: false }),
  hideSensitive: () => set({ isRevealed: false }),
  lock: () => set({ isLocked: true, isRevealed: false, revealRequested: false }),

  setBiometricEnabled: async (enabled) => {
    if (enabled && !(await getBiometricAvailability())) {
      throw new Error("Fingerprint or face authentication is not enrolled on this device.");
    }
    await writeValue(BIOMETRIC_OPT_IN_KEY, String(enabled));
    set({ biometricEnabled: enabled });
  },

  resetPrivacy: async () => {
    await Promise.all([deleteValue(APP_CREDENTIAL_KEY), deleteValue(LEGACY_APP_CREDENTIAL_KEY), deleteValue(BIOMETRIC_OPT_IN_KEY)]);
    set({ hasCredential: false, credentialKind: null, isLocked: true, isRevealed: false, biometricEnabled: false, revealRequested: false });
  },
}));
