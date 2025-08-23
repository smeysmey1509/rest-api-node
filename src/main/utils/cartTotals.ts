import DeliverySetting from "../../models/DeliverySetting";

export async function calculateCartTotals(
  subtotal: number,
  discount: number,
  method: string
) {
  const delivery = await DeliverySetting.findOne({ method, isActive: true });

  let deliveryFee = 0;
  if (delivery) {
    if (delivery.freeThreshold && subtotal >= delivery.freeThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = delivery.baseFee;
    }
  }

  const serviceTax = subtotal * 0.1;

  const total = subtotal - discount + deliveryFee + serviceTax;

  return { serviceTax, deliveryFee, total };
}
