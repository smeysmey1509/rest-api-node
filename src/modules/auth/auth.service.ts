import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt";
import { Roles } from "../../common/constants/roles";
import { AppError } from "../../common/utils/appError";
import { authRepository } from "./auth.repository";

const signToken = (
  payload: { id: string; role: string },
  secret: Secret,
  expiresIn: string
) => jwt.sign(payload, secret, { expiresIn } as SignOptions);

const publicUser = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

export const authService = {
  async register(payload: { name: string; email: string; password: string }) {
    if (!jwtConfig.accessSecret) {
      throw new AppError("JWT secret not configured", 500);
    }

    const existing = await authRepository.findByEmail(payload.email);
    if (existing) throw new AppError("User already exists", 400);

    const user = await authRepository.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: Roles.CUSTOMER,
    });

    const token = signToken(
      { id: String(user._id), role: user.role },
      jwtConfig.accessSecret,
      jwtConfig.accessExpiresIn
    );

    return { token, user: publicUser(user) };
  },

  async login(payload: { identifier: string; password: string }) {
    if (!jwtConfig.accessSecret || !jwtConfig.refreshSecret) {
      throw new AppError("JWT secret not configured", 500);
    }

    const user = await authRepository.findByLogin(payload.identifier);
    if (!user) throw new AppError("User does not exist", 400);

    if (user.status && user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    const isMatch = await user.comparePassword(payload.password);
    if (!isMatch) throw new AppError("Invalid credentials", 400);

    const accessToken = signToken(
      { id: String(user._id), role: user.role },
      jwtConfig.accessSecret,
      jwtConfig.accessExpiresIn
    );
    const refreshToken = signToken(
      { id: String(user._id), role: user.role },
      jwtConfig.refreshSecret,
      jwtConfig.refreshExpiresIn
    );

    return { accessToken, refreshToken, user: publicUser(user) };
  },

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new AppError("No refresh token provided!", 401);
    if (!jwtConfig.accessSecret || !jwtConfig.refreshSecret) {
      throw new AppError("JWT secret not configured.", 500);
    }

    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as jwt.JwtPayload;
    const user = await authRepository.findById(String(decoded.id));
    if (!user) throw new AppError("User not found", 404);
    if (user.status && user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    const accessToken = signToken(
      { id: String(user._id), role: user.role },
      jwtConfig.accessSecret,
      jwtConfig.accessExpiresIn
    );

    return { accessToken };
  },
};
