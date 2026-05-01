import { randomUUID } from "crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
  process.env.NODE_ENV = "test";
});

import app from "../../../app";
import SidebarItem from "../../../models/SidebarItem";

let mongo: MongoMemoryServer;

const getId = (doc: { _id: unknown }) => String(doc._id);
const uniqueName = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await SidebarItem.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Sidebar Items API", () => {
  it("public can create sidebar item", async () => {
    const res = await request(app).post("/api/v1/sidebar-items").send({
      name: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      order: 1,
      type: "module",
    });

    expect(res.status).toBe(200);
    expect(res.body.item.name).toBe("Dashboard");
    expect(res.body.item.path).toBe("/dashboard");
    expect(res.body.item.type).toBe("module");
  });

  it("create sidebar item requires name", async () => {
    const res = await request(app).post("/api/v1/sidebar-items").send({
      path: "/dashboard",
      icon: "dashboard",
      order: 1,
      type: "module",
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain("SidebarItem validation failed");
  });

  it("create sidebar item requires type", async () => {
    const res = await request(app).post("/api/v1/sidebar-items").send({
      name: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      order: 1,
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain("SidebarItem validation failed");
  });

  it("rejects invalid type", async () => {
    const res = await request(app).post("/api/v1/sidebar-items").send({
      name: "Dashboard",
      path: "/dashboard",
      icon: "dashboard",
      order: 1,
      type: "invalid",
    });

    expect(res.status).toBe(500);
    expect(res.body.message).toContain("SidebarItem validation failed");
  });

  it("public can get empty sidebar tree", async () => {
    const res = await request(app).get("/api/v1/sidebar-tree");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("sidebar tree sorts by order", async () => {
    await SidebarItem.create({
      name: "Second",
      path: "/second",
      icon: "second",
      order: 2,
      type: "module",
    });

    await SidebarItem.create({
      name: "First",
      path: "/first",
      icon: "first",
      order: 1,
      type: "module",
    });

    const res = await request(app).get("/api/v1/sidebar-tree");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe("First");
    expect(res.body[1].name).toBe("Second");
  });

  it("sidebar tree builds parent-child structure", async () => {
    const parent = await SidebarItem.create({
      name: uniqueName("Parent"),
      path: "/parent",
      icon: "parent",
      order: 1,
      type: "module",
    });

    const child = await SidebarItem.create({
      name: uniqueName("Child"),
      path: "/parent/child",
      icon: "child",
      order: 2,
      type: "feature",
      parentId: getId(parent),
    });

    const res = await request(app).get("/api/v1/sidebar-tree");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0]._id).toBe(getId(parent));
    expect(res.body[0].children.length).toBe(1);
    expect(res.body[0].children[0]._id).toBe(getId(child));
  });
});