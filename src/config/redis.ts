import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 2,
  enableOfflineQueue: false,
});

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("connect", () => {
  console.log("Redis connected");
});
