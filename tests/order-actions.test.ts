import { describe, expect, it } from "vitest";
import {
  buildDeliveryNoticeMessage,
  buildEmailDeliveryUrl,
  buildWhatsAppDeliveryUrl,
  filterActiveOrders,
  filterArchivedOrders,
  filterDeliveredHistory,
  REOPENED_DELIVERY_STATUS,
} from "../lib/order-actions";

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

  it("returns a reopened delivered order to Active and removes it from History", () => {
    const reopened = { id: "5", orderStatus: REOPENED_DELIVERY_STATUS, archivedAt: null };
    expect(filterActiveOrders([reopened])).toEqual([reopened]);
    expect(filterDeliveredHistory([reopened])).toEqual([]);
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

describe("delivery notification drafts", () => {
  const order = {
    fullName: "Aisha Khan",
    orderReference: "HADX-100",
    productTitle: "Signature Shirt",
    productColor: "Midnight Black",
    size: "M",
    phone: "+92 (300) 123-4567",
    email: "aisha@example.com",
  };

  it("builds a delivery update with the correct order and item details", () => {
    expect(buildDeliveryNoticeMessage(order)).toBe(
      "Hello Aisha Khan, your HADX LABS order HADX-100 (Signature Shirt · Midnight Black · Size M) has been marked as delivered. Thank you for shopping with us.",
    );
  });

  it("prefills WhatsApp and email drafts without sending automatically", () => {
    const message = buildDeliveryNoticeMessage(order);
    expect(buildWhatsAppDeliveryUrl(order)).toBe(`https://wa.me/923001234567?text=${encodeURIComponent(message)}`);
    expect(buildEmailDeliveryUrl(order)).toBe(
      `mailto:aisha@example.com?subject=${encodeURIComponent("Your HADX LABS order HADX-100 has been delivered")}&body=${encodeURIComponent(message)}`,
    );
  });

  it("does not create a draft link when the corresponding customer contact is missing or invalid", () => {
    expect(buildWhatsAppDeliveryUrl({ ...order, phone: "" })).toBeNull();
    expect(buildEmailDeliveryUrl({ ...order, email: "not-an-email" })).toBeNull();
  });
});
