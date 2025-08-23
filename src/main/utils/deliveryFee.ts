import DeliverySetting from "../../models/DeliverySetting";

export async function calculateDeliveryFee(
  subtotal: number,
  method: string = "standard"
): Promise<number> {
  const setting = await DeliverySetting.findOne({ method, isActive: true });

  if (!setting) return 0;

  if (setting.freeThreshold && subtotal >= setting.freeThreshold) {
    return 0;
  }

  return setting.baseFee;
}