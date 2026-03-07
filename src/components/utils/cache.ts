interface Props<T>{
    key: string;
    fn: ()=> Promise<T>;
    ttl: number;
    session_Storage: boolean
}

interface CacheResult<T> {
    response: T;
    isCached: boolean;
}

interface CleanCache {
    prefix: string, 
    session_Storage: boolean
}

/**
 * caches data into session / local storage with a TTL
 * @param key cache key ---> use a prefix ex: `rum-cache:${key}`, the prefix later helps safe clean up of unsued cache in batch
 * @param fn function to fetch data (not cached)
 * @param ttl cache expiry time
 * @param session_Storage should the date go into session storage? if false it sets to localstorage
 * @returns response & isCached
 */
export async function cachedData<T>({key, fn, ttl, session_Storage}: Props<T>): Promise<CacheResult<T>> {
    const storage = session_Storage ? sessionStorage : localStorage

    try{
        const cached = storage.getItem(key);

        if(cached !== null){
            const parsed = JSON.parse(cached);
            
            if(Date.now() < parsed.expiry){
                return {
                    response: parsed.data as T,
                    isCached: true,
                };
            }
            // expired (removes the cached data
            storage.removeItem(key);
        }
    } catch(error){
        console.error("Cache parse error:", error);
        storage.removeItem(key);
    }
    
    // if no cache fetch fresh data
    const response = await fn();

    const payload = {
        data: response,
        expiry: Date.now() + ttl,
    };

    // set new cache
    storage.setItem(key, JSON.stringify(payload));

    // retrun the new data
    return {response: response, isCached: false}
}

/**
 * Silently cleans expired cache entries with a specific prefix
 */
export function cleanExpiredCache({prefix, session_Storage = false}: CleanCache) {
    const storage = session_Storage ? sessionStorage : localStorage;

    try {
        const now = Date.now();

        for (let i = storage.length - 1; i >= 0; i--) {
            const key = storage.key(i);
            if (!key || !key.startsWith(prefix)) continue;

            try {
                const raw = storage.getItem(key);
                if (!raw) continue;

                const parsed = JSON.parse(raw);

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