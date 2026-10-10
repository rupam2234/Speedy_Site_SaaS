"use client";
import CryptoJS from "crypto-js";

const ENC_KEY_STORAGE_KEY = "_enc_session_key";
const ENC_KEY_EXPIRY_KEY = "_enc_session_ttl";
const ENC_KEY_TIMEOUT_KEY = 30 * 60 * 1000;

interface Props<T, M extends any[] = []> {
  key: string;
  fn: (...args: M) => Promise<T>;
  args?: M;
  ttl: number;
  session_Storage: boolean;
  useCache?: boolean;
  useCrypto?: boolean;
}

interface PropsExtended<T, M extends any[]> extends Props<T, M> {
  validatorFn: (...args: M) => Promise<boolean>;
  lastUpdated: number;
}

interface CacheResult<T> {
  response: T;
  isCached: boolean;
}

interface CleanCache {
  prefix: string;
  session_Storage: boolean;
}
interface CachePayload<T> {
  data: T;
  expiry: number;
  cryptography: boolean;
  /** timestamp (ms) of the source data this entry was written for */
  lastUpdated?: number;
}

/**
 * caches data into session / local storage with a TTL
 * @param key cache key ---> use a prefix ex: `rum-cache:${key}`, the prefix later helps safe clean up of unsued cache in batch
 * @param fn function to fetch data (not cached)
 * @param ttl cache expiry time
 * @param session_Storage should the date go into session storage? if false it sets to localstorage
 * @param useCache default= TRUE; if set to FALSE returns fresh data. When TRUE, returns available / unexpired cached data (overrides cache contol)
 * @param useCrypto default= FALSE; if set to True, cached data is encrypterd
 * @returns response & isCached
 */
export async function cachedData<T, M extends any[] = []>({
  key,
  fn,
  args,
  ttl,
  session_Storage,
  useCache = true,
  useCrypto = false,
}: Props<T, M>): Promise<CacheResult<T>> {
  const storage = getStorage(session_Storage);

  if (useCache) {
    const hit = readCache<T>(storage, key);
    if (hit !== null) return hit;
  } else {
    storage.removeItem(key); // if false (user override, we return fresh data and store new cache)
  }
  // if no cache fetch fresh data
  const response: T = await fn(...(args ?? ([] as unknown as M)));

  if (ttl <= 0) {
    return { response, isCached: false };
  }

  writeCache(storage, key, response, ttl, useCrypto);

  // retrun the new data
  return {
    response: response,
    isCached: false,
  };
}

/**
 * Silently cleans expired cache entries with a specific prefix
 */
export function cleanExpiredCache({
  prefix,
  session_Storage = false,
}: CleanCache) {
  const storage = getStorage(session_Storage);

  try {
    const now = Date.now();

    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i);
      if (!key || !key.startsWith(prefix)) continue;

      try {
        const raw = storage.getItem(key);
        if (!raw) continue;

        const parsed: CachePayload<any> = JSON.parse(raw);

        if (!parsed.expiry || now >= parsed.expiry) {
          storage.removeItem(key);
        }
      } catch {
        // corrupted cache → remove
        storage.removeItem(key);
      }
    }
  } catch {
    // silently fail (storage access errors etc)
  }
}

function getEncKey(): string | null {
  // Not available server-side — callers must guard against null.
  if (typeof window === "undefined") return null;

  try {
    // read crypto key from session storage
    const encKey = sessionStorage.getItem(ENC_KEY_STORAGE_KEY);
    const expiry = Number.parseInt(
      sessionStorage.getItem(ENC_KEY_EXPIRY_KEY) as string,
    );
    // if exists and not expired, use it.
    if (encKey && !Number.isNaN(expiry) && Date.now() < expiry) {
      // slide the expiry window
      sessionStorage.setItem(
        ENC_KEY_EXPIRY_KEY,
        (Date.now() + ENC_KEY_TIMEOUT_KEY).toString(),
      );
      return encKey;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    // Ignore storage read error
  }

  // generate a new session key
  const randomKey = CryptoJS.lib.WordArray.random(32).toString(
    CryptoJS.enc.Hex,
  );

  try {
    sessionStorage.setItem(ENC_KEY_STORAGE_KEY, randomKey);
    sessionStorage.setItem(
      ENC_KEY_EXPIRY_KEY,
      (Date.now() + ENC_KEY_TIMEOUT_KEY).toString(),
    );
  } catch (e) {
    console.warn(
      "Unable to persist session encryption key to sessionStorage",
      e,
    );
  }

  return randomKey;
}

function decrypt(value: string, encKey: string) {
  return CryptoJS.AES.decrypt(value, encKey).toString(CryptoJS.enc.Utf8);
}
function encrypt(value: string, encKey: string) {
  return CryptoJS.AES.encrypt(value, encKey).toString();
}

/**
 * Reads an unexpired cache entry from storage (handles decryption + corruption).
 * @returns the cached response as a hit, or null on miss / expiry / corruption
 * (expired & corrupted entries are removed as a side effect).
 */
function readCache<T>(
  storage: Storage,
  key: string,
): CacheResult<T> | null {
  try {
    const cached = storage.getItem(key);

    if (cached !== null) {
      const parsed: CachePayload<T | string> = JSON.parse(cached);
      if (parsed.cryptography && typeof parsed.data === "string") {
        const encKey = getEncKey();
        if (!encKey) {
          // key unavailable (e.g. SSR fallback) — ciphertext is unreadable
          storage.removeItem(key);
          return null;
        }
        try {
          parsed.data = JSON.parse(decrypt(parsed.data, encKey));
        } catch {
          // The session encryption key was rotated or lost since this entry
          // was written (30-min inactivity expiry). The ciphertext cannot be
          // recovered — treat as a normal miss and invalidate the entry.
          console.warn(
            "Encrypted cache unreadable (session key rotated) — invalidating:",
            key,
          );
          storage.removeItem(key);
          return null;
        }
      }
      if (Date.now() < parsed.expiry) {
        return {
          response: parsed.data as T,
          isCached: true,
        };
      }
      // expired (removes the cached data)
      storage.removeItem(key);
    }
  } catch (error) {
    console.error("Cache parse error:", error);
    storage.removeItem(key);
  }
  return null;
}

/**
 * Serializes a response into a cache payload and writes it to storage.
 */
function writeCache<T>(
  storage: Storage,
  key: string,
  response: T,
  ttl: number,
  useCrypto: boolean,
  lastUpdated?: number,
) {
  const encKey = useCrypto ? getEncKey() : null;
  const payload: CachePayload<T | string> = {
    data:
      useCrypto && encKey ? encrypt(JSON.stringify(response), encKey) : response,
    expiry: Date.now() + ttl,
    cryptography: useCrypto && encKey !== null,
    lastUpdated,
  };

  try {
    storage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Cache write failed:", e);
  }
}

/** Returns the current cache entry's payload metadata, or null if missing / corrupted. */
function readCachePayload(
  storage: Storage,
  key: string,
): CachePayload<unknown> | null {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as CachePayload<unknown>;
  } catch {
    return null;
  }
}

