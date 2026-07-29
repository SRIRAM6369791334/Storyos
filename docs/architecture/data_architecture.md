# Data Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.1 — Data Architecture
> **Depends On:** `docs/domain/domain_model.md` — v1.0 Approved
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/entity_architecture.md` — Task 1.2

---

## 1. Purpose

Before designing tables, schemas, or storage engines, StoryOS must answer a more fundamental question: **what kinds of data exist in this system, and how does each kind behave?**

Data behaves differently. Some data is created once and never changes. Some data changes constantly and every change must be preserved. Some data is computed from other data and can be regenerated. Some data is owned by the creator and sovereign. Some data belongs to the system and is generated automatically.

This document classifies every data category in StoryOS, defines its properties, identifies its owner, and describes its lifecycle. The storage design in later phases will follow directly from this classification.

> **Governing Rule:** Data classification drives storage design. Storage design never drives data classification.

---

## 2. Data Classification Overview

StoryOS data is organized into nine primary classifications:

| Class | Symbol | Nature | Example |
|---|---|---|---|
| Canon Data | `[C]` | Creator-confirmed story truth; authoritative | Character attributes, world rules, confirmed events |
| Structural Data | `[S]` | Platform-defined configuration; long-lived | Organization settings, workflow templates, role definitions |
| Versioned Data | `[V]` | Mutable with full history preservation | All entity states across their lifetime |
| Derived Data | `[D]` | Computed from other data; regenerable | Consistency scores, relationship counts, search indices |
| AI Memory Data | `[M]` | Agent-scoped persistent reasoning context | Memory Graph, per-agent inference context |
| Transactional Data | `[T]` | Records of actions; immutable after creation | Audit records, workflow decisions, version records |
| Temporary Data | `[X]` | Short-lived operational state; not permanently stored | Active sessions, in-progress import previews, agent task queues |
| Proposed Data | `[P]` | AI-inferred candidates awaiting creator review | Knowledge proposals, extraction candidates, consistency flags |
| Metadata | `[A]` | Descriptive attributes attached to other data | Tags, custom fields, classification labels |

Each data classification has distinct properties that govern how it is stored, queried, retained, and governed.

---

## 3. Canon Data `[C]`

### 3.1 Definition

Canon Data is the set of facts that have been explicitly confirmed by a creator as true within their Story Universe. It is the authoritative source of truth against which all AI reasoning, consistency checking, and content validation is performed.

### 3.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Mutable by creator action only; never by automated processes |
| **Modification path** | Creator action → Canon Change Request → Creator Confirmation → Canon Update |
| **AI write access** | None — AI agents submit proposals; they never write Canon |
| **Historical preservation** | Full — every Canon state is preserved; superseded Canon is archived, never deleted |
| **Access control** | Scoped to Story Universe; role-based read access |
| **Isolation boundary** | Story Universe — Canon from Universe A is never visible to Universe B |
| **Consistency guarantee** | Strong consistency — all readers see the same Canon state after a confirmed write |

### 3.3 Canon Data Types

| Data Type | Owner Domain | Description |
|---|---|---|
| Character attributes (confirmed) | Character Domain | Name, aliases, appearance, psychology, status — all confirmed by creator |
| World rules (confirmed) | World Building Domain | Physics, magic, social, and environmental rules of the story world |
| Events (Canon status) | Timeline Domain | Story occurrences confirmed as having happened in the Story Universe |
| Relationships (confirmed) | Relationship Domain | Typed, directed connections between entities confirmed as true |
| Knowledge Graph facts (confirmed) | Knowledge Graph Domain | All explicit, creator-confirmed statements in the Knowledge Graph |
| Lore documents (confirmed) | World Building Domain | Authoritative world reference texts confirmed as Canon |
| Timeline ordering (confirmed) | Timeline Domain | The confirmed chronological sequence of Canon events |

### 3.4 Canon Lifecycle

```
Draft Entity Created
    ↓ [Pending — not yet Canon]
