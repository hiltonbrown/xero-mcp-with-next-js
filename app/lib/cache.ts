// Caching system for performance optimization

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class Cache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void { // 5 minutes default
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = Math.ceil(this.maxSize * 0.1); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instances
export const xeroDataCache = new Cache(500); // For Xero API responses
export const sessionCache = new Cache(200); // For session data
export const toolResultCache = new Cache(300); // For MCP tool results

// Cache keys
export const cacheKeys = {
  xeroAccount: (tenantId: string, accountId: string) => `xero:account:${tenantId}:${accountId}`,
  xeroContacts: (tenantId: string, page?: number) => `xero:contacts:${tenantId}:${page || 1}`,
  xeroInvoices: (tenantId: string, status?: string) => `xero:invoices:${tenantId}:${status || 'all'}`,
  session: (sessionId: string) => `session:${sessionId}`,
  toolResult: (toolName: string, params: string) => `tool:${toolName}:${params}`
};

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    const values = this.metrics.get(label)!;
    values.push(value);

    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(label: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return {
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    for (const [label, values] of this.metrics.entries()) {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        result[label] = {
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Utility functions for cached operations
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMs = 5 * 60 * 1000
): Promise<T> {
  // Try to get from cache first
  const cached = xeroDataCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Perform operation and cache result
  const result = await operation();
  xeroDataCache.set(key, result, ttlMs);
  return result;
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Simple pattern matching for cache invalidation
  for (const key of xeroDataCache['cache'].keys()) {
    if (key.includes(pattern)) {
      xeroDataCache.delete(key);
    }
  }
}

// Connection pooling helper
export class ConnectionPool {
  private pool: Map<string, any> = new Map();
  private maxConnections: number;

  constructor(maxConnections = 10) {
    this.maxConnections = maxConnections;
  }

  async getConnection(key: string, factory: () => Promise<any>): Promise<any> {
    if (this.pool.has(key)) {
      return this.pool.get(key);
    }

    if (this.pool.size >= this.maxConnections) {
      // Remove oldest connection
      const firstKey = this.pool.keys().next().value;
      if (firstKey) {
        this.pool.delete(firstKey);
      }
    }

    const connection = await factory();
    this.pool.set(key, connection);
    return connection;
  }

  releaseConnection(key: string): void {
    this.pool.delete(key);
  }

  clear(): void {
    this.pool.clear();
  }

  size(): number {
    return this.pool.size;
  }
}

export const xeroConnectionPool = new ConnectionPool(5);

// Periodic cleanup
setInterval(() => {
  xeroDataCache.cleanup();
  sessionCache.cleanup();
  toolResultCache.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes