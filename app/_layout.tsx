import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, type ErrorBoundaryProps, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { trpc, createTRPCClient } from "@/lib/trpc";
import { initHadxRuntime, subscribeSafeAreaInsets } from "@/lib/_core/hadx-runtime";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/lib/theme-provider";
import { OWNER_SESSION_KEY } from "@/constants/owner-api";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);
  const router = useRouter();

  useEffect(() => {
    initHadxRuntime();
  }, []);

  // Resolve secure storage, but never leave the native splash waiting forever.
  useEffect(() => {
    let active = true;
    const checkOwnerSession = async () => {
      try {
        const key = await Promise.race([
          SecureStore.getItemAsync(OWNER_SESSION_KEY),
          new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);
        if (!active) return;
        router.replace(key ? "/(tabs)" : "/security-vault");
      } catch (error) {
        console.error("Error checking owner session:", error);
        if (active) {
          router.replace("/security-vault");
        }
      } finally {
        if (active) {
          await SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    };
    checkOwnerSession();
    return () => {
      active = false;
    };
  }, [router]);

  const handleSafeAreaUpdate = useCallback((metrics: Metrics) => {
    setInsets(metrics.insets);
    setFrame(metrics.frame);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, [handleSafeAreaUpdate]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Stack initialRouteName="security-vault" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="oauth/callback" />
            <Stack.Screen name="security-vault" />
            <Stack.Screen name="add-product" options={{ presentation: "modal" }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );

  // Keep Expo Router mounted from the first render. A blank root view here can
  // hide navigation errors behind a black screen after the native splash ends.
  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#050505",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#D4AF37", fontSize: 28, fontWeight: "700", marginBottom: 12 }}>
        HADX LABS
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "600", marginBottom: 8 }}>
        App startup error
      </Text>
      <Text style={{ color: "#A3A3A3", fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
        {error?.message || "The app could not render the first screen."}
      </Text>
      <Pressable
        onPress={retry}
        style={{
          alignSelf: "flex-start",
          backgroundColor: "#D4AF37",
          borderRadius: 10,
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: "#050505", fontSize: 15, fontWeight: "700" }}>Try again</Text>
      </Pressable>
    </View>
  );
}
