import { randomUUID } from "crypto";
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

import app from "../../../app";
import User from "@services/user-service/src/modules/users/user.model";
import Role from "../role.model";

let mongo: MongoMemoryServer;

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const registerAndGetToken = async (
  role: "CUSTOMER" | "ADMIN" | "STAFF" = "CUSTOMER"
) => {
  const email = uniqueEmail(role.toLowerCase());
  const password = "Password123";

  const register = await request(app)
    .post("/api/v1/register")
    .send({
      name: `${role} User`,
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
  await Role.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Roles API", () => {
  it("rejects /roles without token", async () => {
    const res = await request(app).get("/api/v1/roles");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("rejects /roles with invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", "Bearer invalid-token");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("rejects CUSTOMER access", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("rejects STAFF access", async () => {
    const staff = await registerAndGetToken("STAFF");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${staff.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("allows ADMIN access", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
  });

  it("response includes ADMIN, CUSTOMER, STAFF", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.roles).toEqual(
      expect.arrayContaining(["ADMIN", "CUSTOMER", "STAFF"])
    );
  });

  it("response does not expose sensitive data", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);

    expect(res.body.password).toBeUndefined();
    expect(res.body.accessToken).toBeUndefined();
    expect(res.body.refreshToken).toBeUndefined();

    for (const storedRole of res.body.stored) {
      expect(storedRole.password).toBeUndefined();
      expect(storedRole.accessToken).toBeUndefined();
      expect(storedRole.refreshToken).toBeUndefined();
    }
  });

  it("stored roles returns array", async () => {
    await Role.create({
      name: "TEST_MANAGER",
      permission: ["users:read", "products:update"],
    });

    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .get("/api/v1/roles")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.stored)).toBe(true);
    expect(res.body.stored.length).toBe(1);
    expect(res.body.stored[0].name).toBe("TEST_MANAGER");
    expect(res.body.stored[0].permission).toEqual([
      "users:read",
      "products:update",
    ]);
  });
});