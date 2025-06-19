import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue("activity_logs");
    console.log("✅ Connected to RabbitMQQQQ");
};

export const publishProductActivity = async (data: any) => {
    if (!channel) throw new Error("RabbitMQ channel is not initialized");
    channel.sendToQueue("activity_logs", Buffer.from(JSON.stringify(data)));
};
