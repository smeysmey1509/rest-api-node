import { randomUUID } from "crypto";
import { Types } from "mongoose";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
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

let mongo: MongoMemoryServer;

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueName = (prefix: string) => {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
};

const getId = (doc: { _id: unknown }) => String(doc._id);

const registerAndGetToken = async (
  role: "CUSTOMER" | "ADMIN" | "STAFF" = "CUSTOMER",
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
  overrides: Partial<{
    name: string;
    price: number;
    stock: number;
    status: "Published" | "Unpublished";
  }> = {},
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
  await Cart.deleteMany({});
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Cart API", () => {
  it("rejects /cart without token", async () => {
    const res = await request(app).get("/api/v1/cart");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  it("gets empty cart for new user", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.promoCode).toBeNull();
    expect(res.body.delivery).toBeNull();
    expect(res.body.summary.subTotal).toBe(0);
    expect(res.body.summary.discount).toBe(0);
    expect(res.body.summary.deliveryFee).toBe(0);
    expect(res.body.summary.serviceTax).toBe(0);
    expect(res.body.summary.total).toBe(0);
    expect(res.body.summary.taxRate).toBe(0);
    expect(res.body.summary.promoCode).toBeNull();
    expect(res.body.summary.promo).toBeNull();
  });

  it("adds product to cart", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      name: uniqueName("CartAdd"),
      price: 50,
      stock: 10,
    });

    const res = await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.summary.subTotal).toBe(100);
    expect(res.body.summary.total).toBeGreaterThanOrEqual(100);
  });

  it("adds same product again and increases quantity", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      price: 25,
    });

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    const res = await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 3,
      });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(5);
    expect(res.body.summary.subTotal).toBe(125);
  });

  it("rejects add cart without productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        quantity: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("add missing product returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const missingProductId = new Types.ObjectId().toString();

    const res = await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: missingProductId,
        quantity: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found.");
  });

  it("add quantity 0 defaults to 1", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      price: 40,
    });

    const res = await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(1);
    expect(res.body.summary.subTotal).toBe(40);
  });

  it("updates quantity using PUT /cart/update/:productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      price: 30,
    });

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 1,
      });

    const res = await request(app)
      .put(`/api/v1/cart/update/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        quantity: 4,
      });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(4);
    expect(res.body.summary.subTotal).toBe(120);
  });

  it("updates quantity using PATCH /cart/:productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct({
      price: 15,
    });

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 1,
      });

    const res = await request(app)
      .patch(`/api/v1/cart/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        quantity: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.summary.subTotal).toBe(30);
  });

  it("rejects update quantity less than 1", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 1,
      });

    const res = await request(app)
      .put(`/api/v1/cart/update/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        quantity: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Quantity must be at least 1.");
  });

  it("update quantity for product not in cart returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    const res = await request(app)
      .put(`/api/v1/cart/update/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        quantity: 2,
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found.");
  });

  it("removes product from cart using DELETE /cart/:productId", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    const res = await request(app)
      .delete(`/api/v1/cart/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.summary.subTotal).toBe(0);
  });

  it("removes product from cart using POST /cart/remove", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    const res = await request(app)
      .post("/api/v1/cart/remove")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .field("productId", getId(product));

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("remove product without existing cart returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    const res = await request(app)
      .delete(`/api/v1/cart/${getId(product)}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found.");
  });

  it("clears cart using POST /cart/clear", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    const res = await request(app)
      .post("/api/v1/cart/clear")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Cart cleared.");

    const cart = await Cart.findOne({ user: customer.user.id });
    expect(cart?.items.length).toBe(0);
  });

  it("clears cart using DELETE /cart", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const product = await createProduct();

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        productId: getId(product),
        quantity: 2,
      });

    const res = await request(app)
      .delete("/api/v1/cart")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Cart cleared.");
  });

  it("clear cart without existing cart returns 404", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/cart/clear")
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found.");
  });

  it("user can only see own cart", async () => {
    const userOne = await registerAndGetToken("CUSTOMER");
    const userTwo = await registerAndGetToken("CUSTOMER");
    const productOne = await createProduct({
      name: uniqueName("UserOneProduct"),
      price: 10,
    });
    const productTwo = await createProduct({
      name: uniqueName("UserTwoProduct"),
      price: 99,
    });

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${userOne.accessToken}`)
      .send({
        productId: getId(productOne),
        quantity: 1,
      });

    await request(app)
      .post("/api/v1/cart/add")
      .set("Authorization", `Bearer ${userTwo.accessToken}`)
      .send({
        productId: getId(productTwo),
        quantity: 1,
      });

    const userOneCart = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${userOne.accessToken}`);

    const userTwoCart = await request(app)
      .get("/api/v1/cart")
      .set("Authorization", `Bearer ${userTwo.accessToken}`);

    expect(userOneCart.status).toBe(200);
    expect(userTwoCart.status).toBe(200);

    expect(userOneCart.body.items.length).toBe(1);
    expect(userTwoCart.body.items.length).toBe(1);

    expect(userOneCart.body.items[0].product._id).toBe(getId(productOne));
    expect(userTwoCart.body.items[0].product._id).toBe(getId(productTwo));

    expect(userOneCart.body.items[0].product._id).not.toBe(
      userTwoCart.body.items[0].product._id,
    );
  });
});
