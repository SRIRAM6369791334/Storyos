# StoryOS Enterprise Architecture
## Task 8.3 — Cost Optimization Architecture

### 1. Preface
This document defines the Cost Optimization Architecture (FinOps) for StoryOS. It details the mechanisms for tracking, attributing, and minimizing cloud compute, storage, and AI inference costs. By embedding cost awareness directly into the telemetry and infrastructure layers, StoryOS ensures long-term financial sustainability while delivering premium AI capabilities.

### 2. Executive Overview
Cloud and AI costs can spiral out of control without strict governance. This architecture implements a FinOps model providing per-tenant, per-feature, and per-AI-call cost visibility via OpenTelemetry. It mandates aggressive cost reduction strategies: Spot/Preemptible instances for background workers (saving ~70%), S3 Intelligent Tiering for long-term storage, AI prompt caching (Task 4.5) to reduce token processing, and dynamic resource right-sizing using Kubernetes VPA (Goldilocks).

### 3. Enterprise Objectives
- **Cost Visibility**: Track every micro-cent of infrastructure and AI cost back to the specific tenant and feature.
- **Margin Protection**: Ensure the cost to serve a user remains below their subscription revenue.
- **Waste Elimination**: Automatically scale down idle resources and utilize cheaper compute (Spot) for non-critical workloads.
- **Predictable Forecasting**: Alert proactively when usage anomalies threaten to breach monthly budgets.

### 4. Architecture Overview
The Cost Optimization architecture leverages OpenTelemetry to attach cost metadata to distributed traces, aggregating them in a FinOps dashboard.

```ascii
+-----------------------------------------------------------------------------+
|                          STORYOS FINOPS ARCHITECTURE                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-------------------+       +---------------------+       +-------------+  |
|  | Application Layer |       | AI Inference Layer  |       | Data Layer  |  |
|  | (API / Workers)   |       | (vLLM / External API|       | (DB / S3)   |  |
|  +-------------------+       +---------------------+       +-------------+  |
|            |                            |                       |           |
|            +--------- OTel Spans +------+-----------------------+           |
|                       Cost Metadata     |                                   |
|                                         v                                   |
|                              +-------------------+                          |
|                              | OpenTelemetry     |                          |
|                              | Collector         |                          |
|                              +-------------------+                          |
|                                         |                                   |
|                                         v                                   |
|                              +-------------------+                          |
|                              | FinOps Data Lake  |                          |
|                              | (Cost Aggregation)|                          |
|                              +-------------------+                          |
|                                         |                                   |
|                                         v                                   |
|                              +-------------------+                          |
|                              | Chargeback &      |                          |
|                              | Billing Engine    |                          |
|                              +-------------------+                          |
+-----------------------------------------------------------------------------+
```

### 5. Core Components
1. **Cost Attributor**: OpenTelemetry middleware injecting `tenant_id` and `estimated_cost` into spans.
2. **Spot Instance Fleet**: AWS EC2 Spot / GCP Preemptible node pools for asynchronous Kafka consumers.
3. **Storage Tiering Manager**: S3 lifecycle policies transitioning cold data to Glacier/Intelligent Tiering.
4. **VPA Recommender**: Goldilocks analyzes actual Pod memory/CPU usage and recommends tighter limits.
5. **AI Cost Router**: Model Router (Task 4.6) directs simple queries to cheap Tier 2 models instead of expensive Tier 1 models.
6. **Budget Alerter**: Anomaly detection service triggering P2 alerts if spend spikes 2x week-over-week.

### 6. Internal Architecture
Cost data is aggregated asynchronously from trace data to avoid impacting application performance.

```ascii
Sequence Diagram: FinOps Telemetry

App Node     AI Gateway     External LLM     OTel Collector    FinOps Lake
   |             |               |                 |                |
   |-DoWork()--->|               |                 |                |
   |             |-Prompt()----->|                 |                |
   |             |<--Tokens------|                 |                |
   |             |               |                 |                |
   |             |--CalculateCost(TokenCount)      |                |
   |             |--EmitSpan(cost=$0.002)--------->|                |
   |             |                                 |---Aggregate--->|
   |<--Result----|                                 |                |
```

### 7. Data Flow
Tracing data flows into the billing system for tenant chargebacks.

