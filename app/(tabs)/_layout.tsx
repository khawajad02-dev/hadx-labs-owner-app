import { Tabs } from "expo-router";
import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useNavigationState } from "@react-navigation/native";
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useEffect, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { PrivacyGate } from "@/components/privacy-ui";

function LiquidTabBarBackground() {
  const colors = useColors();
  const activeIndex = useNavigationState((state) => state.index);
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(activeIndex)).current;
  const itemWidth = width / 6;

  useEffect(() => {
    Animated.timing(progress, { toValue: activeIndex, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [activeIndex, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Animated.View
        style={[
          styles.liquidTabBlob,
          {
            width: itemWidth * 0.72,
            left: itemWidth * 0.14,
            backgroundColor: "rgba(244, 201, 107, 0.22)",
            borderColor: colors.accent,
            shadowColor: colors.primary,
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 5], outputRange: [0, itemWidth * 5] }) }, { scaleX: progress.interpolate({ inputRange: [0, 0.5, 1, 2, 3, 4, 5], outputRange: [1, 1.08, 1, 1, 1, 1, 1] }) }],
          },
        ]}
      />
    </View>
  );
}

function LiquidTabBar(props: BottomTabBarProps) {
  return <BottomTabBar {...props} />;
}

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
        tabBarBackground: () => <LiquidTabBarBackground />,
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
      tabBar={(props) => <LiquidTabBar {...props} />}
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

const styles = StyleSheet.create({
  liquidTabBlob: {
    position: "absolute",
    bottom: 7,
    height: 45,
    borderRadius: 24,
    borderWidth: 1,
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 8,
  },
});
