import Redis from "ioredis";

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
}

export class RedisClient {
  private client: Redis;

  constructor(config?: RedisConfig) {
    this.client = new Redis({
      host: config?.host || process.env.REDIS_HOST || "localhost",
      port: config?.port || Number(process.env.REDIS_PORT || 6379),
      password: config?.password || process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public async checkHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      if (this.client.status !== "ready" && this.client.status !== "connecting") {
        await this.client.connect();
      }
      const response = await this.client.ping();
      if (response === "PONG") {
        return { status: "healthy", latencyMs: Date.now() - start };
      }
      return {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: "Unexpected Redis PING response",
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { status: "unhealthy", latencyMs: Date.now() - start, error: errorMessage };
    }
  }

  public async close(): Promise<void> {
    if (this.client.status === "ready" || this.client.status === "connecting") {
      await this.client.quit();
    }
  }
}
