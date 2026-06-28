export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatusValue =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

const legacyPaymentStatusMap: Record<string, PaymentStatusValue> = {
  pending: PaymentStatus.PENDING,
  authorized: PaymentStatus.PENDING,
  paid: PaymentStatus.SUCCESS,
  success: PaymentStatus.SUCCESS,
  approved: PaymentStatus.SUCCESS,
  failed: PaymentStatus.FAILED,
  cancelled: PaymentStatus.CANCELLED,
  canceled: PaymentStatus.CANCELLED,
  refunded: PaymentStatus.REFUNDED,
};

export const normalizePaymentStatus = (
  status?: string | number
): PaymentStatusValue => {
  if (status === 0) return PaymentStatus.SUCCESS;
  if (status === undefined || status === null) return PaymentStatus.PENDING;
  const value = String(status).trim();
  const upper = value.toUpperCase();
  if (Object.values(PaymentStatus).includes(upper as PaymentStatusValue)) {
    return upper as PaymentStatusValue;
  }
  return legacyPaymentStatusMap[value.toLowerCase()] || PaymentStatus.PENDING;
};
