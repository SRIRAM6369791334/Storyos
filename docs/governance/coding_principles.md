# StoryOS Architectural Principles & Coding Constitution

> **Document Status:** Final v1.0
> **Classification:** Internal — Mandatory Reference
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Scope:** All engineers, AI coding agents, and technical contributors to StoryOS
> **Authority:** These principles supersede convenience, velocity, and individual preference.

---

## Preamble

This document is the architectural constitution of StoryOS.

Every engineer — human or AI — who contributes to StoryOS must understand and comply with these principles before writing a single line of code. These are not suggestions. They are hard boundaries that protect the long-term integrity of the platform.

Violations of these principles are architectural defects, not implementation bugs. A feature that works correctly but violates these principles is still unacceptable and must be corrected.

> **If you are uncertain whether your implementation respects these principles, stop. Re-read this document. Ask before building.**

---

## Part I — The Foundational Law

### Law 1 — The Order of Creation

All design and implementation in StoryOS must follow this strict top-down sequence:

```
Business Need
    ↓
Domain Model
    ↓
Data Classification
    ↓
Entity Design
    ↓
Storage Design
    ↓
Database Schema
    ↓
Implementation
```

**This order is never reversed.**

- A database schema must never be created before its domain is modeled.
- An entity must never be defined before its domain ownership is established.
- A feature must never be implemented before its data classification is understood.
- Storage decisions must never drive entity design.

> **Violation indicator:** If you are designing a table and realizing you don't know which domain owns it, you skipped a step. Stop. Go back to the domain model.

---

## Part II — Domain Principles

### P-DOM-001 — Domain Isolation is Absolute

Every domain owns its data exclusively. No domain may access another domain's internal storage, internal objects, or internal state through any path other than the owning domain's defined interface.

**Permitted:**
```
Character Module → requests entity via Knowledge Graph interface → Knowledge Graph Module responds
```

**Forbidden:**
```
Character Module → directly reads from Knowledge Graph's internal storage
```

**Test:** If removing a domain from the system requires modifying another domain's internal code, the boundary is violated.

---

### P-DOM-002 — Domain Interfaces are the Only Communication Channel

When a domain needs data from another domain, it requests it through that domain's defined interface. It never holds internal references to another domain's value objects across domain boundaries.

**Permitted:** Domain A holds a reference ID to an entity owned by Domain B. It fetches the entity via Domain B's interface when needed.

**Forbidden:** Domain A holds a direct in-memory object reference to Domain B's internal aggregate member.

---

### P-DOM-003 — Business Logic Lives in Domains Only

Business rules, validation logic, and domain invariants live exclusively within domain modules. They are never placed in:
- Storage layer queries
- Presentation layer components
- Application layer orchestrators (which may coordinate, but not decide)
- Database triggers or stored procedures

**Test:** Can you unit-test your business rule without touching a database or a UI? If not, it is in the wrong layer.

---

### P-DOM-004 — Domains Do Not Share Tables

No database table is owned by more than one domain. If two domains appear to need the same table, one of three things is true:
1. One domain actually owns it and the other should query through an interface
2. A new shared domain needs to be created and formally modeled
3. The domain boundaries need to be re-examined

**There are no exceptions to this rule.**

---

### P-DOM-005 — Aggregate Roots are the Entry Point

All access to domain objects is through the designated Aggregate Root. Internal value objects within an aggregate are never directly referenced, stored, or queried from outside the aggregate boundary.

**Permitted:** Fetch `Character` (aggregate root), then access `PsychologyProfile` through it.

**Forbidden:** Query `PsychologyProfile` directly from an external domain.

---

## Part III — Canon Principles

### P-CAN-001 — AI Never Writes Canon

This is the single most important rule in StoryOS.

No AI agent, inference process, or automated system may modify the Canon state of any Story Universe without an explicit, recorded creator confirmation action.

**The only permitted Canon write path:**
```
AI Agent proposes → KnowledgeProposal created → Creator reviews → Creator confirms → Canon updated → Audit recorded
```

**Every other path is forbidden.** There are no exceptions for "high confidence" inferences, "obvious" corrections, or "emergency" updates.

---

### P-CAN-002 — Canon is the Single Source of Truth

All AI reasoning, consistency checking, search, and output generation is performed against Canon. No component may treat any other data source as equally authoritative to Canon.

If Canon and another data source conflict, Canon is correct and the conflict is surfaced to the creator.

---

### P-CAN-003 — Speculative and Inferred Data is Always Labeled

No system output — to a creator or to another system component — may present inferred or speculative knowledge as Canon-equivalent without an explicit, visible AI-origin label.

**Permitted output:** "The system infers that Character A may have known Location B based on Event C. This is not confirmed Canon."

**Forbidden output:** Presenting the above as an established story fact.

---

### P-CAN-004 — Canon History is Immutable

Once a fact enters Canon history — even if it is later superseded — the historical record of it being Canon at that moment is permanent. Canon history is append-only. Old Canon facts are marked as superseded; they are never deleted.

