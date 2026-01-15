import {channel} from "./rabbitmq";

export const publishProductActivity = async (data: any) => {
    if (!channel) throw new Error("RabbitMQ channel is not initialized");
    channel.sendToQueue("activity_logs", Buffer.from(JSON.stringify(data)));
};