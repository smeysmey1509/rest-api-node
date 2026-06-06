import { IPayment, PaymentMethodValue } from "../payment.model";

export type GatewayInitiateInput = {
  payment: IPayment;
  order: any;
  method: PaymentMethodValue;
};

export type GatewayInitiateResult = {
  provider: string;
  status?: string;
  gatewayReference?: string;
  checkoutData?: Record<string, unknown>;
};

export type GatewayVerifyResult = {
  success: boolean;
  status: string;
  gatewayReference?: string;
  paidAt?: Date | null;
  raw?: unknown;
};

export interface PaymentGateway {
  initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult>;
  verify(transactionId: string): Promise<GatewayVerifyResult>;
}
