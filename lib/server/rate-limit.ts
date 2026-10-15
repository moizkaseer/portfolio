import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = (key: string) => Promise<{ success: boolean; reset: number }>;

const memory = new Map<string, number[]>();

/**
 * Per-IP sliding-window limit. Upstash Redis when UPSTASH_REDIS_REST_URL / _TOKEN are set
 * (shared across serverless instances); otherwise an in-memory window (dev / single instance).
 */
export function createLimiter(prefix: string, limit: number, windowSec: number): Limiter {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const rl = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`), prefix });
    return async (key) => {
      const r = await rl.limit(key);
      return { success: r.success, reset: r.reset };
    };
  }
  return async (key) => {
    const now = Date.now();
    const k = `${prefix}:${key}`;
    const hits = (memory.get(k) ?? []).filter((t) => now - t < windowSec * 1000);
    const success = hits.length < limit;
    if (success) hits.push(now);
    memory.set(k, hits);
    return { success, reset: (hits[0] ?? now) + windowSec * 1000 };
  };
}

export function clientIp(headers: Headers) {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
