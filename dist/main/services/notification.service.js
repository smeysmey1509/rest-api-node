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
exports.publishNotificationEvent = void 0;
const rabbitmq_1 = require("./rabbitmq");
const publishNotificationEvent = (data) => __awaiter(void 0, void 0, void 0, function* () {
    if (!rabbitmq_1.channel)
        throw new Error("RabbitMQ channel is not initialized");
    rabbitmq_1.channel.sendToQueue("notification_logs", Buffer.from(JSON.stringify(data)));
});
exports.publishNotificationEvent = publishNotificationEvent;
