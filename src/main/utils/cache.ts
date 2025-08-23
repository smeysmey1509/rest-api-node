// cache.ts
import { createClient } from "redis";
export const redis = createClient({ url: process.env.REDIS_URL });

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export const cartCacheKey = (uid: string) => `cart:${uid}`;

export async function getCachedCart(uid: string) {
  const json = await redis.get(cartCacheKey(uid));
  return json ? JSON.parse(json) : null;
}
export async function setCachedCart(uid: string, payload: any, ttl = 60) {
  await redis.set(cartCacheKey(uid), JSON.stringify(payload), { EX: ttl });
}
export async function invalidateCart(uid: string) {
  await redis.del(cartCacheKey(uid));
}
