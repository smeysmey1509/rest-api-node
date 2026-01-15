import amqp from "amqplib";

let channel: amqp.Channel;

const connectRabbitMQ = async () => {
    const connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    await channel.assertQueue("activity_logs");
    await channel.assertQueue("notification_logs");
    console.log("✅ Connected to RabbitMQ: Main");

    return channel;
};

export { channel, connectRabbitMQ };