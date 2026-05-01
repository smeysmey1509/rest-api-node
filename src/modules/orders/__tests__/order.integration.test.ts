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
import User from "../../users/user.model";
import Order from "../order.model";
import Payment from "../../payments/payment.model";

let mongo: MongoMemoryServer;

const getId = (doc: { _id: unknown }) => String(doc._id);
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@example.com`;

const registerAndGetToken = async (
  role: "CUSTOMER" | "ADMIN" | "STAFF" = "CUSTOMER"
) => {
  const email = uniqueEmail(role.toLowerCase());
  const password = "Password123";

  const register = await request(app).post("/api/v1/register").send({
    name: `${role} User`,
    email,
    password,
  });

  expect(register.status).toBe(201);

  if (role !== "CUSTOMER") {
    await User.findOneAndUpdate({ email }, { role });
  }

  const login = await request(app).post("/api/v1/login").send({
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

const createOrder = async (
  userId: string,
  overrides: Partial<{
    status: string;
    productId: string;
    quantity: number;
    price: number;
  }> = {}
) => {
  const productId = overrides.productId || new Types.ObjectId().toString();
  const quantity = overrides.quantity ?? 1;
  const price = overrides.price ?? 100;
  const total = price * quantity;

  return Order.create({
    user: userId,
    items: [
      {
        product: productId,
        name: "Test Product",
        price,
        quantity,
      },
    ],
    subTotal: total,
    discount: 0,
    deliveryFee: 0,
    serviceTax: 0,
    total,
    status: overrides.status || "PENDING_PAYMENT",
    statusHistory: [
      {
        status: overrides.status || "PENDING_PAYMENT",
        message: "Test order created.",
        updatedAt: new Date(),
      },
    ],
    payment: {
      method: "NORMAL_PAYMENT",
      status: "PENDING",
      currency: "USD",
      paidAt: null,
    },
    summary: {
      subTotal: total,
      discount: 0,
      deliveryFee: 0,
      serviceTax: 0,
      total,
      taxRate: 0,
      promoCode: null,
      promo: null,
    },
  });
};

const createPaymentForOrder = async (order: any) => {
  return Payment.create({
    order: getId(order),
    user: String(order.user),
    method: "NORMAL_PAYMENT",
    provider: "NORMAL_PAYMENT",
    status: "PENDING",
    amount: order.total,
    currency: "USD",
    transactionId: `txn-${randomUUID()}`,
    merchantRef: getId(order),
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
  await Payment.deleteMany({});
  await Order.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Orders API", () => {
  it("rejects /orders without token", async () => {
    const res = await request(app).get("/api/v1/orders");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("customer can list only own orders", async () => {
    const userOne = await registerAndGetToken("CUSTOMER");
    const userTwo = await registerAndGetToken("CUSTOMER");

    const userOneOrder = await createOrder(userOne.user.id);
    await createOrder(userTwo.user.id);

    const res = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${userOne.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(1);
    expect(res.body.orders[0]._id).toBe(getId(userOneOrder));
    expect(res.body.orders[0].user).toBe(userOne.user.id);
  });

  it("customer cannot list admin orders", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can list all orders", async () => {
    const userOne = await registerAndGetToken("CUSTOMER");
    const userTwo = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");

    await createOrder(userOne.user.id);
    await createOrder(userTwo.user.id);

    const res = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBe(2);
  });

  it("customer can cancel own pending order", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const order = await createOrder(customer.user.id, {
      status: "PENDING_PAYMENT",
    });
    const payment = await createPaymentForOrder(order);

    const res = await request(app)
      .patch(`/api/v1/orders/${getId(order)}/cancel`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("CANCELLED");
    expect(res.body.payment.status).toBe("CANCELLED");

    const dbPayment = await Payment.findById(getId(payment));
    expect(dbPayment?.status).toBe("CANCELLED");
  });

  it("customer cannot cancel another user's order", async () => {
    const userOne = await registerAndGetToken("CUSTOMER");
    const userTwo = await registerAndGetToken("CUSTOMER");
    const order = await createOrder(userTwo.user.id);

    const res = await request(app)
      .patch(`/api/v1/orders/${getId(order)}/cancel`)
      .set("Authorization", `Bearer ${userOne.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Forbidden");
  });

  it("customer cannot cancel paid order", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const order = await createOrder(customer.user.id, {
      status: "PAID",
    });

    const res = await request(app)
      .patch(`/api/v1/orders/${getId(order)}/cancel`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Order cannot be cancelled at this stage.");
  });

  it("customer cannot update order status", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const order = await createOrder(customer.user.id);

    const res = await request(app)
      .patch(`/api/v1/orders/${getId(order)}/status`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        status: "PROCESSING",
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can update order status", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const order = await createOrder(customer.user.id);

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${getId(order)}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "PROCESSING",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PROCESSING");
    expect(res.body.statusHistory.at(-1).message).toBe(
      "Order status updated by admin."
    );
  });

  it("rejects update status without status", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const order = await createOrder(customer.user.id);

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${getId(order)}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects marking order as PAID manually", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const order = await createOrder(customer.user.id);

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${getId(order)}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "PAID",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Use payment confirmation to mark an order as paid."
    );
  });

  it("missing order returns 404", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const missingOrderId = new Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/v1/admin/orders/${missingOrderId}/status`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        status: "PROCESSING",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });
});