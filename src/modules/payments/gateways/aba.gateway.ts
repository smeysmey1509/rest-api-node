import axios from "axios";
import crypto from "crypto";
import { paymentConfig } from "../../../config/payment";
import {
  GatewayInitiateInput,
  GatewayInitiateResult,
  GatewayVerifyResult,
  PaymentGateway,
} from "./paymentGateway";

const formatReqTime = (date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const encodeBase64 = (value: unknown) =>
  Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64");

const hashPayload = (payload: Record<string, any>, fields: string[]) => {
  const key = paymentConfig.payway.apiKey;
  const raw = fields.map((field) => payload[field] ?? "").join("");
  return crypto.createHmac("sha512", key).update(raw).digest("base64");
};

const defaultQrHashFields = [
  "req_time",
  "merchant_id",
  "tran_id",
  "amount",
  "items",
  "currency",
  "callback_url",
  "lifetime",
];

const defaultCheckHashFields = ["req_time", "merchant_id", "tran_id"];

const getHashFields = (envName: string, fallback: string[]) =>
  {
    const configured = (process.env[envName] || "")
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
    return configured.length ? configured : fallback;
  };

const buildItems = (order: any) =>
  (order.items || []).map((item: any) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
  }));

export class AbaGateway implements PaymentGateway {
  async initiate(input: GatewayInitiateInput): Promise<GatewayInitiateResult> {
    const { payment, order } = input;
    const reqTime = formatReqTime();
    const payload: Record<string, any> = {
      req_time: reqTime,
      merchant_id: paymentConfig.payway.merchantId,
      tran_id: payment.transactionId,
      first_name: order.contact?.fullName?.split(" ")[0] || "Customer",
      last_name: order.contact?.fullName?.split(" ").slice(1).join(" ") || "",
      email: order.contact?.email || order.shippingAddress?.email || "",
      phone: order.contact?.phone || order.shippingAddress?.phone || "",
      amount: payment.amount,
      purchase_type: "purchase",
      payment_option: "abapay_khqr",
      items: encodeBase64(buildItems(order)),
      currency: payment.currency,
      callback_url: encodeBase64(paymentConfig.payway.callbackUrl),
      return_deeplink: null,
      custom_fields: null,
      return_params: null,
      payout: null,
      lifetime: paymentConfig.payway.lifetime,
      qr_image_template: paymentConfig.payway.qrImageTemplate,
    };

    payload.hash = hashPayload(payload, getHashFields("PAYWAY_QR_HASH_FIELDS", defaultQrHashFields));

    const { data } = await axios.post(
      `${paymentConfig.payway.baseUrl}/api/payment-gateway/v1/payments/generate-qr`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return {
      provider: "PAYWAY",
      status: data?.status?.message || data?.status?.code,
      gatewayReference: data?.status?.trace_id,
      checkoutData: {
        qrString: data?.qrString,
        qrImage: data?.qrImage,
        abapay_deeplink: data?.abapay_deeplink,
        app_store: data?.app_store,
        play_store: data?.play_store,
        amount: data?.amount,
        currency: data?.currency,
        rawStatus: data?.status,
      },
    };
  }

  async verify(transactionId: string): Promise<GatewayVerifyResult> {
    const payload: Record<string, any> = {
      req_time: formatReqTime(),
      merchant_id: paymentConfig.payway.merchantId,
      tran_id: transactionId,
    };
    payload.hash = hashPayload(payload, getHashFields("PAYWAY_CHECK_HASH_FIELDS", defaultCheckHashFields));

    const { data } = await axios.post(
      `${paymentConfig.payway.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    const statusCode = data?.data?.payment_status_code;
    const status = data?.data?.payment_status || data?.status?.message || "";
    const success = Number(statusCode) === 0 || String(status).toUpperCase() === "APPROVED";

    return {
      success,
      status,
      gatewayReference: data?.status?.tran_id || transactionId,
      paidAt: data?.data?.transaction_date ? new Date(data.data.transaction_date) : null,
      raw: data,
    };
  }
}

export const abaGateway = new AbaGateway();
