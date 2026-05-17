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
exports.publishToQueue = exports.connectRabbitMQ = void 0;
const rabbitmq_1 = require("../../config/rabbitmq");
let channel = null;
const connectRabbitMQ = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!rabbitmq_1.rabbitmqConfig.url)
        return null;
    if (channel)
        return channel;
    try {
        const requireFn = eval("require");
        const amqp = requireFn("amqplib");
        const connection = yield amqp.connect(rabbitmq_1.rabbitmqConfig.url);
        channel = yield connection.createChannel();
        yield (channel === null || channel === void 0 ? void 0 : channel.assertQueue(rabbitmq_1.rabbitmqConfig.productActivityQueue, { durable: true }));
        return channel;
    }
    catch (error) {
        console.error("RabbitMQ connection skipped:", error);
        return null;
    }
});
exports.connectRabbitMQ = connectRabbitMQ;
const publishToQueue = (queue, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const activeChannel = yield (0, exports.connectRabbitMQ)();
    if (!activeChannel)
        return;
    activeChannel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
        persistent: true,
    });
});
exports.publishToQueue = publishToQueue;
