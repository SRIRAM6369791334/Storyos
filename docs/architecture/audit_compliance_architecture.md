# Task 6.7 — Audit & Compliance Architecture

## 1. Preface
This document details the Audit and Compliance architecture for StoryOS, ensuring all system and user actions are immutably recorded, cryptographically verifiable, and compliant with SOC2, GDPR, ISO27001, and HIPAA.

## 2. Executive Overview
StoryOS utilizes a cryptographic audit chaining mechanism (SHA-256) stored in an append-only PostgreSQL partition, ensuring tamper-proof logging of all critical actions.

## 3. Enterprise Objectives
- Zero-tamper guarantee for all system logs.
- Automated compliance reporting.
- Seamless SIEM integration for enterprise clients.
- Adherence to AUDIT governance rules.

## 4. Architecture Overview
```ascii
┌────────────────────────────────────────────────────────┐
│                   StoryOS Audit Plane                  │
├────────────────────────────────────────────────────────┤
│  [App Services] ──► [Kafka Audit Topic]                │
│                            │                           │
│                      [Flink Stream]                    │
│                       │          │                     │
│          [PostgreSQL DB]        [Elasticsearch / SIEM] │
│          (Immutable Ledger)     (Real-time Analysis)   │
└────────────────────────────────────────────────────────┘
```

## 5. Core Components
- **Audit Logger SDK**: Injected into all services.
- **Kafka Topic**: High-throughput event buffer.
- **Hash Chain Worker**: Calculates rolling SHA-256 links.
- **Audit Query API**: GraphQL endpoint for compliance teams.

## 6. Internal Architecture
```ascii
[Event Source] ──► [Kafka] ──► [Hash Worker] ──► [PostgreSQL Partition]
                                     │
                                     └─► [S3 Cold Storage (90+ days)]
```

## 7. Data Flow
```ascii
Action      Service        Kafka        Worker        DB
 │             │             │            │           │
 ├─ Generate ─►│             │            │           │
 │             ├─ Publish ──►│            │           │
 │             │             ├─ Consume ─►│           │
 │             │             │            ├─ Chain ──►│
```

## 8. Runtime Lifecycle
```ascii
[State Machine]
(EMITTED) ──► (QUEUED) ──► (HASHED) ──► (COMMITTED) ──► (ARCHIVED)
```

## 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Immutability | DB Triggers blocking UPDATE/DELETE | PostgreSQL |
| Tamper Detection | Nightly SHA-256 verification | Cron Job |
| Access Control | RBAC on Audit GraphQL API | API Gateway |

## 10. Scalability
Kafka handles 100,000 events/sec. DB is partitioned by month.

## 11. Reliability
At-least-once delivery semantics from Kafka to DB.

## 12. Performance
| Metric | P50 | P95 | P99 | Throughput |
|---|---|---|---|---|
| Event Ingestion | 2ms | 5ms | 10ms | 100k EPS |
| Query Latency | 50ms | 150ms | 300ms | 1k QPS |

## 13. Observability
| SLI | SLO | Alert Threshold | Escalation |
|---|---|---|---|
| Hash Chain Integrity | 100% | Any failure | SRE P1 |
| Ingestion Lag | < 5s | > 30s | SRE P2 |

**Prometheus Metrics:**
```promql
rate(storyos_audit_events_ingested_total[5m])
storyos_audit_chain_verification_failures_total
```

## 14. Failure Handling
- **Kafka Down**: Local disk buffering via Filebeat.
- **DB Down**: Kafka retains events for 7 days.

## 15. Testing Strategy
- **Chaos Testing**: 
  1. Drop DB partition during active writes.
  2. Terminate Hash Worker randomly.
  3. Corrupt Kafka offset.
- **Security Testing**: 
  1. Direct DB connection attempt to `UPDATE` log.
  2. Replay same audit event.
  3. API traversal to view cross-tenant logs.

## 16. Governance Rules
- **AUDIT-001**: Every state mutation must emit audit event. (Rationale: Complete visibility. Enforcement: SDK middleware).
- **AUDIT-002**: Audit records are immutable. (Rationale: Compliance requirement. Enforcement: DB triggers & permissions).
- **AUDIT-003**: Audit chain verification must run daily. (Rationale: Tamper detection. Enforcement: ArgoCD cron).

## 17. Cross-Document Integration
| Component | Integration Point | Phase |
|---|---|---|
| BDR | Backups cover the audit ledger | Phase 6 |

## 18. Future Evolution
- Blockchain/DLT integration for public verifiable ledgers.

## 19. Executive Summary
The Audit & Compliance Architecture guarantees the integrity and non-repudiation of all actions within StoryOS, vital for enterprise trust and legal compliance.

---
### Technical Artifacts

**SQL Schema:**
```sql
CREATE TABLE audit_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    outcome VARCHAR(20),
    previous_hash VARCHAR(64) NOT NULL,
    current_hash VARCHAR(64) NOT NULL
) PARTITION BY RANGE (timestamp);
-- Indexes and partitions omitted for brevity
```

**TypeScript Interfaces:**
```typescript
export interface AuditEvent {
  eventId: string;
  tenantId: string;
  actorId: string;
  actorType: 'USER' | 'SYSTEM' | 'AI';
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: Date;
  ipAddress: string;
  outcome: 'SUCCESS' | 'FAILURE';
  previousHash: string;
  currentHash: string;
}
```

**JSON Payload Example:**
```json
{
  "query": "query { getAuditLogs(tenantId: \"xyz\", startDate: \"2026-01-01\") { eventId action } }"
}
```

**YAML Configuration:**
```yaml
audit:
  retention:
    hot: 90d
    cold: 7y
  hashing:
    algorithm: SHA-256
```

**Kubernetes Deployment:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: audit-chain-verifier
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verifier
            image: storyos/audit-verifier:1.0.0
          restartPolicy: OnFailure
```

**Audit Record JSON Example:**
```json
{
  "eventId": "evt_112233",
  "actorId": "usr_999",
  "action": "DOCUMENT_DELETED",
  "previousHash": "abc123def456",
  "currentHash": "def456abc123"
}
```

**Operational Playbook:**
1. If `storyos_audit_chain_verification_failures_total` > 0, page Security on-call immediately.
2. Isolate DB access.
3. Investigate `previous_hash` mismatches in DB.

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
Phase 6 (Audit & Compliance) - COMPLETE.

Document End
