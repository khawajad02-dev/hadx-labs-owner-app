import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiDelete, apiGet } from "@/lib/api-client";

interface Product {
  id: string;
  title: string;
  description?: string | null;
  sku: string;
  priceInCents: number;
  currency?: string;
  imageUrl?: string | null;
  media?: Array<{ url: string; type: "image" | "video"; fileName?: string }>;
  regionalPrices?: { USD?: number; PKR?: number; INR?: number };
  category?: string | null;
  status: "DRAFT" | "PUBLISHED" | string;
  stockQuantity: number;
  createdAt?: string;
}

interface ProductResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const PAGE_SIZE = 24;

function normalizeResponse(data: ProductResponse | Product[]): ProductResponse {
  if (Array.isArray(data)) return { items: data, total: data.length, page: 1, pageSize: data.length || PAGE_SIZE, hasMore: false };
  return data;
}

function formatPrice(product: Product) {
  const usd = product.regionalPrices?.USD ?? product.priceInCents / 100;
  const pkr = product.regionalPrices?.PKR;
  const inr = product.regionalPrices?.INR;
  return [`USD $${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`, pkr ? `PKR ${pkr.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : null, inr ? `INR ₹${inr.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : null].filter(Boolean).join("  ·  ");
}

export default function ProductsScreen() {
  const colors = useColors();
  const router = useRouter();
  const themeCardStyle = colors.themeId === "bento-telemetry"
    ? styles.bentoCard
    : colors.themeId === "visionos-spatial"
      ? styles.spatialCard
      : colors.themeId === "cyberpunk-terminal"
        ? styles.terminalCard
        : colors.themeId === "neumorphic-luxe"
          ? styles.neumorphicCard
          : styles.cyberCard;
  const themeTopStyle = colors.themeId === "visionos-spatial" ? styles.spatialTop : colors.themeId === "cyberpunk-terminal" ? styles.terminalTop : undefined;
  const themeActionStyle = colors.themeId === "cyberpunk-terminal" ? styles.terminalActions : colors.themeId === "bento-telemetry" ? styles.bentoActions : undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async (nextPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else if (!refreshing) setLoading(true);

    try {
      setError("");
      const params = new URLSearchParams({ page: String(nextPage), pageSize: String(PAGE_SIZE) });
      if (query.trim()) params.set("q", query.trim());
      if (status !== "ALL") params.set("status", status);
      const response = await apiGet(`/products?${params.toString()}`);
      const parsed = normalizeResponse(response.data);
      setProducts((previous) => (append ? [...previous, ...parsed.items] : parsed.items));
      setTotal(parsed.total);
      setPage(parsed.page);
      setHasMore(parsed.hasMore);
    } catch (requestError: any) {
      console.error("Error fetching products:", requestError);
      setError(requestError?.response?.data?.error || "The catalog could not be loaded.");
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [query, refreshing, status]);

  useEffect(() => {
    const timer = setTimeout(() => void fetchProducts(1, false), 220);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchProducts(1, false);
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert("Remove this piece?", `${product.title} will be removed from the catalog.`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/products/${product.id}`);
            setProducts((previous) => previous.filter((item) => item.id !== product.id));
            setTotal((previous) => Math.max(0, previous - 1));
          } catch (requestError: any) {
            Alert.alert("Could not remove", requestError?.response?.data?.error || "Try again when the connection is restored.");
          }
        },
      },
    ]);
  };

  const filters = useMemo(() => ["ALL", "PUBLISHED", "DRAFT"] as const, []);

  const renderProduct = ({ item }: { item: Product }) => {
    const primaryMedia = item.media?.[0];
    return (
    <LuxuryCard compact style={[styles.productCard, themeCardStyle]}>
      <View style={[styles.productTop, themeTopStyle]}>
        {primaryMedia?.type === "video" ? (
          <View style={[styles.productImage, styles.videoImage, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}><Text style={[styles.videoMark, { color: colors.primary }]}>▶</Text><Text style={[styles.videoLabel, { color: colors.foreground }]}>Video</Text></View>
        ) : primaryMedia?.url || item.imageUrl ? (
          <Image source={{ uri: primaryMedia?.url || item.imageUrl || "" }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}>
            <Text style={[styles.placeholderMark, { color: colors.primary }]}>H</Text>
          </View>
        )}
        <View style={styles.productCopy}>
          <View style={styles.productTitleRow}>
            <Text style={[styles.productTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
            <StatusPill label={item.status === "PUBLISHED" ? "Live" : "Draft"} tone={item.status === "PUBLISHED" ? "success" : "warning"} />
          </View>
          <Text style={[styles.productSku, { color: colors.muted }]}>{item.sku} · {item.category || "Uncategorised"}</Text>
          <Text style={[styles.productPrice, { color: colors.primary }]}>{formatPrice(item)}</Text>
          <Text style={[styles.mediaCount, { color: colors.muted }]}>{item.media?.length || (item.imageUrl ? 1 : 0)} media asset{(item.media?.length || (item.imageUrl ? 1 : 0)) === 1 ? "" : "s"}</Text>
        </View>
      </View>
      <View style={styles.productMetaRow}>
        <Text style={[styles.metaText, { color: colors.muted }]}>Stock {item.stockQuantity.toLocaleString("en-US")}</Text>
        <Text style={[styles.metaText, { color: item.stockQuantity > 0 ? colors.success : colors.error }]}>{item.stockQuantity > 0 ? "Available" : "Out of stock"}</Text>
      </View>
      <View style={[styles.productActions, themeActionStyle]}>
        <LuxuryButton label="Edit" onPress={() => router.push({ pathname: "/edit-product", params: { id: item.id } })} variant="secondary" style={styles.productAction} />
        <LuxuryButton label="Remove" onPress={() => handleDeleteProduct(item)} variant="danger" style={styles.productAction} />
      </View>
    </LuxuryCard>
    );
  };

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        onEndReached={() => {
          if (hasMore && !loadingMore) void fetchProducts(page + 1, true);
        }}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <SectionHeading
              eyebrow="ATELIER / CATALOG"
              title="Products"
              detail={`${total.toLocaleString("en-US")} pieces in your catalog`}
              action={<LuxuryButton label="Add" onPress={() => router.push("/add-product")} variant="primary" style={styles.addButton} />}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search title, SKU or category"
              placeholderTextColor={`${colors.muted}B3`}
              returnKeyType="search"
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
            />
            <View style={styles.filterRow}>
              {filters.map((filter) => {
                const active = filter === status;
                return (
                  <LuxuryButton
                    key={filter}
                    label={filter === "ALL" ? "All pieces" : filter === "PUBLISHED" ? "Live" : "Drafts"}
                    onPress={() => setStatus(filter)}
                    variant={active ? "primary" : "ghost"}
                    style={styles.filterButton}
                    labelStyle={styles.filterLabel}
                  />
                );
              })}
            </View>
            {error ? (
              <LuxuryCard compact style={styles.errorCard}>
                <Text style={[styles.errorTitle, { color: colors.foreground }]}>Catalog feed paused</Text>
                <Text style={[styles.errorText, { color: colors.muted }]}>{error}</Text>
                <LuxuryButton label="Retry" onPress={() => void fetchProducts(1, false)} variant="ghost" style={styles.retryButton} />
              </LuxuryCard>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Opening the atelier…</Text></View>
          ) : (
            <LuxuryCard accent style={styles.emptyCard}>
              <Text style={[styles.emptyMark, { color: colors.primary }]}>H</Text>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your catalog is ready for its first piece.</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Choose a product image or video from your gallery and publish it without pasting a URL.</Text>
              <LuxuryButton label="Create first product" onPress={() => router.push("/add-product")} variant="primary" style={styles.emptyButton} />
            </LuxuryCard>
          )
        }
        ListFooterComponent={loadingMore ? <View style={styles.footerLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.emptyText, { color: colors.muted }]}>Loading more pieces…</Text></View> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  headerContent: { gap: 14, marginBottom: 4 },
  addButton: { minHeight: 42, paddingHorizontal: 14 },
  searchInput: { borderWidth: 1, borderRadius: 15, minHeight: 50, paddingHorizontal: 15, fontSize: 13 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterButton: { flex: 1, minHeight: 42, paddingHorizontal: 7 },
  filterLabel: { fontSize: 11 },
  productCard: { gap: 14 },
  productTop: { flexDirection: "row", gap: 13 },
  productImage: { width: 76, height: 92, borderRadius: 14, backgroundColor: "#101010" },
  videoImage: { borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  videoMark: { fontSize: 22, fontWeight: "900" },
  videoLabel: { fontSize: 10, fontWeight: "800" },
  imagePlaceholder: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  placeholderMark: { fontSize: 31, fontWeight: "900" },
  productCopy: { flex: 1, gap: 6 },
  productTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 7 },
  productTitle: { flex: 1, fontSize: 16, fontWeight: "900", lineHeight: 20 },
  productSku: { fontSize: 11 },
  productPrice: { fontSize: 12, fontWeight: "900", lineHeight: 18 },
  mediaCount: { fontSize: 10, fontWeight: "700" },
  productMetaRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#FFFFFF12", paddingTop: 11 },
  metaText: { fontSize: 11, fontWeight: "700" },
  productActions: { flexDirection: "row", gap: 9 },
  productAction: { flex: 1, minHeight: 42 },
  errorCard: { borderColor: "#633A36" },
  errorTitle: { fontSize: 14, fontWeight: "900", marginBottom: 5 },
  errorText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  retryButton: { alignSelf: "flex-start", minHeight: 40 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 46, gap: 10 },
  emptyCard: { alignItems: "center", paddingVertical: 28 },
  emptyMark: { fontSize: 42, fontWeight: "900", marginBottom: 10 },
  emptyTitle: { textAlign: "center", fontSize: 18, fontWeight: "900", lineHeight: 24 },
  emptyText: { textAlign: "center", fontSize: 12, lineHeight: 18 },
  emptyButton: { marginTop: 16, minWidth: 190 },
  footerLoading: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 18 },
  bentoCard: { borderRadius: 15 },
  spatialCard: { borderRadius: 30, marginVertical: 4 },
  terminalCard: { borderRadius: 9, borderLeftWidth: 3 },
  neumorphicCard: { borderRadius: 21, shadowOpacity: 0.24, shadowRadius: 18 },
  cyberCard: { borderRadius: 24, borderTopWidth: 2 },
  spatialTop: { flexDirection: "column", alignItems: "center" },
  terminalTop: { gap: 10 },
  terminalActions: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#FFFFFF18", paddingTop: 10 },
  bentoActions: { gap: 6 },
});
