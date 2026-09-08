import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet } from "@/lib/api-client";

type Review = {
  id: string;
  name: string;
  rating: number;
  body: string;
  approved: boolean;
  createdAt: string;
  product?: { id: string; sku: string; title: string; imageUrl?: string | null } | null;
};

const stars = (rating: number) => "★".repeat(rating) + "☆".repeat(5 - rating);

export default function ReviewArchiveScreen() {
  const colors = useColors();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchReviews = useCallback(async () => {
    try {
      setError("");
      const response = await apiGet("/reviews?limit=200");
      const payload = response.data;
      setReviews(Array.isArray(payload) ? payload : payload?.items || []);
    } catch (requestError: any) {
      console.error("Error fetching reviews:", requestError);
      setError(requestError?.response?.data?.error || "The review archive could not be loaded.");
      setReviews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchReviews(); }, [fetchReviews]);

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void fetchReviews(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={<View style={styles.header}><LuxuryButton label="Back to Clients" onPress={() => router.back()} variant="ghost" style={styles.backButton} /><SectionHeading eyebrow="RELATIONSHIPS / REVIEW ARCHIVE" title="Product Reviews" detail={`${reviews.length} customer notes`} /><LuxuryCard accent style={[styles.signalCard, { borderColor: `${colors.primary}66`, backgroundColor: `${colors.surface}CC` }]}><Text style={[styles.signalMark, { color: colors.primary }]}>◉</Text><View style={styles.signalCopy}><Text style={[styles.signalTitle, { color: colors.foreground }]}>Customer voice relay</Text><Text style={[styles.signalText, { color: colors.muted }]}>Read, verify, and capture client feedback for the HADX archive.</Text></View></LuxuryCard>{error ? <LuxuryCard compact style={styles.errorCard}><Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text><LuxuryButton label="Retry" onPress={() => void fetchReviews()} variant="ghost" style={styles.retry} /></LuxuryCard> : null}</View>}
        renderItem={({ item }) => <LuxuryCard compact style={[styles.reviewCard, { borderColor: `${colors.primary}44`, backgroundColor: `${colors.surface}DD` }]}><View style={styles.reviewTop}><View style={[styles.avatar, { borderColor: `${colors.primary}88`, backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.identity}><Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.product, { color: colors.muted }]}>{item.product?.title || "Product review"}</Text></View><Text style={[styles.stars, { color: colors.primary }]}>{stars(Math.max(1, Math.min(5, item.rating)))}</Text></View><Text style={[styles.body, { color: colors.foreground }]}>{item.body}</Text><View style={styles.footer}><Text style={[styles.date, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text><Text style={[styles.status, { color: item.approved ? colors.primary : colors.muted }]}>{item.approved ? "PUBLISHED" : "PENDING"}</Text></View></LuxuryCard>}
        ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Opening review archive…</Text></View> : <LuxuryCard accent style={styles.emptyCard}><Text style={[styles.emptyTitle, { color: colors.foreground }]}>No customer reviews yet.</Text><Text style={[styles.emptyText, { color: colors.muted }]}>Reviews submitted on the website will appear here.</Text></LuxuryCard>}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  header: { gap: 14, marginBottom: 4 },
  backButton: { alignSelf: "flex-start" },
  signalCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 22, padding: 16 },
  signalMark: { fontSize: 32, fontWeight: "900" },
  signalCopy: { flex: 1, gap: 4 },
  signalTitle: { fontSize: 16, fontWeight: "900" },
  signalText: { fontSize: 12, lineHeight: 18 },
  reviewCard: { gap: 14, borderWidth: 1, borderRadius: 22 },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "900" },
  identity: { flex: 1, gap: 3 },
  name: { fontSize: 14, fontWeight: "900" },
  product: { fontSize: 11 },
  stars: { fontSize: 12, letterSpacing: 1 },
  body: { fontSize: 14, lineHeight: 21 },
  footer: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#FFFFFF22", paddingTop: 10 },
  date: { fontSize: 10 },
  status: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  errorCard: { borderColor: "#B8655A" },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  retry: { alignSelf: "flex-start" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyTitle: { textAlign: "center", fontSize: 18, fontWeight: "900" },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
});
