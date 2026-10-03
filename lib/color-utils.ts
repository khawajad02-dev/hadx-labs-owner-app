const COLOR_NAMES: Record<string, string> = {
  black: "#111111",
  white: "#F5F3EE",
  ivory: "#FFFFF0",
  cream: "#FFFDD0",
  beige: "#D6C5A5",
  red: "#C62828",
  crimson: "#DC143C",
  scarlet: "#FF2400",
  maroon: "#800000",
  burgundy: "#800020",
  pink: "#E91E63",
  rose: "#F43F5E",
  magenta: "#D946EF",
  fuchsia: "#FF00FF",
  purple: "#7E22CE",
  violet: "#8B5CF6",
  lavender: "#C4B5FD",
  blue: "#2563EB",
  navy: "#172554",
  royalblue: "#4169E1",
  skyblue: "#38BDF8",
  cyan: "#06B6D4",
  teal: "#0F766E",
  turquoise: "#14B8A6",
  green: "#16A34A",
  lime: "#84CC16",
  olive: "#808000",
  emerald: "#059669",
  mint: "#98FF98",
  yellow: "#EAB308",
  gold: "#D4AF37",
  orange: "#F97316",
  amber: "#F59E0B",
  brown: "#92400E",
  tan: "#D2B48C",
  rust: "#B7410E",
  gray: "#6B7280",
  grey: "#6B7280",
  silver: "#A7AFB8",
  charcoal: "#36454F",
  slate: "#475569",
};

export function colorForName(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (/^#[0-9a-f]{3,8}$/i.test(value.trim())) return value.trim();
  if (COLOR_NAMES[normalized]) return COLOR_NAMES[normalized];
  const matchingName = Object.keys(COLOR_NAMES).find((name) => normalized.includes(name));
  return matchingName ? COLOR_NAMES[matchingName] : "#525252";
}