---

## Part IV — Knowledge Graph Principles

### P-KGR-001 — All Relationships Live in the Knowledge Graph

Every typed, directed connection between any two entities in StoryOS is registered in the Knowledge Graph. No domain module maintains its own relationship store. Relationship data that lives only in one domain and is not exposed to the Knowledge Graph does not exist from the platform's perspective.

**Forbidden:** A Character module maintaining a private list of character-to-character connections that are not registered as Knowledge Graph edges.

---

### P-KGR-002 — The Knowledge Graph Does Not Own Business Logic

The Knowledge Graph stores and traverses structured knowledge. It does not enforce business rules, validate domain invariants, or make Canon decisions. Those responsibilities belong to the domain modules and Canon Management domain respectively.

---

### P-KGR-003 — Provenance is Mandatory

Every fact registered in the Knowledge Graph carries its provenance: which content item or user action established it, at what time, under which version. A fact without provenance is not a valid Knowledge Graph entry.

---

### P-KGR-004 — Explicit and Inferred Knowledge are Always Separated

The Knowledge Graph maintains two distinct knowledge tiers:
- **Explicit Knowledge** — directly established by creator action
- **Inferred Knowledge** — derived by AI reasoning

These tiers are never mixed. An inferred fact never appears in the same query result as an explicit Canon fact without clear tier labeling, unless the creator has explicitly confirmed the inference.

---

## Part V — Event Principles

### P-EVT-001 — Events are the Mechanism for Cross-Domain Side Effects

When a domain operation in Domain A needs to trigger a behavior in Domain B, Domain A emits an event. It does not call Domain B directly.

**Permitted:**
```
Character Module → emits CharacterStatusChanged event → Timeline Module reacts to update character timeline
```

**Forbidden:**
```
Character Module → directly calls Timeline Module's internal UpdateTimeline method
```

---

### P-EVT-002 — Events are Immutable

Once emitted, an event record is never modified. Events describe what happened; they do not predict or prescribe. An event that carries wrong data is evidence of a bug in the emitting module, not a reason to edit the event record.

---

### P-EVT-003 — Events Carry Minimal Data

An event carries only what is necessary to describe the occurrence: the event type, the entity ID affected, the timestamp, and the actor. It does not carry full entity state. Consumers that need full state fetch it through the appropriate domain interface.

**Reason:** Fat events create implicit coupling between producers and consumers.

---

### P-EVT-004 — Event Consumers Do Not Assume Order

No event consumer may rely on events arriving in a specific order relative to events from other domains. Consumers must be idempotent — processing the same event twice must not corrupt state.

---

## Part VI — Storage Principles

### P-STR-001 — The Storage Layer Has No Knowledge of Business Rules

The Storage Layer stores and retrieves data. It does not validate domain invariants, enforce access control, or apply business logic. Stored procedures, database triggers, and computed columns that encode business rules are forbidden.

**Reason:** Business logic in the storage layer is invisible to unit tests, bypasses domain validation, and cannot be reasoned over by domain models.

---

### P-STR-002 — Each Storage Store Serves One Data Characteristic

The six Storage Layer stores are not interchangeable:

| Store | Purpose | Rule |
|---|---|---|
| Entity Store | Structured domain entity data | No graph traversal; no binary content |
| Graph Store | Knowledge Graph nodes and edges | No long-form text; no binary content |
| Document Store | Long-form narrative content | No entity attribute storage |
| Media Store | Binary assets | No structured query use |
| Version Store | Historical state records | Append-only; no updates |
| Audit Store | Immutable operation log | Append-only; no reads except via Audit interface |

Storing data in the wrong store is an architectural defect.

---

### P-STR-003 — Version Store is Append-Only

No record in the Version Store is ever updated or deleted through any operational path. Version records accumulate indefinitely. Archival strategies (cold storage, compression) are permitted; deletion is not.

---

### P-STR-004 — Audit Store is Isolated

The Audit Store is not accessible through any standard data access path. It has its own dedicated interface, accessible only to the Audit System and, for queries, to authorized administrators. No domain module, no application layer orchestrator, and no plugin may read from or write to the Audit Store directly.

---

## Part VII — Security Principles

### P-SEC-001 — Authorization is Synchronous and Blocking

Every operation that touches story data is authorized before execution begins. Authorization is never performed after the fact, never performed lazily, and never skipped for "internal" operations.

There are no trusted internal callers that bypass authorization. Every actor — including AI agents and plugins — is authorized on every request.

---

### P-SEC-002 — Story Universe Isolation is Structural

A Story Universe boundary is not a permission check. It is a structural property of how data is partitioned. An operation that touches Universe A's data cannot, through any bug, misconfiguration, or privilege escalation, access Universe B's data.

**This is enforced at the storage partition level, not at the query filter level.**

Filtering by `universe_id` in a query is insufficient and does not constitute structural isolation.

