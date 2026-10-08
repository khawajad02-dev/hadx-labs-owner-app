export type OrderStatusRecord = {
  orderStatus?: string | null;
  archivedAt?: string | null;
};

export type DeliveryNoticeOrder = {
  fullName: string;
  orderReference: string;
  productTitle: string;
  productColor?: string | null;
  size?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const REOPENED_DELIVERY_STATUS = "CONFIRMED" as const;

function normalizedStatus(order: OrderStatusRecord): string {
  return String(order.orderStatus ?? "").toUpperCase();
}

export function filterActiveOrders<T extends OrderStatusRecord>(orders: T[]): T[] {
  return orders.filter((order) => !order.archivedAt && normalizedStatus(order) !== "DELIVERED");
}

export function filterArchivedOrders<T extends OrderStatusRecord>(orders: T[]): T[] {
  return orders.filter((order) => Boolean(order.archivedAt));
}

export function filterDeliveredHistory<T extends OrderStatusRecord>(orders: T[]): T[] {
  return orders.filter((order) => !order.archivedAt && normalizedStatus(order) === "DELIVERED");
}

export function buildDeliveryNoticeMessage(order: DeliveryNoticeOrder): string {
  const itemDetails = [
    order.productTitle,
    order.productColor,
    order.size ? `Size ${order.size}` : null,
  ].filter(Boolean).join(" · ");
  const itemText = itemDetails ? ` (${itemDetails})` : "";
  return `Hello ${order.fullName || "there"}, your HADX LABS order ${order.orderReference}${itemText} has been marked as delivered. Thank you for shopping with us.`;
}

export function buildWhatsAppDeliveryUrl(order: DeliveryNoticeOrder): string | null {
  const phone = String(order.phone ?? "").replace(/\D/g, "");
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildDeliveryNoticeMessage(order))}`;
}

export function buildEmailDeliveryUrl(order: DeliveryNoticeOrder): string | null {
  const email = String(order.email ?? "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const [localPart, domain] = email.split("@");
  const subject = `Your HADX LABS order ${order.orderReference} has been delivered`;
  return `mailto:${encodeURIComponent(localPart)}@${encodeURIComponent(domain)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildDeliveryNoticeMessage(order))}`;
}
