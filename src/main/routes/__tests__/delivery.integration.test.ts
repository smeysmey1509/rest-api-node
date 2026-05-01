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

import app from "../../../app";
import User from "../../../modules/users/user.model";
import DeliverySetting from "../../../models/DeliverySetting";

let mongo: MongoMemoryServer;

const getId = (doc: { _id: unknown }) => String(doc._id);

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueMethod = (prefix: string) => {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
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

const createDeliverySetting = async (
  overrides: Partial<{
    method: string;
    baseFee: number;
    freeThreshold: number;
    estimatedDays: number;
    isActive: boolean;
    code: string | null;
  }> = {}
) => {
  return DeliverySetting.create({
    method: overrides.method || uniqueMethod("standard"),
    baseFee: overrides.baseFee ?? 2.5,
    freeThreshold: overrides.freeThreshold ?? 50,
    estimatedDays: overrides.estimatedDays ?? 3,
    isActive: overrides.isActive ?? true,
    code: overrides.code ?? null,
  });
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await DeliverySetting.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Delivery API", () => {
  it("rejects delivery list without token", async () => {
    const res = await request(app).get("/api/v1/delivery");

    expect(res.status).toBe(401);
  });

  it("authenticated user can list delivery methods", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    await createDeliverySetting({
      method: uniqueMethod("standard"),
      baseFee: 2,
      estimatedDays: 3,
    });

    const res = await request(app)
      .get("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].baseFee).toBe(2);
    expect(res.body[0].estimatedDays).toBe(3);
  });

  it("authenticated user can create delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const method = uniqueMethod("express");

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method,
        baseFee: 5,
        freeThreshold: 100,
        estimatedDays: 1,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.method).toBe(method);
    expect(res.body.baseFee).toBe(5);
    expect(res.body.freeThreshold).toBe(100);
    expect(res.body.estimatedDays).toBe(1);
    expect(res.body.isActive).toBe(true);

    const dbDelivery = await DeliverySetting.findOne({ method });
    expect(dbDelivery).toBeTruthy();
  });

  it("rejects create delivery without method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        baseFee: 5,
        estimatedDays: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
  });

  it("rejects create delivery without baseFee", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: uniqueMethod("standard"),
        estimatedDays: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
  });

  it("rejects create delivery without estimatedDays", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: uniqueMethod("standard"),
        baseFee: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
  });

  it("rejects duplicate delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const method = uniqueMethod("duplicate");

    await createDeliverySetting({
      method,
      baseFee: 3,
      estimatedDays: 4,
    });

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method,
        baseFee: 5,
        estimatedDays: 2,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Delivery method already exists.");
  });

  it("create pickup delivery generates pickup code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: "pickup",
        baseFee: 0,
        freeThreshold: 0,
        estimatedDays: 0,
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.method).toBe("pickup");
    expect(res.body.code).toBeTruthy();
    expect(typeof res.body.code).toBe("string");
  });

  it("authenticated user can update delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const delivery = await createDeliverySetting({
      method: uniqueMethod("old-method"),
      baseFee: 2,
      freeThreshold: 50,
      estimatedDays: 3,
      isActive: true,
    });

    const newMethod = uniqueMethod("updated-method");

    const res = await request(app)
      .put(`/api/v1/delivery/edit/${getId(delivery)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: newMethod,
        baseFee: 7,
        freeThreshold: 120,
        isActive: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.method).toBe(newMethod);
    expect(res.body.baseFee).toBe(7);
    expect(res.body.freeThreshold).toBe(120);
    expect(res.body.isActive).toBe(false);

    const dbDelivery = await DeliverySetting.findById(getId(delivery));
    expect(dbDelivery?.method).toBe(newMethod);
    expect(dbDelivery?.baseFee).toBe(7);
    expect(dbDelivery?.isActive).toBe(false);
  });

  it("update missing delivery method returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const missingId = new Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/v1/delivery/edit/${missingId}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: uniqueMethod("missing"),
        baseFee: 5,
        freeThreshold: 100,
        isActive: true,
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Delivery method not found.");
  });

  it("authenticated user can delete delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const delivery = await createDeliverySetting({
      method: uniqueMethod("delete"),
      baseFee: 2,
      estimatedDays: 3,
    });

    const res = await request(app)
      .delete(`/api/v1/delivery/remove/${getId(delivery)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Delivery method deleted.");

    const dbDelivery = await DeliverySetting.findById(getId(delivery));
    expect(dbDelivery).toBeNull();
  });

  it("delete missing delivery method returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const missingId = new Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/delivery/remove/${missingId}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Delivery method not found.");
  });
});