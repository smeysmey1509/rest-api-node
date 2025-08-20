export const SERVICE_TAX_RATE = 10;
export const DELIVERY_FEE = 5;

export function calculateCartTotals(subtotal: number, discount: number = 0) {
  const subtotalAfterDiscount = Math.max(subtotal - discount, 0);

  // Tax is % of subtotal AFTER discount
  const serviceTax = (subtotalAfterDiscount * SERVICE_TAX_RATE) / 100;

  // Delivery fee stays fixed
  const deliveryFee = DELIVERY_FEE;

  const total = subtotalAfterDiscount + serviceTax + deliveryFee;

  return { serviceTax, deliveryFee, total };
}
