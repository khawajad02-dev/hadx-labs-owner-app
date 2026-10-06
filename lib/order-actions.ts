export type OrderStatusRecord = { orderStatus?: string | null };

function normalizedStatus(order: OrderStatusRecord): string {
  return String(order.orderStatus ?? "").toUpperCase();
}

export function filterActiveOrders<T extends OrderStatusRecord>(orders: T[]): T[] {
  return orders.filter((order) => normalizedStatus(order) !== "DELIVERED");
}

export function filterDeliveredHistory<T extends OrderStatusRecord>(orders: T[]): T[] {
  return orders.filter((order) => normalizedStatus(order) === "DELIVERED");
}

export function shouldFallbackLegacyDelete(
  orderStatus: string,
  responseStatus: number | undefined,
  serverMessage: string,
): boolean {
  const status = orderStatus.toUpperCase();
  const isOpenOrder = status === "RESERVED" || status === "CONFIRMED";
  const isLegacyRestriction = /(expire|expired|cancelled|canceled)/i.test(serverMessage);
  return responseStatus === 400 && isOpenOrder && isLegacyRestriction;
}

export function isLegacyDeliveredDeleteRestriction(
  orderStatus: string,
  responseStatus: number | undefined,
  serverMessage: string,
): boolean {
  return orderStatus.toUpperCase() === "DELIVERED"
    && responseStatus === 400
    && /expire|cancel/i.test(serverMessage);
}