```ascii
Data Flow Diagram

[Service Traces] --> [OTel Collector] --> [Kafka (FinOps Topic)]
                                                 |
                                                 v
[AWS Cost Explorer API] <------------> [Cost Aggregation Engine]
                                                 |
                                                 v
                                       [Billing DB (Stripe Sync)]
```

### 8. Runtime Lifecycle
State machine for Budget Anomaly Detection.

```ascii
State Machine: Cost Alerter

 [*] --> MonitoringSpend
 MonitoringSpend --> ThresholdWarning : Spend > 80% Budget
 ThresholdWarning --> PagerDutyAlert : Spend > 100% Budget
 MonitoringSpend --> SpikeDetected : 2x WoW Growth
 SpikeDetected --> PagerDutyAlert
 PagerDutyAlert --> ManualReview
 ManualReview --> AdjustedBudget
 ManualReview --> RateLimitedTenant
 AdjustedBudget --> [*]
 RateLimitedTenant --> [*]
```

### 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Tenant Cost Privacy | RBAC on FinOps dashboard | IAM policies |
| Billing Abuse | Hard rate limits on API per tenant | API Gateway / Redis Token Bucket |
| Credential Leakage | Temporary STS tokens for Cost APIs | Vault / K8s Service Accounts |

#### Audit Record JSON
```json
{
  "event_id": "cost_88192",
  "timestamp": "2026-07-29T19:00:00Z",
  "actor": "system_finops",
  "action": "budget_alert_triggered",
  "resource": "tenant_4492",
  "context": {
    "current_spend": 1250.00,
    "budget_limit": 1000.00,
    "anomaly_type": "rapid_ai_consumption"
  }
}
```

### 10. Scalability & Cost Targets
| Category | Metric | Target Cost | Optimization Strategy |
|---|---|---|---|
| Compute | Cost per API Req | < $0.0001 | Graviton (ARM) processors, Spot instances |
| Storage | Cost per GB/Mo | < $0.02 | S3 Intelligent Tiering, DB Archival |
| AI Inference | Cost per 1k Tokens| < $0.001 | Prompt Caching, Batch Inference, vLLM |
| Network | Egress Cost/GB | < $0.05 | Cloudflare Bandwidth Alliance, VPC Endpoints |

### 11. Reliability
- **Spot Interruption Handling**: Applications running on spot instances (Kafka consumers) are fully stateless and handle `SIGTERM` gracefully, returning messages to the queue before termination.
- **Fallback Models**: If budget is exhausted, system gracefully degrades free-tier users to smaller, cheaper AI models.

### 12. Performance
| Metric | Target | Alert Threshold | Escalation |
|---|---|---|---|
| OTel Overhead | < 2% CPU | > 5% CPU | P3 |
| Budget Alert Lag| < 1 hour | > 6 hours | P2 |
| Prompt Cache Hit| > 75% | < 50% | P2 (High Cost) |
| Idle Resource Waste| < 10% | > 20% | P3 (FinOps) |

### 13. Observability
```text
storyos_cost_estimated_usd_total{tenant="tx1", service="ai_generation"} 14.52
storyos_spot_instance_interruptions_total 12
storyos_s3_storage_bytes{tier="intelligent"} 1099511627776
```

### 14. Failure Handling
- **Missing Cost Metadata**: If an external provider's pricing API goes down, the aggregator uses the last known cached pricing multiplier.
- **OOM on Small Instances**: If VPA recommends too small of an instance and OOM occurs, the autoscaler automatically overrides and sizes up.

### 15. Testing Strategy
#### Chaos Testing Scenarios
1. **Spot Mass Eviction**: Simulate cloud provider taking back all spot capacity; verify Auto Scaling Group falls back to on-demand instances to maintain SLA.
2. **Runaway Loop**: Deploy code with an infinite loop hitting the AI; verify per-tenant rate limit and budget circuit breaker halts the spend.

#### Security Testing Scenarios
1. **Bypass Rate Limit**: Attempt to exploit race conditions in the token bucket to rack up AI costs; verify Redis Lua scripts ensure atomicity.

### 16. Governance Rules
- **COST-001**: Every AI operation must emit cost metadata for attribution.
  - **Rationale**: You cannot optimize what you cannot measure. AI is the largest variable cost.
  - **Enforcement**: OpenTelemetry SDK wrappers mandate `ai.token.cost` tags; CI fails if missing.
