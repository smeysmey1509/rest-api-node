"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)();
redisClient.on("error", err => { console.error("❌ Redis Client Error", err); });
redisClient.connect().then(err => {
    console.log("✅ Redis connected");
});
exports.default = redisClient;
