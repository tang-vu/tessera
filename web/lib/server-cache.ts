/**
 * Tiny in-memory TTL cache for server API routes.
 *
 * The dashboard polls every ~4s; without this, each poll re-hits the RPC.
 * Module-level state persists across requests on a warm serverless instance
 * (and resets on cold start / dev hot-reload), which is exactly the behavior
 * we want: cut redundant RPC load and smooth over momentary RPC slowness,
 * while staying fresh enough for a live demo.
 */
type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;
  const value = await fn();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}
