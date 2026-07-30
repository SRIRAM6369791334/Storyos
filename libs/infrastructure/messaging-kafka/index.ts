import { Kafka, Admin } from 'kafkajs';

export interface KafkaConfig {
  clientId?: string;
  brokers?: string[];
}

export class KafkaClient {
  private kafka: Kafka;
  private admin: Admin;

  constructor(config?: KafkaConfig) {
    const brokers = config?.brokers || (process.env.KAFKA_BROKERS ? process.env.KAFKA_BROKERS.split(',') : ['localhost:9092']);
    const clientId = config?.clientId || process.env.KAFKA_CLIENT_ID || 'storyos-app';

    this.kafka = new Kafka({
      clientId,
      brokers,
      retry: {
        retries: 3,
      },
    });
    this.admin = this.kafka.admin();
  }

  public getKafka(): Kafka {
    return this.kafka;
  }

  public async checkHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.admin.connect();
      await this.admin.listTopics();
      await this.admin.disconnect();
      return { status: 'healthy', latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return { status: 'unhealthy', latencyMs: Date.now() - start, error: errorMessage };
    }
  }

  public async close(): Promise<void> {
    try {
      await this.admin.disconnect();
    } catch {
      // ignore if already disconnected
    }
  }
}
