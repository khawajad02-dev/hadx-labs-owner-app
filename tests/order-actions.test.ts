import { describe, expect, it } from "vitest";
import {
  filterActiveOrders,
  filterDeliveredHistory,
  isLegacyDeliveredDeleteRestriction,
  shouldFallbackLegacyDelete,
} from "../lib/order-actions";

describe("order action compatibility helpers", () => {
  it("keeps delivered orders out of the active queue even when the server returns them", () => {
    const orders = [
      { id: "1", orderStatus: "CONFIRMED" },
      { id: "2", orderStatus: "DELIVERED" },
      { id: "3", orderStatus: "delivered" },
    ];
    expect(filterActiveOrders(orders).map((order) => order.id)).toEqual(["1"]);
  });

  it("shows only delivered orders in history even when a legacy server returns other terminal statuses", () => {
    const orders = [
      { id: "1", orderStatus: "CANCELLED" },
      { id: "2", orderStatus: "DELIVERED" },
      { id: "3", orderStatus: "EXPIRED" },
    ];
    expect(filterDeliveredHistory(orders).map((order) => order.id)).toEqual(["2"]);
  });

  it("allows legacy cancel-then-delete fallback only for reserved or confirmed orders", () => {
    const message = "Only cancelled or expired orders can be deleted.";
    expect(shouldFallbackLegacyDelete("CONFIRMED", 400, message)).toBe(true);
    expect(shouldFallbackLegacyDelete("RESERVED", 400, "Delete is allowed when the order expires.")).toBe(true);
    expect(shouldFallbackLegacyDelete("DELIVERED", 400, message)).toBe(false);
    expect(shouldFallbackLegacyDelete("CONFIRMED", 500, message)).toBe(false);
    expect(shouldFallbackLegacyDelete("CANCELLED", 400, message)).toBe(false);
  });

  it("flags legacy delete restriction on delivered orders instead of auto-cancelling/restocking", () => {
    expect(isLegacyDeliveredDeleteRestriction("DELIVERED", 400, "Delete when order expires.")).toBe(true);
    expect(isLegacyDeliveredDeleteRestriction("CONFIRMED", 400, "Delete when order expires.")).toBe(false);
  });
});
