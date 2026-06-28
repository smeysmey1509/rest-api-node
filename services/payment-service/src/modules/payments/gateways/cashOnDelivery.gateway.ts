import {
  GatewayInitiateInput,
  GatewayInitiateResult,
  GatewayVerifyResult,
  PaymentGateway,
} from "./paymentGateway";

export class CashOnDeliveryGateway implements PaymentGateway {
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    return {
      provider: "CASH_ON_DELIVERY",
      status: "PENDING",
      checkoutData: {
        orderId: input.order._id,
        message: "Payment will be collected and confirmed by backend staff.",
      },
    };
  }

  async verify(): Promise<GatewayVerifyResult> {
    return { success: false, status: "PENDING" };
  }
}

export const cashOnDeliveryGateway = new CashOnDeliveryGateway();
