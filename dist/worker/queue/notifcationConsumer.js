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
exports.consumeNotifs = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const Notification_1 = __importDefault(require("../../models/Notification"));
const User_1 = __importDefault(require("../../models/User"));
const server_1 = require("../server");
const consumeNotifs = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const connection = yield amqplib_1.default.connect("amqp://localhost");
        const channel = yield connection.createChannel();
        const queue = "notification_logs";
        yield channel.assertQueue(queue);
        console.log("🎧 Worker listening to:", queue);
        channel.consume(queue, (msg) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!msg)
                    return;
                const notificationData = JSON.parse(msg.content.toString());
                console.log("📥 Received notification:", notificationData);
                const users = yield User_1.default.find({ _id: { $ne: notificationData.userId } }).select("_id");
                console.log("Other users to notify:", users.map(u => u._id.toString()));
                if (!users.length) {
                    console.log("No other users found.");
                    channel.ack(msg);
                    return;
                }
                // Insert notification for each user
                const notifications = yield Notification_1.default.insertMany(users.map(u => ({
                    userId: u._id,
                    title: notificationData.title,
                    message: notificationData.message,
                    read: false,
                })));
                console.log("📝 Saved notifications:", notifications);
                // Emit to each user
                users.forEach(u => {
                    const notif = notifications.find(n => n.userId.equals(u._id));
                    if (notif) {
                        server_1.io.emit(`notification:${u._id}`, notif);
                        console.log(`📡 Emitted to user ${u._id}`);
                    }
                });
                channel.ack(msg);
            }
            catch (err) {
                console.error("❌ Notification failed:", err);
            }
        }));
    }
    catch (err) {
        console.error("❌ Worker failed to consume queue:", err);
    }
});
exports.consumeNotifs = consumeNotifs;
