# Storage Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.6 — Storage Architecture
> **Depends On:** `entity_architecture.md`, `metadata_architecture.md`, `relationship_architecture.md`, `knowledge_graph_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/versioning_architecture.md` — Task 1.7

---

## Preface

Every architecture document written before this one has defined what exists in StoryOS — entities, metadata, relationships, and knowledge graphs. This document defines where everything lives.

Storage architecture is not database design. It does not select vendors, write schemas, or define tables. It defines the **logical storage model** — what category of store is appropriate for each category of data, how data flows between stores, how consistency is maintained across store boundaries, and how the storage layer is governed to meet the platform's performance, security, durability, and compliance obligations.

> **Central architectural truth:** StoryOS uses multiple purpose-built storage systems — each optimized for its specific workload. No single store handles all data. The storage layer is a federation of specialized systems governed by a unified policy model.

This decision traces directly to the Data Architecture (Task 1.1), which classified all platform data into nine categories. Each data category now maps to a storage type optimized for its access pattern, durability requirement, and sensitivity level.

---

## Part I — Storage Principles

### 1.1 Storage Philosophy

StoryOS adopts a **polyglot persistence** storage model. Different data has different shapes, access patterns, and lifetime requirements. Forcing all data into a single storage paradigm produces systems that perform poorly for every workload and excel at none.

The storage layer is designed around three core insights:

**Insight 1 — Data shape determines store type.**
Story entities are structured records. The Knowledge Graph is a network of typed connections. AI embeddings are high-dimensional vectors. Audit records are append-only chains. Binary assets are blobs. Each shape has a natural home — a store optimized for that shape.

**Insight 2 — Access pattern determines store tier.**
Data accessed thousands of times per second needs cache-layer proximity. Data accessed once per month for compliance review needs cold archival. Optimizing every store for every access pattern wastes resources and produces complexity. Tier assignment is deliberate.

**Insight 3 — Write characteristics determine consistency model.**
Some data must be written transactionally (entity creation with its first version record). Some data tolerates eventual consistency (search index updates, graph sync). Some data must be append-only and immutable forever (audit records, version records). The storage architecture respects these differences rather than forcing a single consistency model on all writes.

---

### 1.2 Storage Design Goals

| Goal | Description |
|---|---|
| **SG-01 Purpose-Built Stores** | Each store type is selected for the specific characteristics of the data it holds |
| **SG-02 Data Classification Alignment** | Every data classification from `data_architecture.md` maps to exactly one primary store type |
| **SG-03 Universe Isolation** | Story Universe data is partitioned at the storage level, not filtered at query time |
| **SG-04 Immutability Where Required** | Audit and Version stores are structurally append-only; no delete path exists |
| **SG-05 Tiered Storage** | Hot, warm, and cold tiers reduce cost without sacrificing access when needed |
| **SG-06 Durability by Default** | Every write is durable before the write is acknowledged to the caller |
| **SG-07 Consistency Contracts** | Each store has a declared consistency model; callers know what to expect |
| **SG-08 Security Everywhere** | Encryption at rest and in transit; role-scoped access; full audit of storage operations |
| **SG-09 Vendor Independence** | Storage design is defined in logical terms; no specific cloud or on-premise product is mandated |
| **SG-10 Operational Observability** | Every store reports health, capacity, latency, and error rates to the monitoring layer |

---

### 1.3 Storage Rules

**Rule STR-001 — One Source of Truth Per Data Class**
Each data classification has exactly one authoritative store. Copies in other stores (cache, search index, graph sync) are derived and must be considered eventually consistent with the source.

**Rule STR-002 — Stores Do Not Communicate Directly**
No storage system reads from or writes to another storage system directly. All cross-store data flow goes through the Application or Domain Layer via domain events. Storage systems are never coupled.

**Rule STR-003 — Audit Store Is Never Queried by Normal Operations**
The Audit Store is a write-only operational concern. Application features do not query the Audit Store for runtime behavior. Compliance and security investigation tools access it separately.

**Rule STR-004 — Version Store Is Append-Only**
No update or delete operation is valid on the Version Store. Every write creates a new immutable record. Any system that attempts to update or delete a version record has a defect.

**Rule STR-005 — Cache Is Never the Source of Truth**
Cached data may be stale. Systems that require current state must read from the source store, not the cache. Cache serves read performance, not correctness.

**Rule STR-006 — Universe Data Is Partitioned at Storage Level**
Story Universe data isolation is enforced at the storage partition level. A partition contains data for exactly one Story Universe. Query-time filtering is not a substitute for partition-level isolation.

**Rule STR-007 — Sensitive Data Is Encrypted with Scoped Keys**
Sensitive data classifications (PII, Canon story data, AI reasoning outputs) are encrypted with scope-specific keys. Organization A's data cannot be decrypted with Organization B's keys under any circumstance.

**Rule STR-008 — Deleted Records Are Archived, Not Erased**
For all story and platform entities, deletion is modeled as an archive operation. The record is moved to a cold tier with access control, not physically erased. Physical erasure applies only to GDPR data subject erasure requests for personal data, subject to the defined anonymization protocol.

**Rule STR-009 — Storage Migrations Are Zero-Downtime**
Schema changes and data migrations that affect production storage are executed as online operations. No maintenance window is required for planned migrations.

**Rule STR-010 — Storage Capacity Is Monitored and Alerted**
Every store reports capacity utilization. Alerts fire at 70% (warning) and 85% (critical) of planned capacity. Capacity planning reviews occur quarterly.

---

### 1.4 Storage Lifecycle

```
DATA WRITE:
  Application Layer receives write request
      ↓
  Domain validates and processes
      ↓
  Source store receives write (durable, acknowledged)
      ↓
  Domain event emitted
      ↓
  Derived stores updated (eventually consistent):
      → Graph Store sync
      → Search Index update
      → Cache invalidation
      → Version record creation
      → Audit record appended

AGING:
  Data in hot tier (frequent access)
      ↓ [inactivity threshold crossed]
  Data moves to warm tier
      ↓ [retention threshold crossed or universe archived]
  Data moves to cold tier (archive)
      ↓ [retention period expired — applies to non-permanent data only]
  Data physically deleted (Temporary Store only)

PERMANENT DATA (Version Store, Audit Store):
  Written once → never modified → never deleted → retained indefinitely
  (or per legal minimum retention policy)
```

---

### 1.5 Storage Ownership

| Domain | Primary Storage Responsibility |
|---|---|
| **Entity Domain** | Entity Store — reads and writes for all entity aggregates |
| **Relationship Domain** | Entity Store (relationship records) + Graph Store (edge sync) |
| **Knowledge Graph Domain** | Graph Store — graph nodes, edges, projections |
| **Versioning Domain** | Version Store — all version records |
| **Audit Domain** | Audit Store — all audit records (write-only from all domains) |
| **AI Domain** | Vector Store (embeddings) + Graph Store (Memory Graph partition) |
| **Search Domain** | Search Index Store — manages all search indices |
| **Media Domain** | Object Store — all binary assets |
| **Session Domain** | Session Store — active user sessions |
| **Cache Domain** | Cache Store — manages hot read caches |
| **Configuration Domain** | Configuration Store — platform and universe configuration |
| **Storage Management** | StorageManager — cross-store policy, tiering, backup, health |

---

### 1.6 Storage Validation

**SV-001 — Write Must Succeed Before Acknowledgment**
Storage writes are synchronous and durable. A write is not acknowledged to the caller until it has been committed to the primary store. No write-and-forget for domain records.

**SV-002 — Derived Store Consistency Is Monitored**
The lag between source store write and derived store update (Graph Store, Search Index, Cache) is continuously measured. If lag exceeds the defined SLA, alerts are raised.

**SV-003 — Backup Integrity Is Verified**
Every backup operation produces a checksum. Backup restore procedures are tested on a defined schedule (quarterly). A backup that cannot be successfully restored is treated as no backup.

**SV-004 — Partition Integrity Is Continuously Verified**
A background process verifies that all records in Universe-partitioned stores belong to the declared universe partition. Misrouted records are a critical integrity alert.

**SV-005 — Capacity Projections Are Maintained**
Storage capacity growth is projected at 30-day, 90-day, and 1-year intervals. Projections are updated weekly. If projected growth would breach warning threshold within 90 days, capacity expansion is initiated.

---

### 1.7 Storage Security

**SS-001 — Encryption at Rest**
All stores use AES-256 encryption at rest. Encryption is applied at the storage layer — data is encrypted before being written to disk and decrypted only when read by an authorized caller.

