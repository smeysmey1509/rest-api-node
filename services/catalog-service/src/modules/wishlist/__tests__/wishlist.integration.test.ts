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
import User from "@services/user-service/src/modules/users/user.model";
import Category from "../../categories/category.model";
import Product from "../../products/product.model";
import Cart from "@services/order-service/src/modules/cart/cart.model";
import Wishlist from "../wishlist.model";

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

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Wishlist.deleteMany({});
  await Cart.deleteMany({});
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Wishlist API", () => {
  it("rejects wishlist without token", async () => {
    const res = await request(app).get("/api/v1/wishlist");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("gets empty wishlist", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.totalItems).toBe(0);
    expect(res.body.totalPages).toBe(0);
    expect(res.body.currentPage).toBe(1);
  });

  it("adds product to wishlist using /wishlist/:productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    const res = await request(app)
      .post(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Product added to wishlist successfully.");
    expect(res.body.wishlist.items.length).toBe(1);
    expect(String(res.body.wishlist.items[0].product._id)).toBe(getId(product));
  });

  it("adds product to wishlist using body productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    const res = await request(app)
      .post("/api/v1/wishlist")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Product added to wishlist successfully.");
    expect(res.body.wishlist.items.length).toBe(1);
    expect(String(res.body.wishlist.items[0].product._id)).toBe(getId(product));
  });

  it("prevents duplicate wishlist item", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    const res = await request(app)
      .post(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Product already exists in wishlist.");
    expect(res.body.code).toBe("DUPLICATE_WISHLIST_ITEM");
  });

  it("removes product from wishlist", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    const res = await request(app)
      .delete(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Product removed from wishlist.");
    expect(res.body.wishlist.items).toEqual([]);
  });

  it("remove missing wishlist product returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const savedProduct = await createProduct();
    const missingProductId = new Types.ObjectId().toString();

    await request(app)
      .post(`/api/v1/wishlist/${getId(savedProduct)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    const res = await request(app)
      .delete(`/api/v1/wishlist/${missingProductId}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found in wishlist.");
  });

  it("user can only see own wishlist", async () => {
    const userOne = await registerAndGetToken("CUSTOMER");
    const userTwo = await registerAndGetToken("CUSTOMER");

    const productOne = await createProduct({
      name: uniqueName("UserOneProduct"),
    });
    const productTwo = await createProduct({
      name: uniqueName("UserTwoProduct"),
    });

    await request(app)
      .post(`/api/v1/wishlist/${getId(productOne)}`)
      .set("Authorization", `Bearer ${userOne.accessToken}`)
      .send({});

    await request(app)
      .post(`/api/v1/wishlist/${getId(productTwo)}`)
      .set("Authorization", `Bearer ${userTwo.accessToken}`)
      .send({});

    const userOneWishlist = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${userOne.accessToken}`);

    const userTwoWishlist = await request(app)
      .get("/api/v1/wishlist")
      .set("Authorization", `Bearer ${userTwo.accessToken}`);

    expect(userOneWishlist.status).toBe(200);
    expect(userTwoWishlist.status).toBe(200);

    expect(userOneWishlist.body.items.length).toBe(1);
    expect(userTwoWishlist.body.items.length).toBe(1);

    expect(String(userOneWishlist.body.items[0].product._id)).toBe(
      getId(productOne)
    );
    expect(String(userTwoWishlist.body.items[0].product._id)).toBe(
      getId(productTwo)
    );

    expect(String(userOneWishlist.body.items[0].product._id)).not.toBe(
      String(userTwoWishlist.body.items[0].product._id)
    );
  });

  it("moves wishlist item to cart", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      price: 25,
    });

    await request(app)
      .post(`/api/v1/wishlist/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    const res = await request(app)
      .post("/api/v1/wishlist/move-to-cart")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Moved product to cart.");
    expect(res.body.wishlist.items).toEqual([]);

    expect(res.body.cart.items.length).toBe(1);
    expect(String(res.body.cart.items[0].product._id)).toBe(getId(product));
    expect(res.body.cart.items[0].quantity).toBe(3);
    expect(res.body.cart.summary.subTotal).toBe(75);

    const wishlist = await Wishlist.findOne({ user: customer.user.id });
    expect(wishlist?.items.length).toBe(0);

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.items.length).toBe(1);
  });

  it("move missing wishlist item to cart returns error", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const savedProduct = await createProduct();
    const missingProduct = await createProduct();

    await request(app)
      .post(`/api/v1/wishlist/${getId(savedProduct)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({});

    const res = await request(app)
      .post("/api/v1/wishlist/move-to-cart")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(missingProduct),
        quantity: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found in wishlist.");
  });
});