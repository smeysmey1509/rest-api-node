import DeliverySetting from "../../models/DeliverySetting";

export async function calculateDeliveryFee(
  subtotal: number,
  method: string = "standard"
): Promise<number> {
  const setting = await DeliverySetting.findOne({ method, isActive: true });

  if (!setting) return 0;

  const baseFee = setting.baseFee ?? 0;
  const threshold = setting.freeThreshold ?? null;
  const qualifiesForFree =
    threshold !== null && baseFee <= 0 && subtotal >= threshold;

   return qualifiesForFree ? 0 : baseFee;
}