**SS-002 — Encryption in Transit**
All data in transit between application components and storage systems uses TLS 1.3 minimum. Unencrypted storage connections are rejected.

**SS-003 — Key Management**
Encryption keys are managed by a dedicated Key Management Service (KMS). Keys are rotated on a defined schedule. Organization-scoped data uses Organization-scoped keys. Platform data uses Platform-scoped keys.

**SS-004 — Storage Access Is Role-Scoped**
Storage systems do not have open access. Each application service has a scoped credential that grants access only to the stores and partitions that service legitimately needs. Overly broad storage credentials are an architectural defect.

**SS-005 — Storage Operations Are Audited**
All storage-level administrative operations (backup, restore, migration, tier change, key rotation) are audited in the Audit Store with full actor attribution.

---

## Part II — Storage Model

### 2.1 StorageManager

**Purpose:** The central governance authority for all storage operations in StoryOS. The StorageManager does not participate in individual read/write operations — it governs policy, monitors health, manages lifecycle transitions, and coordinates cross-store operations.

**Responsibilities:**
- Enforce tiering policies (when data moves from hot → warm → cold)
- Coordinate backup and restore operations across all stores
- Monitor capacity and emit alerts
- Govern key rotation schedules
- Execute storage migrations
- Report storage health to the Platform Monitoring service

**Properties:**

| Property | Type | Description |
|---|---|---|
| `managerId` | `ManagerId` | Singleton per deployment |
| `registeredStores` | `StorageProvider[]` | All registered storage systems |
| `activePolicy` | `StoragePolicyId` | The active storage policy governing behavior |
| `healthStatus` | `SystemHealthStatus` | Aggregate health across all stores |
| `lastHealthCheckAt` | `Timestamp` | When last health check ran |
| `alertThresholds` | `AlertThresholdSet` | Capacity, latency, and error rate thresholds |

---

### 2.2 StorageProvider

**Purpose:** An abstraction representing a single logical storage system — one Entity Store instance, one Graph Store instance, etc. Each StorageProvider is registered with the StorageManager.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `providerId` | `ProviderId` | Unique identifier |
| `providerType` | `StoreType` | ENTITY / GRAPH / OBJECT / VECTOR / AUDIT / VERSION / CACHE / SEARCH / METADATA / SESSION / CONFIG / TEMP |
| `status` | `ProviderStatus` | ACTIVE / DEGRADED / OFFLINE / MAINTENANCE |
| `tier` | `StorageTier` | HOT / WARM / COLD |
| `capacityBytes` | `Long` | Total allocated capacity |
| `usedBytes` | `Long` | Current usage |
| `latencyP99Ms` | `Integer` | 99th percentile read/write latency (derived) |
| `errorRate` | `Decimal` | Current error rate (derived) |
| `partitions` | `StoragePartition[]` | Universe and system partitions within this provider |
| `encryptionKeyId` | `KeyId` | Active encryption key |
| `replicationFactor` | `Integer` | How many replicas are maintained |

---

### 2.3 StoragePolicy

**Purpose:** The declarative specification of how data is managed over its lifetime — tiering schedules, backup frequency, retention duration, compression settings, and access controls.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `policyId` | `PolicyId` | Immutable |
| `name` | `PolicyName` | e.g., `ENTITY_STANDARD`, `AUDIT_PERMANENT`, `TEMP_EPHEMERAL` |
| `appliesTo` | `StoreType[]` | Which store types this policy governs |
| `retentionDays` | `Integer?` | Days to retain before eligible for deletion (null = permanent) |
| `hotTierDays` | `Integer` | Days data stays in hot tier before warm transition |
| `warmTierDays` | `Integer` | Days data stays in warm tier before cold transition |
| `backupFrequency` | `BackupFrequency` | HOURLY / DAILY / WEEKLY / MONTHLY / NEVER |
| `backupRetentionDays` | `Integer` | How long backup copies are retained |
| `compressionEnabled` | `Boolean` | Whether compression is applied in warm/cold tiers |
| `encryptionRequired` | `Boolean` | Whether encryption is mandatory (always true for sensitive data) |
| `immutable` | `Boolean` | Whether records are append-only (true for Audit and Version stores) |

---

### 2.4 StorageObject

**Purpose:** The abstract representation of a single persisted item within a store. A StorageObject is the unit of storage — a single entity record, a single graph node, a single version record, etc.

**Universal properties on every StorageObject:**

| Property | Type | Description |
|---|---|---|
| `objectId` | `StorageObjectId` | Storage-layer unique identifier (separate from domain entity ID) |
| `domainId` | `EntityId` | The domain entity this object represents |
| `domainType` | `EntityType` | Type of the domain entity |
| `universeId` | `UniverseId?` | Owning Story Universe (null for platform-level objects) |
| `organizationId` | `OrganizationId` | Owning organization |
| `storeType` | `StoreType` | Which type of store holds this object |
| `tier` | `StorageTier` | Current storage tier |
| `sizeBytes` | `Long` | Serialized object size |
| `checksum` | `Checksum` | Integrity verification hash |
| `encryptionKeyId` | `KeyId` | Key used to encrypt this object |
| `createdAt` | `Timestamp` | Immutable |
| `lastAccessedAt` | `Timestamp` | Updated on each read (for tiering decisions) |
| `version` | `Integer` | Internal storage version counter |

---

### 2.5 StoragePartition

**Purpose:** A logical subdivision within a StorageProvider that isolates data for a specific Story Universe, Organization, or system purpose. Partitions are the structural implementation of Universe isolation.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `partitionId` | `PartitionId` | Immutable |
| `providerId` | `ProviderId` | Parent storage provider |
| `partitionScope` | `PartitionScope` | UNIVERSE / ORGANIZATION / SYSTEM / AI_AGENT |
| `scopeId` | `ScopeId` | The Universe ID, Org ID, or System ID this partition belongs to |
| `status` | `PartitionStatus` | ACTIVE / ARCHIVED / MIGRATING |
| `sizeBytes` | `Long` | Current data size in this partition |
| `quotaBytes` | `Long?` | Optional quota ceiling |
| `encryptionKeyId` | `KeyId` | Partition-scoped encryption key |
| `createdAt` | `Timestamp` | Immutable |
| `archivedAt` | `Timestamp?` | When partition was archived (Universe archived) |

---

### 2.6 StorageTier

Three tiers govern the cost-performance tradeoff of storage across the platform:

| Tier | Name | Access Latency | Storage Cost | Retention | Use Case |
|---|---|---|---|---|---|
| `HOT` | Hot Tier | < 10ms P99 | High | Active period | Actively queried production data |
| `WARM` | Warm Tier | < 100ms P99 | Medium | Inactive period | Recently inactive data; infrequent access |
| `COLD` | Cold Tier | < 30s P99 | Low | Long-term or permanent | Archived universes; historical versions; audit logs |

**Tiering transitions:**
- HOT → WARM: triggered by `lastAccessedAt` exceeding `hotTierDays` threshold in the StoragePolicy
- WARM → COLD: triggered by `lastAccessedAt` exceeding `warmTierDays` threshold
- COLD → WARM: triggered by access request to cold-tier data (automatic rehydration with defined SLA)
- Audit Store and Version Store: always COLD (they are append-only, never rehydrated to HOT)

---

### 2.7 StorageNamespace

**Purpose:** A named logical grouping within a store that organizes related StorageObjects — equivalent to a directory, schema, or container, depending on the store technology. Namespaces structure large stores for operational clarity.

**Namespace hierarchy:**
```
StorageProvider
    └── StoragePartition (per Universe / Organization)
           └── StorageNamespace (per domain / data type)
                  └── StorageObject
```

**Naming convention:** `{organization_id}/{universe_id}/{domain}/{object_type}`

Example: `org_acme/uni_starwars_reimagined/characters/character`

---

### 2.8 StorageReference

**Purpose:** A lightweight pointer from one domain object to a stored binary or large object, avoiding the embedding of large data in structured entity records.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `referenceId` | `ReferenceId` | Immutable |
| `storeType` | `StoreType` | Which store holds the referenced object |
| `objectKey` | `ObjectKey` | The key within the store |
| `mimeType` | `MimeType` | Content type of the stored object |
| `sizeBytes` | `Long` | Size of the stored object |
| `checksum` | `Checksum` | Integrity hash |
| `uploadedAt` | `Timestamp` | Immutable |
| `expiresAt` | `Timestamp?` | For temporary objects; null for permanent |

---

### 2.9 StorageMetadata

