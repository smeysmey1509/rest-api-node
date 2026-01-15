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
exports.consumeActivityLogs = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const Activity_1 = __importDefault(require("../../models/Activity"));
const consumeActivityLogs = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = yield amqplib_1.default.connect("amqp://localhost");
        const channel = yield connection.createChannel();
        const queue = "activity_logs";
        yield channel.assertQueue(queue);
        console.log("🎧 Worker listening to:", queue);
        channel.consume(queue, (msg) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!msg)
                    return;
                const logData = JSON.parse(msg.content.toString());
                console.log("📥 Received activity:", logData);
                yield Activity_1.default.create({
                    user: logData.user,
                    action: logData.action,
                    products: logData.products,
                });
                console.log("📝 Activity saved to DB");
                channel.ack(msg);
            }
            catch (err) {
                console.error("❌ Worker failed to log activity:", err);
            }
        }));
    }
    catch (err) {
        console.error("❌ Worker failed to consume queue:", err);
    }
});
exports.consumeActivityLogs = consumeActivityLogs;
