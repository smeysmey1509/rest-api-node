import { Response } from 'express';
import Notification from "../../../models/Notification";
import { AuthenicationRequest } from "../../../middleware/auth";

export const getNotifications = async (req: AuthenicationRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification.countDocuments({ userId })
        ]);

        const readCount = notifications.filter(n => n.read).length;
        const unreadCount = notifications.filter(n => !n.read).length;

        // Helper function to calculate time ago
        const calculateTimeAgo = (date: Date) => {
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);

            if (diffSeconds < 60) return "Just now";

            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;

            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;

            const diffYears = Math.floor(diffMonths / 12);
            return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
        };

        const notificationsWithTimeAgo = notifications.map(n => ({
            _id: n._id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            read: n.read,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            timeAgo: !n.read ? calculateTimeAgo(n.createdAt) : null,
        }));

        res.status(200).json({
            notification: notificationsWithTimeAgo,
            total,
            readCount,
            unreadCount,
            page,
            totalPages: Math.ceil(total / limit),
        });

    } catch (err) {
        console.error("Failed to get notification", err);
        res.status(500).json({
            error: "Failed to get notification",
        });
    }
}