**Purpose:** System-level metadata attached to StorageObjects for operational management — distinct from domain-level entity metadata defined in the Metadata Architecture.

**StorageMetadata fields:**
- `contentClass` — data classification from Data Architecture (`[C] Canon`, `[S] Structural`, etc.)
- `sensitivityLevel` — 1 (public) through 4 (restricted)
- `lastVerifiedAt` — when integrity check last passed
- `migrationStatus` — whether this object is involved in an active migration
- `archiveReason` — why this object was moved to COLD tier
- `legalHoldActive` — whether this object is subject to a legal hold (cannot be deleted)

---

### 2.10 StorageSnapshot

**Purpose:** A point-in-time consistent capture of all data within a StoragePartition (one Story Universe) across all stores. Used for disaster recovery, Universe cloning, and historical investigation.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `snapshotId` | `StorageSnapshotId` | Immutable |
| `universeId` | `UniverseId` | The Universe captured |
| `label` | `SnapshotLabel?` | Human-readable label |
| `triggeredBy` | `SnapshotTrigger` | MANUAL / SCHEDULED / BRANCH / PRE_MIGRATION / ARCHIVE |
| `storesCaptured` | `StoreType[]` | Which stores were included |
| `totalSizeBytes` | `Long` | Total captured data size |
| `integrityHash` | `Hash` | Cryptographic hash of complete snapshot |
| `createdAt` | `Timestamp` | Immutable |
| `restorable` | `Boolean` | Whether this snapshot has been verified as restorable |
| `lastVerifiedAt` | `Timestamp?` | When restore verification was last run |
| `storageRef` | `StorageReference` | Where snapshot data is stored |

---

### 2.11 StorageStatistics

**Purpose:** Periodically computed aggregate metrics about storage utilization, performance, and health — used for dashboards, capacity planning, and alerting.

| Metric | Description | Refresh |
|---|---|---|
| `totalCapacityBytes` | Sum across all providers | Hourly |
| `usedBytes` | Total used across all providers | Hourly |
| `utilizationPercent` | usedBytes / totalCapacityBytes | Hourly |
| `hotTierBytes` | Data in HOT tier | Hourly |
| `warmTierBytes` | Data in WARM tier | Hourly |
| `coldTierBytes` | Data in COLD tier | Hourly |
| `writeOpsPerSecond` | Current write throughput | Real-time |
| `readOpsPerSecond` | Current read throughput | Real-time |
| `avgWriteLatencyMs` | Moving average write latency | Real-time |
| `avgReadLatencyMs` | Moving average read latency | Real-time |
| `errorRatePercent` | Storage error rate | Real-time |
| `backupsCompleted24h` | Successful backups in last 24h | Daily |
| `backupsFailed24h` | Failed backups in last 24h | Daily |
| `largestPartitionBytes` | Largest single Universe partition | Daily |
| `growthRateBytesPer30d` | Projected 30-day growth | Weekly |

---

### 2.12 StorageHealth

**Purpose:** A composite assessment of the health of each StorageProvider and the overall storage layer.

**Health States:**

| State | Meaning | Action Required |
|---|---|---|
| `HEALTHY` | All metrics within normal range | None |
| `DEGRADED` | One or more metrics approaching threshold | Monitoring |
| `WARNING` | Threshold breached (e.g., capacity > 70%) | Investigation |
| `CRITICAL` | Serious condition (capacity > 85%, high error rate) | Immediate action |
| `OFFLINE` | Store is unreachable | Incident response |

---

## Part III — Storage Types

### 3.1 Entity Store

**Purpose:** The primary structured data store for all entity aggregates — Characters, Locations, Factions, Events, Timelines, Relationships, NarrativeUnits, Items, Organizations, UserAccounts, WorkflowInstances, Plugins, and all their child entities.

**Data classification held:** `[C] Canon`, `[S] Structural`, `[V] Versioned`, `[U] User`

**Access pattern:** High read frequency, moderate write frequency. Reads dominate. Writes are transactional (entity create/update with associated version record creation).

**Consistency model:** Strong consistency required. A write is only acknowledged after durably committed. Reads always return the latest committed state.

**Partitioning:** Partitioned by `universeId` for story entities; by `organizationId` for platform entities (Organizations, UserAccounts).

**Tiering:**
- HOT: all ACTIVE and CANON entities (continuously accessed)
- WARM: entities in ARCHIVED universe that are still within retention period
- COLD: entities from TERMINATED organizations or universes archived > 1 year

**Retention:** Permanent for Canon and Structural data. Platform-policy-defined for user data (minimum 7 years for Enterprise tier).

**Backup frequency:** Daily backup with hourly incremental snapshots.

**Special requirements:**
- Supports point-in-time queries (read entity state as it was at time T)
- Supports transactional writes spanning the entity record and its first Version record
- Universe isolation at partition level
- Full-text indexes on common text fields for application-layer search

---

### 3.2 Graph Store

**Purpose:** The storage system for the Knowledge Graph — all KnowledgeNodes, KnowledgeEdges, GraphViews, GraphProjections, and AI Memory Graph partitions.

**Data classification held:** `[S] Structural` (graph structure), `[I] Inferred` (AI inferences in INFERRED partition), `[T] Temporary` (ephemeral subgraphs)

**Access pattern:** Read-heavy for traversal. Write pattern is event-driven (batched updates from Graph Sync Service). Traversal queries dominate — frequently multi-hop, variable depth.

**Consistency model:** Eventual consistency. The graph is derived from source domains. A defined synchronization SLA (Canon changes: < 5 minutes; non-Canon: < 30 minutes) governs how stale the graph may be.

**Partitioning:**
- Primary partition: by `universeId`
- Sub-partitions within each universe: CANON / ACTIVE / INFERRED / PROPOSED / HISTORICAL / OPERATIONAL / AI_MEMORY (per agent)

**Tiering:**
- HOT: CANON and ACTIVE partitions (traversal-critical)
- WARM: HISTORICAL partition (infrequent historical traversal)
- COLD: ARCHIVED universe graph (read-only; restored on-demand)

**Special requirements:**
- Optimized for graph traversal (adjacency-first storage)
- Supports bounded depth traversal with configurable limits
- Supports temporal traversal (graph state at a story time point)
- AI Memory partition is agent-isolated and encrypted with agent-scoped key
- Graph Projections stored in Object Store; Graph Store holds reference

---

### 3.3 Object Store

**Purpose:** Binary large object storage for all unstructured data — media assets (images, audio, video), document content (narrative text bodies), exported archives, backup files, and graph projection results.

**Data classification held:** `[M] Media`, `[D] Document Content`, backups, exports

**Access pattern:** Write-once, read-occasionally for most objects. Media assets may be frequently served (CDN-backed delivery for public media). Document content read per narrative review session.

**Consistency model:** Eventual consistency acceptable. Object writes are atomic per object. Multi-object consistency is managed by the Application Layer.

**Partitioning:** By `organizationId` → `universeId` → content type namespace.

**Tiering:**
- HOT: Media assets for ACTIVE universes; current narrative content bodies
- WARM: Media assets for less active universes; older document versions
- COLD: Archived universe content; backup copies; exported archives

**Retention:**
- Media assets: Retained as long as universe is ACTIVE or ARCHIVED (per retention policy)
- Narrative content bodies: Permanent (they are the creative work)
- Temporary exports: Configurable TTL (default 7 days); auto-deleted on expiry
- Backup files: Per StoragePolicy (default 90-day retention for daily backups)

**Special requirements:**
- Content-addressable storage (objects identified by content hash, enabling deduplication)
- Pre-signed URL generation for time-limited, authenticated access to media
- Multi-part upload support for large files
- CDN integration point for public media delivery (CDN sits in front; Object Store is origin)

---

### 3.4 Vector Store

**Purpose:** High-dimensional vector storage and approximate nearest neighbor (ANN) index for AI semantic embeddings — character semantic profiles, event embeddings, relationship embeddings, narrative embeddings, and knowledge fact embeddings.

**Data classification held:** `[I] Inferred` (AI-generated embeddings)

**Access pattern:** Write-once-update-rarely (embeddings are recomputed on entity change). Read pattern: ANN similarity queries, high concurrency, low latency requirement.

**Consistency model:** Eventual consistency. Embeddings may lag entity updates by up to 6 hours (batched recomputation).

**Partitioning:** By `universeId`. Cross-universe vector queries are not permitted (structural isolation).

**Tiering:** All HOT (vector similarity queries require low latency; cold vector data is not useful).

