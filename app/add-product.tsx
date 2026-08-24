import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { useColors } from "@/hooks/use-colors";
import { apiPost } from "@/lib/api-client";
import { uploadPickedMedia, type PickedMedia } from "@/lib/media-upload";

export default function AddProductScreen() {
  const colors = useColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [form, setForm] = useState({
    title: "",
    sku: "",
    price: "",
    description: "",
    category: "",
    stockQuantity: "10",
  });

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow gallery access so you can select a product image or video.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: false,
      quality: 1,
    });

    const asset = result.canceled ? undefined : result.assets?.[0];
    if (!asset) return;

    setMedia({
      uri: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });
  };

  const handleSave = async (status: "DRAFT" | "PUBLISHED") => {
    const numericPrice = Number(form.price);
    const numericStock = Number(form.stockQuantity);
    if (!form.title.trim() || !form.sku.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      Alert.alert("Complete the essentials", "Product title, SKU and a valid price are required.");
      return;
    }
    if (!Number.isFinite(numericStock) || numericStock < 0) {
      Alert.alert("Check stock quantity", "Stock must be zero or a positive number.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl: string | undefined;
      if (media) {
        const uploaded = await uploadPickedMedia(media);
        imageUrl = uploaded.publicUrl;
      }

      await apiPost("/products", {
        title: form.title.trim(),
        sku: form.sku.trim(),
        price: numericPrice,
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        stockQuantity: Math.floor(numericStock),
        imageUrl,
        status,
      });

      Alert.alert("Piece secured", status === "PUBLISHED" ? "The product is now live in your atelier." : "The product was saved as a draft.", [
        { text: "Done", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Save product error:", error);
      Alert.alert("Could not save product", error?.response?.data?.error || error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    keyboardType = "default",
    multiline = false,
    placeholder,
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    keyboardType?: "default" | "numeric" | "decimal-pad";
    multiline?: boolean;
    placeholder?: string;
  }) => (
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
        style={[styles.input, { backgroundColor: `${colors.background}CC`, color: colors.foreground, borderColor: colors.border, minHeight: multiline ? 116 : 52 }]}
      />
    </View>
  );

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <SectionHeading eyebrow="ATELIER / NEW PIECE" title="Create product" detail="Build the product once. Let the storefront do the selling." />
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.closeButton, { borderColor: colors.border }, pressed && styles.closePressed]}>
            <Text style={[styles.closeText, { color: colors.muted }]}>Close</Text>
          </Pressable>
        </View>

        <LuxuryCard accent style={styles.mediaCard}>
          <View style={styles.mediaHeader}>
            <View style={styles.mediaCopy}>
              <Text style={[styles.sectionEyebrow, { color: colors.primary }]}>COVER MEDIA</Text>
              <Text style={[styles.mediaTitle, { color: colors.foreground }]}>Choose from gallery</Text>
              <Text style={[styles.mediaDetail, { color: colors.muted }]}>Image or video. No URL copying, no manual hosting.</Text>
            </View>
            <StatusPill label={media ? media.type : "Not selected"} tone={media ? "success" : "neutral"} />
          </View>

          {media?.type === "image" ? (
            <Image source={{ uri: media.uri }} style={styles.mediaPreview} resizeMode="cover" />
          ) : media?.type === "video" ? (
            <View style={[styles.videoPreview, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}55` }]}>
              <Text style={[styles.videoMark, { color: colors.primary }]}>▶</Text>
              <Text style={[styles.videoText, { color: colors.foreground }]}>Video selected</Text>
              <Text style={[styles.videoSubtext, { color: colors.muted }]} numberOfLines={1}>{media.fileName || "Gallery video"}</Text>
            </View>
          ) : null}

          <View style={styles.mediaActions}>
            <LuxuryButton label={media ? "Replace media" : "Open gallery"} onPress={pickMedia} variant={media ? "secondary" : "primary"} style={styles.mediaButton} />
            {media ? <LuxuryButton label="Remove" onPress={() => setMedia(null)} variant="ghost" style={styles.removeButton} /> : null}
          </View>
        </LuxuryCard>

        <LuxuryCard style={styles.formCard}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>Product identity</Text>
          <Text style={[styles.formDetail, { color: colors.muted }]}>A clean, searchable record for your catalog.</Text>
          <View style={styles.formGap}>
            <InputField label="Product title" value={form.title} onChangeText={(value) => updateForm("title", value)} placeholder="e.g. Obsidian Signature Tee" />
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <InputField label="SKU" value={form.sku} onChangeText={(value) => updateForm("sku", value)} placeholder="HADX-001" />
              </View>
              <View style={styles.column}>
                <InputField label="Price (USD)" value={form.price} onChangeText={(value) => updateForm("price", value)} keyboardType="decimal-pad" placeholder="120" />
              </View>
            </View>
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <InputField label="Category" value={form.category} onChangeText={(value) => updateForm("category", value)} placeholder="Atelier" />
              </View>
              <View style={styles.column}>
                <InputField label="Stock" value={form.stockQuantity} onChangeText={(value) => updateForm("stockQuantity", value)} keyboardType="numeric" placeholder="10" />
              </View>
            </View>
            <InputField label="Description" value={form.description} onChangeText={(value) => updateForm("description", value)} multiline placeholder="Tell the story of this piece…" />
          </View>
        </LuxuryCard>

        <View style={styles.footerActions}>
          <LuxuryButton label="Save draft" onPress={() => void handleSave("DRAFT")} variant="secondary" loading={loading} style={styles.footerButton} />
          <LuxuryButton label="Publish live" onPress={() => void handleSave("PUBLISHED")} variant="primary" loading={loading} style={styles.footerButton} />
        </View>
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
  mediaCard: { minHeight: 214 },
  mediaHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  mediaCopy: { flex: 1, gap: 5 },
  sectionEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 2.1 },
  mediaTitle: { fontSize: 18, fontWeight: "900" },
  mediaDetail: { fontSize: 12, lineHeight: 18 },
  mediaPreview: { width: "100%", height: 184, borderRadius: 16, marginTop: 16, backgroundColor: "#101010" },
  videoPreview: { height: 184, borderRadius: 16, marginTop: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, gap: 6 },
  videoMark: { fontSize: 34, fontWeight: "900" },
  videoText: { fontSize: 15, fontWeight: "900" },
  videoSubtext: { maxWidth: "80%", fontSize: 11 },
  mediaActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  mediaButton: { flex: 1 },
  removeButton: { minWidth: 90 },
  formCard: { gap: 4 },
  formTitle: { fontSize: 18, fontWeight: "900" },
  formDetail: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  formGap: { gap: 13 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, lineHeight: 20, textAlignVertical: "top" },
  twoColumn: { flexDirection: "row", gap: 10 },
  column: { flex: 1 },
  footerActions: { flexDirection: "row", gap: 10 },
  footerButton: { flex: 1 },
});
