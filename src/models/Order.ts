import mongoose, { Schema, Document, Types } from "mongoose";

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refunded";

export interface IOrderItem {
  product: Types.ObjectId;
  name: string;
  slug?: string;
  image?: string;
  price: number;
  quantity: number;
}

export interface IShippingAddress {
  fullName?: string;
  phone?: string;
  email?: string;
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  type?: string;
  isDefault?: boolean;
}

export interface IPaymentSummary {
  method?: string;
  status: PaymentStatus;
  transactionId?: string;
  currency?: string;
  paidAt?: Date | null;
}

export interface IDeliverySummary {
  setting?: Types.ObjectId | null;
  method: string;
  baseFee?: number;
  estimatedDays?: number;
  code?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: Date | null;
}

export interface IContactDetails {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface IPromoSummary {
  code: string;
  type?: string;
  value?: number;
  amount?: number;
  maxUsesPerUser?: number;
  expiresAt?: Date;
}

export interface IOrderSummary {
  subTotal: number;
  discount: number;
  deliveryFee: number;
  serviceTax: number;
  total: number;
  taxRate: number;
  promoCode?: string | null;
  promo?: IPromoSummary | null;
}

export interface IStatusHistoryEntry {
  status: OrderStatus;
  message?: string;
  updatedAt: Date;
}

export interface IOrderStatus {
  current: OrderStatus;
  history: IStatusHistoryEntry[];
}

export interface IOrderMeta {
  ip?: string | null;
  device?: string | null;
  userAgent?: string | null;
  location?: string | null;
}

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: IOrderItem[];
  subTotal: number;
  discount: number;
  deliveryFee: number;
  serviceTax: number;
  total: number;
  status: OrderStatus;
  statusHistory?: IStatusHistoryEntry[];
  payment: IPaymentSummary;
  shippingAddress?: IShippingAddress;
  delivery?: IDeliverySummary;
  promoCode?: Types.ObjectId | null;
  notes?: string;
  contact?: IContactDetails;
  summary: IOrderSummary;
  meta?: IOrderMeta;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String },
    phone: { type: String },
    email: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
    type: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const PaymentSchema = new Schema<IPaymentSummary>(
  {
    method: { type: String },
    status: {
      type: String,
      enum: ["pending", "authorized", "paid", "failed", "refunded"],
      default: "pending",
    },
    transactionId: { type: String },
    currency: { type: String },
    paidAt: { type: Date, default: null },
  },
  { _id: false }
);

const DeliverySummarySchema = new Schema<IDeliverySummary>(
  {
    setting: {
      type: Schema.Types.ObjectId,
      ref: "DeliverySetting",
      default: null,
    },
    method: { type: String, required: true },
    baseFee: { type: Number },
    estimatedDays: { type: Number },
    code: { type: String },
    carrier: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    estimatedDeliveryDate: { type: Date, default: null },
  },
  { _id: false }
);

const ContactSchema = new Schema<IContactDetails>(
  {
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
  },
  { _id: false }
);

const PromoSummarySchema = new Schema<IPromoSummary>(
  {
    code: { type: String, required: true },
    type: { type: String },
    value: { type: Number },
    amount: { type: Number },
    maxUsesPerUser: { type: Number },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const OrderSummarySchema = new Schema<IOrderSummary>(
  {
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    serviceTax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    promoCode: { type: String, default: null },
    promo: { type: PromoSummarySchema, default: null },
  },
  { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistoryEntry>(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "paid", "shipped", "delivered", "cancelled"],
      required: true,
    },
    message: { type: String },
    updatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const OrderMetaSchema = new Schema<IOrderMeta>(
  {
    ip: { type: String, default: null },
    device: { type: String, default: null },
    userAgent: { type: String, default: null },
    location: { type: String, default: null },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [OrderItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceTax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    meta: { type: OrderMetaSchema, default: false },
    payment: { type: PaymentSchema, default: () => ({ status: "pending" }) },
    shippingAddress: { type: ShippingAddressSchema, required: false },
    delivery: { type: DeliverySummarySchema, required: false },
    promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode", default: null },
    notes: { type: String },
    contact: { type: ContactSchema, required: false },
    summary: { type: OrderSummarySchema, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>("Order", OrderSchema);