**Retention:** Embeddings are retained as long as the source entity exists. When an entity is ARCHIVED, its embedding moves to COLD Object Store for possible future use.

**Special requirements:**
- ANN index supports cosine similarity and Euclidean distance queries
- Supports filtered ANN queries (similarity search within a filtered subset of vectors)
- Vector dimensions: configurable per embedding model (typically 768–4096 dimensions)
- Embedding model version tracked alongside each vector (vectors from different model versions are not comparable)

---

### 3.5 Audit Store

**Purpose:** The permanent, tamper-evident, cryptographically chained record of all significant system operations. The Audit Store is the compliance backbone of the platform.

**Data classification held:** `[A] Audit`

**Access pattern:** Write-only during normal operations (via Audit System). Read-only for compliance review, security investigation, and forensic analysis. Write throughput is high (every user action, every AI operation, every storage operation produces an audit record).

**Consistency model:** Strong consistency for writes (audit record must be committed before the operation that generated it is acknowledged). Read consistency is eventual (compliance queries may run on replicated read replica).

**Partitioning:** By `organizationId`. System-level audit records in a dedicated system partition.

**Tiering:** All COLD (audit records are written once and rarely read). Write path is optimized for high-throughput append. Read path is optimized for compliance query patterns.

**Retention:** PERMANENT. No delete operation exists on the Audit Store. Records are retained for the maximum of: 10 years (enterprise compliance default) or the jurisdiction-specific legal minimum. `[A]` data classification = permanent retention.

**Immutability enforcement:**
- Append-only file structure at storage layer
- Cryptographic chain: each record contains the hash of the previous record
- Chain integrity verified on a continuous schedule
- Any chain break is a CRITICAL security alert

**Special requirements:**
- Write throughput: designed for > 10,000 records/second sustained
- Cryptographic chain verification runs continuously on a separate process
- Compliance export API: structured export for regulatory submission
- No direct application access — writes go through Audit Domain only; reads go through Compliance Domain only

---

### 3.6 Version Store

**Purpose:** The append-only store for all entity and relationship version records — the complete historical state chain for every governed domain object.

**Data classification held:** `[V] Versioned`

**Access pattern:** High write frequency (every entity change creates a version record). Read frequency: low in normal operation (version history browsed occasionally). High read frequency during restore operations.

**Consistency model:** Strong consistency for writes (version record created in same transaction as entity update). Read consistency: eventual (version history queries can tolerate mild lag).

**Partitioning:** By `universeId` for story entity versions; by `organizationId` for platform entity versions.

**Tiering:**
- HOT: Most recent N versions (configurable; default last 10 versions) for fast access
- WARM: Older versions within the last 90 days
- COLD: All versions older than 90 days

**Retention:** PERMANENT. Version records are never deleted. Version Store follows the same immutability model as Audit Store (append-only; no delete path).

**Special requirements:**
- Sequential version numbering per entity is enforced by the write path (gapless sequence validation)
- EntitySnapshot in each version record is complete (full state, not a diff) — enabling independent restore without chain replay
- Bulk version export for Universe snapshots
- Version comparison queries (diff between version N and version M)

---

### 3.7 Cache Store

**Purpose:** High-speed, low-durability storage for frequently accessed data that is expensive to compute or retrieve from source stores. Cache is always a copy; never a source of truth.

**Data classification held:** `[T] Temporary` (cached copies of any classification)

**Access pattern:** Extremely high read frequency. Write pattern: short-burst writes on cache population or invalidation.

**Consistency model:** None. Cache may be stale by design. Staleness window is defined per cache entry type (entity properties: 30 seconds; GraphStatistics: 5 minutes; computed projections: 10 minutes).

**Partitioning:** By data type and universe (to enable efficient bulk invalidation when a Universe changes).

**Tiering:** All HOT (cache in COLD tier is pointless).

**Retention:** TTL-based. Each cache entry has a defined maximum lifetime. No permanent retention.

**Special requirements:**
- Cache invalidation on domain events (EntityUpdated → invalidate entity cache entries for that entity)
- LRU eviction when memory pressure exceeds configured threshold
- Cache warming: on Universe load, pre-populate cache with most-accessed entities
- Cache hit/miss rate metrics exposed to monitoring
- No persistence across restarts for operational cache (cache rebuilds from source on restart)

---

### 3.8 Search Index Store

**Purpose:** The optimized store for full-text and structured search over entity, metadata, relationship, and narrative content.

**Data classification held:** `[S] Structural` (indexed copies of entity and metadata attributes)

**Access pattern:** Read-heavy (search queries). Write pattern: event-driven updates from domain event stream. Writes are not on the critical path (search index updates are eventually consistent).

**Consistency model:** Eventual consistency. The search index may lag the Entity Store by up to 60 seconds for full-text fields, and up to 5 minutes for structural fields.

**Partitioning:** By `universeId` for story content. By `organizationId` for platform-level search (user directory, universe catalog).

**Tiering:** All HOT (search queries require low latency).

**Retention:** Search index is derived — rebuilt from source stores on demand. Retention follows source data retention.

**Index types maintained:**
- Full-text index: entity names, descriptions, narrative content
- Exact-match index: IDs, enum values, Canon status, lifecycle status
- Range index: numeric fields, date fields
- Facet index: enum and tag fields for faceted search
- Semantic (vector) index: AI embedding vectors for semantic search

**Special requirements:**
- Index rebuild supported without downtime (blue-green index rotation)
- Faceted search with counts for all enum/tag fields
- Phrase and proximity queries for full-text
- Highlighting of matched terms in result snippets
- Search within a specific metadata schema's fields

---

### 3.9 Metadata Store

**Purpose:** The storage system for MetadataSchema definitions, MetadataDefinitions, and MetadataValues. Logically part of the Entity Store family but physically separated for independent scaling and schema governance.

**Data classification held:** `[S] Structural` (schema definitions), `[U] User-Defined` (metadata values), `[I] Inferred` (AI-generated metadata values), `[SYS] System` (system metadata)

**Access pattern:** Schema definitions: read-heavy, write-rare. Metadata values: read-heavy (co-read with entities), moderate write frequency.

**Consistency model:** Strong consistency for schema operations (schema changes must be immediately visible). Eventual consistency acceptable for metadata value reads (< 5 second lag tolerable).

**Partitioning:** Schema definitions: by `organizationId` or `universeId`. Metadata values: by `universeId`.

**Tiering:**
- HOT: Active schema definitions (always needed); current metadata values for ACTIVE entities
- WARM: Metadata values for ARCHIVED entities still within retention
- COLD: Metadata values for TERMINATED organizations

**Special requirements:**
- Schema version history maintained (every schema change creates a version record)
- Metadata values are indexed by `definitionId + entityId` for efficient per-entity retrieval
- AI metadata values (`[AI]` class) stored separately from human metadata values for access control

---

### 3.10 Session Store

**Purpose:** Short-lived storage for active user authentication sessions, including session tokens, expiry times, and session context.

**Data classification held:** `[SYS] System` (authentication state — transient)

**Access pattern:** Very high read frequency (every authenticated request). Write on login, refresh, logout. Delete on logout or expiry.

**Consistency model:** Strong consistency (session state must be accurate — stale session data would allow expired sessions to authenticate).

**Partitioning:** By `organizationId`.

**Tiering:** All HOT.

**Retention:** Session TTL (idle: 30 minutes; maximum: 24 hours). Expired sessions are deleted after TTL. No long-term retention.

**Special requirements:**
- Atomic check-and-set for token refresh (prevent race conditions on concurrent refresh)
- Bulk invalidation by `userId` (for account suspension)
- Bulk invalidation by `organizationId` (for organization suspension)

---

### 3.11 Configuration Store

**Purpose:** Persistent storage for platform configuration, organization settings, universe settings, feature flags, and operational configuration.

**Data classification held:** `[SYS] System`, `[S] Structural` (configuration)

**Access pattern:** Low write frequency (configuration changes are infrequent). High read frequency (configuration read on every request).

**Consistency model:** Strong consistency (configuration changes must be immediately and consistently visible across all service instances).

**Partitioning:** By configuration scope (PLATFORM / ORGANIZATION / UNIVERSE).

**Tiering:** All HOT (configuration is read on critical paths).

**Retention:** Configuration history retained for 1 year (to support rollback of configuration changes).

**Special requirements:**
- Configuration versioning: every change creates a version record
- Configuration inheritance: Universe settings inherit Organization defaults; Organization settings inherit Platform defaults
- Feature flag support: per-organization and per-universe flag evaluation
- Configuration read cached at application layer (invalidated on change event)

