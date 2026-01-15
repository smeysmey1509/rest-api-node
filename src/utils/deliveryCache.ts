// utils/deliveryCache.ts
import DeliverySetting from "../../models/DeliverySetting";

type DeliveryLite = {
  _id: any;
  method: string;
  methodKey: string;
  baseFee: number;
  taxRate?: number;
  freeThreshold?: number | null;
  estimatedDays: number;
};

let CACHE = new Map<string, DeliveryLite>();
let READY = false;

export const normalizeMethod = (m: string) => String(m || "").trim().toLowerCase();

export async function loadDeliveryCache() {
  const docs = await DeliverySetting.find(
    { isActive: true },
    { method: 1, baseFee: 1, taxRate: 1, freeThreshold: 1, estimatedDays: 1 }
  ).lean();
  const next = new Map<string, DeliveryLite>();
  for (const d of docs) {
    const key = normalizeMethod(d.method);
    next.set(key, { ...d, methodKey: key });
  }
  CACHE = next;
  READY = true;
}

export function getDelivery(method: string): DeliveryLite | undefined {
  if (!READY) return undefined;
  return CACHE.get(normalizeMethod(method));
}

// Refresh every 30s (cheap), and whenever you mutate Delivery via your CRUD routes.
setInterval(() => { loadDeliveryCache().catch(() => {}); }, 30_000);
loadDeliveryCache().catch(() => {});
