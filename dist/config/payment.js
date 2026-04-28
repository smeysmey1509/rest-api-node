"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentConfig = void 0;
const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const normalizeKey = (value) => (value || "").replace(/\\n/g, "\n");
exports.paymentConfig = {
    payway: {
        enabled: process.env.PAYWAY_ENABLED !== "false",
        environment: process.env.PAYWAY_ENV || "sandbox",
        baseUrl: trimTrailingSlash(process.env.PAYWAY_BASE_URL || "https://checkout-sandbox.payway.com.kh"),
        merchantId: process.env.PAYWAY_MERCHANT_ID || "",
        apiKey: process.env.PAYWAY_API_KEY || "",
        callbackUrl: process.env.PAYWAY_CALLBACK_URL || "",
        returnUrl: process.env.PAYWAY_RETURN_URL || "",
        cancelUrl: process.env.PAYWAY_CANCEL_URL || "",
        qrImageTemplate: process.env.PAYWAY_QR_IMAGE_TEMPLATE || "template3_color",
        lifetime: Number(process.env.PAYWAY_QR_LIFETIME_MINUTES ||
            process.env.PAYWAY_QR_LIFETIME ||
            6),
        defaultPaymentOption: process.env.PAYWAY_DEFAULT_PAYMENT_OPTION || "abapay_khqr",
        rsaPublicKey: normalizeKey(process.env.PAYWAY_RSA_PUBLIC_KEY),
        rsaPrivateKey: normalizeKey(process.env.PAYWAY_RSA_PRIVATE_KEY),
    },
};