Creator Reviews
    ↓ [Canon Change Request created]
Creator Confirms
    ↓ [Canon status assigned]
Canon Record Created → Audit logged → Version stamped
    ↓ [Active Canon]
Creator updates fact
    ↓ [Canon Change Request created for update]
Creator Confirms update
    ↓ [New Canon Record; old Canon archived as superseded]
    ↓ [Active Canon — updated]
Story Universe archived
    ↓ [Canon preserved in read-only archive state]
```

### 3.5 What Canon Data is NOT

- A draft or work-in-progress entity is not Canon, even if saved
- An AI inference is not Canon, even if highly confident
- An imported entity is not Canon until explicitly confirmed post-import
- A forked/branched Universe state is not Canon (it is experimental)

---

## 4. Structural Data `[S]`

### 4.1 Definition

Structural Data defines how the platform is configured and how it operates. It is set by administrators and changes infrequently. It governs the rules within which Canon Data, user activity, and AI operations occur.

### 4.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Mutable by authorized administrators only |
| **Change frequency** | Low — changes are deliberate and impactful |
| **Historical preservation** | Versioned — changes are tracked but history is not the primary value |
| **AI write access** | None |
| **Access control** | Organization Admin or Super Admin |
| **Scope** | Organization-level or Platform-level |

### 4.3 Structural Data Types

| Data Type | Owner Domain | Description |
|---|---|---|
| Organization configuration | Organization Domain | Tier, settings, feature flags, data residency policy |
| Workflow templates | Workflow Domain | Stage definitions, transition rules, role assignments |
| Role and permission definitions | Authorization Domain | The permission matrix mapping roles to allowed operations |
| Entity schema definitions | Story Universe Domain | Custom entity types and attribute schemas per Universe |
| Custom relationship type definitions | Relationship Domain | Universe-level relationship type vocabulary |
| Plugin manifests and scopes | Plugin Domain | Installed plugin definitions and approved access scopes |
| AI agent configurations | AI Agent Domain | Agent type configurations, operational parameters |
| Notification channel configurations | Notification Domain | Webhook endpoints, email routing configurations |

### 4.4 Structural Data Lifecycle

```
Administrator creates configuration
    ↓ [Draft configuration]
Validation (does this configuration produce a valid system state?)
    ↓ [Active configuration]
System operates under this configuration
    ↓ [May be updated by Administrator]
Updated configuration replaces previous
    ↓ [Previous version archived for rollback]
Organization archived
    ↓ [Configuration preserved in archive]
```

---

## 5. Versioned Data `[V]`

### 5.1 Definition

Versioned Data is any data that changes over time and whose complete change history must be permanently preserved. This is the most volumetrically significant data class in StoryOS — because every entity change creates a new version record.

### 5.2 Properties

| Property | Value |
|---|---|
| **Mutability** | The current state is mutable; all historical states are immutable |
| **History** | Complete — every state a versioned entity has ever held is preserved |
| **Deletion** | Not permitted for version records — current state may be archived, history is permanent |
| **Storage growth** | Unbounded — grows proportionally to the number of entity changes over time |
| **Access pattern** | Current version is the default; historical versions are accessed by explicit version reference |
| **Consistency guarantee** | Strong for current version; eventual for search index of historical versions |

### 5.3 Versioned Data Types

| Data Type | Version Trigger | Version Content |
|---|---|---|
| Character entity state | Any attribute change | Complete character state at that moment |
| Location entity state | Any attribute change | Complete location state at that moment |
| Event entity state | Any attribute change | Complete event state at that moment |
| Relationship state | Any attribute or status change | Complete relationship state at that moment |
| World rule state | Any modification | Complete rule text and metadata at that moment |
| Narrative content | Any edit to content | Complete content text at that moment |
| Knowledge Graph fact | Any modification | Complete fact with provenance at that moment |
| Workflow template | Any stage or rule change | Complete template definition at that moment |
| Organization settings | Any configuration change | Complete settings state at that moment |

### 5.4 Version Record Structure

Every version record carries:
- The entity identifier
- The entity type
- The complete entity state at this version (full snapshot, not diff)
- The author (user or AI agent with role)
- The timestamp (to millisecond precision)
- The operation type (CREATE / UPDATE / STATUS_CHANGE / ARCHIVE)
- The Canon status of this version (Canon / Pending / Non-Canon / Superseded)
- A reference to the preceding version for the same entity

### 5.5 Versioning Lifecycle

```
Entity Created → Version 1 created (immutable record)
    ↓
