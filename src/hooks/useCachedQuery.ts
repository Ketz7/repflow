"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCachedValue, getCachedAge, setCachedValue } from "@/lib/query-cache";

interface UseCachedQueryOptions {
  /** Milliseconds after which the cached value is considered stale and refetched. Default 30_000. */
  staleAfterMs?: number;
}

interface UseCachedQueryResult<T> {
  data: T | undefined;
  /** True on first fetch only (no cached value). False during background revalidation. */
  loading: boolean;
  /** True when a background refetch is in flight (cached data is shown meanwhile). */
  revalidating: boolean;
  error: unknown;
  /** Force a refetch. */
  refetch: () => Promise<void>;
}

/**
 * SWR-lite: returns cached value instantly, then revalidates in background.
 * The `key` must be stable across renders for a given logical query.
 * The `fetcher` is only called via its current ref — caller does not need to memoize.
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {},
): UseCachedQueryResult<T> {
  const { staleAfterMs = 30_000 } = options;
  const [data, setData] = useState<T | undefined>(() => getCachedValue<T>(key));
  const [loading, setLoading] = useState<boolean>(() => getCachedValue<T>(key) === undefined);
  const [revalidating, setRevalidating] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Keep fetcher in a ref so callers don't have to memoize it.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const cached = getCachedValue<T>(key);
    const age = getCachedAge(key);
    const hasCache = cached !== undefined;
    const isStale = age === undefined || age >= staleAfterMs;

    if (hasCache) {
      setData(cached);
      setLoading(false);
      if (!isStale) return; // Fresh enough — skip network.
      setRevalidating(true);
    } else {
      setLoading(true);
    }

    try {
      const fresh = await fetcherRef.current();
      setCachedValue(key, fresh);
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setRevalidating(false);
    }
  }, [key, staleAfterMs]);

  useEffect(() => {
    void run();
  }, [run]);

  const refetch = useCallback(async () => {
    setRevalidating(true);
    try {
      const fresh = await fetcherRef.current();
      setCachedValue(key, fresh);
      setData(fresh);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setRevalidating(false);
    }
  }, [key]);

  return { data, loading, revalidating, error, refetch };
}
