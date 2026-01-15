// utils/totalsFast.ts — purely sync math; no DB
export function calcTotalsSync(opts: {
  subTotal: number;
  discount: number;
  baseFee: number;
  taxRate?: number;
  freeThreshold?: number | null;
}) {
  const taxRate = opts.taxRate ?? 0;
  const freeThreshold = opts.freeThreshold ?? null;

  const discounted = Math.max(0, opts.subTotal - (opts.discount || 0));
  const baseFee = opts.baseFee || 0;
  const qualifiesForFree =
    freeThreshold != null && baseFee <= 0 && discounted >= freeThreshold;
  const deliveryFee = qualifiesForFree ? 0 : baseFee;
  const serviceTax = Math.round(discounted * taxRate);
  const total = discounted + deliveryFee + serviceTax;

  return { deliveryFee, serviceTax, total };
}
