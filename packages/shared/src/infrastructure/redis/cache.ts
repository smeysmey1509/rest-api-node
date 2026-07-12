import { createClient } from "redis";
import { redisConfig } from "../../config/redis";

export const redis = createClient({ url: redisConfig.url });

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export const isRedisReady = () => redis.isReady;

export const cartCacheKey = (uid: string) => `cart:${uid}`;

export async function getCachedCart(uid: string) {
  try {
    const json = await redis.get(cartCacheKey(uid));
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}
export async function setCachedCart(uid: string, payload: unknown, ttl = 60) {
  try {
    await redis.set(cartCacheKey(uid), JSON.stringify(payload), { EX: ttl });
  } catch {
    /* ignore cache errors */
  }
}
export async function invalidateCart(uid: string) {
  try {
    await redis.del(cartCacheKey(uid));
  } catch {
    /* ignore cache errors */
  }
}
