import { Redis } from "@upstash/redis";

interface Props<T> {
  key: string;
  fn: () => Promise<T>;
  ttl: number;
}

interface CacheResult<T> {
    response: T;
    isCached: boolean;
  }

// Build-safe: fromEnv throws without Upstash env, which breaks CI builds
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "https://build-placeholder.upstash.io",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "build-placeholder",
});

export async function redisCache<T>({
  key,
  fn,
  ttl,
}: Props<T>): Promise<CacheResult<T>> {
  const cached = await redis.get<T>(key);

  if (cached) {
    return {response: cached, isCached: true};
  }

  const response = await fn();

  await redis.set(key, response, { ex: ttl });

  const result = {response: response, isCached: false}

  return result;
}