/** Returns the appropriate Web Storage instance, or a no-op in-memory fallback during SSR. */
function getStorage(session_Storage: boolean): Storage {
  if (typeof window === "undefined") {
    // Server-side: return a no-op in-memory Storage so callers don't crash.
    const store = new Map<string, string>();
    return {
      length: store.size,
      key: (i: number) => [...store.keys()][i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
    } as Storage;
  }
  return session_Storage ? sessionStorage : localStorage;
}

/**
 * Extended cache with a validator check before serving cached data.
 * @param validatorFn async check that determines whether the cached flow is still valid
 *   (e.g. a cheap API ping / version check). Returning FALSE marks the cache as stale.
 * @param lastUpdated timestamp (ms) the source data was last updated. Stamped into the
 *   cache payload on every write, and used to skip the validator entirely:
 *   if the stored entry was written at/after this `lastUpdated`, it is served straight
 *   from storage as a HIT (no validatorFn call, no refetch).
 *
 * Behavior:
 *  - unexpired cache with stored lastUpdated >= requested lastUpdated
 *    → served from storage immediately (isCached: true, validator skipped).
 *  - otherwise validatorFn runs:
 *    - TRUE  → normal `cachedData` flow (serve unexpired cache, refresh on expiry).
 *    - FALSE → cache is invalidated, fresh data is fetched via `fn` and written back
 *      with the same ttl / encryption settings, stamped with `lastUpdated` — so the
 *      next call hits the fast path instead of re-validating again.
 *  - validatorFn throws → treated as invalid (failsafe refresh) — logs the error.
 * @returns response & isCached
 */
export async function cachedDataExtended<T, M extends any[] = []>({
  key,
  fn,
  args,
  validatorFn,
  lastUpdated = Date.now(),
  ttl = 0,
  session_Storage = false,
  useCache = true,
  useCrypto = false,
}: PropsExtended<T, M>): Promise<CacheResult<T>> {
  const storage = getStorage(session_Storage);

  // fast path: an unexpired entry already written for this (or a newer)
  // lastUpdated is known-good → serve from storage without re-validating.
  if (useCache) {
    try {
      const payload = readCachePayload(storage, key);
      if (
        payload &&
        Date.now() < payload.expiry &&
        typeof payload.lastUpdated === "number" &&
        payload.lastUpdated >= lastUpdated
      ) {
        return await cachedData({ key, fn, args, ttl, session_Storage, useCache, useCrypto });
      }
    } catch {
      // fall through to the validator path on any read issue
    }
  }

  let validated: boolean;

  try {
    validated = await validatorFn(...(args ?? ([] as unknown as M)));
  } catch (error) {
    console.error("Cache validator error:", error);
    validated = false;
  }

  if (validated) {
    // data is still valid → normal cache flow (may serve unexpired cached data)
    return await cachedData({
      key,
      fn,
      args,
      ttl,
      session_Storage,
      useCache,
      useCrypto,
    });
  }

  // data is stale / invalidated → drop the cache and fetch fresh data,
  // re-storing it with the same ttl & encryption settings, stamped with
  // lastUpdated so subsequent calls short-circuit as a cache HIT.
  storage.removeItem(key);

  const response: T = await fn(...(args ?? ([] as unknown as M)));

  if (ttl > 0) {
    writeCache(storage, key, response, ttl, useCrypto, lastUpdated);
  }

  return { response, isCached: false };
}
