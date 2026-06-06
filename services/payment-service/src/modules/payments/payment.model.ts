import mongoose, { Document, Schema, Types } from "mongoose";
import {
  PaymentStatus,
  PaymentStatusValue,
} from "@shared/constants/paymentStatus";

export const PaymentMethod = {
  NORMAL_PAYMENT: "NORMAL_PAYMENT",
  VISA_MASTER: "VISA_MASTER",
  BANK_TRANSFER: "BANK_TRANSFER",
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
} as const;

export type PaymentMethodValue =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface IPayment extends Document {
  order: Types.ObjectId;
  user: Types.ObjectId;
  method: PaymentMethodValue;
  provider: string;
  status: PaymentStatusValue;
  amount: number;
  currency: string;
  transactionId: string;
  merchantRef?: string;
  gatewayReference?: string;
  gatewayStatus?: string;
  checkoutData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  verifiedAt?: Date | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
      index: true,
    },
    provider: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    merchantRef: { type: String, index: true },
    gatewayReference: { type: String },
    gatewayStatus: { type: String },
    checkoutData: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ order: 1, method: 1 });

const Payment =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;
