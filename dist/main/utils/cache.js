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
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartCacheKey = exports.redis = void 0;
exports.connectRedis = connectRedis;
exports.getCachedCart = getCachedCart;
exports.setCachedCart = setCachedCart;
exports.invalidateCart = invalidateCart;
// cache.ts
const redis_1 = require("redis");
exports.redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
function connectRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!exports.redis.isOpen) {
            yield exports.redis.connect();
        }
    });
}
const cartCacheKey = (uid) => `cart:${uid}`;
exports.cartCacheKey = cartCacheKey;
function getCachedCart(uid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const json = yield exports.redis.get((0, exports.cartCacheKey)(uid));
            return json ? JSON.parse(json) : null;
        }
        catch (_a) {
            return null;
        }
    });
}
function setCachedCart(uid_1, payload_1) {
    return __awaiter(this, arguments, void 0, function* (uid, payload, ttl = 60) {
        try {
            yield exports.redis.set((0, exports.cartCacheKey)(uid), JSON.stringify(payload), { EX: ttl });
        }
        catch (_a) {
            /* ignore cache errors */
        }
    });
}
function invalidateCart(uid) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.redis.del((0, exports.cartCacheKey)(uid));
        }
        catch (_a) {
            /* ignore cache errors */
        }
    });
}
