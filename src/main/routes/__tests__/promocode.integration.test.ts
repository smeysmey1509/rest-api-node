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
import User from "../../../modules/users/user.model";
import PromoCode from "../../../models/PromoCode";

let mongo: MongoMemoryServer;

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueCode = (prefix: string) => {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};

const futureDate = (days = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
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

const createPromo = async (
  overrides: Partial<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    expiresAt: Date;
    isActive: boolean;
    maxUsesPerUser: number;
  }> = {}
) => {
  return PromoCode.create({
    code: overrides.code || uniqueCode("PROMO").toUpperCase(),
    discountType: overrides.discountType || "percentage",
    discountValue: overrides.discountValue ?? 10,
    expiresAt: overrides.expiresAt || new Date(futureDate(7)),
    isActive: overrides.isActive ?? true,
    maxUsesPerUser: overrides.maxUsesPerUser ?? 1,
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
  await PromoCode.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Promo Code API", () => {
  it("rejects promo list without token", async () => {
    const res = await request(app).get("/api/v1/promocode");

    expect(res.status).toBe(401);
  });

  it("rejects promo list for CUSTOMER", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/promocode")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied, admin only.");
  });

  it("ADMIN can list promo codes", async () => {
    const admin = await registerAndGetToken("ADMIN");

    await createPromo({
      code: uniqueCode("LIST"),
      discountType: "percentage",
      discountValue: 15,
    });

    const res = await request(app)
      .get("/api/v1/promocode")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].discountType).toBe("percentage");
    expect(res.body[0].discountValue).toBe(15);
  });

  it("rejects create promo without token", async () => {
    const res = await request(app)
      .post("/api/v1/promocode/create")
      .send({
        code: uniqueCode("NOAUTH"),
        discountType: "percentage",
        discountValue: 10,
        expiresAt: futureDate(),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(401);
  });

  it("rejects create promo for CUSTOMER", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: uniqueCode("CUSTOMER"),
        discountType: "percentage",
        discountValue: 10,
        expiresAt: futureDate(),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied, admin only.");
  });

  it("ADMIN can create percentage promo code", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const code = uniqueCode("PERCENT");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code,
        discountType: "percentage",
        discountValue: 20,
        expiresAt: futureDate(10),
        maxUsesPerUser: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Promo code created.");
    expect(res.body.promo.code).toBe(code.toUpperCase());
    expect(res.body.promo.discountType).toBe("percentage");
    expect(res.body.promo.discountValue).toBe(20);
    expect(res.body.promo.maxUsesPerUser).toBe(2);
    expect(res.body.promo.isActive).toBe(true);

    const dbPromo = await PromoCode.findOne({ code: code.toUpperCase() });
    expect(dbPromo).toBeTruthy();
  });

  it("ADMIN can create fixed promo code", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const code = uniqueCode("FIXED");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code,
        discountType: "fixed",
        discountValue: 5,
        expiresAt: futureDate(10),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Promo code created.");
    expect(res.body.promo.code).toBe(code.toUpperCase());
    expect(res.body.promo.discountType).toBe("fixed");
    expect(res.body.promo.discountValue).toBe(5);
  });

  it("promo code is saved uppercase", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const code = `lower-${randomUUID().slice(0, 8)}`;

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code,
        discountType: "percentage",
        discountValue: 10,
        expiresAt: futureDate(),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.promo.code).toBe(code.toUpperCase());

    const dbPromo = await PromoCode.findOne({ code: code.toUpperCase() });
    expect(dbPromo?.code).toBe(code.toUpperCase());
  });

  it("rejects missing required fields", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code: uniqueCode("MISSING"),
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("All fields are required.");
  });

  it("rejects invalid discountType", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code: uniqueCode("INVALIDTYPE"),
        discountType: "cashback",
        discountValue: 10,
        expiresAt: futureDate(),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid discountType.");
  });

  it("rejects duplicate promo code", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const code = uniqueCode("DUPLICATE").toUpperCase();

    await createPromo({
      code,
      discountType: "percentage",
      discountValue: 10,
    });

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code: code.toLowerCase(),
        discountType: "percentage",
        discountValue: 20,
        expiresAt: futureDate(),
        maxUsesPerUser: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Promo code already exists.");
  });

  it("rejects invalid maxUsesPerUser", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .post("/api/v1/promocode/create")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        code: uniqueCode("BADMAX"),
        discountType: "percentage",
        discountValue: 10,
        expiresAt: futureDate(),
        maxUsesPerUser: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("maxUsesPerUser must be a positive number.");
  });

  it("promo list sorts by expiresAt ascending", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const later = new Date();
    later.setDate(later.getDate() + 20);

    const sooner = new Date();
    sooner.setDate(sooner.getDate() + 5);

    await createPromo({
      code: "LATERPROMO",
      discountType: "fixed",
      discountValue: 5,
      expiresAt: later,
    });

    await createPromo({
      code: "SOONERPROMO",
      discountType: "percentage",
      discountValue: 10,
      expiresAt: sooner,
    });

    const res = await request(app)
      .get("/api/v1/promocode")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].code).toBe("SOONERPROMO");
    expect(res.body[1].code).toBe("LATERPROMO");

    const firstDate = new Date(res.body[0].expiresAt).getTime();
    const secondDate = new Date(res.body[1].expiresAt).getTime();

    expect(firstDate).toBeLessThan(secondDate);
  });
});