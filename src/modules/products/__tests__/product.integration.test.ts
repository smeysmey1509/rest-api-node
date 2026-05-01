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
import Product from "../product.model";

let mongo: MongoMemoryServer;

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

const getId = (doc: { _id: unknown }) => String(doc._id);

const createProductAsAdmin = async (
  adminToken: string,
  categoryId: string,
  overrides: Partial<{
    name: string;
    price: number;
    stock: number;
    status: string;
    description: string;
    images: string[];
    tag: string[];
  }> = {}
) => {
  const name = overrides.name || uniqueName("Product");

  const res = await request(app)
    .post("/api/v1/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name,
      category: categoryId,
      price: overrides.price ?? 99,
      stock: overrides.stock ?? 10,
      status: overrides.status ?? "Published",
      description: overrides.description ?? "Test product description",
      images: overrides.images ?? [],
      tag: overrides.tag ?? [],
    });

  expect(res.status).toBe(201);
  return res.body;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Product.deleteMany({}).setOptions({ withDeleted: true });
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Products API", () => {
  it("public can list products", async () => {
    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.perPage).toBe(25);
  });

  it("admin can create product", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const productName = uniqueName("iPhone");

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: productName,
        category: getId(category),
        price: 1200,
        stock: 5,
        description: "Apple phone",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(productName);
    expect(res.body.price).toBe(1200);
    expect(res.body.stock).toBe(5);
    expect(res.body.status).toBe("Published");
    expect(res.body.category.toString()).toBe(getId(category));
  });

  it("customer cannot create product", async () => {
    const customer = await registerAndGetToken("CUSTOMER");
    const category = await createCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        name: uniqueName("Customer Product"),
        category: getId(category),
        price: 10,
        stock: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("rejects create product without name", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        category: getId(category),
        price: 10,
        stock: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects create product without category", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: uniqueName("Missing Category"),
        price: 10,
        stock: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("public can get product by id", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("GetById"),
      }
    );

    const res = await request(app).get(`/api/v1/products/${product._id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(product._id);
    expect(res.body.name).toBe(product.name);
  });

  it("public can get product by slug", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("GetBySlug"),
      }
    );

    const res = await request(app).get(`/api/v1/products/${product.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(product.slug);
    expect(res.body.name).toBe(product.name);
  });

  it("get missing product returns 404", async () => {
    const missingId = new Types.ObjectId().toString();

    const res = await request(app).get(`/api/v1/products/${missingId}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });

  it("admin can update product", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("BeforeUpdate"),
        price: 50,
        stock: 3,
      }
    );

    const updatedName = uniqueName("AfterUpdate");

    const res = await request(app)
      .patch(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: updatedName,
        price: 75,
        stock: 9,
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe(updatedName);
    expect(res.body.price).toBe(75);
    expect(res.body.stock).toBe(9);
    expect(res.body.slug).toContain(updatedName.toLowerCase().split("-")[0]);
  });

  it("customer cannot update product", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const customer = await registerAndGetToken("CUSTOMER");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category)
    );

    const res = await request(app)
      .patch(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        name: "Hacked Product",
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can soft delete product", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("Delete"),
      }
    );

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Product deleted successfully.");

    const list = await request(app).get("/api/v1/products");

    expect(list.status).toBe(200);
    expect(list.body.products.find((item: any) => item._id === product._id)).toBeUndefined();
  });

  it("customer cannot delete product", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const customer = await registerAndGetToken("CUSTOMER");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category)
    );

    const res = await request(app)
      .delete(`/api/v1/products/${product._id}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("public list hides unpublished products", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("Published"),
      status: "Published",
    });

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("Unpublished"),
      status: "Unpublished",
    });

    const res = await request(app).get("/api/v1/products");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.products[0].status).toBe("Published");
  });

  it("admin can list all statuses with status=all", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("Published"),
      status: "Published",
    });

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("Unpublished"),
      status: "Unpublished",
    });

    const res = await request(app)
      .get("/api/v1/products?status=all")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  it("search products works", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: "Apple Test Phone",
      description: "Searchable apple product",
    });

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: "Kitchen Test Tool",
      description: "Kitchen item",
    });

    const res = await request(app).get("/api/v1/products/search?q=Apple");

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(
      res.body.products.some((item: any) => item.name === "Apple Test Phone")
    ).toBe(true);
  });

  it("pagination works", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("PageOne"),
    });

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("PageTwo"),
    });

    const res = await request(app).get("/api/v1/products?page=1&limit=1");

    expect(res.status).toBe(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.perPage).toBe(1);
    expect(res.body.totalPages).toBe(2);
  });

  it("legacy /product returns raw products array", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    await createProductAsAdmin(admin.accessToken, getId(category), {
      name: uniqueName("RawProduct"),
    });

    const res = await request(app).get("/api/v1/product");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it("recommendations returns related products from same category", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const category = await createCategory();

    const product = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("MainRecommendation"),
      }
    );

    const related = await createProductAsAdmin(
      admin.accessToken,
      getId(category),
      {
        name: uniqueName("RelatedRecommendation"),
      }
    );

    const res = await request(app).get(`/api/v1/product/${product._id}/recommendations`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(
      res.body.products.some((item: any) => item._id.toString() === related._id)
    ).toBe(true);
    expect(
      res.body.products.some((item: any) => item._id.toString() === product._id)
    ).toBe(false);
  });
});