import { Request, Response } from "express";
import { authService } from "./auth.service";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.json(result);
  },

  async login(req: Request, res: Response) {
    const identifier = req.body.identifier || req.body.email || req.body.name;
    const result = await authService.login({
      identifier,
      password: req.body.password,
    });
    res.cookie("refreshToken", result.refreshToken, cookieOptions);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.cookies?.refreshToken);
    res.json(result);
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    res.status(200).json({ msg: "Logged out" });
  },
};
