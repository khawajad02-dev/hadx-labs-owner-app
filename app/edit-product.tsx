import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet, apiPut } from "@/lib/api-client";

export default function EditProductScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", sku: "", price: "", description: "", category: "", stockQuantity: "0", status: "DRAFT" });

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        const response = await apiGet(`/products/${id}`);
        const product = response.data;
        setForm({
          title: product.title || "",
          sku: product.sku || "",
          price: String((product.priceInCents || 0) / 100),
          description: product.description || "",
          category: product.category || "",
          stockQuantity: String(product.stockQuantity ?? 0),
          status: product.status || "DRAFT",
        });
      } catch (error) {
        console.error("Product load error:", error);
        Alert.alert("Could not load product", "Please return to the catalog and try again.", [{ text: "Back", onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    };
    void loadProduct();
  }, [id, router]);

  const update = (field: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const save = async () => {
    const price = Number(form.price);
    const stockQuantity = Number(form.stockQuantity);
    if (!form.title.trim() || !form.sku.trim() || !Number.isFinite(price) || price <= 0 || !Number.isFinite(stockQuantity) || stockQuantity < 0) {
      Alert.alert("Check the product details", "Title, SKU, price and valid stock are required.");
      return;
    }

    setSaving(true);
    try {
      await apiPut(`/products/${id}`, {
        title: form.title.trim(),
        sku: form.sku.trim(),
        price,
        description: form.description.trim(),
        category: form.category.trim(),
        stockQuantity: Math.floor(stockQuantity),
        status: form.status,
      });
      Alert.alert("Piece updated", "Your catalog changes are saved.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (error: any) {
      console.error("Product update error:", error);
      Alert.alert("Could not update product", error?.response?.data?.error || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Opening product details…</Text></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SectionHeading eyebrow="ATELIER / EDIT PIECE" title="Refine product" detail="Keep the catalog precise and current." action={<LuxuryButton label="Close" onPress={() => router.back()} variant="ghost" style={styles.closeButton} />} />
        <LuxuryCard accent style={styles.stateCard}>
          <View style={styles.stateRow}><Text style={[styles.stateLabel, { color: colors.muted }]}>CURRENT STATE</Text><StatusPill label={form.status === "PUBLISHED" ? "Live" : "Draft"} tone={form.status === "PUBLISHED" ? "success" : "warning"} /></View>
          <Text style={[styles.stateTitle, { color: colors.foreground }]}>{form.title || "Untitled piece"}</Text>
          <Text style={[styles.stateDetail, { color: colors.muted }]}>SKU {form.sku || "—"}</Text>
        </LuxuryCard>
        <LuxuryCard style={styles.formCard}>
          <TextInput placeholder="Product title" placeholderTextColor={`${colors.muted}B3`} value={form.title} onChangeText={(value) => update("title", value)} style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />
          <View style={styles.row}><TextInput placeholder="SKU" placeholderTextColor={`${colors.muted}B3`} value={form.sku} onChangeText={(value) => update("sku", value)} style={[styles.input, styles.half, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="Price" placeholderTextColor={`${colors.muted}B3`} keyboardType="decimal-pad" value={form.price} onChangeText={(value) => update("price", value)} style={[styles.input, styles.half, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View>
          <View style={styles.row}><TextInput placeholder="Category" placeholderTextColor={`${colors.muted}B3`} value={form.category} onChangeText={(value) => update("category", value)} style={[styles.input, styles.half, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="Stock" placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={form.stockQuantity} onChangeText={(value) => update("stockQuantity", value)} style={[styles.input, styles.half, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View>
          <TextInput placeholder="Description" placeholderTextColor={`${colors.muted}B3`} multiline value={form.description} onChangeText={(value) => update("description", value)} style={[styles.input, styles.description, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />
        </LuxuryCard>
        <View style={styles.actions}><LuxuryButton label="Save changes" onPress={() => void save()} variant="primary" loading={saving} style={styles.action} /><LuxuryButton label={form.status === "PUBLISHED" ? "Save as draft" : "Make live"} onPress={() => { update("status", form.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"); void save(); }} variant="secondary" loading={saving} style={styles.action} /></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  closeButton: { minHeight: 40, paddingHorizontal: 12 },
  stateCard: { gap: 9 },
  stateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stateLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  stateTitle: { fontSize: 22, fontWeight: "900" },
  stateDetail: { fontSize: 12 },
  formCard: { gap: 11 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  description: { minHeight: 120, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  actions: { gap: 10 },
  action: { width: "100%" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13 },
});
