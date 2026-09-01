import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiPost } from "@/lib/api-client";
import { uploadPickedMedia, type PickedMedia } from "@/lib/media-upload";
import { PRODUCT_SIZES } from "@/constants/product-sizes";

type SelectedMedia = PickedMedia & { id: string };

function makeSku(title: string) {
  const slug = title.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16) || "PIECE";
  return `HADX-${slug}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

type ProductInputFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  fieldStyle?: StyleProp<TextStyle>;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
  placeholder?: string;
};

function ProductInputField({ label, value, onChangeText, colors, fieldStyle, keyboardType = "default", multiline = false, placeholder }: ProductInputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        returnKeyType={multiline ? "default" : "done"}
        placeholder={placeholder}
        placeholderTextColor={`${colors.muted}B3`}
        style={[styles.input, fieldStyle, { backgroundColor: `${colors.background}CC`, color: colors.foreground, borderColor: colors.border, minHeight: multiline ? 116 : 52 }]}
      />
    </View>
  );
}

export default function AddProductScreen() {
  const colors = useColors();
  const router = useRouter();
  const formShellStyle = colors.themeId === "bento-telemetry" ? styles.bentoShell : colors.themeId === "visionos-spatial" ? styles.spatialShell : colors.themeId === "cyberpunk-terminal" ? styles.terminalShell : colors.themeId === "neumorphic-luxe" ? styles.neumorphicShell : styles.cyberShell;
  const fieldStyle = colors.themeId === "bento-telemetry" ? styles.bentoField : colors.themeId === "visionos-spatial" ? styles.spatialField : colors.themeId === "cyberpunk-terminal" ? styles.terminalField : colors.themeId === "neumorphic-luxe" ? styles.neumorphicField : styles.cyberField;
  const actionLayoutStyle = colors.themeId === "bento-telemetry" ? styles.bentoActions : colors.themeId === "visionos-spatial" ? styles.spatialActions : colors.themeId === "cyberpunk-terminal" ? styles.terminalActions : undefined;
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [stockBySize, setStockBySize] = useState<Record<string, string>>({});
  const [drop, setDrop] = useState({ active: false, text: "", startsAt: "", endsAt: "" });
  const [colorVariants, setColorVariants] = useState<Array<{ name: string; imageUrl: string; imageUri?: string; colorMedia: Array<{ id: string; uri?: string; url?: string; type: "image" | "video"; mimeType?: string | null; fileName?: string | null }>; sizes: string[]; stockBySize: Record<string, string> }>>([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const selectedVariant = colorVariants[selectedColorIndex];
  const [form, setForm] = useState({ title: "", sku: "", usdPrice: "", pkrPrice: "", inrPrice: "", description: "", category: "", stockQuantity: "10" });

  const updateForm = (field: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [field]: value }));

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow gallery access so you can select product images and videos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    const additions = result.assets.map((asset, index) => ({
      id: `${asset.assetId || asset.uri}-${Date.now()}-${index}`,
      uri: asset.uri,
      type: asset.type === "video" ? "video" as const : "image" as const,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    }));
    setMedia((previous) => [...previous, ...additions.filter((item) => !previous.some((old) => old.uri === item.uri))]);
  };
  const pickColorMedia = async (index: number) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert("Gallery access needed", "Allow gallery access to choose color photos and videos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], allowsMultipleSelection: true, quality: 1 });
    if (result.canceled || !result.assets?.length) return;
    const additions = result.assets.map((asset, assetIndex) => ({ id: `${asset.assetId || asset.uri}-${Date.now()}-${assetIndex}`, uri: asset.uri, type: asset.type === "video" ? "video" as const : "image" as const, mimeType: asset.mimeType, fileName: asset.fileName }));
    setColorVariants((all) => all.map((variant, variantIndex) => variantIndex === index ? { ...variant, colorMedia: [...variant.colorMedia, ...additions.filter((item) => !variant.colorMedia.some((old) => (old.uri || old.url) === item.uri))] } : variant));
  };

  const removeColorMedia = (variantIndex: number, mediaId: string) => setColorVariants((all) => all.map((variant, index) => index === variantIndex ? { ...variant, colorMedia: variant.colorMedia.filter((item) => item.id !== mediaId) } : variant));

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    const usd = Number(form.usdPrice);
    const pkr = Number(form.pkrPrice);
    const inr = Number(form.inrPrice);
    const sizeStock = Object.fromEntries(selectedSizes.map((size) => [size, Math.max(0, Number(stockBySize[size]) || 0)]));
    const stock = Object.values(sizeStock).reduce((total, value) => total + value, 0);
    if (!form.title.trim() || !form.sku.trim() || !Number.isFinite(usd) || usd <= 0 || !Number.isFinite(pkr) || pkr <= 0 || !Number.isFinite(inr) || inr <= 0) {
      Alert.alert("Complete the price board", "Title, SKU and all three regional prices (USD, PKR and INR) are required.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      Alert.alert("Check stock quantity", "Stock must be zero or a positive number.");
      return;
    }
    if (!selectedSizes.length) {
      Alert.alert("Choose available sizes", "Select at least one size for this product.");
      return;
    }

    setLoading(true);
    setUploadProgress("");
    try {
      const uploadedMedia: Array<{ url: string; type: "image" | "video"; fileName?: string }> = [];
      for (let index = 0; index < media.length; index += 1) {
        setUploadProgress(`Uploading media ${index + 1} of ${media.length}…`);
        const uploaded = await uploadPickedMedia(media[index]);
        uploadedMedia.push({ url: uploaded.publicUrl, type: uploaded.type, fileName: media[index].fileName || undefined });
      }

      const savedColorVariants = [];
      for (const variant of colorVariants) {
        const savedMedia: Array<{ url: string; type: "image" | "video"; fileName?: string }> = [];
        if (variant.imageUrl && !variant.colorMedia.length) savedMedia.push({ url: variant.imageUrl, type: "image" });
        for (const asset of variant.colorMedia) {
          if (asset.uri) {
            const uploaded = await uploadPickedMedia({ uri: asset.uri, type: asset.type, mimeType: asset.mimeType, fileName: asset.fileName });
            savedMedia.push({ url: uploaded.publicUrl, type: uploaded.type, fileName: asset.fileName || undefined });
          } else if (asset.url) savedMedia.push({ url: asset.url, type: asset.type, fileName: asset.fileName || undefined });
        }
        savedColorVariants.push({ name: variant.name.trim(), media: savedMedia, sizes: variant.sizes, stockBySize: Object.fromEntries(Object.entries(variant.stockBySize).map(([size, value]) => [size, Number(value) || 0])) });
      }

      await apiPost("/products", {
        title: form.title.trim(),
        sku: form.sku.trim(),
        price: usd,
        currency: "USD",
        regionalPrices: { USD: usd, PKR: pkr, INR: inr },
        sizes: selectedSizes,
        media: uploadedMedia,
        imageUrl: uploadedMedia[0]?.url,
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        stockQuantity: Math.floor(stock),
        stockBySize: sizeStock,
        status,
        drop, colorVariants: savedColorVariants,
      });

      Alert.alert("Piece secured", status === "PUBLISHED" ? "The product is now live in your atelier." : "The product was saved as a draft.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (error: any) {
      console.error("Save product error:", error);
      Alert.alert("Could not save product", error?.response?.data?.error || error?.message || "Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <View style={styles.topRow}><SectionHeading eyebrow="ATELIER / NEW PIECE" title="Create product" detail="Build the product once. Let the storefront do the selling." /><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.closePressed]}><Text style={[styles.closeText, { color: colors.muted }]}>Close</Text></Pressable></View>

        <LuxuryCard accent style={[styles.mediaCard, formShellStyle]}>
          <View style={styles.mediaHeader}><View style={styles.mediaCopy}><Text style={[styles.sectionEyebrow, { color: colors.primary }]}>MEDIA GALLERY</Text><Text style={[styles.mediaTitle, { color: colors.foreground }]}>Choose as many as you want</Text><Text style={[styles.mediaDetail, { color: colors.muted }]}>Images and videos from your phone gallery. No URL copying.</Text></View><StatusPill label={`${media.length} selected`} tone={media.length ? "success" : "neutral"} /></View>
          {media.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaStrip}>{media.map((item, index) => <View key={item.id} style={styles.mediaItem}>{item.type === "image" ? <Image source={{ uri: item.uri }} style={styles.mediaPreview} resizeMode="cover" /> : <View style={[styles.videoPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}><Text style={[styles.videoMark, { color: colors.primary }]}>▶</Text><Text style={[styles.videoText, { color: colors.foreground }]}>Video</Text></View>}<Pressable onPress={() => setMedia((previous) => previous.filter((selected) => selected.id !== item.id))} style={[styles.removeBadge, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.removeBadgeText, { color: colors.foreground }]}>×</Text></Pressable><Text style={[styles.mediaIndex, { color: colors.muted }]}>{index + 1}</Text></View>)}</ScrollView> : <View style={[styles.emptyMedia, { borderColor: colors.border }]}><Text style={[styles.emptyMediaMark, { color: colors.primary }]}>＋</Text><Text style={[styles.emptyMediaTitle, { color: colors.foreground }]}>Your gallery is empty for this piece</Text><Text style={[styles.mediaDetail, { color: colors.muted }]}>Tap below to choose photos or videos.</Text></View>}
          <View style={styles.mediaActions}><LuxuryButton label={media.length ? "Add more photos / videos" : "Open gallery"} onPress={pickMedia} variant="primary" style={styles.mediaButton} disabled={loading} />{media.length ? <LuxuryButton label="Clear all" onPress={() => setMedia([])} variant="ghost" style={styles.removeButton} disabled={loading} /> : null}</View>
          {uploadProgress ? <Text style={[styles.uploadProgress, { color: colors.primary }]}>{uploadProgress}</Text> : null}
        </LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}><Text style={[styles.formTitle, { color: colors.foreground }]}>Drop release</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Optional separate release control. It does not force a timer.</Text><View style={styles.row}><Pressable onPress={() => setDrop((v) => ({ ...v, active: !v.active }))} style={[styles.sizeChip, { borderColor: drop.active ? colors.primary : colors.border, backgroundColor: drop.active ? `${colors.primary}20` : `${colors.background}CC` }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{drop.active ? "DROP ACTIVE" : "DROP OFF"}</Text></Pressable><TextInput placeholder="LIMITED DROP // LAUNCHING SOON" placeholderTextColor={`${colors.muted}B3`} value={drop.text} onChangeText={(text) => setDrop((v) => ({ ...v, text }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View><View style={styles.row}><TextInput placeholder="Start date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.startsAt} onChangeText={(startsAt) => setDrop((v) => ({ ...v, startsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><TextInput placeholder="End date/time (optional)" placeholderTextColor={`${colors.muted}B3`} value={drop.endsAt} onChangeText={(endsAt) => setDrop((v) => ({ ...v, endsAt }))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /></View></LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}>
          <View style={styles.sectionHeader}><View style={{ flex: 1, gap: 4 }}><Text style={[styles.formTitle, { color: colors.foreground }]}>Color variants</Text><Text style={[styles.formDetail, { color: colors.muted }]}>Choose a color below, then set only that color’s image, sizes, and stock.</Text></View><StatusPill label={`${colorVariants.length} colors`} tone={colorVariants.length ? "success" : "neutral"} /></View>
          <View style={styles.variantPalette}>{colorVariants.map((variant, index) => <Pressable key={`${variant.name}-${index}`} onPress={() => setSelectedColorIndex(index)} style={[styles.colorChoice, { borderColor: selectedColorIndex === index ? colors.primary : colors.border, backgroundColor: selectedColorIndex === index ? `${colors.primary}18` : `${colors.background}CC` }]}><View style={[styles.swatchDot, { backgroundColor: variant.name.toLowerCase().includes("white") ? "#F5F3EE" : variant.name.toLowerCase().includes("silver") ? "#A7AFB8" : variant.name.toLowerCase().includes("red") ? "#8F2A2A" : "#111111", borderColor: colors.border }]} /><Text style={[styles.colorChoiceText, { color: colors.foreground }]}>{variant.name || `Color ${index + 1}`}</Text></Pressable>)}</View>
          {selectedVariant ? <View style={[styles.variantEditor, { borderColor: colors.border }]}><View style={styles.row}><TextInput placeholder="Color name" placeholderTextColor={`${colors.muted}B3`} value={selectedVariant.name} onChangeText={(name) => setColorVariants((all) => all.map((v, i) => i === selectedColorIndex ? { ...v, name } : v))} style={[styles.input, styles.half, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} /><LuxuryButton label="Remove" onPress={() => { setColorVariants((all) => all.filter((_, i) => i !== selectedColorIndex)); setSelectedColorIndex((current) => Math.max(0, Math.min(current, colorVariants.length - 2))); }} variant="ghost" /></View><View style={styles.imageMapping}><View style={{ flex: 1, gap: 3 }}><Text style={[styles.inputLabel, { color: colors.muted }]}>Color media</Text><Text style={[styles.sizeHint, { color: colors.muted }]}>Add as many photos or videos as you need for this color.</Text></View><LuxuryButton label={selectedVariant.colorMedia.length ? "Add more media" : "Choose media"} onPress={() => void pickColorMedia(selectedColorIndex)} variant="secondary" disabled={loading} /></View>{selectedVariant.colorMedia.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaStrip}>{selectedVariant.colorMedia.map((asset) => <View key={asset.id} style={styles.mediaItem}>{asset.type === "image" ? <Image source={{ uri: asset.uri || asset.url }} style={styles.mediaPreview} resizeMode="cover" /> : <View style={[styles.mediaPreview, styles.videoPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}><Text style={[styles.videoMark, { color: colors.primary }]}>▶</Text><Text style={[styles.videoText, { color: colors.foreground }]}>Video</Text></View>}<Pressable onPress={() => removeColorMedia(selectedColorIndex, asset.id)} style={[styles.removeBadge, { backgroundColor: colors.background, borderColor: colors.border }]}><Text style={[styles.removeBadgeText, { color: colors.foreground }]}>×</Text></Pressable></View>)}</ScrollView> : null}<Text style={[styles.inputLabel, { color: colors.muted }]}>Available sizes and stock</Text><View style={styles.sizeGrid}>{PRODUCT_SIZES.map((size) => <Pressable key={size} onPress={() => setColorVariants((all) => all.map((v, i) => i === selectedColorIndex ? { ...v, sizes: v.sizes.includes(size) ? v.sizes.filter((x) => x !== size) : [...v.sizes, size] } : v))} style={[styles.sizeChip, { borderColor: selectedVariant.sizes.includes(size) ? colors.primary : colors.border, backgroundColor: selectedVariant.sizes.includes(size) ? `${colors.primary}18` : `${colors.background}CC` }]}><Text style={[styles.sizeText, { color: colors.foreground }]}>{size}</Text></Pressable>)}</View><View style={styles.stockGrid}>{(selectedVariant.sizes.length ? selectedVariant.sizes : PRODUCT_SIZES.slice(0, 1)).map((size) => <TextInput key={size} placeholder={`${size} stock`} placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={selectedVariant.stockBySize[size] || ""} onChangeText={(value) => setColorVariants((all) => all.map((v, i) => i === selectedColorIndex ? { ...v, stockBySize: { ...v.stockBySize, [size]: value } } : v))} style={[styles.input, styles.stockInput, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />)}</View></View> : <Text style={[styles.sizeHint, { color: colors.muted }]}>Add a color to begin mapping its image, sizes, and stock.</Text>}
          <LuxuryButton label="Add color" onPress={() => { setColorVariants((all) => [...all, { name: "", imageUrl: "", imageUri: "", colorMedia: [], sizes: [...PRODUCT_SIZES], stockBySize: {} }]); setSelectedColorIndex(colorVariants.length); }} variant="secondary" />
        </LuxuryCard>
        <LuxuryCard style={[styles.formCard, formShellStyle]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Product identity</Text><Text style={[styles.formDetail, { color: colors.muted }]}>SKU means Stock Keeping Unit: the unique internal code for finding and managing this product. You can generate it automatically.</Text>
          <View style={styles.formGap}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Product title" value={form.title} onChangeText={(value) => updateForm("title", value)} placeholder="e.g. Obsidian Signature Tee" /><View style={styles.skuRow}><View style={styles.skuInput}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="SKU / internal product code" value={form.sku} onChangeText={(value) => updateForm("sku", value)} placeholder="HADX-OBSIDIAN-001" /></View><LuxuryButton label="Auto-generate" onPress={() => updateForm("sku", makeSku(form.title))} variant="ghost" style={styles.skuButton} disabled={loading} /></View><View style={styles.twoColumn}><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="USD (global base)" value={form.usdPrice} onChangeText={(value) => updateForm("usdPrice", value)} keyboardType="decimal-pad" placeholder="120" /></View><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="PKR (Pakistan)" value={form.pkrPrice} onChangeText={(value) => updateForm("pkrPrice", value)} keyboardType="decimal-pad" placeholder="35000" /></View></View><View style={styles.twoColumn}><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="INR (India)" value={form.inrPrice} onChangeText={(value) => updateForm("inrPrice", value)} keyboardType="decimal-pad" placeholder="10000" /></View></View><Text style={[styles.priceNote, { color: colors.muted }]}>These are owner-set regional prices. Customers see the correct one based on their selected/ detected region; prices are not silently guessed from exchange rates.</Text><View style={styles.sizeGroup}><Text style={[styles.inputLabel, { color: colors.muted }]}>Available sizes</Text><Text style={[styles.sizeHint, { color: colors.muted }]}>Tap each size to add or remove it from this product.</Text><View style={styles.sizeGrid}>{PRODUCT_SIZES.map((size) => { const selected = selectedSizes.includes(size); return <Pressable key={size} onPress={() => setSelectedSizes((current) => selected ? current.filter((item) => item !== size) : [...current, size])} style={[styles.sizeChip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? `${colors.primary}20` : `${colors.background}CC` }]}><Text style={[styles.sizeTick, { color: selected ? colors.primary : colors.muted }]}>{selected ? "✓" : "○"}</Text><Text style={[styles.sizeText, { color: colors.foreground }]}>{size}</Text></Pressable>; })}</View></View><View style={styles.sizeStockCard}><Text style={[styles.inputLabel, { color: colors.muted }]}>Stock by size</Text><Text style={[styles.sizeHint, { color: colors.muted }]}>Select a size above, then enter its stock quantity here.</Text><View style={styles.stockGrid}>{(selectedSizes.length ? selectedSizes : PRODUCT_SIZES).map((size) => <TextInput key={size} placeholder={`${size} stock`} placeholderTextColor={`${colors.muted}B3`} keyboardType="numeric" value={stockBySize[size] || ""} onChangeText={(value) => setStockBySize((current) => ({ ...current, [size]: value }))} style={[styles.input, styles.stockInput, fieldStyle, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]} />)}</View></View><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Category" value={form.category} onChangeText={(value) => updateForm("category", value)} placeholder="Atelier" /><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Description" value={form.description} onChangeText={(value) => updateForm("description", value)} multiline placeholder="Tell the story of this piece…" /></View>
        </LuxuryCard>
        <View style={[styles.footerActions, actionLayoutStyle]}><LuxuryButton label="Save draft" onPress={() => void handleSave("DRAFT")} variant="secondary" loading={loading} style={styles.footerButton} /><LuxuryButton label="Publish live" onPress={() => void handleSave("PUBLISHED")} variant="primary" loading={loading} style={styles.footerButton} /></View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 16 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  closeButton: { marginTop: 4, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  closePressed: { opacity: 0.65, transform: [{ scale: 0.97 }] },
  closeText: { fontSize: 12, fontWeight: "800" },
  mediaCard: { minHeight: 238 },
  mediaHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  mediaCopy: { flex: 1, gap: 5 },
  sectionEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.1 },
  mediaTitle: { fontSize: 18, fontWeight: "900" },
  mediaDetail: { fontSize: 12, lineHeight: 18 },
  mediaStrip: { gap: 10, paddingTop: 16, paddingBottom: 4 },
  mediaItem: { width: 118, height: 142, position: "relative" },
  mediaPreview: { width: 118, height: 118, borderRadius: 16, backgroundColor: "#101010" },
  videoPreview: { width: 118, height: 118, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, gap: 5 },
  videoMark: { fontSize: 28, fontWeight: "900" },
  videoText: { fontSize: 12, fontWeight: "900" },
  removeBadge: { position: "absolute", top: 7, right: 7, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  removeBadgeText: { fontSize: 21, lineHeight: 22 },
  mediaIndex: { fontSize: 10, fontWeight: "800", marginTop: 4 },
  emptyMedia: { minHeight: 130, borderRadius: 17, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 16 },
  emptyMediaMark: { fontSize: 28, fontWeight: "300" },
  emptyMediaTitle: { fontSize: 13, fontWeight: "800" },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  mediaButton: { flex: 1 },
  removeButton: { minWidth: 88 },
  uploadProgress: { fontSize: 11, fontWeight: "800", marginTop: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 }, variantPalette: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, colorChoice: { minHeight: 44, borderWidth: 1, borderRadius: 22, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 7 }, swatchDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 }, colorChoiceText: { fontSize: 12, fontWeight: "800" }, variantEditor: { borderWidth: 1, borderRadius: 16, padding: 10, gap: 10 }, imageMapping: { flexDirection: "row", alignItems: "center", gap: 10 }, variantImage: { width: 92, height: 112, borderRadius: 12 }, stockGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, stockInput: { flexGrow: 1, minWidth: 84 },
  sizeStockCard: { gap: 8, marginTop: 10 },
  formCard: { gap: 11 },
  formTitle: { fontSize: 18, fontWeight: "900" },
  formDetail: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  formGap: { gap: 13 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 20, textAlignVertical: "top" },
  skuRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  skuInput: { flex: 1 },
  skuButton: { minHeight: 52, paddingHorizontal: 10, marginBottom: 0 },
  twoColumn: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  priceNote: { fontSize: 11, lineHeight: 17, marginTop: -4 },
  sizeGroup: { gap: 6 },
  sizeHint: { fontSize: 11, lineHeight: 17 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sizeChip: { minWidth: 58, minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  sizeTick: { fontSize: 16, fontWeight: "900" },
  sizeText: { fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerButton: { flex: 1 },
  row: { flexDirection: "row", gap: 10 }, half: { flex: 1 }, variantBox: { borderWidth: 1, borderRadius: 14, padding: 10, gap: 9 },
  bentoShell: { borderRadius: 15, borderLeftWidth: 3 },
  spatialShell: { borderRadius: 30, marginVertical: 4 },
  terminalShell: { borderRadius: 9, borderLeftWidth: 3 },
  neumorphicShell: { borderRadius: 22, shadowOpacity: 0.28, shadowRadius: 18 },
  cyberShell: { borderRadius: 24, borderTopWidth: 2 },
  bentoField: { borderRadius: 10 },
  spatialField: { borderRadius: 22, minHeight: 58 },
  terminalField: { borderRadius: 6, fontFamily: "monospace" },
  neumorphicField: { borderRadius: 20, shadowOpacity: 0.18, shadowRadius: 10 },
  cyberField: { borderRadius: 14 },
  bentoActions: { gap: 6 },
  spatialActions: { gap: 14 },
  terminalActions: { borderTopWidth: 2, borderTopColor: "#2C6B2A", paddingTop: 10 },
});
