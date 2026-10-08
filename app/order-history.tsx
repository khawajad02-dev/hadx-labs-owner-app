import { useCallback, useEffect, useState } from "react";
import { hadxAlert } from "@/components/HadxAlert";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { SensitiveValue } from "@/components/privacy-ui";
import { useColors } from "@/hooks/use-colors";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { apiGet, apiPut } from "@/lib/api-client";
import { filterDeliveredHistory, REOPENED_DELIVERY_STATUS } from "@/lib/order-actions";

type HistoryOrder = { id: string; orderReference: string; fullName: string; productTitle: string; productColor?: string | null; size?: string | null; quantity: number; orderStatus: string; createdAt: string; updatedAt: string };

function toneForStatus(status: string): "success" | "warning" | "danger" | "neutral" {
  const value = status.toUpperCase();
  if (value === "DELIVERED") return "success";
  if (value === "CANCELLED" || value === "EXPIRED") return "danger";
  return "neutral";
}

export default function OrderHistoryScreen() {
  const colors = useColors();
  const router = useRouter();
  const isRevealed = usePrivacyStore((state) => state.isRevealed);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/orders?status=HISTORY&pageSize=100");
      const data = Array.isArray(response.data) ? response.data : response.data?.items;
      setOrders(Array.isArray(data) ? filterDeliveredHistory(data) : []);
    } catch (requestError: any) {
      console.error("Order history error:", requestError);
      setError(requestError?.response?.data?.error || "Order history could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const returnToActive = async (order: HistoryOrder) => {
    try {
      await apiPut(`/orders/${order.id}`, { orderStatus: REOPENED_DELIVERY_STATUS });
      await loadHistory();
      hadxAlert("Order returned to Active", `${isRevealed ? order.orderReference : "The order"} is no longer marked delivered and is back in the active order queue.`);
    } catch (requestError: any) {
      hadxAlert("Could not return order", requestError?.response?.data?.error || "Please refresh order history and try again.");
    }
  };

  const confirmReturnToActive = (order: HistoryOrder) => {
    hadxAlert("Return order to Active?", `${isRevealed ? order.orderReference : "This order"} will be changed back to Confirmed and removed from delivered history.`, [
      { text: "Keep delivered", style: "cancel" },
      { text: "Return to Active", onPress: () => void returnToActive(order) },
    ]);
  };

  return <ScreenContainer containerClassName="flex-1" className="flex-1"><FlatList
    data={orders}
    keyExtractor={(item) => item.id}
    contentContainerStyle={styles.content}
    showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadHistory(); }} tintColor={colors.primary} colors={[colors.primary]} />}
    ListHeaderComponent={<View style={styles.header}><SectionHeading eyebrow="ARCHIVE / ORDER HISTORY" title="Delivered orders" detail="Past delivered orders retained for audit and records." /><LuxuryButton label="← Back to active orders" onPress={() => router.back()} variant="secondary" style={styles.backButton} />{error ? <LuxuryCard compact style={styles.errorCard}><Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text><LuxuryButton label="Retry" onPress={() => void loadHistory()} variant="ghost" /></LuxuryCard> : null}</View>}
    ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.muted, { color: colors.muted }]}>Loading order history…</Text></View> : <LuxuryCard accent style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No delivered orders yet.</Text><Text style={[styles.muted, { color: colors.muted }]}>Mark a confirmed order as delivered and it will appear here.</Text></LuxuryCard>}
    renderItem={({ item }) => <LuxuryCard compact style={styles.card}><View style={styles.row}><View style={styles.copy}><SensitiveValue revealed={isRevealed} style={[styles.reference, { color: colors.foreground }]}>{item.orderReference}</SensitiveValue><SensitiveValue revealed={isRevealed} style={[styles.name, { color: colors.muted }]}>{item.fullName}</SensitiveValue></View><StatusPill label={item.orderStatus} tone={toneForStatus(item.orderStatus)} /></View><View style={[styles.divider, { borderColor: `${colors.border}88` }]}><SensitiveValue revealed={isRevealed} style={[styles.product, { color: colors.foreground }]}>{item.productTitle} × {item.quantity}</SensitiveValue><SensitiveValue revealed={isRevealed} style={[styles.detail, { color: colors.muted }]}>{[item.productColor, item.size ? `Size ${item.size}` : null].filter(Boolean).join(" · ") || "Variant not recorded"}</SensitiveValue><Text style={[styles.date, { color: colors.muted }]}>Placed {new Date(item.createdAt).toLocaleDateString()} · Updated {new Date(item.updatedAt).toLocaleDateString()}</Text></View><LuxuryButton label="Return to active orders" onPress={() => confirmReturnToActive(item)} variant="secondary" />
    </LuxuryCard>}
  /></ScreenContainer>;
}

const styles = StyleSheet.create({ content: { padding: 20, paddingBottom: 120, gap: 12 }, header: { gap: 14, marginBottom: 4 }, backButton: { alignSelf: "flex-start" }, card: { gap: 12 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, copy: { flex: 1, gap: 4 }, reference: { fontSize: 16, fontWeight: "900" }, name: { fontSize: 12 }, divider: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 5 }, product: { fontSize: 13, fontWeight: "800" }, detail: { fontSize: 12 }, date: { fontSize: 11, marginTop: 4 }, empty: { alignItems: "center", paddingVertical: 36, gap: 10 }, emptyTitle: { fontSize: 17, fontWeight: "900" }, muted: { textAlign: "center", fontSize: 12, lineHeight: 18 }, errorCard: { borderWidth: 1, gap: 10 }, errorText: { fontSize: 13, fontWeight: "800" } });
