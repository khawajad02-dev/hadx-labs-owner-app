import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import {
  CyberOrb,
  LuxuryButton,
  LuxuryCard,
  MiniSparkline,
  SectionHeading,
  StatusPill,
} from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet } from "@/lib/api-client";

interface DashboardMetrics {
  revenueToday: number;
  activeUsers: number;
  serverStatus: string;
  databaseHealth: string;
  totalOrders: number;
  totalProducts: number;
}

function formatCurrency(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function statusTone(value: string | undefined): "success" | "warning" | "danger" | "neutral" {
  const normalized = value?.toLowerCase() ?? "";
  if (["healthy", "online", "operational", "connected"].some((word) => normalized.includes(word))) return "success";
  if (["degraded", "pending", "limited"].some((word) => normalized.includes(word))) return "warning";
  if (["offline", "failed", "error"].some((word) => normalized.includes(word))) return "danger";
  return "neutral";
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchMetrics = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/dashboard");
      setMetrics(response.data);
    } catch (requestError: any) {
      console.error("Error fetching dashboard metrics:", requestError);
      setMetrics(null);
      setError(requestError?.response?.data?.error || "Live metrics are temporarily unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchMetrics();
  };

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>HADX / OWNER CONTROL</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Command center</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>A quiet, precise view of your atelier.</Text>
          </View>
          <View style={[styles.orbDock, { borderColor: `${colors.primary}55` }]}>
            <CyberOrb size={82} />
          </View>
        </View>

        <View style={styles.statusRow}>
          <StatusPill label={metrics?.serverStatus || "Awaiting signal"} tone={statusTone(metrics?.serverStatus)} />
          <StatusPill label={metrics?.databaseHealth || "Data state unknown"} tone={statusTone(metrics?.databaseHealth)} />
        </View>

        {error ? (
          <LuxuryCard style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <View style={[styles.alertDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.alertTitle, { color: colors.foreground }]}>Live feed paused</Text>
            </View>
            <Text style={[styles.alertText, { color: colors.muted }]}>{error}</Text>
            <LuxuryButton label="Retry live feed" onPress={onRefresh} variant="ghost" loading={refreshing} style={styles.retryButton} />
          </LuxuryCard>
        ) : null}

        <LuxuryCard accent style={styles.heroCard}>
          <SectionHeading
            eyebrow="TODAY / PERFORMANCE"
            title={metrics ? formatCurrency(metrics.revenueToday) : "—"}
            detail="Revenue captured today"
          />
          <View style={styles.heroLowerRow}>
            <View style={styles.heroMeta}>
              <Text style={[styles.metricLabel, { color: colors.muted }]}>Active customers</Text>
              <Text style={[styles.metricValue, { color: colors.foreground }]}>
                {typeof metrics?.activeUsers === "number" ? metrics.activeUsers.toLocaleString("en-US") : "—"}
              </Text>
            </View>
            <View style={styles.sparklineWrap}>
              <MiniSparkline values={metrics ? [18, 24, 20, 31, 28, 38, 44] : [0, 0, 0, 0, 0, 0, 0]} color={colors.accent} />
            </View>
          </View>
        </LuxuryCard>

        <SectionHeading eyebrow="ATELIER SNAPSHOT" title="The essentials" detail="Live counts from your store" />
        <View style={styles.metricGrid}>
          <LuxuryCard compact style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Orders</Text>
            <Text style={[styles.metricValueLarge, { color: colors.primary }]}>
              {typeof metrics?.totalOrders === "number" ? metrics.totalOrders.toLocaleString("en-US") : "—"}
            </Text>
            <Text style={[styles.metricHint, { color: colors.muted }]}>All statuses</Text>
          </LuxuryCard>
          <LuxuryCard compact style={styles.metricCard}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Products</Text>
            <Text style={[styles.metricValueLarge, { color: colors.primary }]}>
              {typeof metrics?.totalProducts === "number" ? metrics.totalProducts.toLocaleString("en-US") : "—"}
            </Text>
            <Text style={[styles.metricHint, { color: colors.muted }]}>Your catalog</Text>
          </LuxuryCard>
        </View>

        <SectionHeading eyebrow="QUICK ACTIONS" title="Move with intent" detail="Every control opens a real workflow" />
        <View style={styles.actionGrid}>
          <LuxuryButton
            label="Manage products"
            onPress={() => router.push("/(tabs)/products")}
            variant="secondary"
            style={styles.actionButton}
          />
          <LuxuryButton
            label="Review orders"
            onPress={() => router.push("/(tabs)/orders")}
            variant="secondary"
            style={styles.actionButton}
          />
          <LuxuryButton
            label="Add new piece"
            onPress={() => router.push("/add-product")}
            variant="primary"
            style={styles.actionButton}
          />
          <LuxuryButton label="Refresh metrics" onPress={onRefresh} variant="ghost" loading={refreshing} style={styles.actionButton} />
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Syncing secure telemetry…</Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 18 },
  headerRow: { minHeight: 124, flexDirection: "row", alignItems: "center", gap: 12 },
  headerCopy: { flex: 1, gap: 6 },
  eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.5 },
  title: { fontSize: 32, fontWeight: "900", letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  orbDock: { width: 92, height: 92, alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 46 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alertCard: { borderColor: "#643B37" },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertTitle: { fontSize: 15, fontWeight: "800" },
  alertText: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  retryButton: { alignSelf: "flex-start" },
  heroCard: { minHeight: 188 },
  heroLowerRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 18, marginTop: 24 },
  heroMeta: { gap: 4 },
  metricLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.4 },
  metricValue: { fontSize: 24, fontWeight: "900" },
  sparklineWrap: { flex: 1, maxWidth: 170, height: 38 },
  metricGrid: { flexDirection: "row", gap: 12 },
  metricCard: { flex: 1, minHeight: 128 },
  metricValueLarge: { fontSize: 30, fontWeight: "900", marginTop: 10 },
  metricHint: { fontSize: 11, marginTop: 4 },
  actionGrid: { gap: 10 },
  actionButton: { width: "100%" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 12 },
});
