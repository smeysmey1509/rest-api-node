import { Request, Response } from "express";
import { authService } from "./auth.service";

const isProduction = process.env.NODE_ENV === "production";

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/api/v1/refresh",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearRefreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/api/v1/refresh",
};

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);
    res.status(201).json({ accessToken: result.accessToken, user: result.user });
  },

  async login(req: Request, res: Response) {
    const identifier = req.body.identifier || req.body.email || req.body.name;
    const result = await authService.login({
      identifier,
      password: req.body.password,
    });
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.cookies?.refreshToken);
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);
    res.json({ accessToken: result.accessToken, user: result.user });
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie("refreshToken", clearRefreshCookieOptions);
    res.status(200).json({ msg: "Logged out" });
  },
};
