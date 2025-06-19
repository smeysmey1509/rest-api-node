import amqp from "amqplib";
import Activity from "../../models/Activity";

export const consumeActivityLogs = async () => {
    try {
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();

        const queue = "activity_logs";
        await channel.assertQueue(queue);

        console.log("🎧 Worker listening to:", queue);

        channel.consume(queue, async (msg) => {
            try {
                if (!msg) return;
                const logData = JSON.parse(msg.content.toString());
                console.log("📥 Received activity:", logData);

                await Activity.create({
                    user: logData.user,
                    action: logData.action,
                    products: logData.products,
                });

                console.log("📝 Activity saved to DB");
                channel.ack(msg);
            } catch (err) {
                console.error("❌ Worker failed to log activity:", err);
            }
        });
    } catch (err) {
        console.error("❌ Worker failed to consume queue:", err);
    }
};
