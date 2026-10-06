import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Alert as NativeAlert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };
type AlertState = { title: string; message?: string; buttons: AlertButton[] } | null;
type AlertFn = (title: string, message?: string, buttons?: AlertButton[]) => void;

const AlertContext = createContext<AlertFn>(() => undefined);
export const useHadxAlert = () => useContext(AlertContext);

// Supports non-component callers too; native Alert is the fallback during startup.
let externalShow: AlertFn | null = null;
export const hadxAlert: AlertFn = (title, message, buttons) =>
  externalShow ? externalShow(title, message, buttons) : NativeAlert.alert(title, message, buttons);

export function HadxAlertProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AlertState>(null);
  const close = useCallback(() => setState(null), []);
  const show = useCallback<AlertFn>((title, message, buttons) => {
    setState({ title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] });
  }, []);

  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
    };
  }, [show]);

  return (
    <AlertContext.Provider value={show}>
      {children}
      <Modal visible={Boolean(state)} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{state?.title}</Text>
            {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={styles.buttonRow}>
              {state?.buttons.map((button, index) => (
                <Pressable
                  key={`${button.text}-${index}`}
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    button.style === "cancel" && styles.cancelButton,
                    button.style === "destructive" && styles.destructiveButton,
                  ]}
                  onPress={() => {
                    close();
                    button.onPress?.();
                  }}
                >
                  <Text style={[styles.buttonText, button.style === "cancel" && styles.cancelText]}>{button.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const GOLD = "#D8A94F";
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.76)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#0D0D0D", borderRadius: 20, borderWidth: 1, borderColor: "rgba(216,169,79,0.5)", padding: 22 },
  title: { color: GOLD, fontSize: 14, letterSpacing: 2, fontWeight: "800", marginBottom: 10 },
  message: { color: "rgba(255,255,255,0.88)", fontSize: 15, lineHeight: 22 },
  buttonRow: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, marginTop: 20 },
  button: { minWidth: 84, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, backgroundColor: GOLD, alignItems: "center" },
  cancelButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: "rgba(216,169,79,0.5)" },
  destructiveButton: { backgroundColor: "#A92E24" },
  buttonText: { color: "#1A1306", fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  cancelText: { color: GOLD },
});
