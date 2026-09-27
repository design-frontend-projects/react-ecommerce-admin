import { Redis, type RedisOptions } from 'ioredis'

let redisClient: Redis | null = null
let redisPublisher: Redis | null = null
let redisSubscriber: Redis | null = null

function getRedisConfig(): RedisOptions {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl) {
    return {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy(times) {
        // Exponential backoff capped at 3000ms
        return Math.min(times * 100, 3000)
      },
    }
  }

  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy(times) {
      return Math.min(times * 100, 3000)
    },
  }
}

/**
 * Returns the primary Redis client for general queries, key-value operations, and caching.
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const config = getRedisConfig()
    const redisUrl = process.env.REDIS_URL
    redisClient = redisUrl ? new Redis(redisUrl, config) : new Redis(config)

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection warning (client):', err.message)
    })
    redisClient.on('connect', () => {
      console.log('[Redis] Primary client connected.')
    })
  }
  return redisClient
}

/**
 * Returns a dedicated Redis client instance for Pub/Sub publishing.
 */
export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    const config = getRedisConfig()
    const redisUrl = process.env.REDIS_URL
    redisPublisher = redisUrl ? new Redis(redisUrl, config) : new Redis(config)

    redisPublisher.on('error', (err) => {
      console.warn('[Redis] Connection warning (publisher):', err.message)
    })
  }
  return redisPublisher
}

/**
 * Returns a dedicated Redis client instance for Pub/Sub subscribing.
 */
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    const config = getRedisConfig()
    const redisUrl = process.env.REDIS_URL
    redisSubscriber = redisUrl ? new Redis(redisUrl, config) : new Redis(config)

    redisSubscriber.on('error', (err) => {
      console.warn('[Redis] Connection warning (subscriber):', err.message)
    })
  }
  return redisSubscriber
}

/**
 * Checks whether Redis is currently connected and responsive.
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (client.status !== 'ready' && client.status !== 'connecting') {
      await client.connect()
    }
    const pong = await client.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}
