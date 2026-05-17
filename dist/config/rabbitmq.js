"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rabbitmqConfig = void 0;
const env_1 = require("./env");
exports.rabbitmqConfig = {
    url: env_1.env.rabbitmqUrl,
    productActivityQueue: env_1.env.productActivityQueue,
};
