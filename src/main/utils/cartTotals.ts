import DeliverySetting from "../../models/DeliverySetting";

export async function calculateCartTotals(
  subtotal: number,
  discount: number,
  method: string
) {
  const delivery = await DeliverySetting.findOne({ method, isActive: true });

  const discountedSubtotal = Math.max(0, subtotal - (discount || 0));

  let deliveryFee = 0;
  if (delivery) {
    const threshold = delivery.freeThreshold ?? null;
    const baseFee = delivery.baseFee ?? 0;
    const qualifiesForFree =
      threshold !== null && baseFee <= 0 && discountedSubtotal >= threshold;

    deliveryFee = qualifiesForFree ? 0 : baseFee;
  }

  const serviceTax = Number((discountedSubtotal * 0.1).toFixed(2));

  const total = Number(
    (discountedSubtotal + deliveryFee + serviceTax).toFixed(2)
  );

  return { serviceTax, deliveryFee, total };
}
