import DeliverySetting from "../models/DeliverySetting";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function calculateCartTotals(
  subtotal: number,
  discount: number,
  method: string
) {
  const normalizedMethod = (method || "").trim();
  const methodQuery =
    normalizedMethod.length > 0
      ? {
        $regex: new RegExp(`^${escapeRegex(normalizedMethod)}$`, "i"),
      }
      : undefined;

  const delivery = await DeliverySetting.findOne({
    ...(methodQuery ? { method: methodQuery } : {}),
    isActive: true,
  });

  const sanitizedSubtotal = Math.max(0, subtotal);
  const discountAmount = Math.max(0, discount || 0);
  const discountedSubtotal = Math.max(0, sanitizedSubtotal - discountAmount);

  let deliveryFee = 0;
  if (delivery) {
    const threshold = delivery.freeThreshold ?? null;
    const baseFee = delivery.baseFee ?? 0;
    const qualifiesForFree =
      threshold !== null && baseFee <= 0 && discountedSubtotal >= threshold;

    deliveryFee = qualifiesForFree ? 0 : baseFee;
  }

  const serviceTax = Number((sanitizedSubtotal * 0.1).toFixed(2));

  const total = Number(
    (discountedSubtotal + deliveryFee + serviceTax).toFixed(2)
  );

  return { serviceTax, deliveryFee, total };
}