---

### 3.12 Temporary Store

**Purpose:** Short-lived storage for data that is needed transiently during processing — AI reasoning working context, export staging areas, import staging areas, pending job data.

**Data classification held:** `[T] Temporary`

**Access pattern:** Write-once, read-once (or few times), delete after use.

**Consistency model:** Eventual consistency acceptable.

**Partitioning:** By use-case namespace (AI_CONTEXT / EXPORT_STAGING / IMPORT_STAGING / JOB_WORKING).

**Tiering:** All HOT during use. No warm/cold transition (deleted before tiering would apply).

**Retention:** Strictly TTL-based. No Temporary Store object survives beyond its declared TTL (maximum: 24 hours). Cleanup runs every 15 minutes.

**Special requirements:**
- TTL enforcement is strict — no temporary object can survive past its TTL, regardless of access
- Temporary objects are not backed up
- Size limits enforced per object and per namespace (prevent runaway job data)

---

## Part IV — Storage Behavior

### 4.1 Read Flow

```
Request arrives at Application Layer
    ↓
Cache Store checked (if cache-eligible query)
    ↓ [Cache HIT]
    Return cached data (with staleness label if applicable)
    ↓ [Cache MISS]
Source store read (Entity Store / Graph Store / etc.)
    ↓
Data returned to Application Layer
    ↓
Data populated into Cache Store (with TTL)
    ↓
Response returned to caller
```

**Read path rules:**
- Cache is checked before source store for all non-critical reads
- Critical reads (Canon status checks, authentication) bypass cache
- Read requests that fail source store are not served from stale cache
- Cache population is asynchronous — it does not block the read response

---

### 4.2 Write Flow

```
Write request arrives at Domain Layer
    ↓
Domain validates request (business rules, invariants)
    ↓
Transaction opened (spanning source store write + version record write)
    ↓
Entity Store / primary source store write committed
    ↓
Version record written to Version Store (same transaction)
    ↓
Transaction committed
    ↓ [Synchronous — before response]
Audit record written to Audit Store
    ↓
Response returned to caller
    ↓ [Asynchronous — after response, eventual consistency]
Domain event emitted
    ↓
Graph Store sync triggered
    ↓
Search Index update triggered
    ↓
Cache entry invalidated
    ↓
AI Memory sync triggered (if relevant to agent's Universe)
```

**Write path rules:**
- Source store write and Version record write are atomic (one transaction)
- Audit record write is synchronous but not part of the source transaction (separate commit; failure retried)
- All downstream async updates are driven by domain events — not by the write path directly
- A write that fails source store does not produce downstream events (events are published only on successful commit)

---

### 4.3 Synchronization

Cross-store synchronization is event-driven:

| Source Event | Target Store | Synchronization Mode | SLA |
|---|---|---|---|
| EntityCreated / Updated | Search Index Store | Async / Eventually Consistent | < 60 seconds |
| EntityCreated / Updated | Graph Store (node) | Async / Eventually Consistent | < 5 min (Canon), < 30 min (others) |
| RelationshipCreated / Updated | Graph Store (edge) | Async / Eventually Consistent | < 5 min (Canon), < 30 min (others) |
| EntityCreated / Updated | Cache Store | Invalidation (async) | < 5 seconds |
| EntityCreated / Updated | Metadata Store | Inline (same transaction for schema; async for values) | N/A |
| NarrativePublished | Object Store | Inline (content body write) | N/A |
| EntityUpdated | Vector Store (re-embed) | Async / Batched | < 6 hours |
| UserLogin | Session Store | Synchronous | N/A |
| AnyWrite | Audit Store | Synchronous (before response) | N/A |

---

### 4.4 Replication

Every primary store is replicated for durability and availability:

| Store Type | Replication Factor | Replication Mode |
|---|---|---|
| Entity Store | 3 replicas | Synchronous (quorum write) |
| Graph Store | 3 replicas | Synchronous (quorum write) |
| Object Store | 3+ replicas | Synchronous (3 local) + Async (1 geo-remote) |
| Vector Store | 2 replicas | Async (latency-sensitive; quorum not required) |
| Audit Store | 3 replicas | Synchronous + 1 immutable geo-remote copy |
| Version Store | 3 replicas | Synchronous (quorum write) |
| Cache Store | 2 replicas | Async (cache data is rebuildable) |
| Search Index | 2 replicas | Async (index is rebuildable) |
| Metadata Store | 3 replicas | Synchronous |
| Session Store | 3 replicas | Synchronous |
| Config Store | 3 replicas | Synchronous |
| Temp Store | 1 replica | None (temporary; loss is acceptable) |

**Quorum write:** A write is acknowledged only after N/2+1 replicas have committed it. For 3-replica stores, 2 replicas must confirm before the write is acknowledged.

---

### 4.5 Backup Strategy

| Store | Backup Frequency | Backup Type | Retention |
|---|---|---|---|
| Entity Store | Daily full + hourly incremental | Point-in-time snapshot | 90 days |
| Graph Store | Daily full | Point-in-time snapshot | 90 days |
| Object Store | Daily full | Cross-region copy | 90 days (backups); originals permanent |
| Vector Store | Weekly | Full snapshot | 30 days |
| Audit Store | Continuous streaming + daily | Streaming to geo-remote | Permanent |
| Version Store | Daily full | Point-in-time snapshot | Permanent (matches content) |
| Cache Store | None | N/A (rebuildable) | N/A |
| Search Index | None | N/A (rebuildable) | N/A |
| Metadata Store | Daily full | Point-in-time snapshot | 90 days |
| Session Store | None | N/A (ephemeral) | N/A |
| Config Store | On every change | Versioned snapshot | 1 year |
| Temp Store | None | N/A (ephemeral) | N/A |

**Backup integrity:** Every backup generates a checksum and an integrity report. Restorability is verified quarterly by performing test restores to an isolated environment.

---

### 4.6 Restore Procedure

```
Restore request raised (by Organization Admin or Ops team)
    ↓
Restore scope defined: full universe / specific store / specific entity / time range
    ↓
Nearest clean backup identified (by StorageManager)
    ↓
Backup integrity verified (checksum match)
    ↓ [FAIL: integrity check failed → escalate to Ops; use older backup]
Target partition locked (no new writes during restore)
    ↓
Backup data restored to staging partition
    ↓
Post-restore validation: record count, checksum, referential integrity checks
    ↓ [FAIL: validation failed → roll back staging restore; escalate]
Creator notified: preview restored state (optional review window)
    ↓
Creator confirms: promote staging to production partition
    ↓
Derived stores re-synced from restored source
    ↓
Restore audit record written
```

---

### 4.7 Migration

Storage migration (moving data between store versions, schemas, or physical infrastructure) follows a zero-downtime pattern:

```
Migration planned (scope, strategy, rollback plan documented)
    ↓
Pre-migration snapshot created (safety checkpoint)
    ↓
Migration tool reads from source
    ↓
Data transformed (if schema change) and written to target
    ↓
Source and target run concurrently (dual-write period)
    ↓
Target validated (record count, integrity, sample checks)
    ↓
Traffic cutover to target (atomic, < 1ms switchover)
    ↓
Source retained for rollback period (default: 48 hours)
    ↓ [No issues in rollback period]
Source decommissioned
    ↓
Post-migration audit record written
```

---

### 4.8 Archive

Universe archival triggers a coordinated archive across all stores:

```
Universe status → ARCHIVED (in Entity Store)
    ↓
StorageManager receives UniverseArchived event
    ↓
All HOT-tier data for this universe transitioned to WARM (immediate)
    ↓
GraphSnapshot created (final state preserved)
    ↓
Object Store content copied to archive bucket
    ↓
Universe partition locked (no new writes)
    ↓
Search Index for Universe de-indexed (removed from active search)
    ↓
Cache entries for Universe flushed
    ↓
After 30 days in WARM: transition to COLD
    ↓
Archive complete; read-only access available via cold-tier rehydration
```

---

### 4.9 Retention Policy

| Data Category | Retention Duration | Deletion Action |
|---|---|---|
| `[C] Canon` | Permanent | Never deleted |
| `[S] Structural` | Permanent | Never deleted |
| `[V] Versioned` | Permanent | Never deleted |
| `[A] Audit` | Permanent (min 10 years) | Never deleted |
| `[U] User-Defined` | 7 years (Enterprise) / 3 years (Team) | Anonymized after retention |
| `[I] Inferred` | 2 years from last confirmation | Archived after expiry |
| `[M] Media` | Duration of universe + 1 year | Deleted after grace period |
| `[D] Document` | Permanent (creative work) | Never deleted |
| `[T] Temporary` | Per-object TTL (max 24h) | Deleted at TTL |
| `[SYS] System` | 1 year (config) / 7 days (sessions) | Deleted at expiry |

