import { MilvusClient } from '@zilliz/milvus2-sdk-node';

export interface MilvusConfig {
  address?: string;
  username?: string;
  password?: string;
}

export class StoryOSMilvusClient {
  private client: MilvusClient;

  constructor(config?: MilvusConfig) {
    const address = config?.address || process.env.MILVUS_ADDRESS || 'localhost:19530';
    this.client = new MilvusClient({
      address,
      username: config?.username || process.env.MILVUS_USER,
      password: config?.password || process.env.MILVUS_PASSWORD,
    });
  }

  public getClient(): MilvusClient {
    return this.client;
  }

  public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await this.client.checkHealth();
      if (res.isHealthy) {
        return { status: 'healthy', latencyMs: Date.now() - start };
      }
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: 'Milvus reported unhealthy state' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: errorMessage };
    }
  }

  public async close(): Promise<void> {
    await this.client.closeConnection();
  }
}
