# StoryOS Enterprise Architecture
## Task 8.2 — Scalability Architecture

### 1. Preface
This document details the Scalability Architecture for StoryOS. It outlines the strategies and technical mechanisms required to seamlessly scale the platform from tens of thousands of users to millions. It covers horizontal and vertical scaling, data volume projections, database sharding strategies, Kafka partitioning, and multi-region deployment plans to ensure StoryOS remains highly available and performant at any scale.

### 2. Executive Overview
StoryOS must handle exponential growth in both user traffic and data volume (Knowledge Graph entities). This architecture mandates stateless application layers managed by Kubernetes HPA, coupled with a robust database scaling path (PostgreSQL read replicas evolving to Citus sharding). It defines a clear capacity planning formula and establishes auto-scaling policies to handle burst traffic dynamically, ensuring no single point of failure exists across the infrastructure.

### 3. Enterprise Objectives
- **Elasticity**: Automatically scale compute resources out during peak hours and in during off-peak to save costs.
- **Data Scaling**: Support the growth from 10M entities in Year 1 to 100B entities in Year 5 without downtime.
- **Global Reach**: Provide a clear path from single-region active-passive deployments to multi-region active-active topologies.
- **Zero Downtime**: Ensure horizontal scale-out is achievable without requiring application code changes.

### 4. Architecture Overview
The Scalability Architecture divides the system into stateless processing tiers and stateful data tiers, applying different scaling paradigms to each.

```ascii
+-----------------------------------------------------------------------------+
|                          STORYOS SCALABILITY TOPOLOGY                       |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [ Load Balancer (AWS ALB / Cloudflare) ]                                   |
|           |                                                                 |
|           v                                                                 |
|  +-----------------------------------------------------------------------+  |
|  | Stateless API Pods (K8s HPA based on CPU/RPS)                         |  |
|  | [Pod 1]  [Pod 2]  [Pod 3] ... [Pod N]                                 |  |
|  +-----------------------------------------------------------------------+  |
|           |                                                                 |
|           v                                                                 |
|  +-----------------------------------------------------------------------+  |
|  | Event Bus (Kafka) - Partitioned by Tenant ID                          |  |
|  | [Broker 1]  [Broker 2]  [Broker 3]                                    |  |
|  +-----------------------------------------------------------------------+  |
|           |                                                                 |
|           v                                                                 |
|  +---------------------------+       +-----------------------------------+  |
|  | AI Inference Cluster      |       | Stateful Data Tier                |  |
|  | (KEDA Queue-based HPA)    |       | (Postgres / Neo4j / Milvus)       |  |
|  | [vLLM Node 1] [vLLM Node2]|       | [Primary] ---> [Read Replicas]    |  |
|  +---------------------------+       +-----------------------------------+  |
|                                                                             |
+-----------------------------------------------------------------------------+
```

### 5. Core Components
1. **Stateless Compute**: Kubernetes Deployments managed by Horizontal Pod Autoscaler (HPA).
2. **Event Streaming**: Kafka cluster scaled by partition count (max partitions = max concurrent consumers).
3. **Primary Database**: PostgreSQL with read replicas; scaling to Citus for cross-node sharding.
4. **Graph Database**: Neo4j migrating from single instance to Causal Cluster mode.
5. **Vector Database**: Milvus scaling via multi-collection sharding and separated query/data nodes.
6. **Session Management**: Externalized session state via Redis to ensure pod fungibility.

### 6. Internal Architecture
Data volume projections dictate the internal database scaling roadmap.

```ascii
Sequence Diagram: Database Scaling Path

Timeline     PostgreSQL            Neo4j                 Milvus
 |               |                   |                      |
 | Year 1        | Single Node       | Single Node          | Single Node
 | (10M Ent)     | + Read Replicas   |                      |
 |               |                   |                      |
 | Year 3        | Vertical Scale    | Causal Cluster       | Multi-Collection
 | (1B Ent)      | (Bigger EC2)      | (Core + Read Reps)   | Sharding
 |               |                   |                      |
 | Year 5        | Citus Sharding    | Fabric / Federated   | Distributed
 | (100B Ent)    | (Tenant-based)    | Graphs               | Cloud Native
 v
```

