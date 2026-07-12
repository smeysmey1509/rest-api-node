import mongoose, { InferSchemaType, Model } from "mongoose";

const AuthSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true, immutable: true },
    refreshTokenHash: { type: String, required: true, unique: true, select: false, immutable: true },
    device: String,
    ipAddress: String,
    userAgent: String,
    expiresAt: { type: Date, required: true },
    revokedAt: Date,
  },
  { timestamps: true, collection: "auth_sessions" },
);
AuthSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuthSessionSchema.index({ userId: 1, revokedAt: 1 });

export type AuthSession = InferSchemaType<typeof AuthSessionSchema>;
export const AuthSessionModel = (mongoose.models.AuthSession as Model<AuthSession>) ||
  mongoose.model<AuthSession>("AuthSession", AuthSessionSchema);

