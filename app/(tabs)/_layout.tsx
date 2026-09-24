import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PrivacyGate } from "@/components/privacy-ui";
import { FloatingTabBar } from "@ventur8/react-native-liquid-glass-tab-bar/index";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;
  return (
    <PrivacyGate>
      <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: tabBarHeight,
          paddingTop: 7,
          paddingBottom: bottomPadding,
          backgroundColor: "rgba(8, 7, 5, 0.9)",
          borderTopColor: `${colors.primary}70`,
          borderTopWidth: 1,
          elevation: 16,
          shadowColor: colors.primary,
          shadowOpacity: 0.2,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -8 },
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "800",
          letterSpacing: 0.3,
        },
        tabBarItemStyle: { paddingVertical: 1 },
      }}
      tabBar={(props) => <FloatingTabBar {...props} isDark activeColor={colors.primary} inactiveColor={colors.muted} blurIntensity={58} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <IconSymbol size={21} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarIcon: ({ color }) => <IconSymbol size={21} name="cube.box" color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: "Orders", tabBarIcon: ({ color }) => <IconSymbol size={21} name="list.bullet.rectangle" color={color} /> }} />
      <Tabs.Screen name="customers" options={{ title: "Clients", tabBarIcon: ({ color }) => <IconSymbol size={21} name="person.2" color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: "Insights", tabBarIcon: ({ color }) => <IconSymbol size={21} name="chart.bar" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={21} name="gear" color={color} /> }} />
      </Tabs>
    </PrivacyGate>
  );
}
