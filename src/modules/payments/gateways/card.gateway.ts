import {
  GatewayInitiateInput,
  GatewayInitiateResult,
  GatewayVerifyResult,
  PaymentGateway,
} from "./paymentGateway";

export class CardGateway implements PaymentGateway {
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    return {
      provider: "PAYWAY_CARD",
      status: "PENDING",
      checkoutData: {
        message: "Card payments must be completed through a PCI-compliant hosted gateway. Do not send card number or CVV to this API.",
        orderId: input.order._id,
      },
    };
  }

  async verify(): Promise<GatewayVerifyResult> {
    return { success: false, status: "PENDING" };
  }
}

export const cardGateway = new CardGateway();
