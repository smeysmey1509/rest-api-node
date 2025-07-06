import express from "express";
import {AuthenicationRequest, authenticateToken} from "../../middleware/auth";
import {
    getNotifications
} from "../controllers/notification/notificationController";
import {authorizePermission} from "../../middleware/authorizePermission";
import {deleteNotification} from "../controllers/notification/deleteNotification.controller";

const router = express.Router();

router.get("/notifications",authenticateToken, authorizePermission("read"), getNotifications);

router.delete("/notification/:id",authenticateToken, authorizePermission('delete'), deleteNotification);

export default router;