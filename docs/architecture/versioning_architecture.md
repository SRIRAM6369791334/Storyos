# Versioning Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.7 — Versioning Architecture
> **Depends On:** `entity_architecture.md`, `metadata_architecture.md`, `relationship_architecture.md`, `knowledge_graph_architecture.md`, `storage_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/search_architecture.md` — Task 1.8

---

## Preface

In a traditional writing platform, versioning means simple file saves, document revision history, or basic undo/redo buffers. In StoryOS — an Enterprise AI Platform for narrative universes — versioning is a foundational, multi-dimensional intelligence subsystem.

A Story Universe is not a flat document file. It is a living, multi-layered knowledge graph evolving across two independent temporal dimensions:
1. **Real-World System Time (Creation History):** The sequence of edits, AI agent inferences, creator revisions, and editorial reviews.
2. **In-Universe Story Time (Narrative Chronology):** The chronological timeline of events within the fictional world (e.g., Year 100 Founding → Year 150 Battle → Year 200 Fall).

Furthermore, writers constantly explore alternate storylines ("What if the antagonist survives Chapter 4?"), AI agents generate speculative plot branches, editors review candidate Canon additions, and readers navigate diverging timelines.

The Versioning Architecture defines how every state change — across entities, metadata, relationships, knowledge graphs, workflows, and story universes — is immutably recorded, reconstructed, branched, merged, compared, restored, and governed at enterprise scale.

> **Central architectural truth:** In StoryOS, history is strictly append-only and immutable. State is never mutated in place; it is advanced through versioned events. The past is never overwritten; alternate realities exist as distinct branches of a single, cryptographically verifiable version graph.

---

## Part I — Versioning Principles

### 1.1 Versioning Philosophy

StoryOS models story evolution through a **graph-based version tree**, sharing conceptual alignment with distributed version control systems (such as Git), but architected natively for domain entities, Knowledge Graphs, and human-AI co-creation.

The architecture rests on seven core philosophical pillars:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SEVEN PILLARS OF VERSIONING                        │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ 1. Immutability   │ 2. First-Class    │ 3. Canon Sovereignty            │
│    (Append-only)  │    Branching      │    (Single source of truth)     │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 4. Structural     │ 5. AI Isolation   │ 6. Dual-Time Dimension          │
│    Diffing        │    (Non-Canon)    │    (System vs. Story time)      │
├───────────────────┴───────────────────┴─────────────────────────────────┤
│ 7. Cryptographic Chain Integrity (SHA-256 / Ed25519)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Immutability of the Past (Event-Sourced Truth):** Once a version record is committed, it can never be altered, overwritten, or deleted. Every version is an immutable historical snapshot.
2. **Branching as a First-Class Narrative Primitive:** Exploring alternate storylines is not executed by copying projects or downloading backups. It is achieved by spawning a named branch off the Version Graph of a Story Universe.
3. **Canon Sovereignty:** The `main` branch represents authoritative story truth (`Canon`). Experimental plotlines, writer drafts, and AI-proposed extractions exist in separate, unmerged branches until confirmed by human creators into Canon.
4. **Structural & Semantic Diffing:** Version comparisons are not raw line-by-line text diffs. They are structural and semantic diffs of entity attributes, graph edges, metadata schemas, and timeline states.
5. **Decoupled Story Time vs. System Time:** System time tracks real-world creation history (`SystemTimestamp`). Story time tracks chronological in-universe history (`StoryTimePoint`). The Versioning Architecture bridges both.
6. **AI Proposal Isolation:** All AI-generated suggestions (entity extractions, relationship inferences, prose continuations) are written exclusively to isolated `AI_PROPOSAL` branches.
7. **Cryptographic Provenance:** Version records are hash-chained (`SHA-256`) and optionally signed (`Ed25519`), providing verifiable cryptographic proof of narrative provenance.

---

### 1.2 Versioning Design Goals

| Goal ID | Goal Name | Technical Specification |
|---|---|---|
| **VG-01** | **Immutable Auditability** | Guarantee a gapless, tamper-evident version history for all governed domain objects across the entire platform. |
| **VG-02** | **Time-Travel Reconstruction** | Reconstruct the complete, accurate state of any entity, relationship, graph, or universe at any point in system or story time within $< 100\text{ms}$. |
| **VG-03** | **First-Class Branching** | Support non-destructive exploration of alternate plotlines and AI proposals via branch operations without data duplication. |
| **VG-04** | **Three-Way Semantic Merge** | Provide deterministic, structural merge algorithms for reconciling diverging storyline branches, surfacing logical conflicts automatically. |
| **VG-05** | **AI Proposal Isolation** | Keep AI-generated inferences in isolated version branches until explicit human creator review and Canon promotion. |
| **VG-06** | **Gapless Sequence Ordering** | Enforce strict, monotonic, gapless version numbering (`1, 2, 3...`) per aggregate root branch. |
| **VG-07** | **Zero-Downtime Schema Evolution** | Ensure historical versions remain readable even as entity schemas evolve over years of platform updates. |
| **VG-08** | **Storage Efficiency** | Combine periodic full snapshots with delta/diff encoding to optimize long-term Version Store utilization. |
| **VG-09** | **Cryptographic Integrity** | Hash-chain version records to guarantee cryptographic proof of history and detect physical database tampering. |
| **VG-10** | **Granular Scope Hierarchy** | Support seamless versioning across single-entity level, aggregate root level, Knowledge Graph subgraph level, and macro Story Universe snapshot level. |

---

### 1.3 Version Rules

**Rule VER-001 — History Is Absolute & Immutable**
No operation, system script, or administrative role can update or delete an existing `VersionRecord`. Updates to domain entities create new version records. Deletions are represented as tombstone versions.

**Rule VER-002 — Monotonic Version Numbering Per Branch**
Versions within a single entity branch follow a strict, gapless, monotonically increasing integer sequence ($V_1, V_2, V_3, \dots$). Any detected gap indicates database corruption or missing records.

**Rule VER-003 — Complete Snapshot Availability (Hybrid Model)**
While deltas are used for storage optimization, every version checkpoint must be deterministically reconstructible as a complete state snapshot without requiring full chain replay from genesis.

**Rule VER-004 — Canon Branch Authority**
Only one branch per Story Universe can carry the `isCanon = true` flag (default: `main`). The Canon branch represents the official published storyline.

**Rule VER-005 — AI Inferences Live in Non-Canon Branches**
AI-generated content, inferences, and proposals are committed to non-Canon branches (`AI_PROPOSAL` or `EXPERIMENTAL`) until explicitly merged into Canon by an authorized creator.

**Rule VER-006 — Structural Integrity on Restore**
Restoring an entity to a past version must validate referential integrity against the target version's universe state. If referenced entities no longer exist, the restore operation flags orphan references.

**Rule VER-007 — Mandatory Universal Attribution**
Every `VersionRecord` must record the exact actor ID (User, AI Agent, System Process), real-world timestamp, triggering event ID, and commit message.

**Rule VER-008 — Total Branch Isolation**
Changes committed to Branch A have zero effect on Branch B until an explicit `VersionMerge` operation is executed and confirmed.

**Rule VER-009 — Coordinated Relationship Versioning**
When a relationship changes, the Relationship aggregate receives a new version, and the participating source and target entities receive updated version pointers atomically.

**Rule VER-010 — Version Store Storage Separation**
Version records are physically stored in the append-only `Version Store` (`storage_architecture.md`), structurally isolated from active application state tables.

---

### 1.4 Version Lifecycle

```
                                  [GENESIS VERSION (v1)]
                                            │
                                            ▼
                                   [EDIT VERSION (v2)]
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
          [CANON PROMOTION (v3)]                        [CREATE BRANCH]
                     │                                  ("Alternate Arc")
                     ▼                                             │
          [CANON BRANCH (v4)]                                      ▼
                     │                                    [BRANCH EDIT (v1-B1)]
                     │                                             │
                     │                                             ▼
                     │                                    [AI PROPOSAL (v1-B2)]
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            ▼
                                  [MERGE REQUEST & REVIEW]
                                            │
                                            ├─► [CONFLICT RESOLUTION]
                                            │
                                            ▼
                                  [MERGED CANON VERSION (v5)]
```

---

### 1.5 Version Ownership Matrix

| Domain | Primary Versioning Responsibility |
|---|---|
| **Versioning Domain** | Owns `VersionManager`, `VersionRecord`, `VersionBranch`, `VersionSnapshot`, diff engines, and 3-way merge engines |
| **Entity Domain** | Triggers version creation on aggregate state mutations (Character, Location, Faction, etc.) |
| **Relationship Domain** | Provides state updates for relationship versioning and inverse edge updates |
| **Knowledge Graph Domain** | Provides graph topology snapshots for `GraphVersion` records |
| **Canon Management Domain** | Authorizes promotion of branches/versions to `Canon` status |
| **Storage Domain** | Owns physical `Version Store` (append-only storage engine) |
| **AI Domain** | Owns AI proposal branches, inference version tracking, and automated proposal pruning |
| **Workflow Domain** | Manages version requirements for stage transitions and approval checkpoints |
| **Audit Domain** | Synchronizes version creation events into the permanent, immutable Audit Store |

---