---

### 4.10 Cleanup

Automated cleanup runs on a schedule:

| Cleanup Target | Schedule | Action |
|---|---|---|
| Expired Session Store entries | Every 15 minutes | Physical delete |
| Expired Temp Store objects | Every 15 minutes | Physical delete |
| Expired Cache entries | Continuous (TTL engine) | Eviction |
| Stale Search Index entries | Daily | Remove entries for ARCHIVED entities |
| Low-confidence Inference data | Weekly | Archive INFERRED data below 0.3 confidence |
| Old Graph Projections | Weekly | Archive projections not accessed in 30 days |
| Pre-migration source stores | After rollback period | Decommission |

---

## Part V — Storage Consistency

### 5.1 Event Synchronization

All cross-store consistency is driven by domain events:

```
Source Store write committed
    ↓
Domain Event published to Event Bus
    ↓
Event Bus fans out to all registered subscribers:
    - Graph Sync Service (→ Graph Store)
    - Search Indexer (→ Search Index Store)
    - Cache Invalidator (→ Cache Store)
    - Metadata Sync (→ Metadata Store derived views)
    - AI Memory Sync (→ AI Memory partition in Graph Store)
    - Version Recorder (→ Version Store) [synchronous, in-transaction]
    - Audit Recorder (→ Audit Store) [synchronous, pre-response]
```

**At-least-once delivery:** The Event Bus guarantees at-least-once delivery. Subscribers handle duplicate events idempotently.

**Event ordering:** Events from a single entity are delivered in order (per-entity ordering guarantee). Cross-entity ordering is best-effort.

---

### 5.2 Eventual Consistency

Services that consume data from derived stores (Graph Store, Search Index) must account for eventual consistency:

**For creators and users:**
- UI displays lag indicators when data is known to be updating
- "Updated moments ago" labels for recently modified entities whose derived stores may not have caught up
- Critical operations (Canon confirmation, workflow approval) always read from source store

**For AI agents:**
- AI agents read from their Memory Graph (synchronized copy) — never directly from source store
- Memory Graph lag SLA is defined and monitored
- AI agents that require current Canon state wait for Memory sync confirmation before reasoning

---

### 5.3 Transaction Boundaries

Atomic transactions are scoped to individual store writes:

| Operation | Transaction Scope |
|---|---|
| Entity Create | Entity Store write + Version Store write (single transaction) |
| Entity Update | Entity Store update + Version Store write (single transaction) |
| Relationship Create | Entity Store write + Version Store write (single transaction) |
| Canon Confirmation | Entity Store update + Version Store write + Audit Store write (synchronous; Audit write after transaction) |
| User Login | Session Store write (single transaction) |
| Graph Sync | Graph Store write (independent transaction; failure retried by sync service) |
| Search Index Update | Search Index write (independent; failure retried by indexer) |

Cross-store atomicity (Entity Store + Graph Store in one transaction) is not supported. This is by design — cross-store atomicity requires distributed transactions which carry high complexity and performance cost. Instead, eventual consistency with event-driven sync provides equivalent correctness at lower complexity.

---

### 5.4 Failure Recovery

| Failure Scenario | Detection | Recovery |
|---|---|---|
| Entity Store write fails | Synchronous error; transaction rolled back | Caller receives error; no partial state |
| Version Store write fails | Synchronous error; main transaction rolled back | Entity Store write also rolled back |
| Audit Store write fails | Synchronous error; write retried (up to 3x) | After 3 failures: CRITICAL alert; operation proceeds but flagged as audit-incomplete |
| Graph Sync fails | Event Bus retry; dead-letter queue after N retries | Alert raised; manual re-sync triggered |
| Search Index update fails | Event Bus retry; dead-letter queue after N retries | Alert raised; full re-index triggered |
| Cache Store unavailable | Read falls through to source store | Automatic fallback; no caller impact |
| Vector Store unavailable | Semantic search disabled; structured search still operational | Degraded mode; alert raised |
| Backup fails | Backup job monitoring | Alert raised; next backup attempt scheduled early |

---

### 5.5 Retry Strategy

| Scenario | Max Retries | Retry Interval | Escalation |
|---|---|---|---|
| Event Bus delivery | 5 | Exponential backoff (1s, 2s, 4s, 8s, 16s) | Dead-letter queue |
| Audit Store write | 3 | 100ms fixed | CRITICAL alert |
| Graph Sync | 3 | Exponential (5s, 30s, 300s) | Dead-letter queue + alert |
| Search Index update | 3 | Exponential (5s, 30s, 300s) | Dead-letter queue + alert |
| Backup job | 2 | 30 minutes | Alert + next scheduled backup |
| Cache population | 2 | 500ms | Fail silently (source store serves request) |

---

### 5.6 Conflict Resolution

Conflicts arise when two concurrent writes target the same record:

**Optimistic locking (Entity Store):** Every entity record carries a `version` counter. A write must specify the expected current version. If the actual version differs (concurrent write occurred), the write is rejected with `CONFLICT` error. The caller retries with the latest state.

**Last-write-wins (Cache Store):** Cache does not use locking. The last writer wins. This is safe because cache is derived and not authoritative.

**Append-only (Audit Store, Version Store):** No conflicts possible — every write appends a new record.

**Graph Store:** Concurrent edge creation between the same nodes with the same type is idempotent (duplicate detection). Concurrent edge state transitions use optimistic locking.

---

## Part VI — Performance

### 6.1 Read Optimization

| Technique | Applied To | Effect |
|---|---|---|
| Cache Store population | All frequently-read entities | Reduces source store read load by 80-95% |
| Projection pre-computation | Graph projections, Search facets | Eliminates on-demand recomputation |
| Read replicas | Entity Store, Graph Store | Distributes read traffic; increases read throughput |
| Partial entity reads | Large entity aggregates | Fetch only required fields (projection queries) |
| Batch reads | Related entity sets | Fetch multiple entities in one round trip |
| GraphView pre-filtering | Graph queries | Applies partition and type filters before traversal |
| Index covering | Search queries | Serve queries entirely from index without source read |
| ANN index | Vector Store | Approximate nearest neighbor; 10ms P99 vs. exact search's 10s+ |

---

### 6.2 Write Optimization

| Technique | Applied To | Effect |
|---|---|---|
| Write batching | Search Index updates | Batch 100s of small updates into one bulk index operation |
| Async downstream sync | Graph Store, Search, Cache | Keeps write path fast; downstream updates are eventually consistent |
| Transactional write scope minimization | Entity + Version Store | Only two stores in write transaction; others are async |
| Append-only writes | Audit Store, Version Store | Eliminates lock contention; no update or delete overhead |
| Event bus fan-out | All derived stores | Decouples write latency from downstream update latency |
| AI inference batching | Vector Store, Graph INFERRED partition | Batch process inference writes; not per-entity |

---

### 6.3 Hot, Warm, and Cold Storage Strategy

```
HOT TIER: Optimized for minimum latency
  ├── Entity Store: all ACTIVE and CANON entities
  ├── Graph Store: CANON + ACTIVE partitions
  ├── Metadata Store: active schema definitions + current values
  ├── Session Store: all active sessions
  ├── Config Store: all configuration
  ├── Search Index: all active universe indices
  └── Cache Store: entire cache (LRU managed)

WARM TIER: Optimized for cost-effective infrequent access
  ├── Entity Store: entities for recently archived universes
  ├── Graph Store: HISTORICAL partition
  ├── Object Store: older narrative content, inactive media
  └── Version Store: versions > 90 days old

COLD TIER: Optimized for minimum cost; accessed rarely
  ├── All stores: data for archived universes (> 1 year)
  ├── Audit Store: all audit records (write-once; rarely read)
  ├── Version Store: all versions (permanent cold retention)
  └── Object Store: backup copies, archived exports
```

---

### 6.4 Compression

| Store | Compression | Algorithm | Applied To |
|---|---|---|---|
| Entity Store | WARM + COLD tiers | LZ4 (speed) / ZSTD (ratio) | All record data |
| Object Store | WARM + COLD tiers | ZSTD | Text content (high ratio); Media (skip — already compressed) |
| Audit Store | All tiers | ZSTD | All records (repetitive structure; compresses well) |
| Version Store | WARM + COLD tiers | ZSTD | EntitySnapshot fields |
| Graph Store | COLD tier | LZ4 | Node and edge property sets |
| Vector Store | None | N/A | Vectors are not compressible effectively |

