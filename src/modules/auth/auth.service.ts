import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt";
import { Roles } from "../../common/constants/roles";
import { AppError } from "../../common/utils/appError";
import { authRepository } from "./auth.repository";

const normalizeEmail = (email: string) => email.toLowerCase().trim();
const normalizeIdentifier = (identifier: string) => identifier.trim();

const assertJwtConfig = () => {
  if (!jwtConfig.accessSecret || !jwtConfig.refreshSecret) {
    throw new AppError("JWT secret not configured", 500);
  }
};

const signToken = (
  payload: { id: string; role: string },
  secret: Secret,
  expiresIn: string
) =>
  jwt.sign(payload, secret, {
    expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  } as SignOptions);

const verifyRefreshToken = (refreshToken: string) => {
  try {
    return jwt.verify(refreshToken, jwtConfig.refreshSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    }) as jwt.JwtPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
};

const publicUser = (user: any) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

const buildTokens = (user: any) => ({
  accessToken: signToken(
    { id: String(user._id), role: user.role },
    jwtConfig.accessSecret,
    jwtConfig.accessExpiresIn
  ),
  refreshToken: signToken(
    { id: String(user._id), role: user.role },
    jwtConfig.refreshSecret,
    jwtConfig.refreshExpiresIn
  ),
});

export const authService = {
  async register(payload: { name: string; email: string; password: string }) {
    assertJwtConfig();

    const email = normalizeEmail(payload.email);
    const existing = await authRepository.findByEmail(email);
    if (existing) throw new AppError("User already exists", 409);

    const user = await authRepository.create({
      name: payload.name.trim(),
      email,
      password: payload.password,
      role: Roles.CUSTOMER,
    });

    const tokens = buildTokens(user);

    return { ...tokens, user: publicUser(user) };
  },

  async login(payload: { identifier: string; password: string }) {
    assertJwtConfig();

    const user = await authRepository.findByLogin(normalizeIdentifier(payload.identifier));
    if (!user) throw new AppError("Invalid credentials", 401);

    if (user.status && user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    const isMatch = await user.comparePassword(payload.password);
    if (!isMatch) throw new AppError("Invalid credentials", 401);

    const tokens = buildTokens(user);

    return { ...tokens, user: publicUser(user) };
  },

  async refresh(refreshToken?: string) {
    if (!refreshToken) throw new AppError("No refresh token provided", 401);
    assertJwtConfig();

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded.id) throw new AppError("Invalid refresh token", 401);

    const user = await authRepository.findById(String(decoded.id));
    if (!user) throw new AppError("User not found", 404);
    if (user.status && user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    const tokens = buildTokens(user);

    return { ...tokens, user: publicUser(user) };
  },
};
