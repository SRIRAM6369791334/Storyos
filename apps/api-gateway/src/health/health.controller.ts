import { KafkaClient } from "@storyos/infrastructure-kafka";
import { StoryOSMilvusClient } from "@storyos/infrastructure-milvus";
import { Neo4jClient } from "@storyos/infrastructure-neo4j";
import { PostgresClient } from "@storyos/infrastructure-postgres";
import { RedisClient } from "@storyos/infrastructure-redis";
import type { Request, Response } from "express";

export class HealthController {
  private postgresClient: PostgresClient;
  private neo4jClient: Neo4jClient;
  private redisClient: RedisClient;
  private milvusClient: StoryOSMilvusClient;
  private kafkaClient: KafkaClient;

  constructor() {
    this.postgresClient = new PostgresClient();
    this.neo4jClient = new Neo4jClient();
    this.redisClient = new RedisClient();
    this.milvusClient = new StoryOSMilvusClient();
    this.kafkaClient = new KafkaClient();
  }

  // Shallow Liveness Probe (/health) - REL-001
  public getLiveness = (_req: Request, res: Response): void => {
    res.status(200).json({
      status: "UP",
      service: "StoryOS API Gateway",
      timestamp: new Date().toISOString(),
    });
  };

  // Deep Readiness Probe (/health/deep) - REL-001
  public getReadiness = async (_req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    const [postgres, neo4j, redis, milvus, kafka] = await Promise.all([
      this.postgresClient.checkHealth(),
      this.neo4jClient.checkHealth(),
      this.redisClient.checkHealth(),
      this.milvusClient.checkHealth(),
      this.kafkaClient.checkHealth(),
    ]);

    const isHealthy =
      postgres.status === "healthy" &&
      neo4j.status === "healthy" &&
      redis.status === "healthy" &&
      milvus.status === "healthy" &&
      kafka.status === "healthy";

    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? "UP" : "DOWN",
      totalLatencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      components: {
        postgres,
        neo4j,
        redis,
        milvus,
        kafka,
      },
    });
  };

  public close = async (): Promise<void> => {
    await Promise.allSettled([
      this.postgresClient.close(),
      this.neo4jClient.close(),
      this.redisClient.close(),
      this.milvusClient.close(),
      this.kafkaClient.close(),
    ]);
  };
}
