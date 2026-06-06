import {
  GatewayInitiateInput,
  GatewayInitiateResult,
  GatewayVerifyResult,
  PaymentGateway,
} from "./paymentGateway";

export class BankTransferGateway implements PaymentGateway {
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    return {
      provider: "BANK_TRANSFER",
      status: "PENDING",
      checkoutData: {
        orderId: input.order._id,
        instructions: "Upload or submit bank transfer proof for backend verification.",
      },
    };
  }

  async verify(): Promise<GatewayVerifyResult> {
    return { success: false, status: "PENDING" };
  }
}

export const bankTransferGateway = new BankTransferGateway();
