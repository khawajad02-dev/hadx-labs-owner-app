export type OrderStatusRecord = {
  orderStatus?: string | null;
  archivedAt?: string | null;
};

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
