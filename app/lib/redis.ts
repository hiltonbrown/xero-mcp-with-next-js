
import { createClient } from 'redis';

if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  throw new Error('REDIS_URL environment variable is required in production');
}
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    tls: process.env.NODE_ENV === 'production', // Enable TLS in production
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

let connectionPromise: Promise<typeof redisClient> | null = null;

export async function getRedisClient() {
  if (!connectionPromise) {
    connectionPromise = redisClient.connect()
      .then(() => redisClient)
      .catch(err => {
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
}
