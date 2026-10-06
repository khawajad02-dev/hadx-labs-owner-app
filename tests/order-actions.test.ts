import { describe, expect, it } from "vitest";
import { filterActiveOrders, filterArchivedOrders, filterDeliveredHistory } from "../lib/order-actions";

describe("order list filters", () => {
  it("keeps delivered and archived orders out of the active queue", () => {
    const orders = [
      { id: "1", orderStatus: "CONFIRMED", archivedAt: null },
      { id: "2", orderStatus: "DELIVERED", archivedAt: null },
      { id: "3", orderStatus: "delivered", archivedAt: null },
      { id: "4", orderStatus: "CONFIRMED", archivedAt: "2026-10-07T00:00:00Z" },
    ];
    expect(filterActiveOrders(orders).map((order) => order.id)).toEqual(["1"]);
  });

  it("returns only archived orders in the Archived filter", () => {
    const orders = [
      { id: "1", orderStatus: "CONFIRMED", archivedAt: null },
      { id: "2", orderStatus: "DELIVERED", archivedAt: "2026-10-07T00:00:00Z" },
      { id: "3", orderStatus: "CANCELLED", archivedAt: "2026-10-07T00:05:00Z" },
    ];
    expect(filterArchivedOrders(orders).map((order) => order.id)).toEqual(["2", "3"]);
  });

  it("shows only unarchived delivered orders in order history", () => {
    const orders = [
      { id: "1", orderStatus: "CANCELLED", archivedAt: null },
      { id: "2", orderStatus: "DELIVERED", archivedAt: null },
      { id: "3", orderStatus: "EXPIRED", archivedAt: null },
      { id: "4", orderStatus: "DELIVERED", archivedAt: "2026-10-07T00:00:00Z" },
    ];
    expect(filterDeliveredHistory(orders).map((order) => order.id)).toEqual(["2"]);
  });
});
