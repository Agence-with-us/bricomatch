import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: Redis | null = null;

export const initializeRedis = (): Redis => {
  if (!redisClient) {
    try {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        }
      });

      redisClient.on('connect', () => {
        console.log('Redis connected successfully');
      });

      redisClient.on('error', (err) => {
        console.error('Redis connection error:', err);
      });
    } catch (error) {
      console.error('Redis initialization error:', error);
      throw error;
    }
  }

  return redisClient;
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient();
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) as T : null;
  } catch (error) {
    console.error(`Error getting cached data for ${key}:`, error);
    return null;
  }
};

export const setCachedData = async <T>(
  key: string, 
  data: T, 
  ttl = parseInt(process.env.REDIS_CACHE_TTL || '3600')
): Promise<boolean> => {
  const client = getRedisClient();
  try {
    await client.set(key, JSON.stringify(data), 'EX', ttl);
    return true;
  } catch (error) {
    console.error(`Error setting cached data for ${key}:`, error);
    return false;
  }
};

export const invalidateCache = async (key: string): Promise<boolean> => {
  const client = getRedisClient();
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error invalidating cache for ${key}:`, error);
    return false;
  }
};