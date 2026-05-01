import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.JWT_ISSUER = "rest-api-node";
  process.env.JWT_AUDIENCE = "rest-api-node-client";
  process.env.NODE_ENV = "test";
});

import app from "../../app";
import User from "../../modules/users/user.model";

let mongo: MongoMemoryServer;

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const registerAndGetToken = async (
  role: "CUSTOMER" | "ADMIN" | "STAFF" = "CUSTOMER",
  overrides: Partial<{
    name: string;
    email: string;
    password: string;
  }> = {}
) => {
  const password = overrides.password || "Password123";
  const email = overrides.email || uniqueEmail(role.toLowerCase());

  const register = await request(app)
    .post("/api/v1/register")
    .send({
      name: overrides.name || `${role} User`,
      email,
      password,
    });

  expect(register.status).toBe(201);

  if (role !== "CUSTOMER") {
    await User.findOneAndUpdate({ email }, { role });
  }

  const login = await request(app)
    .post("/api/v1/login")
    .send({
      identifier: email,
      password,
    });

  expect(login.status).toBe(200);

  return {
    accessToken: login.body.accessToken as string,
    user: login.body.user,
    email,
    password,
  };
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Users API", () => {
  it("rejects /me without access token", async () => {
    const res = await request(app).get("/api/v1/me");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("gets current user profile with valid token", async () => {
    const customer = await registerAndGetToken("CUSTOMER", {
      name: "Profile User",
      email: uniqueEmail("profile"),
    });

    const res = await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(customer.email);
    expect(res.body.name).toBe("Profile User");
    expect(res.body.role).toBe("CUSTOMER");
    expect(res.body.password).toBeUndefined();
  });

  it("supports legacy /profile route", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/profile")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Welcome to the protected route!");
    expect(res.body.user.email).toBe(customer.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it("updates current user profile allowed fields only", async () => {
    const customer = await registerAndGetToken("CUSTOMER", {
      email: uniqueEmail("update-profile"),
    });

    const res = await request(app)
      .patch("/api/v1/me")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        name: "Updated Name",
        limit: 25,
        role: "ADMIN",
        status: "BLOCKED",
        password: "HackedPassword123",
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.limit).toBe(25);
    expect(res.body.role).toBe("CUSTOMER");
    expect(res.body.status).toBe("ACTIVE");
    expect(res.body.password).toBeUndefined();

    const dbUser = await User.findOne({ email: customer.email }).select("+password");

    expect(dbUser?.role).toBe("CUSTOMER");
    expect(dbUser?.status).toBe("ACTIVE");
    expect(dbUser?.password).not.toBe("HackedPassword123");
  });

  it("rejects users list for customer role", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("allows admin to list users", async () => {
    await registerAndGetToken("CUSTOMER", {
      email: uniqueEmail("customer-list"),
    });

    const admin = await registerAndGetToken("ADMIN", {
      email: uniqueEmail("admin-list"),
    });

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);

    for (const user of res.body.users) {
      expect(user.password).toBeUndefined();
    }
  });

  it("allows admin to get user by id", async () => {
    const customer = await registerAndGetToken("CUSTOMER", {
      email: uniqueEmail("get-user"),
    });

    const admin = await registerAndGetToken("ADMIN", {
      email: uniqueEmail("admin-get-user"),
    });

    const res = await request(app)
      .get(`/api/v1/users/${customer.user.id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(customer.email);
    expect(res.body.password).toBeUndefined();
  });

  it("returns 404 when admin gets missing user", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const missingUserId = new Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/users/${missingUserId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("User not found.");
  });

  it("rejects status update for customer role", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const target = await registerAndGetToken("CUSTOMER", {
      email: uniqueEmail("target-status"),
    });

    const res = await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        status: "BLOCKED",
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("allows admin to update user status to BLOCKED", async () => {
    const target = await registerAndGetToken("CUSTOMER", {
      email: uniqueEmail("blocked-target"),
    });

    const admin = await registerAndGetToken("ADMIN", {
      email: uniqueEmail("admin-block"),
    });

    const res = await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "BLOCKED",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("BLOCKED");

    const dbUser = await User.findById(target.user.id);
    expect(dbUser?.status).toBe("BLOCKED");
  });

  it("rejects missing status when updating user status", async () => {
    const target = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid user status", async () => {
    const target = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "DELETED",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid user status");
  });

  it("allows admin to set user status back to ACTIVE", async () => {
    const target = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");

    await User.findByIdAndUpdate(target.user.id, {
      status: "BLOCKED",
    });

    const res = await request(app)
      .patch(`/api/v1/users/${target.user.id}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "ACTIVE",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ACTIVE");
  });
});
