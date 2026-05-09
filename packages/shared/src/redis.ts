import IORedis from "ioredis";

export function createRedisConnection(redisUrl = process.env.REDIS_URL): IORedis {
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
