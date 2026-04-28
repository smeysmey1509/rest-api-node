export const paymentConfig = {
  payway: {
    enabled: process.env.PAYWAY_ENABLED !== "false",
    environment: process.env.PAYWAY_ENV || "sandbox",
    baseUrl:
      process.env.PAYWAY_BASE_URL ||
      "https://checkout-sandbox.payway.com.kh",
    merchantId: process.env.PAYWAY_MERCHANT_ID || "",
    apiKey: process.env.PAYWAY_API_KEY || "",
    callbackUrl: process.env.PAYWAY_CALLBACK_URL || "",
    returnUrl: process.env.PAYWAY_RETURN_URL || "",
    cancelUrl: process.env.PAYWAY_CANCEL_URL || "",
    qrImageTemplate: process.env.PAYWAY_QR_IMAGE_TEMPLATE || "template3_color",
    lifetime: Number(process.env.PAYWAY_QR_LIFETIME || 6),
  },
};