### 1.6 Version Validation Principles

**VAL-VER-001 — Cryptographic Hash Verification**
Every `VersionRecord` contains a SHA-256 hash calculated over its payload and the hash of its parent version (`parentVersionHash`). Re-calculating the hash chain during integrity audits must match stored hashes.

$$\text{VersionHash}_N = \text{SHA256}(\text{Payload}_N \parallel \text{VersionHash}_{N-1} \parallel \text{Timestamp}_N \parallel \text{AuthorID})$$

**VAL-VER-002 — Schema Conformance**
The state payload of a `VersionRecord` must conform to the `SchemaVersion` declared in its header. If schema migrations have occurred, payload transformers are applied automatically upon read.

**VAL-VER-003 — Parent Reference Check**
A new version (except Version 1) must reference a valid, existing `parentVersionId` within the same branch.

**VAL-VER-004 — Merge Common Ancestor Validation**
A `VersionMerge` operation must identify a valid `commonAncestorVersionId` shared by the source and target branches.

---

### 1.7 Version Security Architecture

**SEC-VER-001 — Append-Only Storage Security**
The Version Store engine enforces `INSERT`-only operations at the database access tier. `UPDATE` and `DELETE` SQL/NoSQL commands are physically disabled for version storage roles.

**SEC-VER-002 — Role-Gated Branching & Merging**
- **Reader:** Can read public/Canon version history.
- **Writer:** Can create personal branches, edit, and submit merge requests.
- **Editor / Admin:** Can approve merges into the `Canon` branch, execute rollbacks, manage version tags, and delete branches.

**SEC-VER-003 — Secret Entity Masking in History**
If a historical version contains a field subsequently marked `isSecret = true`, reading that past version requires `SECRET_ACCESS` role. Secret visibility policies apply retroactively across all version snapshots.

---

## Part II — Version Model

### 2.1 VersionManager (Domain Service)

**Purpose:** The central governance authority coordinating all versioning operations — snapshot generation, history traversal, branching, diff computation, and three-way merging across all domains.

**Properties & Interface:**

| Property / Method | Type | Description |
|---|---|---|
| `managerId` | `ManagerId` | Singleton per deployment instance |
| `universeId` | `UniverseId` | Owning Story Universe |
| `activePolicies` | `VersionPolicy[]` | Active retention and snapshot policies |
| `status` | `ManagerStatus` | ACTIVE / REINDEXING / INTEGRITY_CHECKING |
| `createVersion()` | Method | Creates a new version record for an aggregate |
| `createSnapshot()` | Method | Captures a full universe or subgraph snapshot |
| `createBranch()` | Method | Spawns a new branch from a specific version |
| `mergeBranches()` | Method | Executes a 3-way merge between source and target branches |
| `computeDiff()` | Method | Computes structural/semantic diff between two versions |
| `restoreVersion()` | Method | Restores an aggregate to a prior version state |

---

### 2.2 VersionRecord (Aggregate Root)

**Purpose:** The atomic, immutable domain object representing a single state change for a governed aggregate or entity.

**Properties:**

| Property | Type | Constraint | Description |
|---|---|---|---|
| `versionId` | `VersionId` | Immutable | System-generated UUIDv7 (time-ordered) |
| `universeId` | `UniverseId` | Immutable | Owning Story Universe ID |
| `aggregateId` | `EntityId` | Immutable | ID of the aggregate root being versioned |
| `aggregateType` | `EntityType` | Immutable | CHARACTER / LOCATION / RELATIONSHIP / GRAPH / etc. |
| `versionNumber` | `Long` | Monotonic | Sequential version number within this branch (1, 2, 3...) |
| `branchId` | `BranchId` | Immutable | The branch this version belongs to |
| `parentVersionId` | `VersionId?` | Immutable | Direct predecessor version ID (null for v1) |
| `secondaryParentVersionId` | `VersionId?` | Immutable | Set during merge operations (second parent) |
| `changeType` | `VersionChangeType` | Enum | CREATED / UPDATED / DELETED / RESTORED / MERGED / CANON_PROMOTED |
| `statePayload` | `SerializedState` | Compressed | Full snapshot or JSON Patch delta payload |
| `payloadFormat` | `PayloadFormat` | Enum | FULL_SNAPSHOT / JSON_PATCH_DELTA |
| `schemaVersion` | `SemanticVersion` | Immutable | Schema version of the payload (e.g., `1.2.0`) |
| `payloadHash` | `Hash` | SHA-256 | Cryptographic hash of payload content |
| `parentVersionHash` | `Hash` | SHA-256 | Cryptographic hash of parent version record |
| `author` | `ActorRef` | Immutable | User ID or AI Agent ID responsible |
| `commitMessage` | `String` | Required | Human-readable explanation of changes |
| `triggerEventId` | `EventId` | Immutable | Domain event ID that triggered version |
| `systemTimestamp` | `Timestamp` | ISO-8601 | Real-world creation timestamp |
| `storyTimestamp` | `StoryTimePoint?` | Optional | In-universe story time associated with version |

