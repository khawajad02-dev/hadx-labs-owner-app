import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet } from "@/lib/api-client";
import { dropState } from "@/lib/drop";

type DropItem = {
  id: string;
  slug: string;
  title: string;
  tagline?: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sellAfterEnd: boolean;
  products: Array<{ id: string; title: string; sku: string; dropOrder: number }>;
  productCount?: number;
};

function statusFor(drop: DropItem) {
  return !drop.isActive ? "DRAFT" : dropState(drop).toUpperCase();
}

function toneFor(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "LIVE") return "success";
  if (status === "UPCOMING" || status === "DRAFT") return "warning";
  if (status === "ENDED") return "neutral";
  return "neutral";
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function DropsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [drops, setDrops] = useState<DropItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDrops = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/drops");
      setDrops(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || "Drops could not be loaded.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void loadDrops(); }, [loadDrops]);

  const openEditor = (params?: { id?: string; run?: string }) => router.push({ pathname: "/drop-editor", params: params || {} });

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={drops}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadDrops(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={<View style={styles.header}><SectionHeading eyebrow="[ SYSTEM :: DROP ]" title="Drops" detail={`${drops.length} timed releases in the control room.`} action={<LuxuryButton label="+ New Drop" onPress={() => openEditor()} variant="primary" style={styles.newButton} />} />{error ? <LuxuryCard compact style={[styles.errorCard, { borderColor: `${colors.error}88` }]}><Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text><LuxuryButton label="Retry" onPress={() => void loadDrops()} variant="ghost" /></LuxuryCard> : null}</View>}
        ListEmptyComponent={loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.muted, { color: colors.muted }]}>Loading releases…</Text></View> : <LuxuryCard accent style={styles.empty}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Drops configured.</Text><Text style={[styles.muted, { color: colors.muted }]}>Create a release and assign pieces from the catalog.</Text><LuxuryButton label="Create first Drop" onPress={() => openEditor()} variant="primary" /></LuxuryCard>}
        renderItem={({ item }) => {
          const status = statusFor(item);
          return <LuxuryCard compact style={styles.card}>
            <View style={styles.row}><View style={styles.copy}><Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.slug, { color: colors.muted }]}>/{item.slug}</Text></View><StatusPill label={status} tone={toneFor(status)} /></View>
            {item.tagline ? <Text style={[styles.tagline, { color: colors.muted }]}>{item.tagline}</Text> : null}
            <View style={[styles.details, { borderColor: `${colors.border}88` }]}><Text style={[styles.detail, { color: colors.foreground }]}>START  ·  {formatDate(item.startsAt)}</Text><Text style={[styles.detail, { color: colors.foreground }]}>END  ·  {formatDate(item.endsAt)}</Text><Text style={[styles.detail, { color: colors.primary }]}>{item.productCount ?? item.products?.length ?? 0} assigned product{(item.productCount ?? item.products?.length ?? 0) === 1 ? "" : "s"}</Text></View>
            <View style={styles.actions}><LuxuryButton label="Edit" onPress={() => openEditor({ id: item.id })} variant="secondary" style={styles.action} />{status === "ENDED" ? <LuxuryButton label="Re-run" onPress={() => openEditor({ id: item.id, run: "1" })} variant="ghost" style={styles.action} /> : null}</View>
          </LuxuryCard>;
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 12 }, header: { gap: 14, marginBottom: 5 }, newButton: { minHeight: 42, paddingHorizontal: 13 }, card: { gap: 12 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }, copy: { flex: 1, gap: 3 }, title: { fontSize: 17, fontWeight: "900" }, slug: { fontSize: 11 }, tagline: { fontSize: 12, lineHeight: 18 }, details: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 7 }, detail: { fontSize: 11, fontWeight: "700" }, actions: { flexDirection: "row", gap: 9 }, action: { flex: 1, minHeight: 40 }, errorCard: { borderWidth: 1, gap: 8 }, errorText: { fontSize: 12 }, loading: { alignItems: "center", gap: 10, padding: 36 }, empty: { alignItems: "center", gap: 12, paddingVertical: 35 }, emptyTitle: { fontSize: 17, fontWeight: "900" }, muted: { fontSize: 12, textAlign: "center", lineHeight: 18 },
});
