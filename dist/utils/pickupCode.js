"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePickupCode = generatePickupCode;
// utils/pickupCode.ts
function generatePickupCode(length = 6) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
