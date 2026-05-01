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
import User from "../../users/user.model";
import Category from "../../categories/category.model";
import Product from "../../products/product.model";
import Cart from "../cart.model";
import PromoCode from "../../../models/PromoCode";
import PromoUsage from "../../../models/PromoUsage";
import DeliverySetting from "../../../models/DeliverySetting";

let mongo: MongoMemoryServer;

const getId = (doc: { _id: unknown }) => String(doc._id);

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueName = (prefix: string) => {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};

const uniqueCode = (prefix: string) => {
  return `${prefix}-${randomUUID().slice(0, 8)}`.toUpperCase();
};

const futureDate = (days = 7) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const pastDate = (days = 1) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
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

const createCategory = async (name = uniqueName("Category")) => {
  return Category.create({
    categoryId: name.toLowerCase().replace(/\s+/g, "-"),
    categoryName: name,
    description: "Test category",
  });
};

const createProduct = async (
  overrides: Partial<{
    name: string;
    price: number;
    stock: number;
    status: "Published" | "Unpublished";
  }> = {}
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
    name: overrides.name || uniqueName("Product"),
    category: getId(category),
    seller: getId(seller),
    price: overrides.price ?? 100,
    stock: overrides.stock ?? 10,
    status: overrides.status ?? "Published",
    images: [],
    tag: [],
    description: "Test product",
    dedupeKey: randomUUID(),
  });
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
    code: overrides.code || uniqueCode("PROMO"),
    discountType: overrides.discountType || "percentage",
    discountValue: overrides.discountValue ?? 10,
    expiresAt: overrides.expiresAt || futureDate(7),
    isActive: overrides.isActive ?? true,
    maxUsesPerUser: overrides.maxUsesPerUser ?? 1,
  });
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
    method: overrides.method || uniqueName("standard"),
    baseFee: overrides.baseFee ?? 0,
    freeThreshold: overrides.freeThreshold,
    estimatedDays: overrides.estimatedDays ?? 3,
    isActive: overrides.isActive ?? true,
    // Avoid unique null conflicts in tests.
    code: overrides.code ?? uniqueCode("DEL"),
  });
};

const addProductToCart = async (
  accessToken: string,
  productId: string,
  quantity = 1
) => {
  const res = await request(app)
    .post("/api/v1/cart/add")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      productId,
      quantity,
    });

  expect(res.status).toBe(200);
  return res;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Cart.deleteMany({});
  await PromoUsage.deleteMany({});
  await PromoCode.deleteMany({});
  await DeliverySetting.deleteMany({});
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Cart Promo + Delivery API", () => {
  it("applies valid percentage promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100 });
    const promo = await createPromo({
      code: "SAVE10",
      discountType: "percentage",
      discountValue: 10,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);

    const res = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: promo.code,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Promo code applied successfully.");
    expect(res.body.promo.code).toBe("SAVE10");
    expect(res.body.promo.type).toBe("percentage");
    expect(res.body.promo.value).toBe(10);
    expect(res.body.promo.amount).toBe(20);

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.discount).toBe(20);
    expect(String(cart?.promoCode)).toBe(getId(promo));
  });

  it("applies valid fixed promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100 });
    const promo = await createPromo({
      code: "FIXED5",
      discountType: "fixed",
      discountValue: 5,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);

    const res = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: promo.code,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.promo.code).toBe("FIXED5");
    expect(res.body.promo.type).toBe("fixed");
    expect(res.body.promo.value).toBe(5);
    expect(res.body.promo.amount).toBe(5);

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.discount).toBe(5);
    expect(String(cart?.promoCode)).toBe(getId(promo));
  });

  it("rejects missing promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Promo code is required.");
  });

  it("rejects inactive promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPromo({
      code: "INACTIVE10",
      discountType: "percentage",
      discountValue: 10,
      isActive: false,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: "INACTIVE10",
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Promo code not found or inactive.");
  });

  it("rejects expired promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPromo({
      code: "EXPIRED10",
      discountType: "percentage",
      discountValue: 10,
      expiresAt: pastDate(1),
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: "EXPIRED10",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Promo code has expired.");
  });

  it("removes promo code", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100 });

    await createPromo({
      code: "REMOVE10",
      discountType: "percentage",
      discountValue: 10,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const apply = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: "REMOVE10",
      });

    expect(apply.status).toBe(200);

    const res = await request(app)
      .post("/api/v1/cart/remove-promocode")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.summary.discount).toBe(0);
    expect(res.body.summary.promoCode).toBeNull();
    expect(res.body.summary.promo).toBeNull();
    expect(res.body.promoCode).toBeNull();

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.discount).toBe(0);
    expect(cart?.promoCode).toBeNull();
  });

  it("selects valid delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100 });

    await createDeliverySetting({
      method: "express",
      baseFee: 5,
      estimatedDays: 1,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/cart/select-delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: "express",
      });

    expect(res.status).toBe(200);
    expect(res.body.delivery.method).toBe("express");
    expect(res.body.delivery.baseFee).toBe(5);
    expect(res.body.delivery.estimatedDays).toBe(1);
    expect(res.body.summary.deliveryFee).toBe(5);

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.delivery).toBeTruthy();
  });

  it("rejects missing delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/cart/select-delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Delivery method is required.");
  });

  it("rejects inactive or missing delivery method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createDeliverySetting({
      method: "inactive-delivery",
      baseFee: 3,
      estimatedDays: 4,
      isActive: false,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const inactive = await request(app)
      .post("/api/v1/cart/select-delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: "inactive-delivery",
      });

    expect(inactive.status).toBe(404);
    expect(inactive.body.message).toBe("Delivery method not found.");

    const missing = await request(app)
      .post("/api/v1/cart/select-delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: "missing-delivery",
      });

    expect(missing.status).toBe(404);
    expect(missing.body.message).toBe("Delivery method not found.");
  });

  it("cart summary recalculates after promo and delivery", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100 });

    await createPromo({
      code: "SUMMARY10",
      discountType: "percentage",
      discountValue: 10,
    });

    await createDeliverySetting({
      method: "express-summary",
      baseFee: 5,
      estimatedDays: 1,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);

    const applyPromo = await request(app)
      .post("/api/v1/cart/apply-promo")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        code: "SUMMARY10",
      });

    expect(applyPromo.status).toBe(200);

    const selectDelivery = await request(app)
      .post("/api/v1/cart/select-delivery")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        method: "express-summary",
      });

    expect(selectDelivery.status).toBe(200);

    const cart = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(cart.status).toBe(200);

    // subTotal = 100 * 2 = 200
    // discount = 10% of 200 = 20
    // serviceTax = 10% of subtotal = 20
    // deliveryFee = 5
    // total = 200 - 20 + 20 + 5 = 205
    expect(cart.body.summary.subTotal).toBe(200);
    expect(cart.body.summary.discount).toBe(20);
    expect(cart.body.summary.serviceTax).toBe(20);
    expect(cart.body.summary.deliveryFee).toBe(5);
    expect(cart.body.summary.total).toBe(205);
    expect(cart.body.summary.promoCode).toBe("SUMMARY10");
    expect(cart.body.summary.promo.amount).toBe(20);
    expect(cart.body.delivery.method).toBe("express-summary");
  });
});