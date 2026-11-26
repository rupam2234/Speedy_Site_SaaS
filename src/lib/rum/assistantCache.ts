import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

// Build-safe: the client is constructed with placeholder env values so the
// module can be imported during a build without a live Upstash connection.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "https://build-placeholder.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "build-placeholder",
});

/** Lowercases and collapses whitespace so equivalent questions share a key. */
export function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable short hash used for cache and rate limit keys. */
export function hashQuestion(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

/**
 * Reads a cached JSON value. Cache failures are never fatal: the caller
 * recomputes the value and the assistant stays available.
 */
export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get<T>(key);
    return cached ?? null;
  } catch {
    return null;
  }
}

/** Writes a cached JSON value with a TTL. Cache failures are never fatal. */
export async function setCachedJson(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // A cache write failure only costs a recomputation on the next request.
  }
}

/**
 * Increments a fixed window counter and reports whether the caller is within
 * the limit. The window key embeds the bucket so counters expire naturally.
 */
export async function isWithinRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const windowKey = `${key}:${bucket}`;

  try {
    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, windowSeconds);
    }
    return count <= limit;
  } catch {
    // Without a working counter the request is allowed rather than blocked.
    return true;
  }
}
