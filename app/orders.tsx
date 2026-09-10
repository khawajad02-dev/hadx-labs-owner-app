import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const ADMIN_SECRET = process.env.EXPO_PUBLIC_ADMIN_SECRET ?? "";

type Order = {
  id: string;
  orderReference: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  productTitle: string;
  productColor?: string | null;
  quantity: number;
  totalAmountInCents: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
};

export default function OrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/orders`, {
        headers: { "x-admin-secret": ADMIN_SECRET },
      });
      const data = await response.json();
      if (response.ok) setOrders(data.orders ?? []);
    } finally {
      refresh ? setRefreshing(false) : setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadOrders(); }, [loadOrders]));

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders(true)} />}
        data={orders}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text className="text-2xl font-bold mb-4" style={{ color: colors.foreground }}>Orders</Text>}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.muted }}>No orders yet.</Text>}
        renderItem={({ item }) => (
          <View className="rounded-xl p-4" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <Text className="font-bold" style={{ color: colors.foreground }}>{item.orderReference}</Text>
            <Text style={{ color: colors.foreground }}>{item.productTitle} × {item.quantity}</Text>
            <Text style={{ color: colors.muted }}>Color: {item.productColor || "Not recorded"}</Text>
            <Text style={{ color: colors.muted }}>{item.fullName} · {item.phone}</Text>
            <Text style={{ color: colors.muted }}>{item.address}</Text>
            <Text style={{ color: colors.primary }}>PKR {(item.totalAmountInCents / 100).toLocaleString()} · COD · {item.orderStatus}</Text>
          </View>
        )}
      />
    </ScreenContainer>
  );
}