---

### 2.3 VersionSnapshot

**Purpose:** A coarse-grained, frozen representation of an entire Story Universe or large subgraph at a specific point in system time.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `snapshotId` | `SnapshotId` | Immutable identifier |
| `universeId` | `UniverseId` | Governed Story Universe |
| `branchId` | `BranchId` | Originating branch ID |
| `label` | `String` | Human label (e.g., "Draft 1 Complete", "Pre-Act 2 Re-write") |
| `manifest` | `SnapshotManifest` | Map of `EntityId → VersionId` for every active entity |
| `graphSnapshotId` | `GraphSnapshotId` | Corresponding Knowledge Graph snapshot ID |
| `createdReason` | `SnapshotReason` | MILESTONE / MANUAL_CHECKPOINT / PRE_MERGE / CANON_RELEASE |
| `storageRef` | `StorageRef` | Object Store key where snapshot binary is stored |
| `author` | `ActorRef` | Creator or System process |
| `timestamp` | `Timestamp` | ISO-8601 creation time |

---

### 2.4 VersionBranch

**Purpose:** A named, isolated line of development in a Story Universe. Allows writers and AI agents to work independently without polluting Canon.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `branchId` | `BranchId` | Unique identifier |
| `universeId` | `UniverseId` | Parent Story Universe ID |
| `name` | `String` | Unique within universe (e.g., `main`, `ai-proposals-ch4`, `what-if-hero-dies`) |
| `branchType` | `BranchType` | CANON / EXPERIMENTAL / AI_PROPOSAL / WORKFLOW / ARCHIVE |
| `headVersionId` | `VersionId` | Pointer to the current latest version on this branch |
| `baseVersionId` | `VersionId` | The version on the parent branch where this branch split |
| `parentBranchId` | `BranchId?` | Parent branch ID (null for primary `main` branch) |
| `isCanon` | `Boolean` | True ONLY for the official Canon branch (`main`) |
| `isProtected` | `Boolean` | True if direct commits are forbidden (requires Merge Request) |
| `createdBy` | `ActorRef` | User or AI agent ID |
| `createdAt` | `Timestamp` | Creation time |

---

### 2.5 VersionTimeline

**Purpose:** The ordered sequence of versions representing the historical trajectory of a specific entity or universe branch.

---

### 2.6 VersionDiff

**Purpose:** The calculated structural and semantic difference between two versions (or between a version and a base snapshot).

**Properties:**

| Property | Type | Description |
|---|---|---|
| `diffId` | `DiffId` | Unique identifier |
| `baseVersionId` | `VersionId` | Target comparison origin |
| `targetVersionId` | `VersionId` | Target comparison destination |
| `entityDiffs` | `EntityDiff[]` | List of added, modified, or removed entity attributes |
| `relationshipDiffs` | `RelationshipDiff[]` | List of added, modified, or removed relationships |
| `metadataDiffs` | `MetadataDiff[]` | List of altered metadata keys |
| `graphDiff` | `GraphDiff` | Subgraph node/edge delta |
| `semanticSummary` | `String` | AI-generated human-readable summary of narrative changes |

---

### 2.7 VersionMerge

**Purpose:** A formal domain operation that combines changes from a source branch into a target branch (e.g., merging an AI Proposal branch into Canon).

---

### 2.8 VersionConflict

**Purpose:** Represents a structural or semantic collision detected during a branch merge.

| Field | Type | Description |
|---|---|---|
| `conflictId` | `ConflictId` | Unique identifier |
| `mergeId` | `MergeId` | Associated merge request |
| `entityId` | `EntityId` | Conflicting entity ID |
| `conflictType` | `ConflictType` | ATTRIBUTE_MUTATION / RELATIONSHIP_CONTRADICTION / DELETION_EDIT / GRAPH_CYCLE / CANON_VIOLATION |
| `sourceValue` | `String` | Value in source branch |
| `targetValue` | `String` | Value in target branch |
| `ancestorValue` | `String` | Original base value |
| `resolution` | `ConflictResolution?` | ACCEPT_SOURCE / ACCEPT_TARGET / MANUAL_OVERRIDE |
| `resolvedBy` | `ActorRef?` | User who resolved conflict |

---

### 2.9 VersionTag & VersionLabel

