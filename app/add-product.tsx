import { useState } from "react";
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

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiPost } from "@/lib/api-client";
import { uploadPickedMedia, type PickedMedia } from "@/lib/media-upload";

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

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    const usd = Number(form.usdPrice);
    const pkr = Number(form.pkrPrice);
    const inr = Number(form.inrPrice);
    const stock = Number(form.stockQuantity);
    if (!form.title.trim() || !form.sku.trim() || !Number.isFinite(usd) || usd <= 0 || !Number.isFinite(pkr) || pkr <= 0 || !Number.isFinite(inr) || inr <= 0) {
      Alert.alert("Complete the price board", "Title, SKU and all three regional prices (USD, PKR and INR) are required.");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      Alert.alert("Check stock quantity", "Stock must be zero or a positive number.");
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

      await apiPost("/products", {
        title: form.title.trim(),
        sku: form.sku.trim(),
        price: usd,
        currency: "USD",
        regionalPrices: { USD: usd, PKR: pkr, INR: inr },
        media: uploadedMedia,
        imageUrl: uploadedMedia[0]?.url,
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        stockQuantity: Math.floor(stock),
        status,
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

        <LuxuryCard style={[styles.formCard, formShellStyle]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Product identity</Text><Text style={[styles.formDetail, { color: colors.muted }]}>SKU means Stock Keeping Unit: the unique internal code for finding and managing this product. You can generate it automatically.</Text>
          <View style={styles.formGap}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Product title" value={form.title} onChangeText={(value) => updateForm("title", value)} placeholder="e.g. Obsidian Signature Tee" /><View style={styles.skuRow}><View style={styles.skuInput}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="SKU / internal product code" value={form.sku} onChangeText={(value) => updateForm("sku", value)} placeholder="HADX-OBSIDIAN-001" /></View><LuxuryButton label="Auto-generate" onPress={() => updateForm("sku", makeSku(form.title))} variant="ghost" style={styles.skuButton} disabled={loading} /></View><View style={styles.twoColumn}><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="USD (global base)" value={form.usdPrice} onChangeText={(value) => updateForm("usdPrice", value)} keyboardType="decimal-pad" placeholder="120" /></View><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="PKR (Pakistan)" value={form.pkrPrice} onChangeText={(value) => updateForm("pkrPrice", value)} keyboardType="decimal-pad" placeholder="35000" /></View></View><View style={styles.twoColumn}><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="INR (India)" value={form.inrPrice} onChangeText={(value) => updateForm("inrPrice", value)} keyboardType="decimal-pad" placeholder="10000" /></View><View style={styles.column}><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Stock quantity" value={form.stockQuantity} onChangeText={(value) => updateForm("stockQuantity", value)} keyboardType="numeric" placeholder="10" /></View></View><Text style={[styles.priceNote, { color: colors.muted }]}>These are owner-set regional prices. Customers see the correct one based on their selected/ detected region; prices are not silently guessed from exchange rates.</Text><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Category" value={form.category} onChangeText={(value) => updateForm("category", value)} placeholder="Atelier" /><ProductInputField colors={colors} fieldStyle={fieldStyle} label="Description" value={form.description} onChangeText={(value) => updateForm("description", value)} multiline placeholder="Tell the story of this piece…" /></View>
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
  formCard: { gap: 4 },
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
  footerActions: { flexDirection: "row", gap: 10 },
  footerButton: { flex: 1 },
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
