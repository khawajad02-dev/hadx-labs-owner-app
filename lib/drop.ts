export type DropState = "off" | "upcoming" | "live" | "ended";

export type DropWindow = {
  startsAt: Date | string;
  endsAt: Date | string;
  isActive: boolean;
};

export function dropState(d: DropWindow, now: number = Date.now()): DropState {
  if (!d.isActive) return "off";
  const start = new Date(d.startsAt).getTime();
  const end = new Date(d.endsAt).getTime();
  if (now < start) return "upcoming";
  if (now < end) return "live";
  return "ended";
}

export function pickFeaturedDrop<T extends DropWindow>(drops: T[], now: number = Date.now()): { drop: T; state: DropState } | null {
  const all = drops.map((drop) => ({ drop, state: dropState(drop, now) })).filter((entry) => entry.state !== "off");
  const time = (drop: T, key: "startsAt" | "endsAt") => new Date(drop[key]).getTime();
  const live = all.filter((entry) => entry.state === "live").sort((a, b) => time(a.drop, "endsAt") - time(b.drop, "endsAt"));
  if (live.length) return live[0];
  const upcoming = all.filter((entry) => entry.state === "upcoming").sort((a, b) => time(a.drop, "startsAt") - time(b.drop, "startsAt"));
  if (upcoming.length) return upcoming[0];
  const ended = all.filter((entry) => entry.state === "ended").sort((a, b) => time(b.drop, "endsAt") - time(a.drop, "endsAt"));
  return ended[0] ?? null;
}

export function productAccess(drop: (DropWindow & { sellAfterEnd: boolean }) | null | undefined, now: number = Date.now()): "open" | "locked" | "ended" {
  if (!drop) return "open";
  const state = dropState(drop, now);
  if (state === "live") return "open";
  if (state === "ended") return drop.sellAfterEnd ? "open" : "ended";
  return "locked";
}

export function splitRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

export function validateDrop(input: { title?: unknown; startsAt?: unknown; endsAt?: unknown }): string | null {
  if (typeof input.title !== "string" || !input.title.trim()) return "Title is required.";
  if (input.startsAt == null || input.endsAt == null) return "Valid start and end times are required.";
  const start = new Date(input.startsAt as string | number | Date).getTime();
  const end = new Date(input.endsAt as string | number | Date).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Valid start and end times are required.";
  if (end <= start) return "End time must be later than start time.";
  return null;
}
