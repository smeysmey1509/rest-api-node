import { channel } from "./rabbitmq";

export const publishNotificationEvent = async (data: any) => {
    if (!channel) throw new Error("RabbitMQ channel is not initialized");
    channel.sendToQueue("notification_logs", Buffer.from(JSON.stringify(data)));
};
