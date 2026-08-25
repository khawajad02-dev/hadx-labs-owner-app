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
  const isBento = colors.themeId === "bento-telemetry";
  const isSpatial = colors.themeId === "visionos-spatial";
  const isTerminal = colors.themeId === "cyberpunk-terminal";
  const isNeumorphic = colors.themeId === "neumorphic-luxe";
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
            <Text style={[styles.title, { color: colors.foreground }]}>{isBento ? "Telemetry deck" : isSpatial ? "Spatial atelier" : isTerminal ? "System console" : isNeumorphic ? "Tactile command" : "Command center"}</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>{isBento ? "Modular signals, arranged for fast decisions." : isSpatial ? "A calm, layered view of your atelier." : isTerminal ? "Live operational signals from the HADX system." : isNeumorphic ? "Tactile controls for a quiet operating rhythm." : "A quiet, precise view of your atelier."}</Text>
          </View>
          <View style={[styles.orbDock, { borderColor: `${colors.primary}55` }]}>
            <CyberOrb size={82} />
          </View>
        </View>

        <View style={[styles.statusRow, isTerminal && styles.terminalStatusRow]}>
          <StatusPill label={metrics?.serverStatus || "Awaiting signal"} tone={statusTone(metrics?.serverStatus)} />
          <StatusPill label={metrics?.databaseHealth || "Data state unknown"} tone={statusTone(metrics?.databaseHealth)} />
          {isBento ? <StatusPill label="Grid synced" tone="success" /> : null}
          {isSpatial ? <StatusPill label="Depth online" tone="neutral" /> : null}
        </View>

        {error ? (
          <LuxuryCard style={[styles.alertCard, { borderColor: `${colors.error}99` }]}>

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

        {isTerminal ? <LuxuryCard compact style={styles.eventCard}><Text style={[styles.eventEyebrow, { color: colors.primary }]}>LIVE EVENT STREAM</Text><Text style={[styles.eventLine, { color: colors.foreground }]}>› auth/session verified</Text><Text style={[styles.eventLine, { color: colors.muted }]}>› storefront route operational</Text><Text style={[styles.eventLine, { color: colors.muted }]}>› order queue ready</Text></LuxuryCard> : null}
        {isSpatial ? <LuxuryCard accent style={styles.spatialCard}><Text style={[styles.metricLabel, { color: colors.primary }]}>SPATIAL LAYER</Text><Text style={[styles.spatialTitle, { color: colors.foreground }]}>Your atelier, in focus.</Text><Text style={[styles.spatialDetail, { color: colors.muted }]}>Move from signal to action with generous, calm surfaces.</Text></LuxuryCard> : null}
        <SectionHeading eyebrow={isBento ? "BENTO SNAPSHOT" : "ATELIER SNAPSHOT"} title={isBento ? "Live modules" : "The essentials"} detail="Live counts from your store" />
        <View style={[styles.metricGrid, isBento && styles.bentoMetricGrid, isNeumorphic && styles.neumorphicMetricGrid]}>
          <LuxuryCard compact style={[styles.metricCard, isTerminal ? styles.terminalMetricCard : isSpatial ? styles.spatialMetricCard : isBento ? styles.bentoMetricCard : isNeumorphic ? styles.neumorphicMetricCard : undefined]}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Orders</Text>
            <Text style={[styles.metricValueLarge, { color: colors.primary }]}>
              {typeof metrics?.totalOrders === "number" ? metrics.totalOrders.toLocaleString("en-US") : "—"}
            </Text>
            <Text style={[styles.metricHint, { color: colors.muted }]}>All statuses</Text>
          </LuxuryCard>
          <LuxuryCard compact style={[styles.metricCard, isTerminal ? styles.terminalMetricCard : isSpatial ? styles.spatialMetricCard : isBento ? styles.bentoMetricCard : isNeumorphic ? styles.neumorphicMetricCard : undefined]}>
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
  terminalStatusRow: { paddingBottom: 2 },
  bentoMetricGrid: { flexWrap: "wrap" },
  neumorphicMetricGrid: { gap: 16 },
  eventCard: { borderRadius: 10 },
  eventEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.1, marginBottom: 10 },
  eventLine: { fontSize: 12, lineHeight: 21, fontFamily: "monospace" },
  spatialCard: { minHeight: 142, justifyContent: "center" },
  spatialTitle: { fontSize: 24, fontWeight: "900", marginTop: 9, marginBottom: 5 },
  spatialDetail: { fontSize: 13, lineHeight: 20 },
  alertCard: { borderWidth: 1 },
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
  terminalMetricCard: { borderRadius: 9, borderLeftWidth: 3 },
  spatialMetricCard: { borderRadius: 30, minHeight: 150, marginVertical: 4 },
  bentoMetricCard: { borderRadius: 15 },
  neumorphicMetricCard: { borderRadius: 22, shadowOpacity: 0.28, shadowRadius: 18 },
  metricValueLarge: { fontSize: 30, fontWeight: "900", marginTop: 10 },
  metricHint: { fontSize: 11, marginTop: 4 },
  actionGrid: { gap: 10 },
  actionButton: { width: "100%" },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8 },
  loadingText: { fontSize: 12 },
});
