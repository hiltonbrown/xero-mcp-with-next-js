
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
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
