import { rabbitmqConfig } from "../../config/rabbitmq";

type RabbitChannel = {
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  sendToQueue(queue: string, content: Buffer, options?: { persistent?: boolean }): boolean;
};

let channel: RabbitChannel | null = null;

export const connectRabbitMQ = async (): Promise<RabbitChannel | null> => {
  if (!rabbitmqConfig.url) return null;
  if (channel) return channel;

  try {
    const requireFn = eval("require") as NodeRequire;
    const amqp = requireFn("amqplib");
    const connection = await amqp.connect(rabbitmqConfig.url);
    channel = await connection.createChannel();
    await channel?.assertQueue(rabbitmqConfig.productActivityQueue, { durable: true });
    return channel;
  } catch (error) {
    console.error("RabbitMQ connection skipped:", error);
    return null;
  }
};

export const publishToQueue = async (queue: string, payload: unknown) => {
  const activeChannel = await connectRabbitMQ();
  if (!activeChannel) return;

  activeChannel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
};
