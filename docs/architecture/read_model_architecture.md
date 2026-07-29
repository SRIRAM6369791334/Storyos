# Read Model & Query Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.4 — Read Model & Query Architecture
> **Depends On:** `domain_execution_architecture.md`, `application_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Illusion of Immediate Knowledge

Task 3.1 established that StoryOS strictly implements CQRS. The Domain Layer (Task 3.2) is optimized for highly consistent, atomic, heavily validated writes. 

However, users and AI Agents do not query data the way it is written. They require massive, aggregated, denormalized, multi-model views—often crossing Bounded Contexts. To query the Domain Model directly would require massive SQL `JOIN`s, destroying scalability and Aggregate isolation.

This document defines the **Read Model Architecture**: an eventually consistent, radically denormalized, multi-model query engine designed to serve sub-millisecond reads without touching a single Domain Entity.

---

## Part I — Projections and View Models

### 1.1 Read Model Projections
A Projection is a specialized, read-only data structure optimized for a specific UI screen or API response (e.g., `CharacterDashboardView`).
- **No Domain Logic:** Projections contain zero business rules. They are purely structural mapping layers.
- **Radical Denormalization:** Projections intentionally duplicate data. If a `CharacterView` needs the `UniverseName`, the Universe name is stored as a string directly inside the Character projection table. `JOIN` operations on the read path are considered an anti-pattern.

### 1.2 Projection Builders & Event-Driven Consistency
How do Projections get their data? Through the CDC Outbox pipeline established in Task 2.2 and 3.1.
1. `DomainEvent` is committed to the write-side Outbox.
2. The Event Bus (Kafka) delivers the `IntegrationEvent`.
3. The **Projection Builder** (a specialized Event Handler) catches the event.
4. The Builder mutates the denormalized Read DB (e.g., executing an `UPSERT` into the `CharacterView` table).
- **Consistency Boundary:** Read models are explicitly *eventually consistent*. Clients must be designed to tolerate lag (typically $< 50ms$).

---

## Part II — Multi-Model Query Federation

StoryOS utilizes different databases for different query profiles. A single GraphQL Query may federate across multiple engines.

### 2.1 The Data Engines
1. **Materialized Views (PostgreSQL):** Used for highly structured, tabular queries (e.g., "List all characters in Universe X, sorted by creation date").
2. **Search Index (Elasticsearch/OpenSearch):** Used for full-text search, BM25 text relevance, and faceted filtering (e.g., "Find all lore entries mentioning 'Sword'"). Synchronized via Projection Builders.
3. **Graph Traversal (Neo4j):** Used for highly connected, N-degree relationship queries (e.g., "Find all characters connected to Faction A who have visited Location B"). 
4. **Vector Search (Milvus/pgvector):** Used for Semantic AI queries (e.g., "Find characters with a personality similar to this prompt").

### 2.2 Query Federation
The Application Layer’s `QueryHandlers` abstract these databases. The client sends a generic `SearchQueryDTO`. The Query Handler routes the request to Elasticsearch, fetches the IDs, and enriches the response with PostgreSQL Materialized View data before returning.

---

## Part III — Pagination, Optimization, and Caching

### 3.1 Pagination, Filtering, and Sorting
- **Cursor-Based Pagination:** Offset-based pagination (`OFFSET 10000 LIMIT 50`) is strictly banned due to catastrophic database performance degradation at scale. All queries must use Keyset/Cursor pagination (`WHERE id > last_seen_id LIMIT 50`).
- **Standardized Filtering:** API requests utilize a standardized filtering AST (Abstract Syntax Tree) converted into specific database predicates by the Query Handlers.

### 3.2 Caching Hierarchy
- **L1 (In-Memory):** Guava/Caffeine cache for static configuration and extremely hot, immutable data.
- **L2 (Distributed):** Redis for standard Read Model caching. 
- **Cache Invalidation:** Projection Builders issue explicit Cache Eviction commands to Redis when an underlying Event mutates a read model.

---

## Part IV — Projection Versioning and Rebuilds

If a new UI screen requires a new `TimelineEventView`, we do not write migration scripts.

### 4.1 The Rebuild Pipeline
Because the write-side `EventStore` or `AuditActionLog` (Task 2.3) holds an immutable history of all facts:
1. Developers define a new Projection Builder (`v2`).
2. The platform replays historical events from the Event Store through the `v2` builder into a new database table.
3. Once the `v2` table catches up to the live event stream, the API Gateway cuts traffic over to `v2`.
4. The `v1` table is dropped.
- *Result:* Zero downtime Read Model migrations.

---

## Part V — Observability and Testing

### 5.1 Read-Side Performance SLIs
Extending the Observability Architecture (Task 2.6):
- **Projection Lag (SLI):** Measures the time between a `DomainEvent` being generated and the `ReadModel` being updated. Alert threshold: > 5 seconds.
- **Query Latency (SLI):** 99th percentile query response time must be $< 100ms$.
- **Cache Hit Ratio (SLI):** A drop below 70% triggers an automated Slack warning.

### 5.2 Testing Strategy for Projections
Read models are tested independently of write models.
- **Given-When-Then:** *Given* a simulated stream of Integration Events, *When* the Projection Builder executes, *Then* assert the Materialized View contains the exact expected JSON/SQL rows.

---

## Part VI — Query Governance Rules

**READ-001: The Domain Bypass Rule**
*Rule:* A `QueryHandler` MUST NOT instantiate, fetch, or reference a Domain Entity or Aggregate Root. It must query the Read database projections directly.
*Enforcement:* ArchUnit blocks dependencies from `com.storyos.*.query` packages to `com.storyos.*.domain` packages.

**READ-002: Banned Joins**
*Rule:* SQL `JOIN` operations inside the primary synchronous query path are banned if they cross Bounded Contexts. Data must be pre-joined (denormalized) into the Materialized View at write-time by the Projection Builder.
*Enforcement:* SQL AST analysis / DB statement interceptors in the CI pipeline.

**READ-003: Mandatory Cursors**
*Rule:* API endpoints returning lists must not accept `page` or `offset` parameters. They must exclusively accept and return `cursor` tokens.
*Enforcement:* OpenAPI schema validation.

---

> *"Writes should be slow, paranoid, and perfectly consistent. Reads should be fast, dumb, and heavily duplicated. Never mix the two."*

---

**Document End**