---

### 6.5 Deduplication

| Store | Deduplication | Basis |
|---|---|---|
| Object Store | Content-addressable (hash-based) | Binary content hash — identical files stored once |
| Version Store | None (each version is a unique complete snapshot) | N/A |
| Audit Store | None (each record is unique) | N/A |
| Cache Store | Key-based (same key = same entry; no duplicates by design) | Cache key |
| Vector Store | Approximate deduplication (very similar vectors flagged) | Cosine similarity > 0.99 → dedup candidate |

---

### 6.6 Partitioning Strategy

| Store | Partition Key | Reason |
|---|---|---|
| Entity Store | `universeId` (story) / `organizationId` (platform) | Universe isolation; co-location of related entities |
| Graph Store | `graphId` (= `universeId`) | Graph traversal performance; isolation |
| Object Store | `organizationId/universeId` | Organizational access control; cost tracking |
| Vector Store | `universeId` | Prevent cross-universe semantic queries |
| Audit Store | `organizationId` | Compliance reporting scope; retention management |
| Version Store | `universeId` (story) / `organizationId` (platform) | Co-location with source entities |
| Metadata Store | `universeId` (values) / `organizationId` (schemas) | Schema inheritance scope; value isolation |
| Search Index | `universeId` | Search scope isolation; independent re-indexing |

---

## Part VII — Security

### 7.1 Encryption Model

```
KEY HIERARCHY:
  Platform Master Key (KMS-managed)
      ↓
  Organization Key (per Organization; derived)
      ↓
  Universe Key (per Story Universe; derived)
      ↓
  Agent Key (per AI Agent; derived)
      ↓
  Object Key (per StorageObject; for CONFIDENTIAL data)
```

**Encryption scope:**
- All data at rest: AES-256-GCM (all stores, all tiers)
- All data in transit: TLS 1.3 (all store connections)
- CONFIDENTIAL data: additional object-level encryption with Universe Key
- AI Memory Graph: additional encryption with Agent Key
- Backup files: encrypted with Organization Key at backup time; key required for restore

---

### 7.2 Isolation

Storage isolation is structural at three levels:

**Level 1 — Provider-level:** Separate StorageProvider instances for Audit Store and Version Store (no shared infrastructure with other store types).

**Level 2 — Partition-level:** Each Story Universe has an isolated StoragePartition within each store. Cross-partition queries are rejected at the storage access layer.

**Level 3 — Key-level:** Organization-scoped and Universe-scoped encryption keys mean data in one partition cannot be decrypted using another partition's key.

---

### 7.3 Access Control

Storage access is governed by service identity, not by user identity:

| Service | Entity Store | Graph Store | Audit Store | Version Store | Object Store |
|---|---|---|---|---|---|
| Entity Domain Service | Read/Write | None | None | Write (version records) | None |
| Relationship Domain Service | Read/Write | None | None | Write (version records) | None |
| Graph Sync Service | None | Read/Write | None | None | None |
| Search Indexer | Read (source) | Read (nodes) | None | None | None |
| Audit Domain Service | None | None | Write | None | None |
| Compliance Domain Service | None | None | Read | None | None |
| AI Agent Service | None | Read/Write (INFERRED + Memory only) | None | None | None |
| Media Domain Service | None | None | None | None | Read/Write |
| StorageManager | Admin (all) | Admin (all) | Admin (read) | Admin (all) | Admin (all) |

No service has broader access than it legitimately requires. Storage credentials are service-specific and rotated on a defined schedule.

---

### 7.4 Audit of Storage Operations

All administrative storage operations are audited:

| Operation | Audit Record |
|---|---|
| Partition created | Admin, partitionId, scope, timestamp |
| Partition archived | Admin, partitionId, reason, timestamp |
| Tier transition | System, objectId, fromTier, toTier, timestamp |
| Backup created | System, backupId, scope, size, timestamp |
| Backup failed | System, backupId, error, timestamp |
| Restore executed | Admin, snapshotId, scope, timestamp |
| Encryption key rotated | Admin, keyId, affectedPartitions, timestamp |
| Storage migration started/completed | Admin, migrationId, scope, timestamp |
| Legal hold applied/removed | Admin, objectId, reason, timestamp |

---

### 7.5 Compliance

**GDPR — Data Subject Erasure:**
When a user exercises their right to erasure, the following applies to story data:

- UserAccount record: email anonymized; display name cleared; stub record preserved for Audit referential integrity
- User-authored metadata values: attributed to `ANONYMOUS_USER` (value preserved as creative work belongs to the Organization)
- Audit records: actor field replaced with `ANONYMIZED_USER_{hash}` (audit chain preserved; identity removed)
- Session Store: all sessions for this user deleted immediately

**Data residency:** StoragePartitions can be configured to restrict physical data placement to specific geographic regions. Universe-level data residency configuration inherits from Organization settings.

**Legal hold:** Individual StorageObjects can be placed under legal hold (e.g., for litigation). Legal-hold objects cannot be deleted, tiered to cold (without copy preserved), or modified by cleanup processes.

---

### 7.6 Backup Security

- Backup files are encrypted with the Organization Key at the time of backup creation
- Backup files stored in a separate, isolated backup storage namespace
- Backup storage credentials are independent of production storage credentials
- Backup files are immutable once written (write-once bucket policy)
- Restore operations require Organization Admin authorization + additional MFA confirmation for production restores

---

## Part VIII — Integration

### 8.1 Integration with Entity Architecture

Entity Architecture defines what domain objects exist. Storage Architecture defines where they live:

| Entity Type | Primary Store | Version Records | Audit Records |
|---|---|---|---|
| Character, Location, Faction, etc. | Entity Store | Version Store | Audit Store |
| Relationship | Entity Store | Version Store | Audit Store |
| KnowledgeFact | Entity Store | Version Store | Audit Store |
| NarrativeUnit (metadata) | Entity Store | Version Store | Audit Store |
| NarrativeUnit (content body) | Object Store | Version Store (ref) | Audit Store |
| Organization, UserAccount | Entity Store (org partition) | Version Store | Audit Store |
| AIAgent, MemoryGraph | Entity Store (metadata) + Graph Store (graph) | Version Store | Audit Store |
| AuditRecord | Audit Store | N/A (self-evidencing) | N/A |
| Version | Version Store | N/A (self-evidencing) | Audit Store |

---

### 8.2 Integration with Metadata Architecture

Metadata storage integration:

- **MetadataSchema definitions** → Metadata Store (schema partition)
- **MetadataValue records** → Metadata Store (value partition, co-partitioned with universe)
- **MetadataVersion records** → Version Store
- **AI metadata values** (`MT-AI-*`) → Metadata Store (AI sub-partition, stricter access control)
- **System metadata** (`MT-SYS-*`) → Metadata Store (system sub-partition; read-only for all application services)

---

### 8.3 Integration with Relationship Architecture

Relationship data storage:

- **Relationship records** → Entity Store (relationship partition)
- **RelationshipVersion records** → Version Store
- **RelationshipHistory entries** → Entity Store (append-only sub-partition)
- **RelationshipEvidence records** → Entity Store (evidence partition)
- **Knowledge Graph edge sync** → Graph Store (event-driven, async)

---

### 8.4 Integration with Knowledge Graph Architecture

Knowledge Graph data storage:

| Graph Data | Store | Partition |
|---|---|---|
| KnowledgeNodes (all partitions) | Graph Store | Per-universe partition |
| KnowledgeEdges (all partitions) | Graph Store | Per-universe partition |
| GraphSnapshots | Object Store | Backup namespace |
| GraphVersion event log | Version Store | Graph sub-partition |
| GraphProjection results | Object Store | Projection namespace |
| AI Memory Graph | Graph Store | Per-agent isolated partition |
| GraphStatistics | Cache Store | Short-TTL; Source: computed |

---

### 8.5 Integration with Versioning Architecture

Version Store is the physical storage for the Versioning Domain:

- All entity version records written to Version Store by the Versioning Domain
- Version Store is the only store the Versioning Domain writes to (besides reading Entity Store for snapshot capture)
- Version history queries: Version Store reads
- Universe snapshots: coordinated reads from Entity Store + Version Store + Graph Store; written to Object Store

---

### 8.6 Integration with Search Architecture

Search data storage:

