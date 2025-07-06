import amqp from "amqplib";

let channel: amqp.Channel;

const connectRabbitMQ = async () => {
    let connection = await amqp.connect("amqp://localhost");
    channel = await connection.createChannel();
    console.log("✅ RabbitMQ connected: Worker");
};

export { channel, connectRabbitMQ };
