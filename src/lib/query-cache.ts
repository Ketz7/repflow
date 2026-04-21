interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  return entry ? (entry.data as T) : undefined;
}

export function getCachedAge(key: string): number | undefined {
  const entry = cache.get(key);
  return entry ? Date.now() - entry.timestamp : undefined;
}

export function setCachedValue<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(keyOrPrefix: string, exact = false): void {
  if (exact) {
    cache.delete(keyOrPrefix);
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(keyOrPrefix)) cache.delete(k);
  }
}

export function clearAllCache(): void {
  cache.clear();
}