- **VersionTag:** Immutable named pointer to a specific `VersionId` (e.g., `v1.0-release`, `act-1-final`).
- **VersionLabel:** Dynamic, moveable label pointing to a current milestone (e.g., `latest-stable`, `editor-review-target`).

---

### 2.10 VersionPolicy

**Purpose:** Defines retention windows, automatic snapshot frequencies, branch limits, and merge approval requirements per Story Universe.

---

### 2.11 VersionStatistics

**Purpose:** Real-time metrics reporting version counts, storage consumption, active branch counts, merge success rates, and conflict frequencies.

---

## Part III — Version Types

StoryOS enforces specialized versioning behaviors across nine distinct domain object categories:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             VERSION TYPES                                │
├───────────────┬───────────────┬───────────────┬───────────┬──────────────┤
│ 1. Entity     │ 2. Metadata   │ 3. Relationship│ 4. Graph  │ 5. Canon     │
│    Versions   │    Versions   │    Versions   │   Versions│    Versions  │
├───────────────┼───────────────┼───────────────┼───────────┼──────────────┤
│ 6. AI Proposal│ 7. Workflow   │ 8. Config     │ 9. Universe              │
│    Versions   │    Versions   │    Versions   │    Versions              │
└───────────────┴───────────────┴───────────────┴──────────────────────────┘
```

### 3.1 Entity Versions

Every aggregate root in the Entity Domain (Character, Location, Faction, Item, Event, NarrativeUnit) maintains an independent version sequence.

- **Trigger:** Any attribute change (e.g., Character name change, Location status update).
- **Payload:** Full state snapshot for key checkpoints; JSON Patch deltas for intermediate minor edits.
- **Invariants:** Updating a child entity (e.g., Character Trait) produces a new VersionRecord for the parent Aggregate Root.

---

### 3.2 Metadata Versions

Governed by the Metadata Architecture (`metadata_architecture.md`), metadata changes are versioned alongside host entities.

- **Trigger:** Addition, modification, or removal of any `MetadataValue`.
- **Special Rule:** Schema version changes (`MetadataSchema` update) trigger batch validation across all affected `MetadataValue` version chains.

---

### 3.3 Relationship Versions

Relationships are first-class domain objects (`relationship_architecture.md`).

- **Trigger:** Relationship creation, attribute update (strength/sentiment), status transition (ACTIVE → ENDED), or secret status reveal.
- **Coordinated Versioning:** When Relationship R between Entity A and Entity B changes, R receives a new `RelationshipVersion`. Lightweight `RelationshipReference` pointers on A and B are updated to reference R's new version ID.

---

### 3.4 Graph Versions

Tracks structural changes to the Knowledge Graph topology (`knowledge_graph_architecture.md`).

- **Trigger:** Graph node addition/deletion, edge addition/deletion, or partition promotion.
- **Payload:** Recorded as a `GraphVersion` event containing affected `NodeId[]` and `EdgeId[]` lists and topology delta patch.

---

### 3.5 Canon Versions

`Canon` is authoritative story truth. Canon versions represent confirmed milestone states.

- **Rule:** A `CanonVersion` requires an explicit creator confirmation event.
- **Tagging:** Canon versions receive immutable tags (`CANON-v1`, `CANON-v2`) and form the spine of the primary `main` branch.

---

### 3.6 AI Proposal Versions

Inferences, generated text, and entity suggestions produced by AI agents.

- **Isolation:** Committed to temporary `AI_PROPOSAL` branches (e.g., `ai/agent_extract/prop_8812`).
- **Promotion:** When approved, the AI Proposal branch is merged into the Canon branch, producing a new Canon `VersionRecord` carrying AI attribution metadata.

---

### 3.7 Workflow Versions

Tracks changes to `WorkflowInstance` state (Stage transitions, review sign-offs, approvals).

- Operational versioning stored in the Operational partition of the Version Store.

---

### 3.8 Configuration Versions

Platform, Organization, and Universe configuration edits.

- Managed as versioned key-value documents with mandatory 1-year history retention.

---

### 3.9 Universe Versions

The macro-version representing the composite state of the entire Story Universe.

- **Universe Version N** = Composite tuple of `(UniverseSnapshotId, GraphSnapshotId, CanonBranchHeadVersionId)`.

---

## Part IV — Behavior

### 4.1 Create Version Flow

```
[Application Layer] Mutation Request for Entity A
        │
        ▼
[Entity Domain] Validate business logic & state transition
        │
        ▼
[Versioning Domain] Fetch current HEAD VersionRecord for Entity A on active Branch
        │
        ▼
Calculate next versionNumber = (HEAD.versionNumber + 1)
        │
        ▼
