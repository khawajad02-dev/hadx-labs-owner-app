import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, MiniSparkline, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet } from "@/lib/api-client";

interface AnalyticsData {
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{ name: string; sales: number }>;
  topCustomers: Array<{ name: string; spent: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}

function formatCurrency(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—";
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<"daily" | "monthly">("monthly");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchAnalytics = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/analytics");
      setAnalytics(response.data);
    } catch (requestError: any) {
      console.error("Error fetching analytics:", requestError);
      setAnalytics(null);
      setError(requestError?.response?.data?.error || "Analytics are temporarily unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const revenueData = useMemo(
    () => timeRange === "daily"
      ? (analytics?.dailyRevenue || []).map((entry) => ({ label: entry.date, amount: entry.amount }))
      : (analytics?.monthlyRevenue || []).map((entry) => ({ label: entry.month, amount: entry.amount })),
    [analytics, timeRange],
  );
  const maxRevenue = Math.max(...revenueData.map((entry) => entry.amount), 1);
  const sparklineValues = revenueData.length > 0 ? revenueData.map((entry) => entry.amount) : [0, 0, 0, 0, 0, 0];

  if (loading) {
    return <ScreenContainer containerClassName="flex-1" className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Opening telemetry…</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchAnalytics(); }} tintColor={colors.primary} colors={[colors.primary]} />}>
        <SectionHeading eyebrow="TELEMETRY / PERFORMANCE" title="Insights" detail="A calm read of how the atelier is moving." action={<StatusPill label={analytics ? "Synced" : "Awaiting data"} tone={analytics ? "success" : "warning"} />} />
        {error ? <LuxuryCard style={styles.errorCard}><Text style={[styles.errorTitle, { color: colors.foreground }]}>Telemetry feed paused</Text><Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text><LuxuryButton label="Retry" onPress={() => void fetchAnalytics()} variant="ghost" style={styles.retry} /></LuxuryCard> : null}
        <View style={styles.metricsRow}>
          <LuxuryCard compact style={styles.metricCard}><Text style={[styles.metricLabel, { color: colors.muted }]}>Revenue</Text><Text style={[styles.metricValue, { color: colors.primary }]}>{formatCurrency(analytics?.totalRevenue)}</Text><Text style={[styles.metricHint, { color: colors.muted }]}>All time</Text></LuxuryCard>
          <LuxuryCard compact style={styles.metricCard}><Text style={[styles.metricLabel, { color: colors.muted }]}>Avg. order</Text><Text style={[styles.metricValue, { color: colors.primary }]}>{formatCurrency(analytics?.averageOrderValue)}</Text><Text style={[styles.metricHint, { color: colors.muted }]}>Per order</Text></LuxuryCard>
        </View>
        <LuxuryCard accent style={styles.chartCard}>
          <View style={styles.chartHeader}><View><Text style={[styles.chartEyebrow, { color: colors.primary }]}>REVENUE ARC</Text><Text style={[styles.chartTitle, { color: colors.foreground }]}>{timeRange === "daily" ? "Daily movement" : "Monthly movement"}</Text></View><View style={styles.toggleRow}><LuxuryButton label="Day" onPress={() => setTimeRange("daily")} variant={timeRange === "daily" ? "primary" : "ghost"} style={styles.toggle} labelStyle={styles.toggleLabel} /><LuxuryButton label="Month" onPress={() => setTimeRange("monthly")} variant={timeRange === "monthly" ? "primary" : "ghost"} style={styles.toggle} labelStyle={styles.toggleLabel} /></View></View>
          <View style={styles.sparkline}><MiniSparkline values={sparklineValues} color={colors.accent} /></View>
          {revenueData.length > 0 ? <View style={styles.barList}>{revenueData.slice(-6).map((entry, index) => <View key={`${entry.label}-${index}`} style={styles.barRow}><Text style={[styles.barLabel, { color: colors.muted }]} numberOfLines={1}>{entry.label}</Text><View style={[styles.barTrack, { backgroundColor: `${colors.border}88` }]}><View style={[styles.barFill, { backgroundColor: colors.primary, width: `${Math.max(4, (entry.amount / maxRevenue) * 100)}%` }]} /></View><Text style={[styles.barValue, { color: colors.foreground }]}>{formatCurrency(entry.amount)}</Text></View>)}</View> : <Text style={[styles.emptyText, { color: colors.muted }]}>No revenue data has been recorded for this range.</Text>}
        </LuxuryCard>
        <LuxuryCard compact style={styles.conversionCard}><View><Text style={[styles.metricLabel, { color: colors.muted }]}>Conversion rate</Text><Text style={[styles.conversionValue, { color: colors.foreground }]}>{typeof analytics?.conversionRate === "number" ? `${analytics.conversionRate}%` : "—"}</Text></View><View style={[styles.conversionOrb, { borderColor: colors.primary }]}><Text style={[styles.conversionOrbText, { color: colors.primary }]}>↗</Text></View></LuxuryCard>
        {analytics?.topProducts?.length ? <LuxuryCard compact><Text style={[styles.cardTitle, { color: colors.foreground }]}>Top pieces</Text>{analytics.topProducts.slice(0, 5).map((product, index) => <View key={`${product.name}-${index}`} style={styles.rankRow}><Text style={[styles.rankNumber, { color: colors.primary }]}>{String(index + 1).padStart(2, "0")}</Text><Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>{product.name}</Text><StatusPill label={`${product.sales} sales`} tone="neutral" /></View>)}</LuxuryCard> : null}
        {analytics?.topCustomers?.length ? <LuxuryCard compact><Text style={[styles.cardTitle, { color: colors.foreground }]}>Highest-value clients</Text>{analytics.topCustomers.slice(0, 5).map((customer, index) => <View key={`${customer.name}-${index}`} style={styles.rankRow}><Text style={[styles.rankNumber, { color: colors.primary }]}>{String(index + 1).padStart(2, "0")}</Text><Text style={[styles.rankName, { color: colors.foreground }]} numberOfLines={1}>{customer.name}</Text><Text style={[styles.customerSpend, { color: colors.primary }]}>{formatCurrency(customer.spent)}</Text></View>)}</LuxuryCard> : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 16 },
  loadingText: { marginTop: 10, fontSize: 13 },
  errorCard: { borderColor: "#633A36" },
  errorTitle: { fontSize: 15, fontWeight: "900", marginBottom: 5 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retry: { alignSelf: "flex-start", minHeight: 40 },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, minHeight: 112 },
  metricLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  metricValue: { fontSize: 24, fontWeight: "900", marginTop: 12 },
  metricHint: { fontSize: 11, marginTop: 4 },
  chartCard: { gap: 16 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  chartEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  chartTitle: { fontSize: 17, fontWeight: "900", marginTop: 5 },
  toggleRow: { flexDirection: "row", gap: 5 },
  toggle: { minHeight: 34, paddingHorizontal: 8, borderRadius: 11 },
  toggleLabel: { fontSize: 10 },
  sparkline: { height: 48 },
  barList: { gap: 11 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 62, fontSize: 10 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barValue: { width: 66, textAlign: "right", fontSize: 10, fontWeight: "800" },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
  conversionCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  conversionValue: { fontSize: 30, fontWeight: "900", marginTop: 8 },
  conversionOrb: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  conversionOrbText: { fontSize: 30, fontWeight: "900" },
  cardTitle: { fontSize: 17, fontWeight: "900", marginBottom: 14 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 38 },
  rankNumber: { width: 25, fontSize: 11, fontWeight: "900" },
  rankName: { flex: 1, fontSize: 13, fontWeight: "800" },
  customerSpend: { fontSize: 13, fontWeight: "900" },
});