---

### P-SEC-003 — Least Privilege Everywhere

Every actor — user, AI agent, plugin — receives the minimum access required to perform its function. Access is never granted "just in case" or for future use. When a function ends, access earned for that function ends.

---

### P-SEC-004 — Plugins and Agents are Untrusted by Default

Every plugin and every AI agent — including first-party ones — operates as an untrusted actor until it presents valid credentials and its operation is authorized against its declared scope. There is no class of plugin or agent that bypasses this.

---

### P-SEC-005 — Security Events are Never Suppressed

Any security event — failed authentication, unauthorized access attempt, permission escalation, anomalous data access pattern — is always written to the Audit System, regardless of whether the operation was ultimately permitted or denied. Security event logging is never conditional.

---

## Part VIII — AI Principles

### P-AI-001 — AI Memory is Scoped, Never Global

An AI agent's memory context is strictly scoped to its assigned Story Universe. An agent working on Universe A has zero access to memory, facts, or knowledge from Universe B. This is enforced at the AI Layer boundary, not through runtime filtering.

---

### P-AI-002 — AI Reasoning Steps are Audited

Every reasoning step taken by an AI agent — every fact it read, every inference it made, every proposal it generated — is written to an AI audit log simultaneously with the reasoning. Reasoning logs cannot be selectively suppressed or post-processed before logging.

---

### P-AI-003 — AI Outputs are Proposals, Not Commands

The outputs of AI agents are always proposals awaiting human review. They are never automatically applied to Canon, never silently merged into domain state, and never presented to other system components as confirmed facts without explicit creator authorization.

---

### P-AI-004 — AI Agent Failures are Isolated

An AI agent failure — crash, timeout, inference error — must not propagate to human user sessions or corrupt story data. AI agents operate in isolated execution contexts. Their failures are logged, reported, and recovered from without affecting the data integrity of the Story Universe they serve.

---

## Part IX — Versioning Principles

### P-VER-001 — All Entity State Changes are Versioned

Every state-changing operation on any domain entity is captured as a version record before the change is applied. There is no "minor change" exception. There is no "temporary edit" exception. All changes are versioned.

---

### P-VER-002 — Versions are Never Deleted

Version records are permanent. An entity with 10,000 versions has 10,000 permanent historical records. Archival to cold storage is acceptable. Deletion is not, through any operational path.

---

### P-VER-003 — The Current Version is Always Explicitly Marked

At all times, exactly one version of any entity is marked as the current Canon version. There is no ambiguity about which version is current. Queries that do not specify a version always return the current Canon version.

---

## Part X — Collaboration Principles

### P-COL-001 — Concurrent Edits Do Not Silently Merge

When two users attempt to edit the same entity simultaneously, the system does not silently merge the changes. It detects the conflict and surfaces it for explicit creator resolution. Silent merges corrupt story knowledge.

---

### P-COL-002 — Comments and Discussions are Entity-Scoped

Discussion threads exist as structured annotations on specific entities or content items. They are not a general-purpose communication channel. Every comment is traceable to the specific story element it concerns.

---

## Part XI — Implementation Checklist

Before any implementation task is started, the following must be true:

- [ ] The feature has a traceable requirement in `prs.md`
- [ ] The domain ownership of all data involved is identified in `domain_model.md`
- [ ] The data classification of all data involved is defined in `data_architecture.md`
- [ ] No business logic is being placed in the storage layer
- [ ] No domain module is accessing another domain's internal storage
- [ ] All new entity types are registered in the Knowledge Graph
- [ ] All Canon-modifying paths include an explicit creator confirmation step
- [ ] All new operations emit the appropriate domain event
- [ ] Authorization is enforced at the Application Layer for all new operations
- [ ] All new operations are captured by the Audit System
- [ ] All new AI agent outputs are proposals, not direct Canon writes

If any item on this checklist is unchecked, the implementation is not ready to begin.

---

## Part XII — How to Handle Principle Conflicts

Occasionally, two principles may appear to be in tension. Use this priority order:

1. **Security Principles** (P-SEC) — always highest priority
2. **Canon Principles** (P-CAN) — creator trust is foundational
3. **Domain Principles** (P-DOM) — architectural integrity
4. **Knowledge Graph Principles** (P-KGR) — knowledge accuracy
5. **Storage Principles** (P-STR) — data durability
6. **Event Principles** (P-EVT) — loose coupling
7. **AI Principles** (P-AI) — AI safety
8. **Versioning Principles** (P-VER) — historical completeness
9. **Collaboration Principles** (P-COL) — team coordination

When in doubt, escalate to the Chief Software Architect before proceeding.

---

> *"These principles are not rules invented to slow development. They are patterns learned from the failures of systems that started without them. Respecting them now is what will make StoryOS maintainable when it contains a million entities, a hundred AI agents, and a thousand contributors."*

---

**Document End**
**Governance applies to:** All code, all agents, all contributors, all phases
