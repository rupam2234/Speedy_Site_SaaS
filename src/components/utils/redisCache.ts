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

const redis = Redis.fromEnv();

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
