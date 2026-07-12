import { createHash, randomUUID } from "crypto";
import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { jwtConfig } from "@shared/config/jwt";
import { Roles } from "@shared/constants/roles";
import { DomainEventNames } from "@shared/events/domain-events";
import { publishDomainEvent } from "@shared/events/message-bus";
import { AppError } from "@shared/errors/app-error";
import { authRepository } from "./auth.repository";
import { AuthSessionModel } from "../auth-sessions/auth-session.model";

const normalizeEmail = (email: string) => email.toLowerCase().trim();
const normalizeIdentifier = (identifier: string) => identifier.trim();

type TokenPayload = {
  id: string;
  role: string;
  tokenType: "access" | "refresh";
  jti?: string;
};

const assertJwtConfig = () => {
  if (!jwtConfig.accessSecret || !jwtConfig.refreshSecret) {
    throw new AppError("JWT secret not configured", 500);
  }
};

const signToken = (
  payload: TokenPayload,
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

type AuthUser = { _id: unknown; name: string; email: string; role: string; status: string; customerNumber?: string };
type SessionContext = { device?: string; ipAddress?: string; userAgent?: string };

const publicUser = (user: AuthUser) => ({
  id: user._id,
  customerNumber: user.customerNumber,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
});

const buildTokens = (user: AuthUser) => ({
  accessToken: signToken(
    { id: String(user._id), role: user.role, tokenType: "access" },
    jwtConfig.accessSecret,
    jwtConfig.accessExpiresIn
  ),
  refreshToken: signToken(
    {
      id: String(user._id),
      role: user.role,
      tokenType: "refresh",
      jti: randomUUID(),
    },
    jwtConfig.refreshSecret,
    jwtConfig.refreshExpiresIn
  ),
});

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

const persistSession = async (user: AuthUser, refreshToken: string, context: SessionContext) => {
  const decoded = jwt.decode(refreshToken);
  if (!decoded || typeof decoded === "string" || !decoded.exp) throw new AppError("Could not create refresh session", 500);
  await AuthSessionModel.create({
    userId: user._id,
    refreshTokenHash: tokenHash(refreshToken),
    expiresAt: new Date(decoded.exp * 1000),
    ...context,
  });
};

export const authService = {
  async register(payload: { name: string; email: string; password: string }, context: SessionContext = {}) {
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
    await persistSession(user, tokens.refreshToken, context);

    await publishDomainEvent(DomainEventNames.UserCreated, {
      userId: String(user._id),
      email: user.email,
    }).catch((error) => console.error("Failed to publish user.created event:", error));

    return { ...tokens, user: publicUser(user) };
  },

  async login(payload: { identifier: string; password: string }, context: SessionContext = {}) {
    assertJwtConfig();

    const user = await authRepository.findByLogin(normalizeIdentifier(payload.identifier));
    if (!user) throw new AppError("Invalid credentials", 401);

    if (user.status && user.status !== "ACTIVE") {
      throw new AppError("User account is not active", 403);
    }

    const isMatch = await user.comparePassword(payload.password);
    if (!isMatch) throw new AppError("Invalid credentials", 401);

    const tokens = buildTokens(user);
    await persistSession(user, tokens.refreshToken, context);

    return { ...tokens, user: publicUser(user) };
  },

  async refresh(refreshToken?: string, context: SessionContext = {}) {
    if (!refreshToken) throw new AppError("No refresh token provided", 401);
    assertJwtConfig();

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded.id || decoded.tokenType !== "refresh") {
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await authRepository.findActiveById(String(decoded.id));
    if (!user) throw new AppError("Invalid refresh token", 401);

    const oldSession = await AuthSessionModel.findOneAndUpdate(
      { refreshTokenHash: tokenHash(refreshToken), revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { revokedAt: new Date() } },
      { new: true },
    ).select("_id");
    if (!oldSession) throw new AppError("Refresh session is revoked or expired", 401);

    const tokens = buildTokens(user);
    await persistSession(user, tokens.refreshToken, context);

    return { ...tokens, user: publicUser(user) };
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    await AuthSessionModel.updateOne(
      { refreshTokenHash: tokenHash(refreshToken), revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
  },

  async logoutAll(userId: string) {
    await AuthSessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  },
};
