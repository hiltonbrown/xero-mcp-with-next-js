
import { getRedisClient } from './redis';

// Set a value in the cache
export async function setCache<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
  const client = await getRedisClient();
  await client.set(key, JSON.stringify(data), { EX: ttlSeconds });
}

// Get a value from the cache
export async function getCache<T>(key: string): Promise<T | null> {
  const client = await getRedisClient();
  const data = await client.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

// Delete a value from the cache
export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(key);
}

// Cache keys
export const cacheKeys = {
  pkce: (state: string) => `pkce:${state}`,
  xeroAccount: (tenantId: string, accountId: string) => `xero:account:${tenantId}:${accountId}`,
  xeroContacts: (tenantId: string, page?: number) => `xero:contacts:${tenantId}:${page || 1}`,
  xeroInvoices: (tenantId: string, status?: string) => `xero:invoices:${tenantId}:${status || 'all'}`,
  session: (sessionId: string) => `session:${sessionId}`,
  toolResult: (toolName: string, params: string) => `tool:${toolName}:${params}`
};

// Utility functions for cached operations
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await operation();
  await setCache(key, result, ttlSeconds);
  return result;
}

// Invalidate cache based on a pattern
export async function invalidateCache(pattern: string): Promise<void> {
  const client = await getRedisClient();
  let cursor = 0;
  do {
    const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
    for (const key of reply.keys) {
      await client.del(key);
    }
    cursor = reply.cursor;
  } while (cursor !== 0);
}
