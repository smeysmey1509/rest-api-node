import fs from "fs";
import path from "path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
});

import app from "../src/app";

const uploadsDir = path.join(process.cwd(), "uploads");
const testFileName = `test-upload-${Date.now()}.txt`;
const testFilePath = path.join(uploadsDir, testFileName);

beforeAll(() => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  fs.writeFileSync(testFilePath, "hello upload static test", "utf-8");
});

afterAll(() => {
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
});

describe("Uploads Static Files", () => {
  it("serves existing file in uploads", async () => {
    const res = await request(app).get(`/uploads/${testFileName}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe("hello upload static test");
  });

  it("missing upload file returns 404", async () => {
    const res = await request(app).get("/uploads/missing-file-123.txt");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe(
      "Route not found: GET /uploads/missing-file-123.txt"
    );
  });

  it("static upload does not expose random route as file", async () => {
    const res = await request(app).get("/uploads/not-a-real-folder/file.png");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});