"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.abaGateway = exports.AbaGateway = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const payment_1 = require("../../../config/payment");
const formatReqTime = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};
const encodeBase64 = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64");
const hashPayload = (payload, fields) => {
    const key = payment_1.paymentConfig.payway.apiKey;
    const raw = fields.map((field) => { var _a; return (_a = payload[field]) !== null && _a !== void 0 ? _a : ""; }).join("");
    return crypto_1.default.createHmac("sha512", key).update(raw).digest("base64");
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
const getHashFields = (envName, fallback) => {
    const configured = (process.env[envName] || "")
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
    return configured.length ? configured : fallback;
};
const buildItems = (order) => (order.items || []).map((item) => ({
    name: item.name,
    quantity: item.quantity,
    price: item.price,
}));
class AbaGateway {
    initiate(input) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const { payment, order } = input;
            const reqTime = formatReqTime();
            const payload = {
                req_time: reqTime,
                merchant_id: payment_1.paymentConfig.payway.merchantId,
                tran_id: payment.transactionId,
                first_name: ((_b = (_a = order.contact) === null || _a === void 0 ? void 0 : _a.fullName) === null || _b === void 0 ? void 0 : _b.split(" ")[0]) || "Customer",
                last_name: ((_d = (_c = order.contact) === null || _c === void 0 ? void 0 : _c.fullName) === null || _d === void 0 ? void 0 : _d.split(" ").slice(1).join(" ")) || "",
                email: ((_e = order.contact) === null || _e === void 0 ? void 0 : _e.email) || ((_f = order.shippingAddress) === null || _f === void 0 ? void 0 : _f.email) || "",
                phone: ((_g = order.contact) === null || _g === void 0 ? void 0 : _g.phone) || ((_h = order.shippingAddress) === null || _h === void 0 ? void 0 : _h.phone) || "",
                amount: payment.amount,
                purchase_type: "purchase",
                payment_option: payment_1.paymentConfig.payway.defaultPaymentOption,
                items: encodeBase64(buildItems(order)),
                currency: payment.currency,
                callback_url: encodeBase64(payment_1.paymentConfig.payway.callbackUrl),
                return_deeplink: null,
                custom_fields: null,
                return_params: null,
                payout: null,
                lifetime: payment_1.paymentConfig.payway.lifetime,
                qr_image_template: payment_1.paymentConfig.payway.qrImageTemplate,
            };
            payload.hash = hashPayload(payload, getHashFields("PAYWAY_QR_HASH_FIELDS", defaultQrHashFields));
            const { data } = yield axios_1.default.post(`${payment_1.paymentConfig.payway.baseUrl}/api/payment-gateway/v1/payments/generate-qr`, payload, { headers: { "Content-Type": "application/json" } });
            return {
                provider: "PAYWAY",
                status: ((_j = data === null || data === void 0 ? void 0 : data.status) === null || _j === void 0 ? void 0 : _j.message) || ((_k = data === null || data === void 0 ? void 0 : data.status) === null || _k === void 0 ? void 0 : _k.code),
                gatewayReference: (_l = data === null || data === void 0 ? void 0 : data.status) === null || _l === void 0 ? void 0 : _l.trace_id,
                checkoutData: {
                    qrString: data === null || data === void 0 ? void 0 : data.qrString,
                    qrImage: data === null || data === void 0 ? void 0 : data.qrImage,
                    abapay_deeplink: data === null || data === void 0 ? void 0 : data.abapay_deeplink,
                    app_store: data === null || data === void 0 ? void 0 : data.app_store,
                    play_store: data === null || data === void 0 ? void 0 : data.play_store,
                    amount: data === null || data === void 0 ? void 0 : data.amount,
                    currency: data === null || data === void 0 ? void 0 : data.currency,
                    rawStatus: data === null || data === void 0 ? void 0 : data.status,
                },
            };
        });
    }
    verify(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const payload = {
                req_time: formatReqTime(),
                merchant_id: payment_1.paymentConfig.payway.merchantId,
                tran_id: transactionId,
            };
            payload.hash = hashPayload(payload, getHashFields("PAYWAY_CHECK_HASH_FIELDS", defaultCheckHashFields));
            const { data } = yield axios_1.default.post(`${payment_1.paymentConfig.payway.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`, payload, { headers: { "Content-Type": "application/json" } });
            const statusCode = (_a = data === null || data === void 0 ? void 0 : data.data) === null || _a === void 0 ? void 0 : _a.payment_status_code;
            const status = ((_b = data === null || data === void 0 ? void 0 : data.data) === null || _b === void 0 ? void 0 : _b.payment_status) || ((_c = data === null || data === void 0 ? void 0 : data.status) === null || _c === void 0 ? void 0 : _c.message) || "";
            const success = Number(statusCode) === 0 || String(status).toUpperCase() === "APPROVED";
            return {
                success,
                status,
                gatewayReference: ((_d = data === null || data === void 0 ? void 0 : data.status) === null || _d === void 0 ? void 0 : _d.tran_id) || transactionId,
                paidAt: ((_e = data === null || data === void 0 ? void 0 : data.data) === null || _e === void 0 ? void 0 : _e.transaction_date) ? new Date(data.data.transaction_date) : null,
                raw: data,
            };
        });
    }
}
exports.AbaGateway = AbaGateway;
exports.abaGateway = new AbaGateway();
