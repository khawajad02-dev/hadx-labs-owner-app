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
  address?: string | null;
  city?: string | null;
  country?: string | null;
  latestProductTitle?: string | null;
  latestSize?: string | null;
  totalOrders: number;
  lifetimeValue: number;
  lastOrderDate?: string;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "H";
}

export default function CustomersScreen() {
  const colors = useColors();
  const isBento = colors.themeId === "bento-telemetry";
  const isSpatial = colors.themeId === "visionos-spatial";
  const isTerminal = colors.themeId === "cyberpunk-terminal";
  const isNeumorphic = colors.themeId === "neumorphic-luxe";
  const customerCardStyle = isBento ? styles.bentoCard : isSpatial ? styles.spatialCard : isTerminal ? styles.terminalCard : isNeumorphic ? styles.neumorphicCard : styles.cyberCard;
  const customerHeaderStyle = isSpatial ? styles.spatialHeader : isTerminal ? styles.terminalHeader : undefined;
  const customerActionStyle = isTerminal ? styles.terminalActions : isBento ? styles.bentoActions : undefined;
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
    return customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.address || ""} ${customer.city || ""} ${customer.country || ""} ${customer.latestProductTitle || ""} ${customer.latestSize || ""}`.toLowerCase().includes(normalized));
  }, [customers, query]);

  const contact = async (kind: "whatsapp" | "call" | "email", customer: Customer) => {
    const urls = {
      whatsapp: `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Congratulations ${customer.name}! Your HADX LABS parcel${customer.latestProductTitle ? ` for ${customer.latestProductTitle}` : ""}${customer.latestSize ? ` in size ${customer.latestSize}` : ""} is being prepared and is expected within 5–7 working days. We will contact you with any delivery update.`)}`,
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
    <LuxuryCard compact style={[styles.customerCard, customerCardStyle]}>
      <View style={[styles.customerHeader, customerHeaderStyle]}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}16`, borderColor: `${colors.primary}66` }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(item.name)}</Text>
        </View>
        <View style={styles.customerCopy}>
          <Text style={[styles.customerName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.customerEmail, { color: colors.muted }]} numberOfLines={1}>{item.email}</Text>
        </View>
        <StatusPill label={item.totalOrders > 4 ? "Collector" : "Client"} tone={item.totalOrders > 4 ? "success" : "neutral"} />
      </View>
      <View style={[styles.deliveryBlock, { borderColor: `${colors.border}88`, backgroundColor: `${colors.surface}99` }]}>
        <Text style={[styles.deliveryTitle, { color: colors.primary }]}>LATEST DELIVERY</Text>
        <Text style={[styles.deliveryText, { color: colors.foreground }]}>{item.latestProductTitle || "No product recorded"}{item.latestSize ? ` · Size ${item.latestSize}` : ""}</Text>
        <Text style={[styles.deliveryText, { color: colors.muted }]}>{item.address || "Address not recorded"}{item.city ? `, ${item.city}` : ""}{item.country ? `, ${item.country}` : ""}</Text>
      </View>
      <View style={[styles.customerStats, { borderColor: `${colors.border}88` }]}>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Orders</Text><Text style={[styles.statValue, { color: colors.foreground }]}>{item.totalOrders.toLocaleString("en-US")}</Text></View>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Lifetime value</Text><Text style={[styles.statValue, { color: colors.primary }]}>${Number(item.lifetimeValue || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}</Text></View>
        <View><Text style={[styles.statLabel, { color: colors.muted }]}>Last order</Text><Text style={[styles.statValueSmall, { color: colors.foreground }]}>{item.lastOrderDate ? new Date(item.lastOrderDate).toLocaleDateString() : "—"}</Text></View>
      </View>
      <View style={[styles.actions, customerActionStyle]}><LuxuryButton label="WhatsApp" onPress={() => void contact("whatsapp", item)} variant="ghost" style={styles.action} /><LuxuryButton label="Call" onPress={() => void contact("call", item)} variant="secondary" style={styles.action} /><LuxuryButton label="Email" onPress={() => void contact("email", item)} variant="secondary" style={styles.action} /></View>
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
  deliveryBlock: { gap: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 10 },
  deliveryTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  deliveryText: { fontSize: 12, lineHeight: 17 },
  customerStats: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12, gap: 8 },
  statLabel: { fontSize: 10, marginBottom: 4 },
  statValue: { fontSize: 15, fontWeight: "900" },
  statValueSmall: { fontSize: 11, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 7 },
  action: { flex: 1, minHeight: 40, paddingHorizontal: 5 },
  errorCard: { borderColor: "#B8655A" },
  errorTitle: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retry: { alignSelf: "flex-start", minHeight: 40 },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyMark: { fontSize: 40, fontWeight: "900", marginBottom: 8 },
  emptyTitle: { textAlign: "center", fontSize: 18, fontWeight: "900", lineHeight: 24 },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
  bentoCard: { borderRadius: 15, borderLeftWidth: 3 },
  spatialCard: { borderRadius: 30, marginVertical: 4 },
  terminalCard: { borderRadius: 9, borderLeftWidth: 3 },
  neumorphicCard: { borderRadius: 22, shadowOpacity: 0.28, shadowRadius: 18 },
  cyberCard: { borderRadius: 24, borderTopWidth: 2 },
  spatialHeader: { flexDirection: "column", alignItems: "flex-start" },
  terminalHeader: { alignItems: "flex-start" },
  terminalActions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  bentoActions: { gap: 5 },
});
