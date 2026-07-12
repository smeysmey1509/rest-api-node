import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { userService } from "./user.service";

export const userController = {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getCurrentUser(req.user?.id);
    res.status(200).json(user);
  },

  async legacyProfile(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getCurrentUser(req.user?.id);
    res.json({
      msg: "Welcome to the protected route!",
      userId: req.user,
      user,
    });
  },

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updateCurrentUser(req.user?.id, req.body);
    res.status(200).json(user);
  },

  async listUsers(req: AuthenticatedRequest, res: Response) {
    const result = await userService.listUsers(req.query as Record<string, unknown>);
    res.status(200).json(result);
  },

  async getUser(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getUser(String(req.params.id));
    res.status(200).json(user);
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updateUserStatus(String(req.params.id), req.body.status);
    res.status(200).json(user);
  },
};