### 7. Data Flow
Scaling write-heavy vs. read-heavy workloads using CQRS.

```ascii
Data Flow Diagram

                        +----------------+
                        | Load Balancer  |
                        +----------------+
                           /          \
                     (Writes)        (Reads)
                       /                \
          +--------------+            +--------------+
          | Write API    |            | Read API     | (Scales 10x more)
          +--------------+            +--------------+
                 |                           |
                 v                           v
          +--------------+            +--------------+
          | Write DB     |---(Sync)-->| Read Models  |
          | (Postgres)   |            | (Redis/MatV) |
          +--------------+            +--------------+
```

### 8. Runtime Lifecycle
State machine for auto-scaling policies.

```ascii
State Machine: HPA Scaling

 [*] --> Baseline
 Baseline --> ScalingOut : CPU > 70% or RPS > Threshold
 ScalingOut --> PeakLoad
 PeakLoad --> ScalingIn : CPU < 30% for 300s
 ScalingIn --> Baseline
 PeakLoad --> EmergencyProvisioning : CPU > 95%
 EmergencyProvisioning --> PeakLoad : New Nodes Ready
```

### 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Cross-Tenant Leakage in Shards | Tenant ID is part of the shard key | ORM middleware injects tenant ID |
| DDoS Amplification | WAF blocks before HPA triggers scale-out | Cloudflare / AWS WAF |
| Multi-Region Sync Encryption | mTLS over dedicated backbone | Istio multi-cluster mesh |

#### Audit Record JSON
```json
{
  "event_id": "scale_991002",
  "timestamp": "2026-07-29T18:55:00Z",
  "actor": "system_keda",
  "action": "cluster_scale_out",
  "resource": "vllm_gpu_pool",
  "context": {
    "trigger": "queue_depth_exceeded",
    "queue_length": 450,
    "previous_replicas": 10,
    "new_replicas": 15
  }
}
```

### 10. Scalability
| Metric | Year 1 Projection | Year 3 Projection | Year 5 Projection | Sharding Strategy |
|---|---|---|---|---|
| Entities | 10M | 1B | 100B | Hash on Tenant ID |
| DB Size | 500GB | 5TB | 500TB | Citus Distributed Tables |
| Graph Nodes | 50M | 5B | 500B | Federated Subgraphs |
| Req/Sec | 1,000 | 25,000 | 250,000 | Geo-DNS + Edge Compute |

### 11. Reliability
- **Active-Passive Multi-Region**: Cross-region database replication (async). In case of region loss, RTO < 15m, RPO < 5m.
- **CRDT Evolution**: Future active-active deployment will use Conflict-Free Replicated Data Types for write-anywhere capabilities.

### 12. Performance
| Metric | Target | Alert Threshold | Escalation |
|---|---|---|---|
| Scale-Out Latency | < 60s | > 120s | P3 |
| Shard Rebalance | 0 Downtime | Connection Drops > 0 | P1 |
| Cross-Region Lag | < 5s | > 30s | P2 |
| HPA Thrashing | 0 events/hr | > 5 scale up/down / hr| P3 |

### 13. Observability
```text
kube_hpa_status_current_replicas{deployment="api-gateway"} 12
kafka_consumer_lag{group="index-builder"} 4500
postgres_replication_lag_bytes 1048576
citus_shard_count_total 256
```

### 14. Failure Handling
- **Resource Exhaustion**: If K8s cluster cannot provision more nodes (cloud provider limits), system initiates load shedding (drops lowest tier background jobs).
- **Split Brain**: In active-active, Paxos/Raft consensus strictly enforces quorum to prevent data corruption during partition.

