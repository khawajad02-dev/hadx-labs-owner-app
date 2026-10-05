import { describe, expect, it } from "vitest";
import { dropState, pickFeaturedDrop, productAccess, splitRemaining, validateDrop } from "../lib/drop";

const now = Date.parse("2026-10-06T12:00:00.000Z");
const drop = (startsAt: string, endsAt: string, isActive = true) => ({ startsAt, endsAt, isActive });

describe("drop state helpers", () => {
  it("identifies draft, upcoming, live, and ended windows", () => {
    expect(dropState(drop("2026-10-06T13:00:00Z", "2026-10-06T14:00:00Z", false), now)).toBe("off");
    expect(dropState(drop("2026-10-06T13:00:00Z", "2026-10-06T14:00:00Z"), now)).toBe("upcoming");
    expect(dropState(drop("2026-10-06T11:00:00Z", "2026-10-06T14:00:00Z"), now)).toBe("live");
    expect(dropState(drop("2026-10-06T10:00:00Z", "2026-10-06T11:00:00Z"), now)).toBe("ended");
  });

  it("prefers a live release, then the nearest upcoming release", () => {
    const upcoming = { ...drop("2026-10-06T12:30:00Z", "2026-10-06T14:00:00Z"), id: "soon" };
    const live = { ...drop("2026-10-06T11:00:00Z", "2026-10-06T13:00:00Z"), id: "live" };
    expect(pickFeaturedDrop([upcoming, live], now)?.drop.id).toBe("live");
    expect(pickFeaturedDrop([upcoming], now)?.drop.id).toBe("soon");
  });

  it("allows product access only when live or explicitly sell-after-end", () => {
    expect(productAccess({ ...drop("2026-10-06T13:00:00Z", "2026-10-06T14:00:00Z"), sellAfterEnd: false }, now)).toBe("locked");
    expect(productAccess({ ...drop("2026-10-06T10:00:00Z", "2026-10-06T11:00:00Z"), sellAfterEnd: false }, now)).toBe("ended");
    expect(productAccess({ ...drop("2026-10-06T10:00:00Z", "2026-10-06T11:00:00Z"), sellAfterEnd: true }, now)).toBe("open");
  });

  it("validates required title and chronological date range", () => {
    expect(validateDrop({ title: " ", startsAt: now, endsAt: now + 1 })).toBe("Title is required.");
    expect(validateDrop({ title: "Release", startsAt: null, endsAt: now + 1 })).toBe("Valid start and end times are required.");
    expect(validateDrop({ title: "Release", startsAt: now, endsAt: now })).toBe("End time must be later than start time.");
    expect(validateDrop({ title: "Release", startsAt: now, endsAt: now + 1 })).toBeNull();
  });

  it("splits remaining time into a non-negative countdown", () => {
    expect(splitRemaining(90_061_000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(splitRemaining(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
