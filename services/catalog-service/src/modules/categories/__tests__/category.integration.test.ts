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
import Category from "../category.model";

let mongo: MongoMemoryServer;

const uniqueEmail = (prefix: string) => {
  return `${prefix}-${randomUUID()}@example.com`;
};

const uniqueCategoryName = (prefix: string) => {
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

const createCategoryAsAdmin = async (
  adminToken: string,
  overrides: Partial<{
    categoryName: string;
    categoryId: string;
    description: string;
  }> = {}
) => {
  const categoryName = overrides.categoryName || uniqueCategoryName("Category");

  const res = await request(app)
    .post("/api/v1/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      categoryName,
      categoryId: overrides.categoryId,
      description: overrides.description || "Test category",
    });

  expect(res.status).toBe(201);
  expect(res.body.category).toBeTruthy();

  return res.body.category;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
  await Category.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Categories API", () => {
  it("public can list categories", async () => {
    const res = await request(app).get("/api/v1/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.perPage).toBe(25);
  });

  it("public can list raw categories using /category", async () => {
    const admin = await registerAndGetToken("ADMIN");

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("Raw"),
    });

    const res = await request(app).get("/api/v1/category");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
  });

  it("admin can create category", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const categoryName = uniqueCategoryName("Phones");

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        categoryName,
        description: "Phone products",
      });

    expect(res.status).toBe(201);
    expect(res.body.msg).toBe("Category created.");
    expect(res.body.category.categoryName).toBe(categoryName);
    expect(res.body.category.categoryId).toBeTruthy();
  });

  it("admin can create category using legacy /category route", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const categoryName = uniqueCategoryName("Legacy");

    const res = await request(app)
      .post("/api/v1/category")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        name: categoryName,
        description: "Created from legacy route",
      });

    expect(res.status).toBe(201);
    expect(res.body.category.categoryName).toBe(categoryName);
  });

  it("customer cannot create category", async () => {
    const customer = await registerAndGetToken("CUSTOMER");

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        categoryName: uniqueCategoryName("Customer"),
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("rejects create category without categoryName or name", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        description: "Missing category name",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate category", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const categoryName = uniqueCategoryName("Duplicate");

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName,
    });

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        categoryName,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Duplicate category");
  });

  it("public can get category by id", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const category = await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("Get"),
    });

    const res = await request(app).get(`/api/v1/categories/${category._id}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(category._id);
    expect(res.body.categoryName).toBe(category.categoryName);
  });

  it("public get missing category returns 404", async () => {
    const missingId = new Types.ObjectId().toString();

    const res = await request(app).get(`/api/v1/categories/${missingId}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found.");
  });

  it("admin can update category", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const category = await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("BeforeUpdate"),
    });

    const updatedName = uniqueCategoryName("AfterUpdate");

    const res = await request(app)
      .patch(`/api/v1/categories/${category._id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        categoryName: updatedName,
        description: "Updated category description",
      });

    expect(res.status).toBe(200);
    expect(res.body.categoryName).toBe(updatedName);
    expect(res.body.description).toBe("Updated category description");
  });

  it("customer cannot update category", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const customer = await registerAndGetToken("CUSTOMER");

    const category = await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("CustomerUpdate"),
    });

    const res = await request(app)
      .patch(`/api/v1/categories/${category._id}`)
      .set("Authorization", `Bearer ${customer.accessToken}`)
      .send({
        categoryName: "Hacked Category",
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("admin can delete category", async () => {
    const admin = await registerAndGetToken("ADMIN");

    const category = await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("Delete"),
    });

    const res = await request(app)
      .delete(`/api/v1/categories/${category._id}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Category deleted successfully.");

    const dbCategory = await Category.findById(category._id);
    expect(dbCategory).toBeNull();
  });

  it("customer cannot delete category", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const customer = await registerAndGetToken("CUSTOMER");

    const category = await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("CustomerDelete"),
    });

    const res = await request(app)
      .delete(`/api/v1/categories/${category._id}`)
      .set("Authorization", `Bearer ${customer.accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.msg).toBe("Forbidden: insufficient role");
  });

  it("delete missing category returns 404", async () => {
    const admin = await registerAndGetToken("ADMIN");
    const missingId = new Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/v1/categories/${missingId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Category not found.");
  });

  it("category search works with q query", async () => {
    const admin = await registerAndGetToken("ADMIN");

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName: "Apple Phones",
    });

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName: "Kitchen Tools",
    });

    const res = await request(app).get("/api/v1/categories?q=Apple");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.categories[0].categoryName).toBe("Apple Phones");
  });

  it("pagination works", async () => {
    const admin = await registerAndGetToken("ADMIN");

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("PageOne"),
    });

    await createCategoryAsAdmin(admin.accessToken, {
      categoryName: uniqueCategoryName("PageTwo"),
    });

    const res = await request(app).get("/api/v1/categories?page=1&limit=1");

    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBe(1);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.perPage).toBe(1);
    expect(res.body.totalPages).toBe(2);
  });
});