Entity Updated → Version 2 created (immutable); Version 1 remains unchanged
    ↓
Entity Updated → Version 3 created (immutable); Versions 1, 2 remain unchanged
    ↓ ... (indefinitely)
Entity Archived → Version N created with ARCHIVE operation type
    ↓
All versions 1 through N remain permanently in Version Store
```

---

## 6. Derived Data `[D]`

### 6.1 Definition

Derived Data is computed from Canon Data and other primary data sources. It has no independent truth value — it is always a representation derived from authoritative sources. Derived data can always be regenerated from its source data, even if it is lost.

### 6.2 Properties

| Property | Value |
|---|---|
| **Mutability** | System-managed; automatically updated when source data changes |
| **Authority** | No independent authority — if derived data conflicts with its sources, the sources are correct |
| **Regenerability** | Always regenerable from source data |
| **Loss consequence** | Recoverable — regenerate from source; no story knowledge is lost |
| **Consistency** | Eventual — derived data may lag behind its source data by a bounded amount |
| **AI write access** | AI may contribute to derived data (e.g., search scores, similarity vectors) |

### 6.3 Derived Data Types

| Derived Data | Source Data | Update Trigger |
|---|---|---|
| Search index | All entity and content data | Entity or content change event |
| Knowledge Graph query cache | Knowledge Graph nodes and edges | Graph mutation event |
| Universe health score | Consistency violations, entity completeness, activity | Consistency check, entity update |
| Relationship count per entity | Relationship records | Relationship create/delete event |
| Character arc summary | Character history and event participation | Event or character update |
| Timeline visualization data | Event records and Timeline structure | Event create/update/delete |
| Semantic similarity vectors | All entity descriptions and content | Entity or content change event |
| Notification delivery status | Notification records and delivery attempts | Delivery attempt result |

### 6.4 Derived Data Principles

- Derived data is never used as the source of truth in a consistency check. The source data is always consulted.
- Derived data degradation (stale cache, out-of-sync search index) is surfaced as a system health signal, not silently tolerated.
- The regeneration path for every derived data type must be documented and tested.

---

## 7. AI Memory Data `[M]`

### 7.1 Definition

AI Memory Data is the persistent, agent-scoped representation of story knowledge that AI agents maintain across sessions. It is derived from Canon Data but managed as a distinct data class because it has unique isolation, lifecycle, and access properties.

### 7.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Updated when Canon changes; also updated when agent performs new reasoning |
| **Isolation** | Strictly scoped to one Story Universe per agent type — no cross-universe leakage |
| **Authority** | Subordinate to Canon — Memory Data that contradicts Canon is flagged as a conflict |
| **Human access** | Creator can inspect but never directly edits agent memory |
| **AI write access** | AI agents may update their own memory within their assigned scope only |
| **Consistency** | Eventually consistent with Canon — synchronization is triggered by Canon change events |

### 7.3 AI Memory Data Types

| Memory Data Type | Description | Scope |
|---|---|---|
| Memory Graph | Agent's graph representation of story knowledge | Per agent type, per Story Universe |
| Memory record | A single persisted fact in agent memory with Canon-sync timestamp | Per agent, per Universe |
| Memory scope definition | The defined subset of Universe knowledge this agent can access | Per agent assignment |
| Memory conflict record | A detected divergence between agent memory and current Canon | Per agent, per Universe |
| Reasoning context | Temporary reasoning state for an in-progress agent task | Per agent session; temporary |
| Session memory | Facts established or referenced within the current agent session | Per agent session; temporary |

### 7.4 AI Memory Lifecycle

```
Agent assigned to Story Universe
    ↓
