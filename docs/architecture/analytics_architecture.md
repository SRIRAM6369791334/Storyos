# Task 7.1 — Analytics Architecture

## 1. Preface
This document details the Analytics Architecture for StoryOS, separating OLAP workloads from OLTP, ensuring high-performance insights for creators and product teams without impacting core story editing.

## 2. Executive Overview
StoryOS streams events via Kafka into Flink for real-time processing, landing in ClickHouse (OLAP) using a dimensional star schema. This powers in-app dashboards and internal BI.

## 3. Enterprise Objectives
- Zero performance impact on OLTP databases.
- Sub-second analytical query latency for user dashboards.
- Strict GDPR compliance for analytical data.

## 4. Architecture Overview
```ascii
┌────────────────────────────────────────────────────────┐
│                 Analytics Pipeline                     │
├────────────────────────────────────────────────────────┤
│ [App SDK] ──► [Kafka] ──► [Flink] ──► [ClickHouse]     │
│                              │             │           │
│                         [S3 Data Lake]  [Grafana/Dash] │
└────────────────────────────────────────────────────────┘
```

## 5. Core Components
- **Kafka**: Event ingestion.
- **Flink**: Stream aggregation (hourly/daily rollups).
- **ClickHouse**: Fast columnar OLAP datastore.
- **Grafana/Mixpanel**: Visualization layers.

## 6. Internal Architecture
```ascii
[Raw Events] ──► [Filter/Cleanse] ──► [Aggregations] ──► [Serving Layer]
```

## 7. Data Flow
```ascii
Client       Kafka        Flink       ClickHouse    Dashboard
 │             │            │             │             │
 ├─ ViewEvent─►│            │             │             │
 │             ├─ Consume ─►│             │             │
 │             │            ├─ Aggregate ─►             │
 │             │            │             │◄─ Query ────┤
```

## 8. Runtime Lifecycle
```ascii
[Event State]
(RAW) ──► (VALIDATED) ──► (ENRICHED) ──► (AGGREGATED) ──► (ARCHIVED)
```

## 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| PII Removal | Regex/Hashing in Flink pipeline | Flink Job |
| Tenant Isolation | Mandatory `tenant_id` predicate | Query Proxy |

## 10. Scalability
ClickHouse clustered deployment handles trillions of rows with linear scaling.

## 11. Reliability
Exactly-once processing guarantees from Kafka to ClickHouse via Flink checkpoints.

## 12. Performance
| Metric | P50 | P95 | P99 |
|---|---|---|---|
| Ingestion Latency | 1s | 2s | 5s |
| Dashboard Query | 100ms | 300ms | 800ms |

## 13. Observability
| SLI | SLO | Alert Threshold | Escalation |
|---|---|---|---|
| Pipeline Lag | < 1m | > 5m | SRE P2 |
| Query Latency | < 500ms | > 1s | Data Eng P2 |

**Prometheus Metrics:**
```promql
flink_taskmanager_job_task_operator_KafkaConsumer_records_lag_max
clickhouse_query_duration_ms
```

## 14. Failure Handling
- **ClickHouse Down**: Flink applies backpressure, Kafka buffers.
- **Data Corruption**: Replay from Kafka/S3 via Flink state rewind.

## 15. Testing Strategy
- **Chaos Testing**: 
  1. Restart Flink TaskManagers.
  2. Kill a ClickHouse node.
- **Security Testing**: 
  1. Submit PII in event payload, verify redaction.

## 16. Governance Rules
- **ANALYTICS-001**: Analytics events must never contain raw PII. (Rationale: GDPR compliance. Enforcement: Flink validation layer).
- **ANALYTICS-002**: Analytics must not affect OLTP. (Rationale: System stability. Enforcement: Complete physical separation).
- **ANALYTICS-003**: Queries must include tenant isolation predicate. (Rationale: Data security. Enforcement: API Proxy middleware).

## 17. Cross-Document Integration
| Component | Integration Point | Phase |
|---|---|---|
| Core App | App publishes events | Phase 3 |

## 18. Future Evolution
- Real-time ML model feature hydration from Flink.

## 19. Executive Summary
The Analytics Architecture delivers actionable, real-time insights securely, providing deep visibility into user behavior and application performance without compromising operational stability.

---
### Technical Artifacts

**SQL Schema (ClickHouse):**
```sql
CREATE TABLE fact_story_interactions (
    event_id UUID,
    tenant_id UUID,
    user_id UUID,
    story_id UUID,
    event_type String,
    word_count Int32,
    timestamp DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, story_id, timestamp);
```

**TypeScript Interfaces:**
```typescript
export interface AnalyticsEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  eventType: 'STORY_VIEW' | 'AI_GENERATE' | 'PUBLISH';
  metadata: Record<string, any>;
  timestamp: Date;
}
```

**JSON Payload Example:**
```json
{
  "eventId": "uuid-1234",
  "tenantId": "tenant-01",
  "eventType": "AI_GENERATE",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

**YAML Configuration:**
```yaml
flink:
  job:
    name: analytics-aggregator
    parallelism: 4
    checkpoint_interval: 60000
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: clickhouse
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: clickhouse
        image: clickhouse/clickhouse-server:latest
```

**Audit Record JSON Example:**
```json
{
  "eventId": "evt_analytics_1",
  "action": "PII_REDACTED",
  "resourceType": "EventStream",
  "outcome": "SUCCESS"
}
```

**Operational Playbook:**
1. If Kafka lag spikes, increase Flink parallelism.
2. If ClickHouse query is slow, check `ORDER BY` index usage.

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
Phase 7 (Analytics) - COMPLETE.

Document End
