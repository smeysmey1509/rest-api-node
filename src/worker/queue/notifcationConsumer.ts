import amqp from "amqplib";
import Notification from "../../models/Notification";
import User from "../../models/User";
import {io} from "../server"

export const consumeNotifs = async () => {
    try{
        const connection = await amqp.connect("amqp://localhost");
        const channel = await connection.createChannel();

        const queue = "notification_logs";
        await channel.assertQueue(queue);

        console.log("🎧 Worker listening to:", queue);

        channel.consume(queue, async (msg: any) => {
            try{
                if (!msg) return;
                const notificationData = JSON.parse(msg.content.toString());
                console.log("📥 Received notification:", notificationData);

                const users = await User.find({_id: {$ne: notificationData.userId}}).select("_id");

                console.log("Other users to notify:", users.map(u => u._id.toString()));

                if (!users.length) {
                    console.log("No other users found.");
                    channel.ack(msg);
                    return;
                }

                // Insert notification for each user
                const notifications = await Notification.insertMany(
                    users.map(u => ({
                        userId: u._id,
                        title: notificationData.title,
                        message: notificationData.message,
                        read: false,
                    }))
                );

                console.log("📝 Saved notifications:", notifications);

                // Emit to each user
                users.forEach(u => {
                    const notif = notifications.find(n => n.userId.equals(u._id));
                    if (notif) {
                        io.emit(`notification:${u._id}`, notif);
                        console.log(`📡 Emitted to user ${u._id}`);
                    }
                });

                channel.ack(msg);
            }catch(err){
                console.error("❌ Notification failed:", err);
            }
        });

    }catch(err){
        console.error("❌ Worker failed to consume queue:", err);
    }
}