"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../../middleware/auth");
const notificationController_1 = require("../controllers/notification/notificationController");
const authorizePermission_1 = require("../../middleware/authorizePermission");
const deleteNotification_controller_1 = require("../controllers/notification/deleteNotification.controller");
const router = express_1.default.Router();
router.get("/notifications", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), notificationController_1.getNotifications);
router.delete("/notification/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)('delete'), deleteNotification_controller_1.deleteNotification);
exports.default = router;