Generate Payload (Full Snapshot or JSON Patch Delta)
        │
        ▼
Compute SHA-256 payloadHash and parentVersionHash
        │
        ▼
Instantiate VersionRecord (UUIDv7, ActorRef, Timestamps, Commit Message)
        │
        ▼
[Transaction Boundary (Storage Domain)]
  ├── 1. INSERT VersionRecord into Version Store (Append-Only)
  └── 2. UPDATE Entity A current_version_id in Entity Store
        │
        ▼
[Domain Event] Publish VersionCreated to Event Bus
        │
        ├──► Search Indexer (Incremental Index Update)
        ├──► Knowledge Graph Sync (Graph Edge Sync)
        └──► Audit Store (Append Audit Log Entry)
```

---

### 4.2 Snapshot Strategy (Hybrid Model)

To prevent deep version chain replay performance degradation, StoryOS enforces a **Hybrid Snapshot-Delta Strategy**:

- **Delta Encoding:** Minor intermediate edits store JSON Patch deltas (RFC 6902).
- **Periodic Checkpoint Snapshots:** Every **20 versions**, or on any **Canon Promotion** / **Branch Creation**, a full aggregate snapshot is mandatorily written.
- **Time-Travel Reconstruction:** Reading Version N requires fetching the nearest preceding full snapshot ($S$) and applying deltas from $S \to N$. Maximum delta applications = 19 steps.

$$\text{Reconstruction}(V_N) = \text{State}(S_k) + \sum_{i=k+1}^{N} \text{Delta}(V_i)$$

```
v1 (FULL) ──► v2 (DELTA) ──► v3 (DELTA) ... ──► v20 (FULL CHECKPOINT) ──► v21 (DELTA)
```

---

### 4.3 Restore & Rollback

- **Restore (Entity Level):** Reverts a single entity to a past version state by creating a **new** `VersionRecord` (Version N+1) whose state payload is an exact copy of Version P. This preserves complete intermediate history without deleting any intervening records.
- **Rollback (Universe Level):** Repointers the Branch `headVersionId` to a prior `VersionSnapshotId`. Subsequent writes branch forward from the rollback target.

---

### 4.4 Compare & Diff Engine

The Versioning Domain provides a structural Diff Engine operating across three levels:

1. **Primitive Field Diff:** Scalar value comparison (`before` vs `after`).
2. **Aggregate Struct Diff:** Property additions, removals, child entity array changes.
3. **Graph Topology Diff:** Evaluates graph adjacency matrix deltas (added edges, removed edges, weight shifts).

---

### 4.5 Branch & Merge Engine

#### Branching:
Creating a branch creates a new `VersionBranch` record setting `baseVersionId` and `headVersionId` to the current version of the source branch. Zero data is duplicated.

#### Merging (Three-Way Merge Algorithm):
```
Source Branch Head (S) ──────┐
                             ├─► Three-Way Merge Engine ──► Result (M)
Target Branch Head (T) ──────┤
                             │
Common Ancestor (A) ─────────┘
```

1. Identify Lowest Common Ancestor $A = \text{LCA}(S, T)$.
2. Compute Delta $\Delta S = S - A$ and Delta $\Delta T = T - A$.
3. Evaluate overlap:
   - If $\Delta S$ and $\Delta T$ modify disjoint entities/fields: **Clean Auto-Merge**.
   - If $\Delta S$ and $\Delta T$ modify the same field to different values: **Conflict Flagged**.
   - If $\Delta S$ deletes an entity that $\Delta T$ modified: **Deletion Conflict Flagged**.
4. Generate `VersionMerge` report.
5. If no conflicts (or after all conflicts are resolved), commit Merge Version $M$ having `parentVersionId = T` and `secondaryParentVersionId = S`.

---

### 4.6 Canon Promotion Flow

```
1. AI Agent or Writer completes work on Branch B
2. Creator submits "Promote to Canon" request
3. System executes pre-promotion validation gate:
   - Run Consistency Checking Agent across Branch B
   - Verify zero unresolved contradictions
   - Verify structural schema validity
4. Editor/Admin reviews VersionDiff(CanonHead, BranchBHead)
5. Editor approves promotion
6. Three-Way Merge executed into Canon Branch (`main`)
7. New Canon VersionRecord committed (`changeType = CANON_PROMOTED`)
8. Immutable Tag attached: `CANON-V{X}`
9. Domain Event: CanonPromoted emitted to Knowledge Graph & Search Sync
```

---

## Part V — Multi-Timeline Architecture

StoryOS supports complex narrative structures requiring multiple concurrent story timelines (e.g., sci-fi time travel, branching choose-your-own-adventure narratives, or writer exploratory drafts).

```
                            ┌──► Branch: Timeline Alpha (Alternate Future)
                            │
