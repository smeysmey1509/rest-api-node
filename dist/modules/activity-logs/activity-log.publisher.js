"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishProductActivity = void 0;
const rabbitmq_1 = require("../../config/rabbitmq");
const rabbitmq_client_1 = require("../../infrastructure/rabbitmq/rabbitmq.client");
const publishProductActivity = (payload) => {
    return (0, rabbitmq_client_1.publishToQueue)(rabbitmq_1.rabbitmqConfig.productActivityQueue, Object.assign(Object.assign({}, payload), { occurredAt: new Date().toISOString() }));
};
exports.publishProductActivity = publishProductActivity;
