import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../../app";
import User from "../../users/user.model";

let mongo: MongoMemoryServer;

const getSetCookieHeader = (res: request.Response) => {
  const cookie = res.headers["set-cookie"];

  if (Array.isArray(cookie)) {
    return cookie.join("; ");
  }

  return cookie || "";
};

beforeAll(async () => {
  process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
  process.env.JWT_ACCESS_EXPIRES_IN = "15m";
  process.env.JWT_REFRESH_EXPIRES_IN = "7d";
  process.env.JWT_ISSUER = "rest-api-node";
  process.env.JWT_AUDIENCE = "rest-api-node-client";

  mongo = await MongoMemoryServer.create();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Auth API", () => {
  it("registers a user and sets refresh cookie", async () => {
    const res = await request(app)
      .post("/api/v1/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "Password123",
      });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe("test@example.com");
    expect(getSetCookieHeader(res)).toContain("refreshToken");
  });

  it("rejects weak password", async () => {
    const res = await request(app)
      .post("/api/v1/register")
      .send({
        name: "Test User",
        email: "weak@example.com",
        password: "123",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects duplicate email", async () => {
    const payload = {
      name: "Test User",
      email: "duplicate@example.com",
      password: "Password123",
    };

    await request(app).post("/api/v1/register").send(payload);
    const res = await request(app).post("/api/v1/register").send(payload);

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("User already exists");
  });

  it("logs in with valid credentials", async () => {
    await request(app)
      .post("/api/v1/register")
      .send({
        name: "Login User",
        email: "login@example.com",
        password: "Password123",
      });

    const res = await request(app)
      .post("/api/v1/login")
      .send({
        identifier: "login@example.com",
        password: "Password123",
      });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe("login@example.com");
    expect(getSetCookieHeader(res)).toContain("refreshToken");
  });

  it("returns same message for unknown user and wrong password", async () => {
    await request(app)
      .post("/api/v1/register")
      .send({
        name: "Secure User",
        email: "secure@example.com",
        password: "Password123",
      });

    const wrongPassword = await request(app)
      .post("/api/v1/login")
      .send({
        identifier: "secure@example.com",
        password: "WrongPassword123",
      });

    const unknownUser = await request(app)
      .post("/api/v1/login")
      .send({
        identifier: "unknown@example.com",
        password: "WrongPassword123",
      });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe("Invalid credentials");
    expect(unknownUser.body.message).toBe("Invalid credentials");
  });

  it("refreshes access token using refresh cookie", async () => {
    const register = await request(app)
      .post("/api/v1/register")
      .send({
        name: "Refresh User",
        email: "refresh@example.com",
        password: "Password123",
      });

    const cookie = register.headers["set-cookie"];

    const res = await request(app)
      .post("/api/v1/refresh")
      .set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe("refresh@example.com");
    expect(getSetCookieHeader(res)).toContain("refreshToken");
  });

  it("rejects refresh without cookie", async () => {
    const res = await request(app).post("/api/v1/refresh");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("No refresh token provided");
  });

  it("logs out and clears refresh cookie", async () => {
    const res = await request(app).post("/api/v1/logout");

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Logged out");
    expect(getSetCookieHeader(res)).toContain("refreshToken=");
  });

  it("stores password as hashed value", async () => {
  await request(app)
    .post("/api/v1/register")
    .send({
      name: "Hash User",
      email: "hash@example.com",
      password: "Password123",
    });

  const user = await User.findOne({ email: "hash@example.com" }).select("+password");

  expect(user).toBeTruthy();
  expect(user?.password).toBeTruthy();
  expect(user?.password).not.toBe("Password123");
  expect(user?.password.startsWith("$2")).toBe(true);
});

it("sets default role to CUSTOMER", async () => {
  const res = await request(app)
    .post("/api/v1/register")
    .send({
      name: "Role User",
      email: "role@example.com",
      password: "Password123",
    });

  expect(res.status).toBe(201);
  expect(res.body.user.role).toBe("CUSTOMER");
});

it("rejects invalid email", async () => {
  const res = await request(app)
    .post("/api/v1/register")
    .send({
      name: "Invalid Email",
      email: "wrong-email",
      password: "Password123",
    });

  expect(res.status).toBe(400);
  expect(res.body.code).toBe("VALIDATION_ERROR");
});

it("rejects missing name", async () => {
  const res = await request(app)
    .post("/api/v1/register")
    .send({
      email: "noname@example.com",
      password: "Password123",
    });

  expect(res.status).toBe(400);
  expect(res.body.code).toBe("VALIDATION_ERROR");
});

it("rejects blocked user login", async () => {
  await request(app)
    .post("/api/v1/register")
    .send({
      name: "Blocked User",
      email: "blocked@example.com",
      password: "Password123",
    });

  await User.findOneAndUpdate(
    { email: "blocked@example.com" },
    { status: "BLOCKED" }
  );

  const res = await request(app)
    .post("/api/v1/login")
    .send({
      identifier: "blocked@example.com",
      password: "Password123",
    });

  expect(res.status).toBe(403);
  expect(res.body.message).toBe("User account is not active");
});

it("rotates refresh token cookie", async () => {
  const register = await request(app)
    .post("/api/v1/register")
    .send({
      name: "Rotate User",
      email: "rotate@example.com",
      password: "Password123",
    });

  const firstCookie = getSetCookieHeader(register);

  const refresh = await request(app)
    .post("/api/v1/refresh")
    .set("Cookie", register.headers["set-cookie"]);

  const secondCookie = getSetCookieHeader(refresh);

  expect(refresh.status).toBe(200);
  expect(secondCookie).toContain("refreshToken");
  expect(secondCookie).not.toBe(firstCookie);
});

it("rejects invalid refresh token", async () => {
  const res = await request(app)
    .post("/api/v1/refresh")
    .set("Cookie", "refreshToken=invalid-token");

  expect(res.status).toBe(401);
  expect(res.body.message).toBe("Invalid or expired refresh token");
});

});