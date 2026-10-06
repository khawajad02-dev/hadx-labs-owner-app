import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { hadxAlert } from "@/components/HadxAlert";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { LuxuryButton, LuxuryCard, SectionHeading, StatusPill } from "@/components/luxury-ui";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import { validateDrop } from "@/lib/drop";

type Product = { id: string; title: string; sku: string; imageUrl?: string | null; dropId?: string | null; dropOrder?: number };
type DropItem = { id: string; title: string; tagline?: string | null; startsAt: string; endsAt: string; isActive: boolean; sellAfterEnd: boolean; products: Product[] };
type DateField = "startsAt" | "endsAt";
type PickerState = { field: DateField; mode: "date" | "time" | "datetime" };

function roundMinute(date: Date) { const next = new Date(date); next.setSeconds(0, 0); return next; }
function formatDate(date: Date) { return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
function defaultStart() { const date = new Date(); date.setHours(date.getHours() + 1); return roundMinute(date); }

export default function DropEditorScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id, run } = useLocalSearchParams<{ id?: string; run?: string }>();
  const isRun = run === "1";
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [endsAt, setEndsAt] = useState(() => { const end = defaultStart(); end.setDate(end.getDate() + 1); return end; });
  const [isActive, setIsActive] = useState(true);
  const [sellAfterEnd, setSellAfterEnd] = useState(false);
  const [selected, setSelected] = useState<Product[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [error, setError] = useState("");

  const loadProducts = useCallback(async (search: string) => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "50" });
      if (search.trim()) params.set("q", search.trim());
      const response = await apiGet(`/products?${params.toString()}`);
      setProducts(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || "Product picker could not be loaded.");
    }
  }, []);

  useEffect(() => { const timeout = setTimeout(() => void loadProducts(query), 180); return () => clearTimeout(timeout); }, [loadProducts, query]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    void apiGet("/drops").then((response) => {
      if (!active) return;
      const drop = (response.data?.items as DropItem[] | undefined)?.find((entry) => entry.id === id);
      if (!drop) throw new Error("Drop not found.");
      setTitle(drop.title || ""); setTagline(drop.tagline || ""); setIsActive(drop.isActive); setSellAfterEnd(drop.sellAfterEnd);
      if (isRun) {
        const start = defaultStart(); const end = new Date(start); end.setDate(end.getDate() + 1);
        setStartsAt(start); setEndsAt(end);
      } else {
        setStartsAt(new Date(drop.startsAt)); setEndsAt(new Date(drop.endsAt));
      }
      setSelected((drop.products || []).slice().sort((a, b) => (a.dropOrder || 0) - (b.dropOrder || 0)));
    }).catch((loadError: any) => setError(loadError?.response?.data?.error || loadError?.message || "Drop could not be loaded."))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isRun]);

  const availableProducts = useMemo(() => products.filter((product) => !selected.some((item) => item.id === product.id)), [products, selected]);
  const currentDate = picker?.field === "startsAt" ? startsAt : endsAt;

  const handleDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (!picker || event.type === "dismissed" || !value) { setPicker(null); return; }
    const current = picker.field === "startsAt" ? startsAt : endsAt;
    if (Platform.OS === "android" && picker.mode === "date") {
      const dateOnly = new Date(current);
      dateOnly.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
      if (picker.field === "startsAt") setStartsAt(dateOnly); else setEndsAt(dateOnly);
      setPicker({ field: picker.field, mode: "time" });
      return;
    }
    let next = value;
    if (picker.mode === "time") {
      next = new Date(current);
      next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    }
    if (picker.field === "startsAt") setStartsAt(next); else setEndsAt(next);
    setPicker(null);
  };

  const moveProduct = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= selected.length) return;
    setSelected((items) => { const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  };

  const save = async () => {
    const validationError = validateDrop({ title, startsAt, endsAt });
    if (validationError) { hadxAlert("Check Drop details", validationError); return; }
    setSaving(true); setError("");
    const payload = { title: title.trim(), tagline: tagline.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), isActive, sellAfterEnd, productIds: selected.map((product) => product.id) };
    try {
      if (id && !isRun) await apiPut(`/drops/${id}`, payload); else await apiPost("/drops", payload);
      hadxAlert(isRun ? "Drop re-run created" : id ? "Drop updated" : "Drop created", "The release and product order have been saved.", [{ text: "Done", onPress: () => router.back() }]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || "Drop could not be saved.");
    } finally { setSaving(false); }
  };

  if (loading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.muted, { color: colors.muted }]}>Loading Drop…</Text></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} containerClassName="flex-1" className="flex-1">
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <SectionHeading eyebrow="[ SYSTEM :: DROP ]" title={isRun ? "Re-run Drop" : id ? "Edit Drop" : "New Drop"} detail="Configure a timed release and its assigned pieces." action={<LuxuryButton label="Close" onPress={() => router.back()} variant="ghost" style={styles.closeButton} />} />
      {error ? <LuxuryCard compact style={[styles.errorCard, { borderColor: `${colors.error}88` }]}><Text style={[styles.errorText, { color: colors.foreground }]}>{error}</Text></LuxuryCard> : null}
      <LuxuryCard style={styles.card}>
        <Text style={[styles.mono, { color: colors.primary }]}>[ RELEASE :: CONFIGURATION ]</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Drop title (required)" placeholderTextColor={`${colors.muted}B3`} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
        <TextInput value={tagline} onChangeText={setTagline} placeholder="Tagline (optional)" placeholderTextColor={`${colors.muted}B3`} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
        <View style={styles.fieldGroup}><Text style={[styles.label, { color: colors.muted }]}>STARTS AT</Text><Pressable onPress={() => setPicker({ field: "startsAt", mode: Platform.OS === "ios" ? "datetime" : "date" })} style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.dateText, { color: colors.foreground }]}>{formatDate(startsAt)}</Text><Text style={{ color: colors.primary }}>Choose date & time</Text></Pressable></View>
        <View style={styles.fieldGroup}><Text style={[styles.label, { color: colors.muted }]}>ENDS AT</Text><Pressable onPress={() => setPicker({ field: "endsAt", mode: Platform.OS === "ios" ? "datetime" : "date" })} style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.background }]}><Text style={[styles.dateText, { color: colors.foreground }]}>{formatDate(endsAt)}</Text><Text style={{ color: colors.primary }}>Choose date & time</Text></Pressable></View>
        <View style={[styles.toggleRow, { borderColor: colors.border }]}><View style={styles.toggleCopy}><Text style={[styles.toggleTitle, { color: colors.foreground }]}>Active</Text><Text style={[styles.muted, { color: colors.muted }]}>Turn off to save this release as a draft.</Text></View><Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: `${colors.muted}55`, true: `${colors.primary}88` }} thumbColor={isActive ? colors.primary : "#888888"} /></View>
        <View style={[styles.toggleRow, { borderColor: colors.border }]}><View style={styles.toggleCopy}><Text style={[styles.toggleTitle, { color: colors.foreground }]}>Keep selling after end</Text><Text style={[styles.muted, { color: colors.muted }]}>Allow assigned products to remain purchasable.</Text></View><Switch value={sellAfterEnd} onValueChange={setSellAfterEnd} trackColor={{ false: `${colors.muted}55`, true: `${colors.primary}88` }} thumbColor={sellAfterEnd ? colors.primary : "#888888"} /></View>
      </LuxuryCard>
      <LuxuryCard style={styles.card}>
        <View style={styles.sectionHead}><View style={styles.sectionCopy}><Text style={[styles.mono, { color: colors.primary }]}>[ PRODUCT :: ASSIGNMENT ]</Text><Text style={[styles.cardTitle, { color: colors.foreground }]}>Shirt picker</Text></View><StatusPill label={`${selected.length} selected`} tone={selected.length ? "success" : "neutral"} /></View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search products by title or SKU" placeholderTextColor={`${colors.muted}B3`} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} />
        <Text style={[styles.label, { color: colors.muted }]}>ASSIGNED ORDER · USE ARROWS TO REORDER</Text>
        {selected.length ? selected.map((product, index) => <View key={product.id} style={[styles.productRow, { borderColor: colors.border, backgroundColor: `${colors.background}CC` }]}><View style={styles.productCopy}><Text numberOfLines={1} style={[styles.productTitle, { color: colors.foreground }]}>{product.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{product.sku}</Text></View><Pressable disabled={index === 0} onPress={() => moveProduct(index, -1)} style={styles.iconButton}><Text style={{ color: index === 0 ? colors.muted : colors.primary }}>↑</Text></Pressable><Pressable disabled={index === selected.length - 1} onPress={() => moveProduct(index, 1)} style={styles.iconButton}><Text style={{ color: index === selected.length - 1 ? colors.muted : colors.primary }}>↓</Text></Pressable><Pressable onPress={() => setSelected((items) => items.filter((item) => item.id !== product.id))} style={styles.removeButton}><Text style={{ color: colors.error }}>Remove</Text></Pressable></View>) : <Text style={[styles.muted, { color: colors.muted }]}>No products assigned yet.</Text>}
        <Text style={[styles.label, { color: colors.muted, marginTop: 8 }]}>SEARCH RESULTS · TAP ADD</Text>
        {availableProducts.slice(0, 20).map((product) => <View key={product.id} style={[styles.productRow, { borderColor: colors.border }]}><View style={styles.productCopy}><Text numberOfLines={1} style={[styles.productTitle, { color: colors.foreground }]}>{product.title}</Text><Text style={[styles.muted, { color: colors.muted }]}>{product.sku}</Text></View><LuxuryButton label="Add" onPress={() => setSelected((items) => [...items, product])} variant="secondary" style={styles.addButton} /></View>)}
        {!availableProducts.length ? <Text style={[styles.muted, { color: colors.muted }]}>No matching products.</Text> : null}
      </LuxuryCard>
      <LuxuryButton label={isRun ? "Create re-run" : "Save Drop"} onPress={() => void save()} variant="primary" loading={saving} style={styles.saveButton} />
    </ScrollView>
    {picker ? <DateTimePicker value={currentDate} mode={picker.mode} display="default" onChange={handleDateChange} /> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 14 }, closeButton: { minHeight: 40 }, card: { gap: 13 }, mono: { fontSize: 10, fontWeight: "900", letterSpacing: 1.8 }, input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 13 }, fieldGroup: { gap: 7 }, label: { fontSize: 9, fontWeight: "900", letterSpacing: 1.4 }, dateButton: { minHeight: 55, borderWidth: 1, borderRadius: 13, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, dateText: { fontSize: 12, fontWeight: "800" }, toggleRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 12 }, toggleCopy: { flex: 1, gap: 3 }, toggleTitle: { fontSize: 13, fontWeight: "800" }, muted: { fontSize: 11, lineHeight: 16 }, sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, sectionCopy: { gap: 5 }, cardTitle: { fontSize: 17, fontWeight: "900" }, productRow: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 9, flexDirection: "row", alignItems: "center", gap: 7 }, productCopy: { flex: 1, gap: 3 }, productTitle: { fontSize: 12, fontWeight: "800" }, iconButton: { width: 31, height: 31, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#D8A94F12" }, removeButton: { paddingHorizontal: 5, paddingVertical: 8 }, addButton: { minHeight: 36, paddingHorizontal: 12 }, saveButton: { minHeight: 48 }, errorCard: { borderWidth: 1 }, errorText: { fontSize: 12 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
});
