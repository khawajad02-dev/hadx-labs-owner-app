import * as Device from "expo-device";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { apiDelete, apiPost } from "@/lib/api-client";

const OWNER_PUSH_TOKEN_KEY = "hadx_owner_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerOwnerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn("Owner push registration skipped: Expo project ID is not configured.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "New orders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== "granted") permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await apiPost("/devices", { token });
  await SecureStore.setItemAsync(OWNER_PUSH_TOKEN_KEY, token);
  return token;
}

export async function unregisterOwnerPushToken(): Promise<void> {
  const token = await SecureStore.getItemAsync(OWNER_PUSH_TOKEN_KEY);
  if (!token) return;
  try {
    await apiDelete("/devices", { data: { token }, timeout: 4000 });
  } finally {
    await SecureStore.deleteItemAsync(OWNER_PUSH_TOKEN_KEY);
  }
}

export function addOwnerNotificationResponseListener(onOpenOrders: () => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { orderNumber?: unknown };
    if (typeof data?.orderNumber === "string" && data.orderNumber) onOpenOrders();
  });
}
