import pg from "pg";

export interface PostgresConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
}

export class PostgresClient {
  private pool: pg.Pool;

  constructor(config?: PostgresConfig) {
    this.pool = new pg.Pool({
      host: config?.host || process.env.POSTGRES_HOST || "localhost",
      port: config?.port || Number(process.env.POSTGRES_PORT || 5432),
      database: config?.database || process.env.POSTGRES_DB || "storyos_dev",
      user: config?.user || process.env.POSTGRES_USER || "storyos_admin",
      password: config?.password || process.env.POSTGRES_PASSWORD || "storyos_dev_password",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async checkHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
        return { status: "healthy", latencyMs: Date.now() - start };
      } finally {
        client.release();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { status: "unhealthy", latencyMs: Date.now() - start, error: errorMessage };
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export { PostgresUniverseRepository } from "./src/universe.repository.js";
export { PostgresCharacterRepository } from "./src/character.repository.js";
export { PostgresLocationRepository } from "./src/location.repository.js";
export { PostgresEventRepository } from "./src/event.repository.js";
export {
  PostgresWorkRepository,
  PostgresChapterRepository,
  PostgresSceneRepository,
} from "./src/narrative.repository.js";
