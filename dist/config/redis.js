"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfig = void 0;
const env_1 = require("./env");
exports.redisConfig = {
    url: env_1.env.redisUrl,
};
