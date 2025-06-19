import amqp from "amqplib";
import Activity from "../../models/Activity";

export const startConsumer = async () => {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();
    await channel.assertQueue("activity_logs");

    console.log("👀 Worker listening for activity logs...");

    channel.consume("activity_logs", async (msg) => {
        if (msg) {
            const data = JSON.parse(msg.content.toString());
            console.log("📥 Worker received:", data);

            try {
                await Activity.create({
                    user: data.user,
                    products: data.products,
                    action: data.action
                });
            } catch (err) {
                console.error("❌ Failed to log activity:", err);
            }

            channel.ack(msg);
        }
    });
};
