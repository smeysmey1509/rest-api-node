// src/api/utils/redisClient.ts
import { createClient } from "redis";

const url = process.env.REDIS_URL || "redis://localhost:6379";
const client = createClient({ url });

let connected = false;
client.on("error", (err) => console.error("❌ Redis error:", err));

export async function ensureRedis() {
  if (connected) return client;
  await client.connect();           // connects once; subsequent calls are no-ops
  connected = true;
  try {
    const pong = await client.ping();
    console.log("✅ Redis connected. PING:", pong);
  } catch (e) {
    console.error("⚠️ Redis PING failed:", e);
  }
  return client;
}

// Tiny wrappers so failures never crash your API
export async function rget(key: string) {
  try {
    const c = await ensureRedis();
    return await c.get(key);
  } catch (e) {
    console.error("[Redis GET] failed:", key, e);
    return null;
  }
}

export async function rsetEX(key: string, ttlSec: number, val: string) {
  try {
    const c = await ensureRedis();
    // node-redis v4: either setEx(...) or set(..., { EX: ttl })
    return await c.set(key, val, { EX: ttlSec });
  } catch (e) {
    console.error("[Redis SETEX] failed:", key, e);
  }
}

export async function rdel(key: string) {
  try {
    const c = await ensureRedis();
    await c.del(key);
  } catch (e) {
    console.error("[Redis DEL] failed:", key, e);
  }
}

export default { ensureRedis, rget, rsetEX, rdel };
