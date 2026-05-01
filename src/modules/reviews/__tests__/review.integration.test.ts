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
import Category from "../../categories/category.model";
import Product from "../../products/product.model";
import Review from "../review.model";
import Order from "../../orders/order.model";

let mongo: MongoMemoryServer;

const getId = (doc: { _id: unknown }) => String(doc._id);

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueName = (prefix: string) => {
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

const createPaidOrder = async (userId: string, product: any) => {
  const price = Number(product.price || 100);

  return Order.create({
    user: userId,
    items: [
      {
        product: getId(product),
        name: product.name,
        slug: product.slug,
        price,
        quantity: 1,
      },
    ],
    subTotal: price,
    discount: 0,
    deliveryFee: 0,
    serviceTax: 0,
    total: price,
    status: "PAID",
    statusHistory: [
      {
        status: "PAID",
        message: "Paid order for review test.",
        updatedAt: new Date(),
      },
    ],
    payment: {
      method: "NORMAL_PAYMENT",
      status: "SUCCESS",
      transactionId: `txn-${randomUUID()}`,
      currency: "USD",
      paidAt: new Date(),
    },
    summary: {
      subTotal: price,
      discount: 0,
      deliveryFee: 0,
      serviceTax: 0,
      total: price,
      taxRate: 0,
      promoCode: null,
      promo: null,
    },
    meta: {},
  });
};

const createReviewAsCustomer = async (
  accessToken: string,
  productId: string,
  overrides: Partial<{
    rating: number;
    title: string;
    comment: string;
    body: string;
  }> = {}
) => {
  return request(app)
    .post("/api/v1/reviews")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      productId,
      rating: overrides.rating ?? 5,
      title: overrides.title ?? "Great product",
      comment: overrides.comment ?? "I like this product.",
      body: overrides.body,
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
  await Review.deleteMany({});
  await Order.deleteMany({});
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Reviews API", () => {
  it("public can list approved reviews", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await Review.create({
      product: getId(product),
      user: customer.user.id,
      rating: 5,
      title: "Approved review",
      comment: "Visible review",
      status: "APPROVED",
      isVerifiedPurchase: true,
    });

    const res = await request(app).get(
      `/api/v1/products/${getId(product)}/reviews`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.reviews.length).toBe(1);
    expect(res.body.reviews[0].status).toBe("APPROVED");
    expect(res.body.reviews[0].title).toBe("Approved review");
  });

  it("public legacy /product/:productId/reviews works", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await Review.create({
      product: getId(product),
      user: customer.user.id,
      rating: 4,
      title: "Legacy approved review",
      comment: "Visible from legacy route",
      status: "APPROVED",
      isVerifiedPurchase: true,
    });

    const res = await request(app).get(
      `/api/v1/product/${getId(product)}/reviews`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.reviews.length).toBe(1);
    expect(res.body.reviews[0].title).toBe("Legacy approved review");
  });

  it("rejects create review without token", async () => {
    const product = await createProduct();

    const res = await request(app).post("/api/v1/reviews").send({
      productId: getId(product),
      rating: 5,
      comment: "No token review",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("customer can create review", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const res = await createReviewAsCustomer(
      customer.accessToken,
      getId(product),
      {
        rating: 5,
        title: "Nice product",
        comment: "Very good.",
      }
    );

    expect(res.status).toBe(201);
    expect(res.body.msg).toBe("Review created");
    expect(res.body.review.product.toString()).toBe(getId(product));
    expect(res.body.review.user.toString()).toBe(customer.user.id);
    expect(res.body.review.rating).toBe(5);
    expect(res.body.review.status).toBe("PENDING");
    expect(res.body.review.isVerifiedPurchase).toBe(true);
  });

  it("rejects missing productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        rating: 5,
        comment: "Missing product id",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects missing rating", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        comment: "Missing rating",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid rating", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const res = await request(app)
      .post("/api/v1/reviews")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        rating: 6,
        comment: "Invalid rating",
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("rating must be between 1 and 5");
  });

  it("new review is not public until approved", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product)
    );

    expect(created.status).toBe(201);
    expect(created.body.review.status).toBe("PENDING");

    const publicList = await request(app).get(
      `/api/v1/products/${getId(product)}/reviews`
    );

    expect(publicList.status).toBe(200);
    expect(publicList.body.reviews).toEqual([]);
  });

  it("customer cannot approve review", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product)
    );

    const res = await request(app)
      .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can approve review", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product),
      {
        rating: 4,
      }
    );

    const res = await request(app)
      .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");

    const dbReview = await Review.findById(created.body.review._id);
    expect(dbReview?.status).toBe("APPROVED");
  });

  it("approved review appears in public list", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product),
      {
        title: "Public after approval",
        rating: 5,
      }
    );

    await request(app)
      .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    const publicList = await request(app).get(
      `/api/v1/products/${getId(product)}/reviews`
    );

    expect(publicList.status).toBe(200);
    expect(publicList.body.reviews.length).toBe(1);
    expect(publicList.body.reviews[0].title).toBe("Public after approval");
    expect(publicList.body.reviews[0].status).toBe("APPROVED");
  });

  it("customer cannot delete review", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product)
    );

    const res = await request(app)
      .delete(`/api/v1/reviews/${created.body.review._id}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can delete review", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const admin = await registerAndGetToken("ADMIN");
    const product = await createProduct();

    await createPaidOrder(customer.user.id, product);

    const created = await createReviewAsCustomer(
      customer.accessToken,
      getId(product)
    );

    const res = await request(app)
      .delete(`/api/v1/reviews/${created.body.review._id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Review deleted successfully.");

    const dbReview = await Review.findById(created.body.review._id);
    expect(dbReview).toBeNull();
  });

  it("delete missing review returns 404", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const missingReviewId = new Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/reviews/${missingReviewId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Review not found");
  });
});