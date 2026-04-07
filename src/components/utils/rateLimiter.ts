interface Ratelimiter {
  /**
   * Key of the value you are passing to session storage
   */
  key: string;
  /**
   * value is what you want to store in session storatge for the give TTL
   */
  value: any;
  /**
   * TTL: time to live should be in mili seconds (for example: 5 Minute -> 5 * 60 * 1000)
   */
  ttl: number;
}

/**
 * sets any key-value pair in session storage with expiry
 * @param param0 key, value and expiry timer in milisecond
 */
export function setRatelimiter({ key, value, ttl }: Ratelimiter) {
  const now = Date.now();

  const item = {
    value,
    expiry: now + ttl, // ttl extends the time to future for a expiry
  };

  sessionStorage.setItem(key, JSON.stringify(item));
}

/**
 * retuns the value for a key with session based expiry
 * @param key key of item store with expiry
 * @returns value as any
 */
export function getRateLimiter(key: string) {
  const item = sessionStorage.getItem(key);

  if (!item) return null;

  const itemData = JSON.parse(item);
  const now = Date.now();

  if (now > itemData.expiry) {
    // Expired
    sessionStorage.removeItem(key);
    return null;
  }

  return itemData.value;
}
