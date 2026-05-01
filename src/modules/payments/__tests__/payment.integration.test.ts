import { randomUUID } from "crypto";
import { Types } from "mongoose";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

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
import Category from "../../categories/category.model";
import Product from "../../products/product.model";
import Order from "../../orders/order.model";
import Payment from "../payment.model";

let mongo: MongoMemoryReplSet;

const getId = (doc: { _id: unknown }) => String(doc._id);
const uniqueEmail = (prefix: string) => `${prefix}-${randomUUID()}@example.com`;
const uniqueName = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

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

const createCategory = async (name = uniqueName("Category")) => {
  return Category.create({
    categoryId: name.toLowerCase().replace(/\s+/g, "-"),
    categoryName: name,
    description: "Test category",
  });
};

const createProduct = async (
  overrides: Partial<{ price: number; stock: number }> = {}
) => {
  const category = await createCategory();
  const seller = await User.create({
    name: uniqueName("Seller"),
    email: uniqueEmail("seller"),
    password: "Password123",
    role: "ADMIN",
    status: "ACTIVE",
  });

  return Product.create({
    name: uniqueName("PaymentProduct"),
    category: getId(category),
    seller: getId(seller),
    price: overrides.price ?? 100,
    stock: overrides.stock ?? 10,
    status: "Published",
    images: [],
    tag: [],
    description: "Payment test product",
    dedupeKey: randomUUID(),
  });
};

const createOrderAndPayment = async (
  userId: string,
  product: any,
  quantity = 2
) => {
  const amount = Number(product.price) * quantity;

  const order = await Order.create({
    user: userId,
    items: [
      {
        product: getId(product),
        name: product.name,
        slug: product.slug,
        price: product.price,
        quantity,
      },
    ],
    subTotal: amount,
    discount: 0,
    deliveryFee: 0,
    serviceTax: 0,
    total: amount,
    status: "PENDING_PAYMENT",
    statusHistory: [
      {
        status: "PENDING_PAYMENT",
        message: "Order created for payment test.",
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
      subTotal: amount,
      discount: 0,
      deliveryFee: 0,
      serviceTax: 0,
      total: amount,
      taxRate: 0,
      promoCode: null,
      promo: null,
    },
  });

  const payment = await Payment.create({
    order: getId(order),
    user: userId,
    method: "NORMAL_PAYMENT",
    provider: "NORMAL_PAYMENT",
    status: "PENDING",
    amount,
    currency: "USD",
    transactionId: `txn-${randomUUID()}`,
    merchantRef: getId(order),
  });

  return { order, payment };
};

beforeAll(async () => {
  mongo = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: "wiredTiger",
    },
  });

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Payment.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Payments API", () => {
  it("rejects get payment without token", async () => {
    const res = await request(app).get(`/api/v1/payments/${new Types.ObjectId()}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("authenticated user can get payment", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();
    const { payment } = await createOrderAndPayment(customer.user.id, product);

    const res = await request(app)
      .get(`/api/v1/payments/${getId(payment)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(getId(payment));
    expect(res.body.user).toBe(customer.user.id);
    expect(res.body.status).toBe("PENDING");
  });

  it("missing payment returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const missingPaymentId = new Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/payments/${missingPaymentId}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Payment not found");
  });

  it("verify normal payment keeps payment pending", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();
    const { payment } = await createOrderAndPayment(customer.user.id, product);

    const res = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/verify`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.gatewayStatus).toBe("PENDING");
  });

  it("customer cannot confirm manual payment", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();
    const { payment } = await createOrderAndPayment(customer.user.id, product);

    const res = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can confirm manual payment", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct({ stock: 10 });
    const { payment } = await createOrderAndPayment(customer.user.id, product, 2);

    const res = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("SUCCESS");
    expect(res.body.gatewayStatus).toBe("APPROVED");
    expect(res.body.verifiedAt).toBeTruthy();
    expect(res.body.paidAt).toBeTruthy();
  });

  it("manual confirmation marks order PAID and reduces stock", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct({ stock: 10 });
    const { order, payment } = await createOrderAndPayment(
      customer.user.id,
      product,
      3
    );

    const res = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);

    const dbOrder = await Order.findById(getId(order));
    expect(dbOrder?.status).toBe("PAID");
    expect(dbOrder?.payment.status).toBe("SUCCESS");

    const dbProduct = await Product.findById(getId(product));
    expect(dbProduct?.stock).toBe(7);
    expect(dbProduct?.salesCount).toBe(3);
  });

  it("confirming twice does not reduce stock twice", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct({ stock: 10 });
    const { payment } = await createOrderAndPayment(customer.user.id, product, 2);

    const first = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(second.status).toBe(200);

    const dbProduct = await Product.findById(getId(product));
    expect(dbProduct?.stock).toBe(8);
    expect(dbProduct?.salesCount).toBe(2);
  });

  it("confirm missing payment returns 404", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const missingPaymentId = new Types.ObjectId().toString();

    const res = await request(app)
      .post(`/api/v1/payments/${missingPaymentId}/confirm-manual`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Payment not found");
  });
});