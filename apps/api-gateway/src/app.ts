import express, { Express } from 'express';
import { HealthController } from './health/health.controller.js';

export function createApp(): { app: Express; healthController: HealthController } {
  const app = express();
  const healthController = new HealthController();

  app.use(express.json());

  // Liveness & Readiness Probes (REL-001)
  app.get('/health', healthController.getLiveness);
  app.get('/health/deep', healthController.getReadiness);

  return { app, healthController };
}
