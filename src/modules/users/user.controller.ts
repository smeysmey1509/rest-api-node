import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
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

  async listUsers(_req: AuthenticatedRequest, res: Response) {
    const users = await userService.listUsers();
    res.status(200).json(users);
  },

  async getUser(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getUser(req.params.id);
    res.status(200).json(user);
  },

  async updateUserStatus(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updateUserStatus(req.params.id, req.body.status);
    res.status(200).json(user);
  },
};