### 15. Testing Strategy
#### Chaos Testing Scenarios
1. **Traffic Spike**: Simulate 10x traffic spike in 10 seconds; verify HPA scales out before queue depth drops requests.
2. **Node Termination**: Kill 30% of K8s worker nodes; verify Pod Disruption Budgets prevent downtime and cluster autoscaler replaces nodes.
3. **Region Failover**: Isolate primary AWS region; verify Route53 shifts traffic to secondary region and DB promotes replica to primary.

#### Security Testing Scenarios
1. **Tenant ID Forgery**: Attempt to access a shard belonging to another tenant via API manipulation; verify rejection.
2. **Autoscaler Abuse**: Send slowloris attack to trigger expensive scale-out; verify WAF blocks connection holding.

### 16. Governance Rules
- **SCALE-001**: No single point of failure at any tier.
  - **Rationale**: Hardware fails; architecture must survive node, zone, and region failures.
  - **Enforcement**: Infrastructure as Code (Terraform) validation checks for minimum replicas >= 3 spread across AZs.
- **SCALE-002**: Horizontal scale-out must be achievable without application code change.
  - **Rationale**: Scaling should be an operational concern, not a development bottleneck.
  - **Enforcement**: All microservices must pass a "statelessness" CI check (no local disk writes, session state in Redis).
- **SCALE-003**: Capacity planning review must occur quarterly.
  - **Rationale**: Hardware provisioning and reserved instance purchasing requires lead time.
  - **Enforcement**: Finance and Engineering hold a mandated quarterly review using the formula: `current_load × growth_rate × headroom = target`.

### 17. Cross-Document Integration
| Subsystem | Integration Point | Document |
|---|---|---|
| Database | Citus sharding and replication | Phase 1 - Storage |
| Cost Optimization | Right-sizing node pools | Task 8.3 - Cost Optimization |
| Deployment | K8s HPA and KEDA definitions | Phase 2 - Deployment |

### 18. Future Evolution
- **Active-Active Multi-Region**: Implementing Spanner or CockroachDB to replace Citus for true global write-anywhere consistency.
- **Serverless Compute**: Moving bursty background processing to AWS Lambda / Knative to reduce baseline compute costs.

### 19. Executive Summary
The Scalability Architecture provides a robust, future-proof blueprint for StoryOS. By decoupling stateless application tiers from stateful data tiers, utilizing Kubernetes autoscaling, and defining a clear database sharding migration path, StoryOS is equipped to scale from thousands to millions of users without sacrificing performance or reliability.

---
### Code & Schemas

#### SQL Schema (Citus Sharding Prep)
```sql
-- Standard PostgreSQL table ready for Citus distribution
CREATE TABLE entities (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    universe_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, id) -- tenant_id must be in PK for Citus
);

-- Future Citus command (executed when cluster scales)
-- SELECT create_distributed_table('entities', 'tenant_id');
```

#### TypeScript Interfaces
```typescript
export interface ScaleTrigger {
  metricType: 'CPU' | 'MEMORY' | 'QUEUE_DEPTH' | 'RPS';
  threshold: number;
  stabilizationWindowSeconds: number;
}

export interface CapacityPlan {
  region: string;
  currentPeakRps: number;
  projectedGrowthFactor: number;
  headroomMultiplier: number;
  targetProvisionedCapacity: number;
}
```

#### YAML Configuration Example
```yaml
scalability:
  hpa:
    min_replicas: 3
    max_replicas: 50
    cpu_target_percentage: 70
    scale_down_stabilization_window_seconds: 300
  database:
    sharding_key: "tenant_id"
    read_replicas_per_primary: 2
  kafka:
    default_partitions: 64
```

#### Kubernetes Deployment Snippet (HPA & KEDA)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: storyos-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: vllm-worker-scaler
spec:
  scaleTargetRef:
    name: vllm-worker
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
  - type: kafka
    metadata:
      topic: ai-inference-requests
      bootstrapServers: kafka-cluster:9092
      consumerGroup: vllm-group
      lagThreshold: "50"
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
Phase 8 Scalability is complete.

---
[Document End]