Memory Graph initialized from current Canon (full sync)
    ↓ [Agent is now operational]
Agent performs reasoning → reads Memory Graph
    ↓
Agent generates proposal → proposal stored as Proposed Data [P], NOT in Memory Graph
    ↓
Creator confirms proposal → Canon updated → Memory sync event emitted
    ↓
Memory Graph updated to reflect confirmed Canon change
    ↓ [Cycle continues]
Agent session ends → Session memory discarded → Memory Graph persisted
    ↓
Agent reassigned or decommissioned → Memory Graph archived
```

### 7.5 Memory Isolation Rules

- Memory Graph for Universe A is stored in a completely separate partition from Memory Graph for Universe B.
- An agent session token scopes all memory reads to the assigned Universe. There is no query parameter or configuration that overrides this.
- Memory Graph synchronization applies only from Canon to Memory — never from Memory to Canon.

---

## 8. Transactional Data `[T]`

### 8.1 Definition

Transactional Data records that something happened. Unlike Versioned Data (which records the state of an entity), Transactional Data records the occurrence of an event — an action taken, a decision made, a transition completed. Transactional records are immutable after creation.

### 8.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Immutable after creation — records of actions cannot be altered |
| **Deletion** | Never permitted for any record in this class |
| **Growth** | Unbounded — grows continuously for the lifetime of the platform |
| **Consistency** | Strong — transactional records must be committed atomically with the operations they record |
| **Access** | Write: any authorized operation; Read: administrators and compliance functions |

### 8.3 Transactional Data Types

| Transactional Data | Description | Immutability Mechanism |
|---|---|---|
| Audit record | Every system operation with full attribution | Cryptographic chain; append-only store |
| Workflow decision | Stage transition decisions with actor, timestamp, and rationale | Append-only; no update path |
| Canon change decision | Creator's accept/reject decision on a Canon change request | Append-only; no update path |
| AI reasoning log | Every reasoning step, memory read, and proposal generated by an AI agent | Append-only; AI cannot read its own logs |
| Import decision log | Creator's decisions on each import candidate | Append-only |
| Export record | Every export operation with scope, format, and authorization | Append-only |
| Security event record | Authentication, authorization decisions, and anomalous access patterns | Cryptographic chain; append-only |
| Notification delivery record | Delivery outcome for every notification sent | Append-only |

### 8.4 Transactional Data Integrity

All Transactional Data is written in the same atomic operation as the action it records. There is no "log after the fact" pattern. If the transactional record cannot be written, the action is rolled back.

The Audit Record chain uses cryptographic linking — each record contains a hash of the previous record. Any gap or modification in the chain is detectable.

---

## 9. Temporary Data `[X]`

### 9.1 Definition

Temporary Data is operational state that exists for a bounded duration and is not persisted beyond its usefulness. Loss of Temporary Data is never catastrophic — it causes inconvenience at most and can be recovered through user re-action.

### 9.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Freely mutable during its lifecycle |
| **Persistence** | Not durably persisted — may be held in memory or short-lived cache |
| **Loss consequence** | Recoverable; user may need to restart an action |
| **Retention** | Defined TTL (time-to-live) for every Temporary Data type |
| **Audit** | Not audited (operations on Temporary Data are not story-truth-affecting) |

### 9.3 Temporary Data Types

| Temporary Data | TTL | Notes |
|---|---|---|
| Active user session | Configurable; default 8 hours | Expires on logout or timeout |
| Import preview | 24 hours | Discarded if creator does not commit within window |
| Agent task queue entry | Duration of agent task | Discarded when task completes or fails |
| Agent session reasoning context | Duration of agent session | Session memory; persisted to Memory Graph on session end |
| Export job in progress | Duration of export job + 1 hour | Completed artifact transitions to Export Domain |
| Real-time presence indicator | 30 seconds + renewal | Expires if client does not renew |
| Notification delivery retry queue | 48 hours maximum | Permanent failure recorded after TTL |
| Search query result cache | Configurable; typically 5–60 minutes | Invalidated by source data change events |

---

## 10. Proposed Data `[P]`

### 10.1 Definition

Proposed Data is knowledge generated by AI agents that has not yet been reviewed or confirmed by a creator. It exists in a distinct pending state — visible to creators for review, but never treated as Canon, never used as an authoritative source by other AI agents or consistency checks.

### 10.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Immutable after creation (proposals are not edited — they are accepted, rejected, or superseded by new proposals) |
| **Authority** | None — proposed data is always labeled as AI-inferred and pending |
| **Lifetime** | Until creator reviews (accepted → transitions to Canon Data; rejected → archived) |
| **AI consumption** | Other AI agents must not treat proposals as Canon when reasoning |
| **Transparency** | Always visible to the creator with full AI reasoning evidence |

### 10.3 Proposed Data Types

| Proposed Data | Source | Target on Acceptance |
|---|---|---|
| Knowledge proposal | AI Inference Domain | Canon Data (after creator confirmation) |
| Extraction candidate | AI Extraction Domain | Domain entity (after creator review and confirmation) |
| Consistency violation | AI Consistency Domain | Canon Change Request (if creator decides to fix) |
| Character voice inference | AI Character Agent | Character Voice Profile (after creator confirmation) |
| Relationship inference | AI Inference Domain | Relationship entity (after creator confirmation) |
| Timeline ordering proposal | AI Timeline Agent | Timeline event order (after creator confirmation) |

### 10.4 Proposed Data Lifecycle

```
AI Agent performs reasoning
    ↓