Master Canon Timeline ──────┼──► Branch: Timeline Beta (Past Retcon)
                            │
                            └──► Branch: AI Workspace (Unconfirmed Proposals)
```

### 5.1 Alternate Timelines

An Alternate Timeline is represented as a dedicated `VersionBranch` with `branchType = EXPERIMENTAL`.

- Entities within an Alternate Timeline inherit base state from the Canon split point.
- Mutations in the Alternate Timeline create versions scoped exclusively to that branch.
- In-universe story time (`storyTimestamp`) can diverge across timelines (e.g., Year 2050 in Timeline Alpha vs Year 1990 in Timeline Beta).

---

### 5.2 Branch Graphs

Each `VersionBranch` maintains its own Knowledge Graph projection (`GraphView`).

- Nodes and edges in Branch B are queryable via the Graph Traversal Engine by specifying `branchId = BranchB`.
- The traversal engine applies branch inheritance: queries look for nodes/edges in `BranchB`; if not present, they fall back to `baseVersionId` on the parent Canon branch.

---

### 5.3 AI Proposal Timelines

AI agents operate inside isolated `AI_PROPOSAL` branches.

- Every AI reasoning pass or text generation session runs inside an ephemeral proposal branch.
- The AI can mutate entities, add relationships, and create story events within its branch.
- Human creators inspect the branch via visual `VersionDiff` tools.
- Accepting a proposal executes a merge into Canon; rejecting it archives the branch.

---

## Part VI — Consistency & Integrity

### 6.1 Immutable History Guarantee

History immutability is enforced at three architectural layers:

1. **Domain Layer:** Aggregate roots do not expose `updateVersion()` methods. Only `createNextVersion()` is valid.
2. **Database Layer:** Version Store database role possesses only `SELECT` and `INSERT` privileges. `UPDATE` and `DELETE` commands do not exist.
3. **Cryptographic Layer:** SHA-256 hash chaining ensures any physical tampering with historic disk sectors invalidates the hash chain check.

---

### 6.2 Gap Detection

The `VersionManager` runs continuous background sequence verification:

$$\text{Expected Version}(N) = \text{Version}(N-1) + 1$$

If a query detects a version chain containing `v1, v2, v4`, the Versioning Domain immediately flags a `VersionGapException`, quarantines the branch, and alerts system administrators.

---

### 6.3 Concurrency & Optimistic Locking

To prevent race conditions during simultaneous edits:

```
1. Writer A reads Character X (current versionId = v5)
2. Writer B reads Character X (current versionId = v5)
3. Writer A commits edit:
   - Target parentVersionId = v5
   - System accepts -> Character X is now v6
4. Writer B attempts to commit edit:
   - Target parentVersionId = v5
   - System checks Head Version on branch (now v6)
   - Discrepancy detected (v5 != v6)
5. Writer B's commit is REJECTED with ConcurrentModificationException
6. Writer B's client automatically invokes 3-Way Auto-Merge or prompts user to resolve
```

---

## Part VII — Security & Compliance

### 7.1 Cryptographic Signatures

High-assurance enterprise installations require cryptographic non-repudiation for Canon confirmation:

- When an Editor promotes a version to Canon, the `VersionRecord` is signed using the Editor's asymmetric private key (`Ed25519`).
- The digital signature is stored in `VersionRecord.signature`.
- Public key verification proves exactly which human creator authorized a Canon state.

---

### 7.2 Audit System Integration

The Versioning Domain integrates directly with the Audit Store (`storage_architecture.md`):

- Every `VersionRecord` creation automatically writes a corresponding `AuditRecord` to the immutable Audit Store.
- Audit records link `auditId → versionId`, establishing full traceability from user UI click to disk storage.

---

### 7.3 Compliance & Retention

- **Canon & Branch History:** Retained permanently for active universes.
- **Deleted Universes:** Version history retained according to Organization retention tier (Enterprise default: 10 years).
- **GDPR Anonymization:** When a user account is anonymized, the `author.actorId` field across past `VersionRecords` is replaced with `ANONYMOUS_USER_{hash}`. Version state payloads (the creative story content) remain intact.

---

## Part VIII — Domain Integration

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      VERSIONING DOMAIN INTEGRATION                       │
├───────────────────┬───────────────────┬───────────────────┬──────────────┤
│ Entity Domain     │ Relationship Dom  │ Knowledge Graph   │ Storage Dom  │
│ Writes aggregates │ Tracks link state │ Snapshots topology│ Append-only  │
├───────────────────┼───────────────────┼───────────────────┼──────────────┤
│ Workflow Domain   │ Search Domain     │ AI Memory Domain  │ Metadata Dom │
│ Stage gating      │ Indexing diffs    │ Syncs on merge    │ Key versioning│
└───────────────────┴───────────────────┴───────────────────┴──────────────┘
```

