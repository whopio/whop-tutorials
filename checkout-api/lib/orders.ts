import { randomUUID } from "node:crypto";

export type OrderStatus = "pending" | "paid";

export interface Order {
  id: string;
  status: OrderStatus;
  userId: string;
  paymentId?: string;
  createdAt: string;
  paidAt?: string;
}

const orders = new Map<string, Order>();

export function createOrder(userId: string): Order {
  const order: Order = {
    id: randomUUID(),
    status: "pending",
    userId,
    createdAt: new Date().toISOString(),
  };

  orders.set(order.id, order);
  return order;
}

export function markPaid(id: string, paymentId: string): Order | undefined {
  const order = orders.get(id);
  if (!order) return undefined;
  if (order.status === "paid") return order;

  const paid: Order = {
    ...order,
    status: "paid",
    paymentId,
    paidAt: new Date().toISOString(),
  };

  orders.set(id, paid);
  return paid;
}
