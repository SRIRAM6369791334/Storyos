# Task 6.8 — Backup & Disaster Recovery Architecture

## 1. Preface
This document outlines the Backup and Disaster Recovery (BDR) strategy for StoryOS, ensuring data durability, rapid recovery, and continuous operations across all storage tiers.

## 2. Executive Overview
StoryOS uses continuous WAL archiving for PostgreSQL, snapshotting for vector and graph databases, and multi-region S3 replication, achieving a database RPO of 5 minutes and RTO of 1 hour.

## 3. Enterprise Objectives
- Guarantee zero data loss beyond the defined RPO.
- Provide automated point-in-time recovery (PITR).
- Ensure backups are isolated and tamper-proof.
- Adhere to BDR governance rules.

## 4. Architecture Overview
```ascii
┌────────────────────────────────────────────────────────┐
│                   Production Environment (us-east-1)   │
├────────────────────────────────────────────────────────┤
│ [PostgreSQL] ──(WAL)──► [Barman] ──► [S3 Primary]      │
│ [Neo4j] ──(Dumps)──────► [Cron] ───► [S3 Primary]      │
│ [Milvus] ──(Snaps)─────► [Cron] ───► [S3 Primary]      │
└───────────────────────────┬────────────────────────────┘
                            │ (Cross-Region Replication)
┌───────────────────────────▼────────────────────────────┐
│                   DR Environment (eu-west-1)           │
├────────────────────────────────────────────────────────┤
│                      [S3 DR Replica]                   │
└────────────────────────────────────────────────────────┘
```

## 5. Core Components
- **Barman**: Continuous WAL archiver for PostgreSQL.
- **S3 Object Lock**: WORM (Write Once Read Many) storage for backups.
- **KMS**: Manages backup encryption keys.
- **DR Controller**: Automated failover scripts.

## 6. Internal Architecture
```ascii
[DB Primary] ──► [WAL Archive] ──► [Backup Storage (S3)]
       │                                  │
       └─► [Standby Replica]              └─► [DR Restore Test Pipeline]
```

## 7. Data Flow
```ascii
Transaction      WAL Gen       Archive      Replicate     Verify
 │                  │             │             │           │
 ├─ Write ─────────►│             │             │           │
 │                  ├─ Push ─────►│             │           │
 │                  │             ├─ Copy ─────►│           │
 │                  │             │             ├─ Restore─►│
```

## 8. Runtime Lifecycle
```ascii
[Backup State Machine]
(INIT) ──► (STREAMING) ──► (ARCHIVED) ──► (VERIFIED) ──► (EXPIRED)
```

## 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Encryption at Rest | AES-256 via AWS KMS | S3 Bucket Policy |
| Tamper Protection | S3 Object Lock (Compliance Mode) | AWS IAM |
| Segregation of Duties | Backup keys stored in separate AWS account | IAM Orgs |

## 10. Scalability
S3 inherently scales. Barman configured with parallel workers for fast backup/restore of multi-TB databases.

## 11. Reliability
Cross-region replication provides 99.999999999% durability.

## 12. Performance
| Metric | Target | RPO | RTO |
|---|---|---|---|
| PostgreSQL | Continuous | 5 min | 1 hour |
| Neo4j | Daily | 24 hours | 2 hours |
| Redis (Cache) | Hourly | 1 hour | 5 min |

## 13. Observability
| SLI | SLO | Alert Threshold | Escalation |
|---|---|---|---|
| WAL Archival Lag | < 5m | > 10m | SRE P1 |
| Backup Success Rate| 100% | Any failure | SRE P2 |

**Prometheus Metrics:**
```promql
storyos_backup_wal_archive_lag_seconds
storyos_backup_job_status{job="pg_dump"}
```

## 14. Failure Handling
- **S3 Outage**: Spool WAL locally on DB nodes until S3 recovers.
- **Primary Region Down**: Initiate DR failover to eu-west-1 using replicated S3 data.

## 15. Testing Strategy
- **Chaos Testing**: 
  1. Block network access to S3 during WAL shipping.
  2. Delete a live data file to trigger emergency PITR.
- **Security Testing**: 
  1. Attempt to delete backups via compromised IAM role.
  2. Attempt to read backups without KMS decryption key.

## 16. Governance Rules
- **BDR-001**: All backups must be verified via automated restore test. (Rationale: Unverified backups are useless. Enforcement: CI/CD restore pipeline).
- **BDR-002**: Backup encryption keys must be stored separately. (Rationale: Compromise isolation. Enforcement: Multi-account AWS architecture).
- **BDR-003**: RTO/RPO SLAs must be tested quarterly. (Rationale: Compliance and readiness. Enforcement: Quarterly compliance audit).

## 17. Cross-Document Integration
| Component | Integration Point | Phase |
|---|---|---|
| Business Continuity | BDR enables the BC strategy | Phase 6 |

## 18. Future Evolution
- Cross-cloud (AWS to GCP) backup replication for ultra-high availability.

## 19. Executive Summary
The BDR architecture provides a resilient, automated, and tamper-proof foundation, guaranteeing data survival and rapid restoration in the event of catastrophic failures.

---
### Technical Artifacts

**SQL Schema:**
*(Not applicable for infrastructure backups, relying on system schemas)*

**TypeScript Interfaces:**
```typescript
export interface BackupJob {
  jobId: string;
  targetType: 'POSTGRES' | 'NEO4J' | 'MILVUS';
  status: 'RUNNING' | 'SUCCESS' | 'FAILED';
  bytesArchived: number;
  rpoAchieved: number;
  timestamp: Date;
}
```

**JSON Payload Example:**
```json
{
  "action": "TRIGGER_RESTORE",
  "targetTime": "2026-07-29T12:00:00Z",
  "environment": "dr-eu-west-1"
}
```

**YAML Configuration:**
```yaml
barman:
  server: storyos-pg-cluster
  backup_method: postgres
  archiver: on
  retention_policy: "RECOVERY WINDOW OF 35 DAYS"
```

**Kubernetes Deployment:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-neo4j-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: storyos/neo4j-backup:1.0
          restartPolicy: Never
```

**Audit Record JSON Example:**
```json
{
  "eventId": "evt_bdr_1",
  "action": "RESTORE_DR_DRILL",
  "actorId": "system",
  "outcome": "SUCCESS"
}
```

**Operational Playbook:**
1. Detect Primary Down.
2. Declare DR via Incident Commander.
3. Activate DR Scripts (`make deploy-dr`).
4. Restore DB from S3 (`barman recover ...`).
5. Verify data integrity.
6. Failover DNS.

### Knowledge Density Checklist
- [x] 19-section structure
- [x] ASCII architecture diagram
- [x] ASCII sequence diagram
- [x] ASCII state machine
- [x] ASCII data flow diagram
- [x] SQL schema (N/A justified)
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
Phase 6 (Backup & DR) - COMPLETE.

Document End
