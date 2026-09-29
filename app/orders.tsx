import { Redirect } from "expo-router";

export default function LegacyOrdersRedirect() {
  return <Redirect href="/(tabs)/orders" />;
}
