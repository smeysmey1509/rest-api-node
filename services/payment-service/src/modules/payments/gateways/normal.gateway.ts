import {
  GatewayInitiateInput,
  GatewayInitiateResult,
  GatewayVerifyResult,
  PaymentGateway,
} from "./paymentGateway";

export class NormalGateway implements PaymentGateway {
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    return {
      provider: "NORMAL_PAYMENT",
      status: "PENDING",
      checkoutData: {
        orderId: input.order._id,
        paymentId: input.payment._id,
        transactionId: input.payment.transactionId,
        message: "Payment created. Backend/admin confirmation is required before the order is marked paid.",
      },
    };
  }

  async verify(): Promise<GatewayVerifyResult> {
    return { success: false, status: "PENDING" };
  }
}

export const normalGateway = new NormalGateway();
