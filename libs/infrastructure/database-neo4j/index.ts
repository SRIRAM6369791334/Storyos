import neo4j, { type Driver } from "neo4j-driver";

export interface Neo4jConfig {
  uri?: string;
  user?: string;
  password?: string;
}

export class Neo4jClient {
  private driverInstance: Driver;

  constructor(config?: Neo4jConfig) {
    const uri = config?.uri || process.env.NEO4J_URI || "bolt://localhost:7687";
    const user = config?.user || process.env.NEO4J_USER || "neo4j";
    const password = config?.password || process.env.NEO4J_PASSWORD || "storyos_dev_password";

    this.driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionTimeout: 5000,
    });
  }

  public getDriver(): Driver {
    return this.driverInstance;
  }

  public async checkHealth(): Promise<{
    status: "healthy" | "unhealthy";
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.driverInstance.verifyConnectivity();
      return { status: "healthy", latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { status: "unhealthy", latencyMs: Date.now() - start, error: errorMessage };
    }
  }

  public async close(): Promise<void> {
    await this.driverInstance.close();
  }
}

export { Neo4jRelationshipRepository } from "./src/relationship.repository.js";
