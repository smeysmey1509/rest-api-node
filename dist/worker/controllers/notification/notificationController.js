"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../../../models/Notification"));
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const [notifications, total] = yield Promise.all([
            Notification_1.default.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Notification_1.default.countDocuments({ userId })
        ]);
        const readCount = notifications.filter(n => n.read).length;
        const unreadCount = notifications.filter(n => !n.read).length;
        // Helper function to calculate time ago
        const calculateTimeAgo = (date) => {
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            if (diffSeconds < 60)
                return "Just now";
            const diffMinutes = Math.floor(diffSeconds / 60);
            if (diffMinutes < 60)
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            const diffHours = Math.floor(diffMinutes / 60);
            if (diffHours < 24)
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 30)
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
            const diffMonths = Math.floor(diffDays / 30);
            if (diffMonths < 12)
                return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
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
    }
    catch (err) {
        console.error("Failed to get notification", err);
        res.status(500).json({
            error: "Failed to get notification",
        });
    }
});
exports.getNotifications = getNotifications;
