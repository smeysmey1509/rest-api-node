export const jwtConfig = {
  accessSecret: process.env.JWT_SECRET || "",
  refreshSecret: process.env.JWT_REFRESH_SECRET || "",
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};
