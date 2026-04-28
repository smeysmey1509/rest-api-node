import Payment, { IPayment } from "./payment.model";

export const paymentRepository = {
  create(payload: Partial<IPayment>) {
    return Payment.create(payload);
  },

  findById(id: string) {
    return Payment.findById(id);
  },

  findByTransaction(transactionId: string) {
    return Payment.findOne({
      $or: [{ transactionId }, { merchantRef: transactionId }, { gatewayReference: transactionId }],
    });
  },

  findByOrder(orderId: string) {
    return Payment.findOne({ order: orderId }).sort({ createdAt: -1 });
  },

  update(id: string, updates: Record<string, unknown>) {
    return Payment.findByIdAndUpdate(id, updates, { new: true });
  },
};