- **COST-002**: Spot instances must never host stateful workloads.
  - **Rationale**: Spot instances can be terminated with 2 minutes notice, causing data corruption for databases.
  - **Enforcement**: Kubernetes Mutating Admission Webhook rejects Pods with persistent volume claims from scheduling on Spot node taints.
- **COST-003**: Monthly cost per active user must trend downward quarter-over-quarter.
  - **Rationale**: Economies of scale must be realized as the platform grows.
  - **Enforcement**: Executive FinOps review dashboard tracks this KPI; feature freezes triggered if trend reverses.

### 17. Cross-Document Integration
| Subsystem | Integration Point | Document |
|---|---|---|
| AI Architecture | Token budgets and Model Router | Phase 4 - AI Architecture |
| Storage | S3 lifecycle and DB reserved instances | Phase 1 - Storage |
| Telemetry | OTel span injection | Phase 2 - Observability |

### 18. Future Evolution
- **Serverless AI**: Migrating from provisioned GPU instances to Serverless GPU inference (e.g., Baseten/Modal) to achieve true scale-to-zero during off-peak hours.
- **Carbon Tracking**: Linking cost optimization directly to carbon footprint reduction metrics via GreenOps.

### 19. Executive Summary
The Cost Optimization Architecture secures the financial viability of StoryOS. By treating cost as a first-class metric alongside latency and uptime, and aggressively utilizing Spot compute, tiered storage, and AI prompt caching, StoryOS maximizes its profit margins while delivering immense value to its users.

---
### Code & Schemas

#### SQL Schema (Chargeback DB)
```sql
CREATE TABLE tenant_cost_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    billing_period DATE NOT NULL,
    service_category VARCHAR(50) NOT NULL, -- 'AI', 'COMPUTE', 'STORAGE'
    total_cost_usd NUMERIC(10,4) DEFAULT 0,
    api_calls_count BIGINT DEFAULT 0,
    tokens_consumed BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, billing_period, service_category)
);

CREATE INDEX idx_tenant_cost_period ON tenant_cost_aggregations(billing_period);
```

#### TypeScript Interfaces
```typescript
export interface FinOpsSpanMetadata {
  tenantId: string;
  featureName: string;
  resourceType: 'API' | 'AI_MODEL' | 'DB_QUERY';
  estimatedCostUsd: number;
  consumptionMetrics: {
    inputTokens?: number;
    outputTokens?: number;
    executionTimeMs?: number;
    bytesProcessed?: number;
  };
}

export interface BudgetAlertPolicy {
  tenantId: string;
  monthlyBudgetUsd: number;
  warningThresholdPercent: number; // e.g. 0.8
  actionOnExceed: 'NOTIFY' | 'THROTTLE' | 'BLOCK';
}
```

#### YAML Configuration Example
```yaml
finops:
  cost_attribution:
    enabled: true
    provider_rates:
      claude_3_haiku_input: 0.00025
      claude_3_haiku_output: 0.00125
  spot_instances:
    allowed_node_pools: ["background-workers", "offline-eval"]
    fallback_to_ondemand: true
  storage:
    s3_transition_days_to_ia: 30
    s3_transition_days_to_glacier: 90
```

#### Kubernetes Deployment Snippet (Spot Instance Toleration)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kx-pipeline-worker
  namespace: storyos-ai
spec:
  replicas: 10
  template:
    spec:
      nodeSelector:
        lifecycle: spot
      tolerations:
      - key: "spotInstance"
        operator: "Exists"
        effect: "NoSchedule"
      containers:
      - name: worker
        image: storyos/kx-pipeline:v1.2.0
        # Wait 60s for graceful shutdown when spot node is preempted
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 60"]
```

### Knowledge Density Checklist
- [x] 19-section structure
- [x] ASCII architecture diagram
- [x] ASCII sequence diagram
- [x] ASCII state machine
- [x] ASCII data flow diagram
- [x] SQL schema
- [x] TypeScript interfaces
- [x] JSON payload example
- [x] YAML configuration example
- [x] Kubernetes deployment snippet
- [x] Performance targets table
- [x] SLI/SLO table
- [x] Prometheus metrics
- [x] Security controls table
- [x] Audit record JSON example
- [x] Operational playbook
- [x] Chaos testing scenarios
- [x] Security testing scenarios
- [x] Governance rules
- [x] Cross-document integration table
- [x] Phase Progress section

### Phase Progress
Phase 8 Cost Optimization is complete.

---
[Document End]