Proposal created with:
    - AI origin label (mandatory)
    - Evidence chain (mandatory)
    - Confidence indicator (informational only)
    - Affected entities (mandatory)
    ↓ [Pending state]
Notification sent to creator
    ↓
Creator reviews proposal
    ↓
Decision: ACCEPT → Proposal transitions to Canon Change Request → Creator confirms → Canon updated
Decision: REJECT → Proposal archived with rejection reason
Decision: DEFER → Proposal remains in Pending state; re-surfaces at next relevant review
    ↓
Proposal record retained in archive (for audit; proposals are never fully deleted)
```

---

## 11. Metadata `[A]`

### 11.1 Definition

Metadata is descriptive data attached to other data objects. It enriches entities and content with additional classification, context, and queryability without changing the core domain meaning of the object it is attached to.

### 11.2 Properties

| Property | Value |
|---|---|
| **Mutability** | Freely mutable by authorized users |
| **Authority** | Organizational or informational — metadata does not affect Canon status |
| **Inheritance** | Some metadata cascades (a tag applied to a Story Universe may be visible on all its entities) |
| **Extensibility** | Metadata schemas are configurable at the Story Universe level |

### 11.3 Metadata Types

| Metadata Type | Attached To | Purpose |
|---|---|---|
| Tags | Any entity or content | Freeform classification labels for filtering and organization |
| Custom attributes | Entities (per Universe schema) | Universe-specific entity attributes beyond standard fields |
| Classification labels | Story Universes, Works | Genre, medium, audience, status classifications |
| Content ratings | Narrative content | Maturity, tone, and content advisory labels |
| AI labels | Proposed Data | AI confidence, method, and source attribution labels |
| Provenance metadata | Knowledge Graph facts | Source content, author, timestamp of fact establishment |
| Export metadata | Export artifacts | Format, scope, timestamp, and authorization of export |
| Media metadata | Media assets | Title, creator, license, date, MIME type, AI-origin flag |

---

## 12. Data Ownership Matrix

Every data type in StoryOS has exactly one owning domain. Data ownership determines which domain is responsible for validation, mutation authorization, and lifecycle management of that data.

| Domain | Owns `[C]` | Owns `[S]` | Owns `[V]` | Owns `[D]` | Owns `[M]` | Owns `[T]` | Owns `[X]` | Owns `[P]` | Owns `[A]` |
|---|---|---|---|---|---|---|---|---|---|
| Story Universe | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ |
| Character | ✅ | — | ✅ | — | — | — | — | — | ✅ |
| World Building | ✅ | — | ✅ | — | — | — | — | — | ✅ |
| Timeline | ✅ | — | ✅ | — | — | — | — | — | — |
| Relationship | ✅ | — | ✅ | — | — | — | — | — | — |
| Knowledge Graph | ✅ | — | ✅ | ✅ | — | — | — | — | ✅ |
| Canon Management | ✅ | — | ✅ | — | — | ✅ | — | — | — |
| Narrative | ✅ | — | ✅ | — | — | — | — | — | ✅ |
| Item | ✅ | — | ✅ | — | — | — | — | — | ✅ |
| AI Agent | — | ✅ | — | — | — | — | ✅ | — | — |
| AI Memory | — | — | — | — | ✅ | — | ✅ | — | — |
| Inference | — | — | — | — | — | — | — | ✅ | — |
| Consistency | — | — | — | ✅ | — | — | — | ✅ | — |
| AI Extraction | — | — | — | — | — | — | — | ✅ | — |
| Workflow | — | ✅ | — | ✅ | — | ✅ | — | — | — |
| Versioning | — | — | ✅ | — | — | ✅ | — | — | — |
| Search | — | — | — | ✅ | — | — | ✅ | — | — |
| Organization | — | ✅ | — | — | — | — | — | — | — |
| Identity | — | ✅ | — | — | — | — | ✅ | — | — |
| Authorization | — | ✅ | — | — | — | ✅ | — | — | — |
| Audit | — | — | — | — | — | ✅ | — | — | — |
| Notification | — | ✅ | — | — | — | ✅ | ✅ | — | — |
| Plugin | — | ✅ | — | — | — | ✅ | — | — | — |
| Compliance | — | ✅ | — | — | — | ✅ | — | — | — |
| Media | — | — | ✅ | — | — | — | — | — | ✅ |
| Metadata | — | — | — | — | — | — | — | — | ✅ |

---

## 13. Data Lifecycle Summary

| Class | Created By | Modified By | Read By | Deleted? | Retention |
|---|---|---|---|---|---|
| `[C]` Canon | Creator (confirmation) | Creator (confirmation) | All authorized; AI agents (read-only) | Never — superseded only | Permanent |
| `[S]` Structural | Administrators | Administrators | System components; Admins | Replaced, never deleted | Permanent |
| `[V]` Versioned | Any authorized write | Current version replaced; history preserved | Authorized users; Versioning System | History: Never; Archive: allowed | Permanent history |
| `[D]` Derived | System (automated) | System (automated on source change) | Queries; AI agents | Regenerable — may be purged and rebuilt | Until regenerated |
| `[M]` AI Memory | AI agents + Canon sync | AI agents + Canon sync | Assigned AI agents only | Archived when agent decommissioned | Agent lifetime |
| `[T]` Transactional | Any system operation | Never modified | Audit administrators; compliance | Never | Minimum 24 months |
| `[X]` Temporary | System operation | Freely | Component that created it | After TTL | TTL-bound |
| `[P]` Proposed | AI agents | Never (proposals are replaced, not modified) | Creator; related AI agents (labeled) | Archived after decision | Until decision + archive |
| `[A]` Metadata | Authorized users | Authorized users | All authorized readers | Allowed (metadata loss is recoverable) | Lifetime of attached object |

---

## 14. Data Sensitivity Classification

All data in StoryOS carries one of four sensitivity levels that govern encryption, access logging, and export control.

| Sensitivity Level | Definition | Examples |
|---|---|---|
| **Level 1 — Public** | Non-sensitive; safe to display without access checks | Platform feature descriptions, public workflow stage names |
| **Level 2 — Organization Internal** | Sensitive to the organization; standard access control applies | Story Universe entities, character data, workflow history |
| **Level 3 — Restricted** | Elevated sensitivity; requires explicit authorization beyond role | Secret relationships, compliance records, AI reasoning logs |
| **Level 4 — Platform Critical** | Highest sensitivity; access only through dedicated interfaces | Audit records, authentication credentials, cryptographic keys |

**Rule:** All Canon Data `[C]` is minimum Level 2. All Transactional Data `[T]` is minimum Level 3. Authentication credentials are always Level 4.

---

## 15. Cross-Cutting Data Rules

These rules apply across all data classifications without exception.

### 15.1 Story Universe is the Isolation Root

All data of every classification that belongs to a Story Universe is partitioned by Story Universe. No query, no AI operation, no user access, and no system process may return data from two different Story Universes in the same response without explicit multi-universe authorization.

### 15.2 Every Write Has an Owner

Every data write operation has an attributable owner: a specific user account or AI agent identity. Anonymous writes do not exist in StoryOS. The owner is recorded at the moment of write and is immutable.

### 15.3 Encryption is Universal

All data at rest and in transit, across all classifications, is encrypted. There is no data classification that bypasses encryption. The sensitivity classification governs the strength of encryption and key management, not whether encryption applies.

### 15.4 Deletion is Replacement, Not Erasure

In StoryOS, "deleting" an entity means marking it as archived in its current version. The entity's version history remains permanently. Physical deletion of story data does not occur through any standard operational path. (Personal data deletion for compliance purposes follows the Compliance Domain's data subject request process, which is a separate, audited path.)

### 15.5 Data Classification is Documented Before Implementation

Before any new data type is implemented, its classification must be documented in this document or in a domain-level data specification that extends this document. Undocumented data types are architectural defects.

---

## 16. Storage Layer Mapping

This section maps data classifications to the Storage Layer stores defined in the architecture. This mapping is the bridge from data classification to storage design.

| Data Classification | Primary Store | Secondary Store | Rationale |
|---|---|---|---|
| `[C]` Canon Data | Entity Store | Graph Store (for Knowledge Graph facts) | Structured, versioned, queryable entity data |
| `[S]` Structural Data | Entity Store | — | Configuration data behaves like versioned entities |
| `[V]` Versioned Data | Version Store | — | Append-only; every state preserved |
| `[D]` Derived Data | Derived Cache | Search Index (for search-optimized derived data) | High-read, regenerable; does not need version history |
| `[M]` AI Memory Data | Graph Store (isolated partition) | — | Graph structure optimized for AI traversal queries |
| `[T]` Transactional Data | Audit Store | — | Append-only; cryptographically chained; isolated |
| `[X]` Temporary Data | In-memory / short-lived cache | — | Not durably persisted; TTL-managed |
| `[P]` Proposed Data | Entity Store (pending partition) | — | Structured; lifecycle-managed; never merges with Canon partition |
| `[A]` Metadata | Entity Store (alongside owning entity) | Search Index (for metadata-based querying) | Co-located with entity for efficient retrieval |

---

> *"Data architecture is the art of deciding, before the first table is drawn, what the system believes and why it is allowed to believe it. Every category defined here is a commitment — to creators, to AI agents, and to future engineers — about what this system will and will not do with story knowledge."*

---

**Document End**
**Previous:** `docs/domain/domain_model.md` — v1.0 Approved
**Next:** `docs/architecture/entity_architecture.md` — Task 1.2 — Entity Architecture
