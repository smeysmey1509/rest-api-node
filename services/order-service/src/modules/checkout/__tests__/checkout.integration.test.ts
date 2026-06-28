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
import Category from "@services/catalog-service/src/modules/categories/category.model";
import Product from "@services/catalog-service/src/modules/products/product.model";
import Cart from "../../cart/cart.model";
import Order from "../../orders/order.model";
import Payment from "@services/payment-service/src/modules/payments/payment.model";
import PromoCode from "../../coupons/coupon.model";
import PromoUsage from "../../coupons/coupon-usage.model";
import DeliverySetting from "@services/inventory-service/src/modules/inventory/delivery-setting.model";

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
    baseFee: overrides.baseFee ?? 5,
    freeThreshold: overrides.freeThreshold,
    estimatedDays: overrides.estimatedDays ?? 3,
    isActive: overrides.isActive ?? true,
    code: overrides.code ?? uniqueCode("DEL"),
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

const selectDelivery = async (accessToken: string, method: string) => {
  const res = await request(app)
    .post("/api/v1/cart/select-delivery")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ method });

  expect(res.status).toBe(200);
  return res;
};

const applyPromo = async (accessToken: string, code: string) => {
  const res = await request(app)
    .post("/api/v1/cart/apply-promo")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ code });

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
  await Payment.deleteMany({});
  await Order.deleteMany({});
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

describe("Checkout API", () => {
  it("rejects checkout without token", async () => {
    const res = await request(app).post("/api/v1/checkout").send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("rejects checkout with empty cart", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty.");
  });

  it("rejects checkout when no delivery method exists", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No delivery methods are currently available.");
  });

  it("rejects checkout when product stock is not enough", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 1 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(`Not enough stock for ${product.name}.`);
  });

  it("creates order successfully", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.order).toBeTruthy();
    expect(res.body.order.user).toBe(customer.user.id);
    expect(res.body.order.items.length).toBe(1);
    expect(res.body.order.items[0].product).toBe(getId(product));
    expect(res.body.order.status).toBe("PENDING_PAYMENT");
    expect(res.body.order.subTotal).toBe(100);
    expect(res.body.order.deliveryFee).toBe(5);
    expect(res.body.order.serviceTax).toBe(10);
    expect(res.body.order.total).toBe(115);

    const dbOrder = await Order.findById(res.body.order._id);
    expect(dbOrder).toBeTruthy();
  });

  it("creates payment successfully", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
        currency: "USD",
      });

    expect(res.status).toBe(201);
    expect(res.body.payment).toBeTruthy();
    expect(res.body.payment.order).toBe(res.body.order._id);
    expect(res.body.payment.user).toBe(customer.user.id);
    expect(res.body.payment.method).toBe("NORMAL_PAYMENT");
    expect(res.body.payment.provider).toBe("NORMAL_PAYMENT");
    expect(res.body.payment.status).toBe("PENDING");
    expect(res.body.payment.amount).toBe(res.body.order.total);
    expect(res.body.payment.currency).toBe("USD");
    expect(res.body.payment.transactionId).toBeTruthy();
    expect(res.body.payment.checkoutData.message).toContain(
      "Payment created"
    );

    const dbPayment = await Payment.findById(res.body.payment._id);
    expect(dbPayment).toBeTruthy();
  });

  it("clears cart after checkout", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);

    const checkout = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(checkout.status).toBe(201);

    const cart = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(cart.status).toBe(200);
    expect(cart.body.items).toEqual([]);
    expect(cart.body.summary.subTotal).toBe(0);
    expect(cart.body.summary.discount).toBe(0);
    expect(cart.body.summary.serviceTax).toBe(0);
    expect(cart.body.summary.total).toBe(0);

    const dbCart = await Cart.findOne({ user: customer.user.id });
    expect(dbCart?.items.length).toBe(0);
  });

  it("preserves selected delivery in order", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "express",
      baseFee: 7,
      estimatedDays: 1,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);
    await selectDelivery(customer.accessToken, "express");

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.delivery.method).toBe("express");
    expect(res.body.order.delivery.baseFee).toBe(7);
    expect(res.body.order.delivery.estimatedDays).toBe(1);
    expect(res.body.order.deliveryFee).toBe(7);
  });

  it("preserves promo summary in order", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await createPromo({
      code: "CHECKOUT10",
      discountType: "percentage",
      discountValue: 10,
      maxUsesPerUser: 2,
    });

    await addProductToCart(customer.accessToken, getId(product), 2);
    await applyPromo(customer.accessToken, "CHECKOUT10");

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.subTotal).toBe(200);
    expect(res.body.order.discount).toBe(20);
    expect(res.body.order.summary.promoCode).toBe("CHECKOUT10");
    expect(res.body.order.summary.promo.code).toBe("CHECKOUT10");
    expect(res.body.order.summary.promo.type).toBe("percentage");
    expect(res.body.order.summary.promo.value).toBe(10);
    expect(res.body.order.summary.promo.amount).toBe(20);
  });

  it("increments promo usage after checkout", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    const promo = await createPromo({
      code: "USAGE10",
      discountType: "percentage",
      discountValue: 10,
      maxUsesPerUser: 2,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);
    await applyPromo(customer.accessToken, "USAGE10");

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
      });

    expect(res.status).toBe(201);

    const usage = await PromoUsage.findOne({
      user: customer.user.id,
      promoCode: getId(promo),
    });

    expect(usage).toBeTruthy();
    expect(usage?.usageCount).toBe(1);
  });

  it("supports shipping address", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
        shippingAddress: {
          fullName: "Rak Smey",
          phone: "012345678",
          email: "rak@example.com",
          line1: "Street 123",
          line2: "Floor 2",
          city: "Phnom Penh",
          country: "Cambodia",
          postalCode: "12000",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.order.shippingAddress.fullName).toBe("Rak Smey");
    expect(res.body.order.shippingAddress.line1).toBe("Street 123");
    expect(res.body.order.shippingAddress.line2).toBe("Floor 2");
    expect(res.body.order.shippingAddress.city).toBe("Phnom Penh");
    expect(res.body.order.shippingAddress.country).toBe("Cambodia");
    expect(res.body.order.shippingAddress.postalCode).toBe("12000");
  });

  it("supports contact details", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "NORMAL_PAYMENT",
        contact: {
          fullName: "Checkout Customer",
          email: "checkout@example.com",
          phone: "098765432",
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.order.contact.fullName).toBe("Checkout Customer");
    expect(res.body.order.contact.email).toBe("checkout@example.com");
    expect(res.body.order.contact.phone).toBe("098765432");
  });

  it("supports payment method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "CASH_ON_DELIVERY",
        currency: "USD",
      });

    expect(res.status).toBe(201);
    expect(res.body.order.payment.method).toBe("CASH_ON_DELIVERY");
    expect(res.body.order.payment.status).toBe("PENDING");
    expect(res.body.payment.method).toBe("CASH_ON_DELIVERY");
    expect(res.body.payment.status).toBe("PENDING");
  });

  it("rejects unsupported payment method", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({ price: 100, stock: 10 });

    await createDeliverySetting({
      method: "standard",
      baseFee: 5,
      estimatedDays: 3,
      isActive: true,
    });

    await addProductToCart(customer.accessToken, getId(product), 1);

    const res = await request(app)
      .post("/api/v1/checkout")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        paymentMethod: "CRYPTO",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Unsupported payment method");
  });
});