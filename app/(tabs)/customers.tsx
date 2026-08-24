import { useCallback, useEffect, useMemo, useState } from "react";
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
import { apiGet } from "@/lib/api-client";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  lifetimeValue: number;
  lastOrderDate?: string;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "H";
}

export default function CustomersScreen() {
  const colors = useColors();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/customers");
      const payload = response.data;
      setCustomers(Array.isArray(payload) ? payload : payload?.items || []);
    } catch (requestError: any) {
      console.error("Error fetching customers:", requestError);
      setError(requestError?.response?.data?.error || "The client ledger could not be loaded.");
      setCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const visibleCustomers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return customers;
    return customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(normalized));
  }, [customers, query]);

  const contact = async (kind: "whatsapp" | "call" | "email", customer: Customer) => {
    const urls = {
      whatsapp: `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${customer.name}, thank you for your business with HADX LABS.`)}`,
      call: `tel:${customer.phone}`,
      email: `mailto:${customer.email}`,
    };
    try {
      await Linking.openURL(urls[kind]);
    } catch {
      Alert.alert("Could not open contact", "Please check the customer details and try again.");
    }
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <LuxuryCard compact style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}66` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(item.name)}</Text>
        </View>
        <View style={styles.customerCopy}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.customerEmail, { color: colors.muted }]} numberOfLines={1}>{item.email}</Text>
        </View>
        <StatusPill label={item.totalOrders > 4 ? "Collector" : "Client"} tone={item.totalOrders > 4 ? "success" : "neutral"} />
      </View>
      <View style={styles.customerStats}>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Orders</Text><Text style={[styles.statValue, { color: colors.foreground }]}>{item.totalOrders.toLocaleString("en-US")}</Text></View>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Lifetime value</Text><Text style={[styles.statValue, { color: colors.primary }]}>${Number(item.lifetimeValue || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text></View>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Last order</Text><Text style={[styles.statValueSmall, { color: colors.foreground }]}>{item.lastOrderDate ? new Date(item.lastOrderDate).toLocaleDateString() : "—"}</Text></View>
      </View>
      <View style={styles.actions}><LuxuryButton label="WhatsApp" onPress={() => void contact("whatsapp", item)} variant="ghost" style={styles.action} /><LuxuryButton label="Call" onPress={() => void contact("call", item)} variant="secondary" style={styles.action} /><LuxuryButton label="Email" onPress={() => void contact("email", item)} variant="secondary" style={styles.action} /></View>
    </LuxuryCard>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={visibleCustomers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchCustomers(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={<View style={styles.headerContent}><SectionHeading eyebrow="RELATIONSHIPS / CLIENT LEDGER" title="Clients" detail={`${visibleCustomers.length.toLocaleString("en-US")} of ${customers.length.toLocaleString("en-US")} clients`} /><TextInput value={query} onChangeText={setQuery} placeholder="Search clients, email or phone" placeholderTextColor={`${colors.muted}B3`} returnKeyType="search" style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]} />{error ? <LuxuryCard compact style={styles.errorCard}><Text style={[styles.errorTitle, { color: colors.foreground }]}>Client feed paused</Text><Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text><LuxuryButton label="Retry" onPress={() => void fetchCustomers()} variant="ghost" style={styles.retry} /></LuxuryCard> : null}</View>}
        ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Opening client ledger…</Text></View> : <LuxuryCard accent style={styles.emptyCard}><Text style={[styles.emptyMark, { color: colors.primary }]}>H</Text><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No clients in this view.</Text><Text style={[styles.emptyText, { color: colors.muted }]}>As orders arrive, customer relationships will appear here.</Text></LuxuryCard>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  headerContent: { gap: 14, marginBottom: 4 },
  searchInput: { borderWidth: 1, borderRadius: 15, minHeight: 50, paddingHorizontal: 15, fontSize: 13 },
  customerCard: { gap: 14 },
  customerHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "900", letterSpacing: 0.8 },
  customerCopy: { flex: 1, gap: 4 },
  customerName: { fontSize: 16, fontWeight: "900" },
  customerEmail: { fontSize: 11 },
  customerStats: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#FFFFFF12", paddingVertical: 12, gap: 8 },
  statLabel: { fontSize: 10, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "900" },
  statValueSmall: { fontSize: 11, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 7 },
  action: { flex: 1, minHeight: 40, paddingHorizontal: 5 },
  errorCard: { borderColor: "#633A36" },
  errorTitle: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retry: { alignSelf: "flex-start", minHeight: 40 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyMark: { fontSize: 40, fontWeight: "900", marginBottom: 8 },
  emptyTitle: { textAlign: "center", fontSize: 18, fontWeight: "900", lineHeight: 24 },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
});