- **Search Index** lives in Search Index Store
- Search Index is built from reads of Entity Store, Metadata Store, and Graph Store
- AI semantic vectors indexed by Vector Store's ANN engine
- Search result sets are not persisted (ephemeral query results)
- Saved searches stored in Entity Store (as SavedSearch entities)
- Search index rebuild reads from Entity Store → Search Indexer → Search Index Store

---

### 8.7 Integration with Workflow

Workflow data storage:

- **WorkflowTemplate, WorkflowInstance** → Entity Store
- **StageDecisionRecord** → Entity Store (append-only sub-partition)
- **WorkflowComment** → Entity Store
- **Workflow graph nodes** (operational) → Graph Store (OPERATIONAL partition)
- All workflow state changes → Version Store + Audit Store

---

### 8.8 Integration with AI Memory

AI Memory storage integration:

- **AI Memory Graph** → Graph Store (isolated per-agent partition; encrypted with agent key)
- **AI inference records** → Graph Store (INFERRED partition)
- **AI proposal records** → Entity Store (proposal partition)
- **AI semantic vectors** → Vector Store (per-universe partition)
- **AI working context** → Temp Store (TTL-bound; deleted after task completion)
- **AI task audit records** → Audit Store

---

## Part IX — Best Practices

### 9.1 Naming Conventions

| Concept | Convention | Good | Bad |
|---|---|---|---|
| StorageProvider name | `{type}_{region}_{tier}_{index}` | `entity_us1_hot_01` | `db1`, `store_primary` |
| StoragePartition name | `{org_id}_{universe_id}_{domain}` | `org_acme_uni_lotr_characters` | `partition1` |
| StorageNamespace path | `{org}/{universe}/{domain}/{type}` | `acme/lotr/characters/character` | `chars` |
| Backup label | `{store}_{scope}_{date}_{type}` | `entity_uni_lotr_2026-07-29_daily` | `backup1` |
| Snapshot label | Human-readable milestone | `"End of Arc 2 — Dragon War"` | `snap_42` |
| Cache key | `{store}:{partition}:{entity_type}:{entity_id}:{version}` | `entity:uni_lotr:character:char_001:v7` | `char001` |
| Object Store key | `{org}/{universe}/{content_type}/{id}/{filename}` | `acme/lotr/media/img_001/dragon.webp` | `img001` |

---

### 9.2 Performance Guidelines

| Concern | Guideline |
|---|---|
| Entity reads | Always check Cache Store first; source read only on miss |
| Graph traversal | Limit depth to 5 for interactive queries; use CANON partition for user-facing queries |
| Batch writes | Batch search index updates in groups of 100–1,000 |
| Large object reads | Stream from Object Store; never buffer entire file in memory |
| Vector queries | Limit to 50 ANN results; apply structured pre-filters to reduce candidate set |
| Backup timing | Schedule daily backups during lowest-traffic window |
| Cache TTL | Entity properties: 30s; GraphStats: 5min; Config: 60s; Session: per-session TTL |
| Partition queries | Always include `universeId` in query predicates to benefit from partition pruning |
| Audit writes | Batch audit records for high-frequency events (e.g., AI inference events) within 100ms windows |
| Temp Store | Declare TTL at creation; never rely on cleanup process as the primary expiry mechanism |

---

### 9.3 Monitoring

| Metric | Alert Threshold | Action |
|---|---|---|
| Storage utilization | Warning: 70%; Critical: 85% | Capacity expansion |
| Write latency P99 | Warning: 100ms; Critical: 500ms | Investigation |
| Read latency P99 | Warning: 50ms; Critical: 200ms | Cache effectiveness review |
| Error rate | Warning: 0.1%; Critical: 1% | Incident investigation |
| Audit Store chain integrity | Any break | CRITICAL security alert |
| Backup failure rate | Any failure | Alert + early retry |
| Graph sync lag | Warning: 2x SLA; Critical: 5x SLA | Sync service investigation |
| Search index lag | Warning: 5 minutes; Critical: 30 minutes | Indexer investigation |
| Cache hit rate (entity) | Warning: < 80%; Critical: < 60% | Cache size or TTL review |
| Temp Store TTL violations | Any object exceeding TTL by > 1h | Cleanup process alert |

---

### 9.4 Capacity Planning

| Store | Growth Driver | Planning Cadence |
|---|---|---|
| Entity Store | Number of entities per universe | Quarterly |
| Graph Store | Nodes + edges per universe | Quarterly |
| Object Store | Media upload volume + narrative content | Monthly |
| Vector Store | Number of entities × embedding dimension | Quarterly |
| Audit Store | Operations per day × record size | Annually (high growth) |
| Version Store | Write frequency × entity count | Quarterly |
| Cache Store | Hot entity set size × average entity size | Quarterly |
| Search Index | Full-text content volume + entity count | Quarterly |

**Capacity planning principle:** Plan for 3x current utilization at all times. Alert at 70% of planned capacity. Expand before alert is sustained for more than 7 days.

---

### 9.5 Common Mistakes

**❌ Mistake 1 — Treating Storage as Database**
Storage Architecture defines logical store types and policies, not physical database schemas. Choosing a specific database engine or schema is an implementation decision made in a later phase, constrained by the logical architecture.

**❌ Mistake 2 — One Store for Everything**
Forcing all data into a single store (e.g., a relational database for graphs, vectors, blobs, and audit records) produces a system that performs poorly for every workload.

**❌ Mistake 3 — Cache as Source of Truth**
Cache can be stale. Any operation that requires current state (Canon confirmation, authentication, billing) must read from the source store, not the cache.

**❌ Mistake 4 — Forgetting Backup Verification**
A backup that cannot be restored is not a backup. Backup integrity verification and test restore are not optional operational activities — they are part of the backup strategy.

**❌ Mistake 5 — Missing Retention Policy**
"We'll keep everything forever" is not a retention policy — it is a capacity and compliance liability. Every data classification needs an explicit retention duration with a defined action at expiry.

**❌ Mistake 6 — Cross-Store Transactions**
Distributed transactions spanning multiple stores are expensive, complex, and fragile. The correct design is: single-store atomic transactions for write + domain events for eventual consistency across stores.

**❌ Mistake 7 — Vendor Lock-in in Storage Architecture**
This document does not name specific databases, cloud services, or vendors. Storage architecture must be expressed in logical terms so implementation can adapt to technology changes without redesigning the architecture.

**❌ Mistake 8 — No Monitoring**
A storage system without monitoring will fail silently. Capacity exhaustion, backup failure, and audit chain breaks are all silent failures without the monitoring and alerting layer defined here.

---

### 9.6 Architecture Rules

**ARCH-STR-001 — Source Domain Is Always Authoritative**
The Entity Store, holding domain entity records, is the source of truth. Graph Store, Search Index, and Cache are derived copies. Any discrepancy is resolved in favor of the Entity Store.

**ARCH-STR-002 — Audit and Version Stores Are Immutable**
No delete or update operation exists on the Audit Store or Version Store. These stores grow only — they never shrink through operational action.

**ARCH-STR-003 — Universe Isolation Is a Storage-Level Guarantee**
Partition-level isolation means isolation failures are impossible through application bugs. Query-time filtering as the only isolation mechanism is insufficient.

**ARCH-STR-004 — Every Write Is Durable Before Acknowledgment**
A write acknowledged to the caller has been durably committed to the primary store. Acknowledge-then-persist patterns are not acceptable for any domain data.

**ARCH-STR-005 — Derived Stores Are Eventually Consistent**
All stores other than the primary source store operate under eventual consistency. Systems that depend on these stores for correctness must handle and tolerate lag.

**ARCH-STR-006 — Vendor Independence Is Maintained**
Storage selection is a technology decision, not an architecture decision. The architecture defines the logical requirements; technology selection satisfies those requirements.

**ARCH-STR-007 — Storage Migrations Are Zero-Downtime**
Any migration that requires a maintenance window is an unacceptable design. Online migration patterns are mandated for all storage changes.

**ARCH-STR-008 — Backup Restorability Is a First-Class Requirement**
Backup creation without restore verification is a false sense of security. Restore capability is part of the backup architecture.

---

> *"Storage is not the foundation of StoryOS — intelligence is. But without a well-designed storage layer, that intelligence has nowhere durable, secure, and scalable to live. Storage architecture is how we make good architecture permanent."*

---

**Document End**
**Previous:** `docs/architecture/knowledge_graph_architecture.md` — Task 1.5 Approved
**Next:** `docs/architecture/versioning_architecture.md` — Task 1.7
