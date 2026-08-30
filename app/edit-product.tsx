import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiGet, apiPut } from "@/lib/api-client";
import { uploadPickedMedia, type PickedMedia } from "@/lib/media-upload";
import { PRODUCT_SIZES } from "@/constants/product-sizes";

type EditableMedia = (PickedMedia & { id: string; url?: string }) | { id: string; url: string; type: "image" | "video"; fileName?: string };

export default function EditProductScreen() {
  const colors = useColors();
  const router = useRouter();
  const formShellStyle = colors.themeId === "bento-telemetry" ? styles.bentoShell : colors.themeId === "visionos-spatial" ? styles.spatialShell : colors.themeId === "cyberpunk-terminal" ? styles.terminalShell : colors.themeId === "neumorphic-luxe" ? styles.neumorphicShell : styles.cyberShell;
  const fieldStyle = colors.themeId === "bento-telemetry" ? styles.bentoField : colors.themeId === "visionos-spatial" ? styles.spatialField : colors.themeId === "cyberpunk-terminal" ? styles.terminalField : colors.themeId === "neumorphic-luxe" ? styles.neumorphicField : styles.cyberField;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<EditableMedia[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [drop, setDrop] = useState({ active: false, text: "", startsAt: "", endsAt: "" });
  const [colorVariants, setColorVariants] = useState<Array<{ name: string; imageUrl: string; sizes: string[]; stockBySize: Record<string, string> }>>([]);
  const [form, setForm] = useState({ title: "", sku: "", usdPrice: "", pkrPrice: "", inrPrice: "", description: "", category: "", stockQuantity: "0", status: "DRAFT" });

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        const response = await apiGet(`/products/${id}`);
        const product = response.data;
        setForm({ title: product.title || "", sku: product.sku || "", usdPrice: String(product.regionalPrices?.USD ?? (product.priceInCents || 0) / 100), pkrPrice: String(product.regionalPrices?.PKR ?? ""), inrPrice: String(product.regionalPrices?.INR ?? ""), description: product.description || "", category: product.category || "", stockQuantity: String(product.stockQuantity ?? 0), status: product.status || "DRAFT" });
        setSelectedSizes(Array.isArray(product.availableSizes) && product.availableSizes.length ? product.availableSizes : [...PRODUCT_SIZES]);
        setDrop(product.drop || { active: false, text: "", startsAt: "", endsAt: "" });
        setColorVariants((product.colorVariants || []).map((v: any) => ({ name: v.name || "", imageUrl: v.media?.[0]?.url || "", sizes: v.sizes || product.availableSizes || [...PRODUCT_SIZES], stockBySize: Object.fromEntries((v.sizes || product.availableSizes || [...PRODUCT_SIZES]).map((size: string) => [size, String(v.stockBySize?.[size] ?? 0)])) })));
        setDrop(product.drop || { active: false, text: "", startsAt: "", endsAt: "" });
        setColorVariants((product.colorVariants || []).map((v: any) => ({ name: v.name || "", imageUrl: v.media?.[0]?.url || "", sizes: v.sizes || product.availableSizes || [...PRODUCT_SIZES], stockBySize: Object.fromEntries((v.sizes || product.availableSizes || [...PRODUCT_SIZES]).map((size: string) => [size, String(v.stockBySize?.[size] ?? 0)])) })));
        setMedia((product.media || (product.imageUrl ? [{ url: product.imageUrl, type: "image" }] : [])).map((entry: { url: string; type: "image" | "video"; fileName?: string }, index: number) => ({ ...entry, id: `${entry.url}-${index}` })));
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

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow gallery access to add photos or videos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, quality: 1 });
    if (result.canceled) return;
    const additions = result.assets.map((asset, index) => ({ id: `${asset.assetId || asset.uri}-${Date.now()}-${index}`, uri: asset.uri, type: asset.type === "video" ? "video" as const : "image" as const, mimeType: asset.mimeType, fileName: asset.fileName }));
    setMedia((previous) => [...previous, ...additions.filter((item) => !previous.some((old) => ("uri" in old ? old.uri : old.url) === item.uri))]);
  };

  const save = async (statusOverride?: "DRAFT" | "PUBLISHED") => {
    const usd = Number(form.usdPrice);
    const pkr = Number(form.pkrPrice);
    const inr = Number(form.inrPrice);
    const stockQuantity = Number(form.stockQuantity);
    if (!form.title.trim() || !form.sku.trim() || !Number.isFinite(usd) || usd <= 0 || !Number.isFinite(pkr) || pkr <= 0 || !Number.isFinite(inr) || inr <= 0 || !Number.isFinite(stockQuantity) || stockQuantity < 0) {
      Alert.alert("Complete the product board", "Title, SKU, USD, PKR, INR and valid stock are required.");
      return;
    }
    if (!selectedSizes.length) {
      Alert.alert("Choose available sizes", "Select at least one size for this product.");
      return;
    }
    const savedStatus = statusOverride ?? form.status;
    setSaving(true);
    try {
      const uploaded: Array<{ url: string; type: "image" | "video"; fileName?: string }> = [];
      for (const [index, item] of media.entries()) {
        if ("uri" in item) {
          const result = await uploadPickedMedia(item);
          uploaded.push({ url: result.publicUrl, type: result.type, fileName: item.fileName || undefined });
        } else uploaded.push({ url: item.url, type: item.type, fileName: item.fileName });
        if (index % 2 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      await apiPut(`/products/${id}`, { title: form.title.trim(), sku: form.sku.trim(), price: usd, regionalPrices: { USD: usd, PKR: pkr, INR: inr }, sizes: selectedSizes, media: uploaded, imageUrl: uploaded[0]?.url, description: form.description.trim(), category: form.category.trim(), stockQuantity: Math.floor(stockQuantity), status: savedStatus, drop, colorVariants: colorVariants.map((variant) => ({ ...variant, media: variant.imageUrl ? [{ url: variant.imageUrl, type: "image" }] : [], stockBySize: Object.fromEntries(Object.entries(variant.stockBySize).map(([size, value]) => [size, Number(value) || 0])) })), });
      Alert.alert(savedStatus === "PUBLISHED" ? "Piece is live" : "Piece saved as draft", savedStatus === "PUBLISHED" ? "The product is now visible in your storefront." : "Your catalog changes are saved as a draft.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (error: any) {
      console.error("Product update error:", error);
      Alert.alert("Could not update product", error?.response?.data?.error || error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.muted }]}>Opening product details…</Text></View></ScreenContainer>;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <SectionHeading eyebrow="ATELIER / EDIT PIECE" title="Refine product" detail="Keep the catalog precise and current." action={<LuxuryButton label="Close" onPress={() => router.back()} variant="ghost" style={styles.closeButton} />} />
        <LuxuryCard accent style={[styles.stateCard, formShellStyle]}><View style={styles.stateRow}><Text style={[styles.stateLabel, { color: colors.muted }]}>CURRENT STATE</Text><StatusPill label={form.status === "PUBLISHED" ? "Live" : "Draft"} tone={form.status === "PUBLISHED" ? "success" : "warning"} /></View><Text style={[styles.stateTitle, { color: colors.foreground }]}>{form.title || "Untitled piece"}</Text><Text style={[styles.stateDetail, { color: colors.muted }]}>SKU {form.sku || "—"}</Text></LuxuryCard>
        <LuxuryCard style={[styles.mediaCard, formShellStyle]}><View style={styles.mediaHeader}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.eyebrow, { color: colors.primary }]}>MEDIA GALLERY</Text><Text style={[styles.mediaTitle, { color: colors.foreground }]}>Replace or add media</Text><Text style={[styles.mediaDetail, { color: colors.muted }]}>Keep as many product photos and videos as you need.</Text></View><StatusPill label={`${media.length} selected`} tone={media.length ? "success" : "neutral"} /></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaStrip}>{media.map((item, index) => <View key={item.id} style={styles.mediaItem}>{item.type === "image" ? <Image source={{ uri: "uri" in item ? item.uri : item.url }} style={styles.mediaPreview} resizeMode="cover" /> : <View style={[styles.mediaPreview, styles.videoPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}><Text style={[styles.videoMark, { color: colors.primary }]}>▶</Text><Text style={[styles.videoLabel, { color: colors.foreground }]}>Video</Text></View>}<Pressable onPress={() => setMedia((previous) => previous.filter((selected) => selected.id !== item.id))} style={[styles.removeBadge, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.removeBadgeText, { color: colors.foreground }]}>×</Text></Pressable><Text style={[styles.mediaIndex, { color: colors.muted }]}>{index + 1}</Text></View>)}</ScrollView><LuxuryButton label="Add more photos / videos" onPress={pickMedia} variant="primary" style={styles.addMediaButton} disabled={saving} /></LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}><Text style={[styles.formTitle, { color: colors.foreground }]}>Drop release</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Manual controls only — publish when you choose.</Text><View style={styles.row}><Pressable onPress={() => setDrop((v) => ({ ...v, active: !v.active }))} style={[styles.sizeChip, { borderColor: drop.active ? colors.primary : colors.border, backgroundColor: drop.active ? `${colors.primary}20` : `${colors.background}CC` }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{drop.active ? "DROP ACTIVE" : "DROP OFF"}</Text></Pressable><TextInput placeholder="LIMITED DROP // LAUNCHING SOON" placeholderTextColor={`${colors.muted}B3`} value={drop.text} onChangeText={(text) => setDrop((v) => ({ ...v, text }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.row}><TextInput placeholder="Start date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.startsAt} onChangeText={(startsAt) => setDrop((v) => ({ ...v, startsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="End date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.endsAt} onChangeText={(endsAt) => setDrop((v) => ({ ...v, endsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View></LuxuryCard><LuxuryCard style={[styles.formCard, formShellStyle]}><Text style={[styles.formTitle, { color: colors.foreground }]}>Color variant manager</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Keep product identity unified; map image URL, sizes, and stock per color.</Text>{colorVariants.map((variant, index) => <View key={`${variant.name}-${index}`} style={[styles.variantBox, { borderColor: colors.border }]}><View style={styles.row}><TextInput placeholder="Color name" placeholderTextColor={`${colors.muted}B3`} value={variant.name} onChangeText={(name) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, name } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="Uploaded image URL" placeholderTextColor={`${colors.muted}B3`} value={variant.imageUrl} onChangeText={(imageUrl) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, imageUrl } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.sizeGrid}>{PRODUCT_SIZES.map((size) => <Pressable key={size} onPress={() => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, sizes: v.sizes.includes(size) ? v.sizes.filter((x) => x !== size) : [...v.sizes, size] } : v))} style={[styles.sizeChip, { borderColor: variant.sizes.includes(size) ? colors.primary : colors.border }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{size} · {variant.stockBySize[size] || "0"}</Text></Pressable>)}</View><View style={styles.row}>{(variant.sizes.length ? variant.sizes : PRODUCT_SIZES.slice(0, 1)).map((size) => <TextInput key={size} placeholder={`${size} stock`} placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={variant.stockBySize[size] || ""} onChangeText={(value) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, stockBySize: { ...v.stockBySize, [size]: value } } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />)}</View><LuxuryButton label="Remove color" onPress={() => setColorVariants((all) => all.filter((_, i) => i !== index))} variant="ghost" /></View>)}<LuxuryButton label="Add color variant" onPress={() => setColorVariants((all) => [...all, { name: "", imageUrl: "", sizes: [...PRODUCT_SIZES], stockBySize: {} }])} variant="secondary" /></LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}><Text style={[styles.formTitle, { color: colors.foreground }]}>Drop release</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Manual controls only — publish when you choose.</Text><View style={styles.row}><Pressable onPress={() => setDrop((v) => ({ ...v, active: !v.active }))} style={[styles.sizeChip, { borderColor: drop.active ? colors.primary : colors.border, backgroundColor: drop.active ? `${colors.primary}20` : `${colors.background}CC` }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{drop.active ? "DROP ACTIVE" : "DROP OFF"}</Text></Pressable><TextInput placeholder="LIMITED DROP // LAUNCHING SOON" placeholderTextColor={`${colors.muted}B3`} value={drop.text} onChangeText={(text) => setDrop((v) => ({ ...v, text }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.row}><TextInput placeholder="Start date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.startsAt} onChangeText={(startsAt) => setDrop((v) => ({ ...v, startsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="End date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.endsAt} onChangeText={(endsAt) => setDrop((v) => ({ ...v, endsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View></LuxuryCard><LuxuryCard style={[styles.formCard, formShellStyle]}><Text style={[styles.formTitle, { color: colors.foreground }]}>Color variant manager</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Keep product identity unified; map image URL, sizes, and stock per color.</Text>{colorVariants.map((variant, index) => <View key={`${variant.name}-${index}`} style={[styles.variantBox, { borderColor: colors.border }]}><View style={styles.row}><TextInput placeholder="Color name" placeholderTextColor={`${colors.muted}B3`} value={variant.name} onChangeText={(name) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, name } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="Uploaded image URL" placeholderTextColor={`${colors.muted}B3`} value={variant.imageUrl} onChangeText={(imageUrl) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, imageUrl } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.sizeGrid}>{PRODUCT_SIZES.map((size) => <Pressable key={size} onPress={() => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, sizes: v.sizes.includes(size) ? v.sizes.filter((x) => x !== size) : [...v.sizes, size] } : v))} style={[styles.sizeChip, { borderColor: variant.sizes.includes(size) ? colors.primary : colors.border }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{size} · {variant.stockBySize[size] || "0"}</Text></Pressable>)}</View><View style={styles.row}>{(variant.sizes.length ? variant.sizes : PRODUCT_SIZES.slice(0, 1)).map((size) => <TextInput key={size} placeholder={`${size} stock`} placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={variant.stockBySize[size] || ""} onChangeText={(value) => setColorVariants((all) => all.map((v, i) => i === index ? { ...v, stockBySize: { ...v.stockBySize, [size]: value } } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />)}</View><LuxuryButton label="Remove color" onPress={() => setColorVariants((all) => all.filter((_, i) => i !== index))} variant="ghost" /></View>)}<LuxuryButton label="Add color variant" onPress={() => setColorVariants((all) => [...all, { name: "", imageUrl: "", sizes: [...PRODUCT_SIZES], stockBySize: {} }])} variant="secondary" /></LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}><TextInput placeholder="Product title" placeholderTextColor={`${colors.muted}B3`} value={form.title} onChangeText={(value) => update("title", value)} style={[styles.input, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><View style={styles.row}><TextInput placeholder="SKU" placeholderTextColor={`${colors.muted}B3`} value={form.sku} onChangeText={(value) => update("sku", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="USD base" placeholderTextColor={`${colors.muted}B3`} keyboardType="decimal-pad" value={form.usdPrice} onChangeText={(value) => update("usdPrice", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.row}><TextInput placeholder="PKR" placeholderTextColor={`${colors.muted}B3`} keyboardType="decimal-pad" value={form.pkrPrice} onChangeText={(value) => update("pkrPrice", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="INR" placeholderTextColor={`${colors.muted}B3`} keyboardType="decimal-pad" value={form.inrPrice} onChangeText={(value) => update("inrPrice", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.sizeGroup}><Text style={[styles.inputLabel, { color: colors.muted }]}>Available sizes</Text><Text style={[styles.sizeHint, { color: colors.muted }]}>Tap each size to add or remove it from this product.</Text><View style={styles.sizeGrid}>{PRODUCT_SIZES.map((size) => { const selected = selectedSizes.includes(size); return <Pressable key={size} onPress={() => setSelectedSizes((current) => selected ? current.filter((item) => item !== size) : [...current, size])} style={[styles.sizeChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}20` : `${colors.background}CC` }]}><Text style={[styles.sizeTick, { color: selected ? colors.primary : colors.muted }]}>{selected ? "✓" : "○"}</Text><Text style={[styles.sizeText, { color: colors.foreground }]}>{size}</Text></Pressable>; })}</View></View><View style={styles.row}><TextInput placeholder="Category" placeholderTextColor={`${colors.muted}B3`} value={form.category} onChangeText={(value) => update("category", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="Stock" placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={form.stockQuantity} onChangeText={(value) => update("stockQuantity", value)} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><TextInput placeholder="Description" placeholderTextColor={`${colors.muted}B3`} multiline value={form.description} onChangeText={(value) => update("description", value)} style={[styles.input, styles.description, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></LuxuryCard>
        <View style={styles.actions}><LuxuryButton label="Save changes" onPress={() => void save()} variant="primary" loading={saving} style={styles.action} /><LuxuryButton label={form.status === "PUBLISHED" ? "Save as draft" : "Make live"} onPress={() => { const next = form.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"; update("status", next); void save(next); }} variant="secondary" loading={saving} style={styles.action} /></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 16 }, closeButton: { minHeight: 40, paddingHorizontal: 12 }, stateCard: { gap: 9 }, stateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, stateLabel: { fontSize: 10, fontWeight: "900", letterSpacing: 2 }, stateTitle: { fontSize: 22, fontWeight: "900" }, stateDetail: { fontSize: 12 }, mediaCard: { gap: 10 }, mediaHeader: { flexDirection: "row", gap: 10 }, eyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2 }, mediaTitle: { fontSize: 17, fontWeight: "900" }, mediaDetail: { fontSize: 12, lineHeight: 18 }, mediaStrip: { gap: 10, paddingVertical: 5 }, mediaItem: { width: 110, height: 133, position: "relative" }, mediaPreview: { width: 110, height: 110, borderRadius: 15, backgroundColor: "#101010" }, videoPreview: { borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 }, videoMark: { fontSize: 25, fontWeight: "900" }, videoLabel: { fontSize: 11, fontWeight: "800" }, removeBadge: { position: "absolute", top: 6, right: 6, width: 27, height: 27, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, removeBadgeText: { fontSize: 20, lineHeight: 21 }, mediaIndex: { fontSize: 10, marginTop: 3 }, addMediaButton: { marginTop: 3 }, formCard: { gap: 11 }, formTitle: { fontSize: 17, fontWeight: "900" }, formDetail: { fontSize: 12, lineHeight: 18 }, variantBox: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 9 }, input: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },   description: { minHeight: 120, textAlignVertical: "top" },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  sizeGroup: { gap: 6 },
  sizeHint: { fontSize: 11, lineHeight: 17 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip: { minWidth: 58, minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  sizeTick: { fontSize: 16, fontWeight: "900" },
  sizeText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  row: { flexDirection: "row", gap: 10 }, half: { flex: 1 },   actions: { gap: 10 }, action: { width: "100%" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 }, loadingText: { fontSize: 13 },
  bentoShell: { borderRadius: 15, borderLeftWidth: 3 },
  spatialShell: { borderRadius: 30, marginVertical: 4 },
  terminalShell: { borderRadius: 9, borderLeftWidth: 3 },
  neumorphicShell: { borderRadius: 22, shadowOpacity: 0.28, shadowRadius: 18 },
  cyberShell: { borderRadius: 24, borderTopWidth: 2 },
  bentoField: { borderRadius: 10 },
  spatialField: { borderRadius: 22 },
  terminalField: { borderRadius: 6, fontFamily: "monospace" },
  neumorphicField: { borderRadius: 20, shadowOpacity: 0.18, shadowRadius: 10 },
  cyberField: { borderRadius: 14 },
});