### 8.1 Integration Details

1. **Entity Architecture:** Every aggregate mutation emits `EntityMutatedEvent` → consumed by Versioning Domain to write `VersionRecord`.
2. **Metadata Architecture:** Metadata value changes are included in parent entity version payloads and indexed by `MetadataVersion`.
3. **Relationship Architecture:** Relationship state updates trigger `RelationshipVersion` records; entity version payloads reference relationship version IDs.
4. **Knowledge Graph Architecture:** Graph Sync Service consumes `VersionCreated` events to update node/edge partition states.
5. **Storage Architecture:** Writes version payloads directly to the dedicated, append-only `Version Store`.
6. **Workflow Domain:** Workflow stage transitions (e.g., "In Review" → "Approved") require a tagged `VersionSnapshot`.
7. **Search Architecture:** Search Indexer reads `VersionDiff` to perform incremental re-indexing rather than full re-indexing.
8. **AI Memory Domain:** AI agents update their internal Memory Graphs by consuming version diff streams (`vN → vN+1`).

---

## Part IX — Best Practices & Rules

### 9.1 Naming Conventions

| Object | Pattern | Example |
|---|---|---|
| Branch Name (Canon) | `main` | `main` |
| Branch Name (User) | `user/{userId}/{topic}` | `user/usr_92/re-write-ch3` |
| Branch Name (AI) | `ai/{agentId}/{proposalId}` | `ai/agent_extract/prop_8812` |
| Immutable Tag | `v{major}.{minor}-{label}` | `v1.0-canon-release` |
| Version ID | UUIDv7 (Time-ordered) | `018f3a5b-7c12-7000-8000-000000000001` |

---

### 9.2 Performance Guidelines

1. **Never Replay Whole Chains:** Always utilize periodic full snapshots (every 20 versions) during history reconstruction.
2. **Asynchronous Diff Generation:** Compute semantic diffs asynchronously via background workers; do not block the write transaction.
3. **Lazy Payload Loading:** When querying version timelines, retrieve version headers (`versionId`, `author`, `timestamp`, `commitMessage`) first. Fetch large `statePayload` blobs only on explicit selection.
4. **Branch Pruning:** Automatically archive stale, unmerged AI proposal branches after 30 days of inactivity.

---

### 9.3 Common Mistakes to Avoid

**❌ Mistake 1 — Treating Versioning as File Backups**
Versioning is an active narrative graph primitive, not a zip file of the database created once a night.

**❌ Mistake 2 — In-Place Mutation of Version Records**
Attempting to edit a version commit message or timestamp by modifying an existing row. Version records are strictly immutable.

**❌ Mistake 3 — Unbounded Replay Chains**
Reconstructing Version 500 by applying 499 sequential deltas. Always enforce mandatory checkpoint snapshots.

**❌ Mistake 4 — Direct Commits to Canon by AI**
Allowing AI agents to commit directly to the `main` Canon branch. AI work must always occur on isolated proposal branches.

**❌ Mistake 5 — Text-Only Diffing**
Using line-based text diff tools for complex domain entities. StoryOS diffing must be structural and semantic.

---

### 9.4 Architectural Rules Summary

**ARCH-VER-001 — Append-Only Absolute Immutability**
Version history is strictly append-only. No system API or administrative tool shall provide a capability to modify or delete historical `VersionRecords`.

**ARCH-VER-002 — Mandatory Three-Way Merge for Branch Consolidation**
All branch consolidation operations must compute a Three-Way Merge referencing a verified Common Ancestor version.

**ARCH-VER-003 — Strict Monotonic Versioning Per Branch**
Versions on a branch must form a gapless, strictly increasing integer sequence.

**ARCH-VER-004 — Canon Isolation Guarantee**
The `main` Canon branch shall only accept state changes via authorized human creator commits or verified merge approval events.

**ARCH-VER-005 — Deterministic Snapshot Reconstruction**
Any historic version state must be deterministically reconstructible within $< 100\text{ms}$ latency using the Hybrid Snapshot-Delta strategy.

---

> *"Memory is the cornerstone of intelligence. The Versioning Architecture gives StoryOS an unerasable narrative memory — allowing creators and AI agents to explore endless alternate worlds while keeping Canon truth absolute, verifiable, and permanent."*

---

**Document End**
**Previous:** `docs/architecture/storage_architecture.md` — Task 1.6 Approved
**Next:** `docs/architecture/search_architecture.md` — Task 1.8
