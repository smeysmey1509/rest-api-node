// worker/utils/rabbitmq.ts
import amqplib from "amqplib";

let channel: amqplib.Channel;

export async function connectRabbitMQ() {
    try {
        const connection = await amqplib.connect("amqp://localhost");
        channel = await connection.createChannel();
        console.log("✅ Connected to RabbitMQ");
    } catch (error) {
        console.error("❌ Failed to connect to RabbitMQ:", error);
        process.exit(1);
    }
}

export function getChannel(): amqplib.Channel {
    if (!channel) throw new Error("RabbitMQ channel not initialized");
    return channel;
}
