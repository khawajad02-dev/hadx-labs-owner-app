import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet, apiPut } from "@/lib/api-client";

interface Order {
  id: string;
  orderReference: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  productTitle: string;
  quantity: number;
  totalAmountInCents: number;
  currency?: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  product?: { id: string; title: string; imageUrl?: string | null; sku?: string } | null;
}

interface OrderResponse {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

const PAGE_SIZE = 25;
const FILTERS = ["ALL", "RESERVED", "CONFIRMED", "CANCELLED"] as const;
type OrderFilter = (typeof FILTERS)[number];

function normalizeResponse(data: OrderResponse | Order[]): OrderResponse {
  if (Array.isArray(data)) return { items: data, total: data.length, page: 1, pageSize: data.length || PAGE_SIZE, hasMore: false };
  return data;
}

function formatAmount(order: Order) {
  const value = order.totalAmountInCents / 100;
  return `${order.currency === "PKR" ? "PKR " : order.currency === "EUR" ? "€" : "$"}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toneForStatus(status: string): "success" | "warning" | "danger" | "neutral" {
  const normalized = status.toUpperCase();
  if (normalized === "CONFIRMED" || normalized === "DELIVERED") return "success";
  if (normalized === "RESERVED" || normalized === "PENDING_PAYMENT") return "warning";
  if (normalized === "CANCELLED" || normalized === "EXPIRED" || normalized === "FAILED") return "danger";
  return "neutral";
}

export default function OrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<OrderFilter>("ALL");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async (append: boolean, cursor?: string | null) => {
    if (append) setLoadingMore(true);
    else if (!refreshing) setLoading(true);

    try {
      setError("");
      const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
      if (query.trim()) params.set("q", query.trim());
      if (filter !== "ALL") params.set("status", filter);
      if (cursor) params.set("cursor", cursor);
      const response = await apiGet(`/orders?${params.toString()}`);
      const parsed = normalizeResponse(response.data);
      setOrders((previous) => (append ? [...previous, ...parsed.items] : parsed.items));
      setTotal(parsed.total);
      setNextCursor(parsed.nextCursor || null);
      setHasMore(parsed.hasMore);
    } catch (requestError: any) {
      console.error("Error fetching orders:", requestError);
      setError(requestError?.response?.data?.error || "The order queue could not be loaded.");
      if (!append) setOrders([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [filter, query, refreshing]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchOrders(false), 220);
    return () => clearTimeout(timer);
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchOrders(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const previous = orders;
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, orderStatus: newStatus } : order)));
    try {
      await apiPut(`/orders/${orderId}`, { orderStatus: newStatus });
    } catch (requestError: any) {
      setOrders(previous);
      Alert.alert("Could not update order", requestError?.response?.data?.error || "Try again when the connection is restored.");
    }
  };

  const contactWhatsApp = (order: Order) => {
    if (!order.phone) {
      Alert.alert("No phone number", "This order has no customer phone number.");
      return;
    }
    const message = `Hi ${order.fullName}, this is an update about your HADX LABS order ${order.orderReference}.`;
    const url = `https://wa.me/${order.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert("Could not open WhatsApp", "Please check that WhatsApp is installed."));
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <LuxuryCard compact style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderCopy}>
          <Text style={[styles.orderReference, { color: colors.foreground }]}>{item.orderReference}</Text>
          <Text style={[styles.customerName, { color: colors.muted }]}>{item.fullName}</Text>
        </View>
        <StatusPill label={item.orderStatus} tone={toneForStatus(item.orderStatus)} />
      </View>
      <View style={styles.orderBody}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.muted }]}>Piece</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]} numberOfLines={1}>{item.productTitle} × {item.quantity}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.muted }]}>Value</Text>
          <Text style={[styles.amount, { color: colors.primary }]}>{formatAmount(item)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.muted }]}>Payment</Text>
          <StatusPill label={item.paymentStatus.replaceAll("_", " ")} tone={toneForStatus(item.paymentStatus)} />
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.muted }]}>Placed</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.actionRow}>
        {item.orderStatus === "RESERVED" ? <LuxuryButton label="Confirm" onPress={() => void updateOrderStatus(item.id, "CONFIRMED")} variant="primary" style={styles.actionButton} /> : null}
        {item.orderStatus !== "CANCELLED" && item.orderStatus !== "EXPIRED" ? <LuxuryButton label="Cancel" onPress={() => void updateOrderStatus(item.id, "CANCELLED")} variant="danger" style={styles.actionButton} /> : null}
        <LuxuryButton label="WhatsApp" onPress={() => contactWhatsApp(item)} variant="ghost" style={styles.actionButton} />
      </View>
    </LuxuryCard>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={() => {
          if (hasMore && nextCursor && !loadingMore) void fetchOrders(true, nextCursor);
        }}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <SectionHeading eyebrow="OPERATIONS / ORDER QUEUE" title="Orders" detail={`${total.toLocaleString("en-US")} orders across every status`} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search order, customer, email or product"
              placeholderTextColor={`${colors.muted}B3`}
              returnKeyType="search"
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
            <View style={styles.filterRow}>
              {FILTERS.map((item) => (
                <LuxuryButton
                  key={item}
                  label={item === "ALL" ? "All" : item.charAt(0) + item.slice(1).toLowerCase()}
                  onPress={() => setFilter(item)}
                  variant={filter === item ? "primary" : "ghost"}
                  style={styles.filterButton}
                  labelStyle={styles.filterLabel}
                />
              ))}
            </View>
            {error ? (
              <LuxuryCard compact style={styles.errorCard}>
                <Text style={[styles.errorTitle, { color: colors.foreground }]}>Order feed paused</Text>
                <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
                <LuxuryButton label="Retry" onPress={() => void fetchOrders(false)} variant="ghost" style={styles.retryButton} />
              </LuxuryCard>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Opening secure order queue…</Text></View>
          ) : (
            <LuxuryCard accent style={styles.emptyCard}>
              <Text style={[styles.emptyMark, { color: colors.primary }]}>⌁</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No orders match this view.</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Try another status or search phrase. The queue is designed to keep loading as it grows.</Text>
            </LuxuryCard>
          )
        }
        ListFooterComponent={loadingMore ? <View style={styles.footerLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Loading the next page…</Text></View> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  headerContent: { gap: 14, marginBottom: 4 },
  searchInput: { borderWidth: 1, borderRadius: 15, minHeight: 50, paddingHorizontal: 15, fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterButton: { flex: 1, minHeight: 40, paddingHorizontal: 5 },
  filterLabel: { fontSize: 10 },
  orderCard: { gap: 14 },
  orderHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  orderCopy: { flex: 1, gap: 4 },
  orderReference: { fontSize: 16, fontWeight: "900" },
  customerName: { fontSize: 12 },
  orderBody: { gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#FFFFFF12", paddingVertical: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  detailLabel: { fontSize: 11, fontWeight: "700" },
  detailValue: { flex: 1, textAlign: "right", fontSize: 12, fontWeight: "700" },
  amount: { fontSize: 15, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 7 },
  actionButton: { flex: 1, minHeight: 40, paddingHorizontal: 5 },
  errorCard: { borderColor: "#633A36" },
  errorTitle: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retryButton: { alignSelf: "flex-start", minHeight: 40 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyMark: { fontSize: 40, fontWeight: "900", marginBottom: 8 },
  emptyTitle: { textAlign: "center", fontSize: 18, fontWeight: "900", lineHeight: 24 },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
  footerLoading: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 18 },
});
