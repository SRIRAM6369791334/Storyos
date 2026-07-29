# Search Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.8 — Search Architecture
> **Depends On:** `entity_architecture.md`, `metadata_architecture.md`, `relationship_architecture.md`, `knowledge_graph_architecture.md`, `storage_architecture.md`, `versioning_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Phase 1 Complete

---

## Preface: The Cognitive Retrieval Engine

In standard enterprise applications, search is often treated as a secondary utility—a simple inverted index bolted onto a relational database to find records by name or description. In StoryOS — an Enterprise AI Platform for narrative universes — search is fundamentally different. Search is the cognitive retrieval engine for structured data, unstructured narrative prose, semantic knowledge, and highly contextual graph relationships.

A single Story Universe can contain tens of thousands of entities, complex relationship webs, deep historical version chains, branching timelines, AI-generated inferences, and massive volumes of text. To navigate this complexity, the platform requires an advanced Search Architecture that moves beyond simple keyword matching and embraces multi-modal, context-aware discovery.

The Search Architecture defines how creators, editors, AI agents, and automated workflows discover knowledge across the platform using Hybrid Search (combining lexical BM25 with high-dimensional semantic vectors), Graph Traversal Context, and Canon-Aware filtering.

> **Central architectural truth:** In StoryOS, search is an eventually consistent, derived intelligence layer. The Search Index is never the source of truth, but it is the primary interface for all discovery. Every query must mathematically and structurally respect the boundaries of Story Universes, branch timelines, and Canon sovereignty.

---

## Part I — Search Principles

### 1.1 Search Philosophy

The StoryOS Search Architecture is built upon seven foundational pillars that differentiate it from generic enterprise search implementations. These pillars ensure that the system can scale to massive universes while providing split-second responses for complex RAG (Retrieval-Augmented Generation) pipelines.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        SEVEN PILLARS OF SEARCH                          │
├───────────────────┬───────────────────┬─────────────────────────────────┤
│ 1. Hybrid         │ 2. Context-Aware  │ 3. Branch & Canon               │
│    Retrieval      │    (Graph + Sem)  │    Awareness                    │
├───────────────────┼───────────────────┼─────────────────────────────────┤
│ 4. Event-Driven   │ 5. Isolated       │ 6. Multi-Modal                  │
│    Indexing       │    Tenancy        │    Discovery                    │
├───────────────────┴───────────────────┴─────────────────────────────────┤
│ 7. AI-First Ranking (Relevance prioritized by semantic intent)           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Pillar 1: Hybrid Retrieval as the Standard
Lexical search (BM25) is excellent for exact names, specific terminology, and rare words. However, it fails when users or AI agents search using synonyms or concepts. Semantic search (Vectors) is excellent for concepts, themes, and intents, but struggles with exact keyword precision (e.g., finding a specific serial number or unique character name). StoryOS uses Hybrid Search by default, executing both paradigms in parallel and fusing their scores using Reciprocal Rank Fusion (RRF).

#### Pillar 2: Context-Aware (Graph + Semantic)
A query for "Allies of the King" requires understanding the Knowledge Graph (who is allied to the node "King") combined with semantic understanding of the query intent. Search in StoryOS is not blind text matching; it utilizes pre-computed graph centrality and 1st-degree edge denormalization to provide context-aware results.

#### Pillar 3: Branch & Canon Awareness
Search results dynamically change based on the active timeline. Searching within an `AI_PROPOSAL` branch yields different results than searching within the `Canon` branch. The search architecture inherently understands the Versioning Architecture and routes queries to the correct temporal and branch state of an entity.

#### Pillar 4: Event-Driven Indexing
The Search Index is updated asynchronously via domain events emitted by the Versioning and Entity domains. It is eventually consistent but highly available. The primary transactional database is never locked or burdened by search indexing operations.

#### Pillar 5: Isolated Tenancy
Search indices are structurally partitioned by Story Universe. Cross-universe search is mathematically impossible at the index level for standard queries to guarantee absolute data isolation, preventing character data from Universe A leaking into Universe B.

#### Pillar 6: Multi-Modal Discovery
Search encompasses structured data (Entity attributes like health or status), unstructured data (Narrative prose), dynamic metadata (Tags/Taxonomies defined in the Metadata Architecture), and temporal data (Version history).

#### Pillar 7: AI-First Ranking
Ranking algorithms incorporate AI-derived confidence scores, graph centrality metrics (PageRank), and contextual relevance, moving beyond simple term frequency. The system learns from AI and human interactions to dynamically adjust ranking weights.

---

### 1.2 Search Design Goals

The architecture must satisfy the following technical design goals to meet enterprise standards:

| Goal ID | Goal Name | Technical Specification |
|---|---|---|
| **SG-01** | **Sub-Second Hybrid Latency** | Execute complex hybrid queries (lexical + semantic + graph filters) within < 100ms at the 99th percentile under load. |
| **SG-02** | **Branch-Scoped Queries** | Ensure every search query strictly filters results based on the user's or agent's active `VersionBranch`. |
| **SG-03** | **Canon Priority Ranking** | By default, boost ranking scores for entities and relationships that hold `isCanon = true` status to surface authoritative truth. |
| **SG-04** | **Eventual Consistency SLA** | Guarantee that changes committed to the source transactional stores are reflected in the Search Index within < 60 seconds. |
| **SG-05** | **Zero-Downtime Re-Indexing** | Support complete background index rebuilds (Blue/Green indexing) without impacting read availability or locking write queues. |
| **SG-06** | **Faceted Drill-Down** | Provide millisecond-latency aggregations (facets) for metadata schemas, entity types, and lifecycle states across millions of records. |
| **SG-07** | **Semantic Tolerance** | Handle typos, synonyms, and conceptual queries seamlessly via high-dimensional vector embeddings and approximate nearest neighbors. |
| **SG-08** | **AI Agent Query API** | Provide a structured, deterministic search interface optimized for LLM tool-use, function calling, and Retrieval-Augmented Generation (RAG). |
| **SG-09** | **Strict Access Control** | Filter search results post-retrieval (or via query-time predicates) to exclude `isSecret` data for unauthorized actors. |
| **SG-10** | **Operational Observability** | Track zero-result queries, click-through rates, and query latency to continuously tune ranking weights and identify content gaps. |

---

### 1.3 Search Rules

The following non-negotiable architectural rules govern all interactions with the Search Domain.

**Rule SCH-001 — The Index is Derivative, Not Authoritative**
The Search Index is a read-optimized projection of data. If an index becomes corrupted, desynchronized, or lost, it is discarded and rebuilt entirely from the source of truth (Entity Store / Version Store). Application logic must never use the Search Index as a durable system of record or attempt to execute business state mutations based solely on search results.

**Rule SCH-002 — Mandatory Universe Scoping**
Every search query must explicitly declare a `universeId`. Queries lacking a universe boundary are rejected at the API gateway, except for specific cross-platform administrative directories (which run against separate, dedicated system indices).

**Rule SCH-003 — Branch Inheritance in Search**
When searching an alternate branch (e.g., `Branch_B` spawned from `Canon`), the index must return the state of entities as they exist in `Branch_B`, automatically falling back to `Canon` state for entities that have not been modified on `Branch_B`.

**Rule SCH-004 — AI Indexing Segregation**
AI-generated inferences existing in the `INFERRED` graph partition or unmerged proposal branches are indexed, but are heavily down-ranked or excluded entirely unless the query explicitly requests AI proposals.

**Rule SCH-005 — Immutable Document IDs**
A `SearchDocument` representing an entity must use a stable ID (`EntityId`). Updates overwrite the existing document rather than appending. Version history search relies on specific version-tagged sub-indices.

**Rule SCH-006 — No Direct Database Queries for Search**
Application services must not use SQL `LIKE`, regex matching, or deep `JOIN`s on the primary transactional databases for user-driven discovery. All discovery flows through the Search Architecture to preserve transactional database performance.

**Rule SCH-007 — Secret Data Exclusion**
Entities marked `isSecret = true` are indexed, but their secret fields are placed in restricted index fields. Queries from non-privileged actors automatically append a `-isSecret:true` filter predicate at the AST compilation phase.

**Rule SCH-008 — Vector Dimension Consistency**
The semantic search engine strictly enforces vector dimension matching. If the underlying AI embedding model is upgraded (e.g., from 768 dimensions to 1536 dimensions), a full semantic re-index via a Green alias is mandatory before the new model goes live.

**Rule SCH-009 — Maximum Clause Limits**
To prevent denial-of-service via query expansion, a single query AST cannot expand into more than 1,024 boolean clauses. Queries exceeding this are rejected.

**Rule SCH-010 — No Cross-Store Atomicity**
Writing to the primary Entity Store and writing to the Search Index are not atomic. Failure to update the Search Index does not roll back the Entity Store write. Instead, eventual consistency relies on robust DLQ (Dead Letter Queue) retries.

---

## Part II — Search Model

The Search Domain revolves around a set of formalized domain models representing indices, documents, queries, and results.

### 2.1 SearchManager (Domain Service)

**Purpose:** The central orchestration engine that handles query routing, index management, alias swapping (Blue/Green deployments), and cluster metric collection.

**Properties & Interface:**

| Property / Method | Type | Description |
|---|---|---|
| `managerId` | `ManagerId` | Singleton instance identifier |
| `activeIndices` | `SearchIndex[]` | Registry of all active and building indices |
| `queryParsers` | `SearchAnalyzer[]` | Configured text analyzers (per language/domain) |
| `status` | `SearchStatus` | HEALTHY / DEGRADED / REBUILDING / READ_ONLY |
| `executeQuery()` | Method | Accepts `SearchQuery`, returns `SearchResult` |
| `indexDocument()` | Method | Upserts a `SearchDocument` (Bulk optimized) |
| `triggerRebuild()` | Method | Initiates a zero-downtime background index rebuild |
| `getFacets()` | Method | Executes an aggregation-only query (0 hits returned) |
| `swapAlias()` | Method | Point an alias to a new backing index during Blue/Green |
| `validateQuery()` | Method | Checks query complexity and security constraints |

---

### 2.2 SearchQuery

**Purpose:** A structured representation of a user or AI search intent, encapsulating text, filters, semantic vectors, and execution parameters.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `queryId` | `QueryId` | Ephemeral UUID for distributed tracing |
| `universeId` | `UniverseId` | Mandatory isolation scope |
| `branchId` | `BranchId` | Active timeline context (defaults to Canon) |
| `rawText` | `String` | Original user or LLM input |
| `parsedAst` | `QueryAST` | Structured representation (Boolean logic, clauses) |
| `queryVector` | `Vector?` | Generated embedding for semantic search |
| `filters` | `SearchFilter[]` | Hard boolean constraints (e.g., `type == CHARACTER`) |
| `requestedFacets` | `String[]` | Fields to aggregate in results (e.g., `tags`) |
| `pagination` | `Pagination` | Offset/Limit or Cursor for deep paging |
| `rankingProfile` | `RankingProfile` | Weight adjustments (e.g., RECENCY_BOOST, CANON_BOOST) |
| `minScore` | `Float` | Cutoff threshold for result relevance |
| `timeoutMs` | `Integer` | Execution timeout (default: 500ms) |

---

### 2.3 SearchResult

**Purpose:** The paginated response containing matched documents, highlighted snippets, metadata aggregations, and execution metrics.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `queryId` | `QueryId` | Links back to the original request |
| `totalHits` | `Long` | Total matching documents across the index |
| `executionTimeMs` | `Integer` | Backend processing latency |
| `documents` | `SearchDocument[]` | The retrieved hits ordered by score |
| `facets` | `SearchFacet[]` | Aggregation buckets (e.g., Type counts) |
| `suggestions` | `SearchSuggestion[]` | "Did you mean?" or auto-complete hints |
| `maxScore` | `Float` | Highest relevance score in the set |
| `nextCursor` | `String?` | Token for retrieving the next page of results |
| `isPartial` | `Boolean` | True if the search timed out before searching all shards |

---

### 2.4 SearchIndex

**Purpose:** The logical container holding inverted indices for text, columnar stores (doc values) for filtering/sorting/faceting, and HNSW graphs for vector search.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `indexId` | `IndexId` | Internal unique identifier |
| `universeId` | `UniverseId` | Associated Story Universe |
| `indexAlias` | `String` | Stable routing name (e.g., `universe_123_read`) |
| `backingStore` | `String` | Physical index name (e.g., `universe_123_v4`) |
| `documentCount` | `Long` | Number of indexed entities |
| `schemaVersion` | `SemanticVersion` | Mapping version of the index |
| `state` | `IndexState` | ACTIVE / BUILDING / DEPRECATED |
| `shardCount` | `Integer` | Number of physical partitions |
| `replicaCount` | `Integer` | Number of redundant copies |
| `lastRefreshedAt` | `Timestamp` | Time of last index segment commit |

---

### 2.5 SearchDocument

**Purpose:** A denormalized, flattened representation of an Entity, designed specifically for rapid retrieval, scoring, and highlighting. A SearchDocument is NOT a 1:1 copy of the database row; it is reshaped for search.

**Properties:**

| Property | Type | Indexing Treatment |
|---|---|---|
| `id` | `String` | Exact Match, Stored (Primary Key) |
| `entityType` | `String` | Keyword, Facetable (CHARACTER, LOCATION, EVENT) |
| `title` | `String` | Analyzed Text (High Boost applied at query time) |
| `aliases` | `String[]` | Analyzed Text (Medium Boost) |
| `description` | `String` | Analyzed Text (Standard weighting) |
| `metadata` | `KeyValue[]` | Dynamic nested fields, Facetable |
| `vectorEmbedding` | `Float[]` | HNSW Vector Index (Dense vector space, 1536-dim) |
| `branchStates` | `Map<BranchId, Hash>`| Used for Branch-Aware filtering logic |
| `graphCentrality` | `Float` | Numeric, used for Ranking Boost calculations |
| `isCanon` | `Boolean` | Filterable, Boostable |
| `isSecret` | `Boolean` | Filterable (Security injection target) |
| `createdAt` | `Timestamp` | Sortable |
| `lastUpdated` | `Timestamp` | Sortable, Recency Decay applied |
| `adjacentNodes` | `String[]` | Array of 1st-degree connected entity IDs |

---

### 2.6 SearchAnalyzer

**Purpose:** The processing pipeline that converts raw text into normalized tokens for the inverted index. StoryOS uses multiple analyzers depending on the field.

**Pipeline Components:**
1. **Character Filters:** Strip HTML tags, normalize unicode (e.g., `café` -> `cafe`), convert em-dashes to spaces, strip markdown syntax.
2. **Tokenizer:** 
   - *Standard:* Word boundary split based on Unicode text segmentation.
   - *Edge N-Gram:* Splits words into prefixes (`mag` -> `m`, `ma`, `mag`) for sub-millisecond autocomplete.
3. **Token Filters:**
   - Lowercase filtering.
   - Stop-word removal (`the`, `is`, `at`, `and`).
   - Stemming (`running` -> `run`, `wolves` -> `wolf`).
   - Synonym expansion (`Blade` -> `Sword`, `Mage` -> `Wizard`).

---

### 2.7 SearchRanking & Ranking Profiles

**Purpose:** Mathematical formulas that dictate the order of `SearchResults`. Custom profiles allow different parts of the application (e.g., Editor UI vs AI Agent) to prioritize different signals.

- **Base Score:** BM25 (Lexical) or Cosine Similarity (Semantic).
- **Boosts:** Multipliers applied dynamically.
- **Profiles:**
  - `STRICT_LEXICAL`: Disables semantic search completely (fastest, exact matches).
  - `DISCOVERY`: High semantic weight, high graph centrality boost. Designed for serendipitous exploration.
  - `RECENT_CHANGES`: Exponential decay boost on `lastUpdated`. Designed for dashboards.
  - `CANON_ONLY`: Applies a hard filter dropping all non-Canon results, prioritizing published truth.
  - `AI_RAG`: Specifically tuned for Retrieval-Augmented Generation, minimizing false positives over recall.

---

### 2.8 SearchFilter & SearchFacet

- **SearchFilter:** A boolean predicate that strictly includes or excludes documents (e.g., `status IN (ACTIVE, DRAFT)`). Filters do not affect relevance scores; they only restrict the candidate pool (pre-filtering). Because they bypass scoring, filters are highly cacheable and extremely fast.
- **SearchFacet:** An aggregation over the result set. Example: Searching for "Sword" returns 500 hits. The Facet computes: `Type: Item (400), Event (50), Character (50)`. Facets drive the UI drill-down experience.

---

### 2.9 SearchSuggestion & SearchStatistics

- **SearchSuggestion:** Powered by a specialized edge N-gram index or completion suggester to provide < 20ms type-ahead autocomplete in the user interface. Suggests entities, recent searches, or popular terms.
- **SearchStatistics:** Real-time analytics tracking zero-result queries (identifying content gaps), slow queries, and Reciprocal Rank Fusion performance. This data feeds back into the synonym dictionaries and alerts content editors to missing lore.

---

### 2.10 SearchPolicy

**Purpose:** Configuration objects defining retention limits, index rotation schedules, vector embedding model versions, and resource allocation per Story Universe. Determines how many replicas a universe requires based on read volume.

---

## Part III — Search Types

StoryOS executes queries across multiple conceptual planes simultaneously. Users do not choose which engine to use; the SearchManager routes the intent seamlessly.

### 3.1 Full Text (Lexical BM25)

- **Mechanic:** Analyzes query terms against inverted index frequencies. BM25 improves upon standard TF-IDF by applying term frequency saturation (the 100th occurrence of a word doesn't boost the score 100x) and document length normalization (a match in a short description is worth more than a match in a 50-page chapter).
- **Best For:** Exact names, specific phrasing, known entities, and part numbers.
- **Example:** A search for `"John Smith"` exactly matches the Character's name field with high precision.

### 3.2 Semantic (Vector / ANN)

- **Mechanic:** Computes cosine similarity between the query's embedding vector and document embedding vectors using Approximate Nearest Neighbor (HNSW - Hierarchical Navigable Small World graphs).
- **Best For:** Conceptual matching, intent-based queries, thematic searches, and descriptive lookups where the exact words are unknown.
- **Example:** `"Characters who use fire magic"` will return the "Pyromancer" entity even if the words "fire" or "magic" do not explicitly appear in the entity's description, because their mathematical vectors lie close together in the 1536-dimensional space.

### 3.3 Hybrid Search (RRF)

- **Mechanic:** Executes Lexical and Semantic searches in parallel. The result sets are merged using Reciprocal Rank Fusion (RRF).
  `RRF_Score = 1 / (k + Rank_Lexical) + 1 / (k + Rank_Semantic)`
  Where $k$ is a smoothing constant (typically 60).
- **Best For:** The default search mode for all natural language inputs in StoryOS, balancing exact precision with thematic recall.

### 3.4 Metadata & Exact Match

- **Mechanic:** Strict columnar filtering on structured fields (Enums, Tags, IDs, Dates) bypassing the scoring engine entirely via bitset intersections.
- **Best For:** API queries, workflow routing, dashboard faceted navigation, and security enforcement.
- **Example:** `entityType == LOCATION AND tags CONTAINS "Capital" AND population > 100000`

### 3.5 Graph & Relationship Search

- **Mechanic:** While deep, multi-hop graph traversal belongs to the Knowledge Graph Domain, the Search Index denormalizes 1st-degree relationships for fast retrieval.
- **Example:** Searching for a specific event will heavily boost entities that share a `PARTICIPATED_IN` edge with that event. The index stores an array of adjacent node IDs (`adjacentNodes: ["E_123", "E_456"]`) to facilitate this without requiring expensive graph joins at query time.

### 3.6 Branch-Aware Search

- **Mechanic:** A query executing on the `AI_PROPOSAL_1` branch must return the entity states as they exist on that branch, not as they exist in Canon.
- **Implementation:** `SearchDocument` contains a map of branch overrides. If an entity is modified on a branch, its updated state is indexed alongside its Canon state. Query-time routing via the Search Gateway ensures the correct payload is retrieved based on the user's active session state. If the entity was not modified on the branch, it seamlessly falls back to the Canon representation.

### 3.7 Canon-Aware Search

- **Mechanic:** Users searching the global platform default to Canon-only results. The `isCanon: true` filter is implicitly applied to all queries unless the user explicitly toggles "Include Proposals / Alternate Timelines" in the UI.

### 3.8 AI Memory & Workflow Search

- **Mechanic:** AI Agents possess a private Memory Graph. Search queries executed by an AI Agent automatically scope to the Universe AND the Agent's private memory namespace, allowing RAG pipelines to retrieve context securely without hallucinating details from other universes or accessing unauthorized Canon data.

---

## Part IV — Detailed Execution Pipelines

### 4.1 Exhaustive Query Pipeline State Machine

The query execution path is a highly concurrent DAG (Directed Acyclic Graph).

```text
       [CLIENT REQ]
            │
            ▼
    [SECURITY GATEWAY] ───── (Injects universeId & Branch filters)
            │
            ▼
      [QUERY PARSER]   ───── (Generates AST)
            │
            ├─────────────────────────────────────────┐
            ▼                                         ▼
   [LEXICAL BRANCH]                            [SEMANTIC BRANCH]
            │                                         │
    (BM25 Inverted Index)                    (HNSW Vector Graph)
            │                                         │
            ▼                                         ▼
     [TOP 1000 HITS]                           [TOP 1000 HITS]
            │                                         │
            └──────────────────┬──────────────────────┘
                               ▼
                        [RRF FUSION]
                               │
                               ▼
                      [RANKING BOOSTS] ───── (Graph Centrality, Recency)
                               │
                               ▼
                       [POST-FILTERING] ──── (Role-based exclusions)
                               │
                               ▼
                        [HIGHLIGHTING]
                               │
                               ▼
                      [RETURN TO CLIENT]
```

### 4.2 Comprehensive Incremental Indexing Flow

To meet the `< 60s` eventual consistency SLA:

1. **Transaction Commit:** A database transaction completes in the Entity Store.
2. **Outbox Pattern:** The Entity Store writes an `EntityUpdatedEvent` to a local outbox table.
3. **Change Data Capture (CDC):** Debezium/Kafka reads the outbox and streams the event.
4. **Indexer Consumption:** The Search Indexer service consumes the event.
5. **Micro-Batching:** Events are buffered for 5 seconds to merge rapid successive edits to the same entity.
6. **Data Hydration:** The Indexer calls the Entity API to fetch the full canonical JSON.
7. **Vectorization Call:** The Indexer calls the AI Domain's `/embed` endpoint.
8. **Document Transformation:** The JSON is flattened into the `SearchDocument` mapping.
9. **Bulk Upsert:** The document is sent via `_bulk` API to the Search Cluster.
10. **Index Refresh:** The Search Cluster flushes the translog to a Lucene segment.

### 4.3 Zero-Downtime Blue/Green Re-Indexing (Detailed)

```text
State A: READ=Alias_Blue, WRITE=Alias_Blue
[Trigger Event]: Schema upgraded.

Step 1: Create Index_Green with new mapping.
Step 2: Update WRITE=Alias_Blue,Alias_Green (Live traffic goes to both).
Step 3: Launch Background Backfill Job.
Step 4: Backfill streams 1M documents from Entity Store to Index_Green.
Step 5: Backfill completes. Verify Document Count (Blue == Green).
Step 6: Update READ=Alias_Green. (Queries now hit Green).
Step 7: Update WRITE=Alias_Green. (Blue stops receiving updates).
Step 8: Delete Index_Blue.

State B: READ=Alias_Green, WRITE=Alias_Green
```

---

## Part V — Deep Ranking Engine & Math

Ranking defines the intelligence of the search platform. 

### 5.1 BM25 Mathematics
BM25 score for a document `D` and query `Q` containing terms `q_i`:
```text
Score(D, Q) = sum( IDF(q_i) * (f(q_i, D) * (k1 + 1)) / (f(q_i, D) + k1 * (1 - b + b * (|D| / avgdl))) )
```
*Where:*
- `f(q_i, D)` is the term frequency.
- `|D|` is document length, `avgdl` is average document length.
- `k1` and `b` are tuning parameters. StoryOS sets `b=0.75` and `k1=1.2`.

### 5.2 Cosine Similarity for Vectors
```text
Similarity(A, B) = (A · B) / (||A|| * ||B||)
```
StoryOS normalizes all vectors to unit length prior to indexing. Therefore, the denominator is always 1, reducing the computation to a blazing-fast simple dot product `A · B`.

### 5.3 Reciprocal Rank Fusion (RRF)
```text
RRF(d) = sum( 1 / (60 + rank_i(d)) )
```
This formula ensures that documents ranking highly in *both* Lexical and Semantic lists bubble to the absolute top, ignoring raw score variance between the two disparate scoring systems.

---

## Part VI — Search API Contracts & Schemas

*(Note: These schemas define the logical architecture of the interface, not implementation code).*

### 6.1 Query Request Payload Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SearchQueryRequest",
  "type": "object",
  "properties": {
    "universeId": { "type": "string", "description": "Mandatory isolation scope" },
    "branchId": { "type": "string", "default": "canon" },
    "query": { "type": "string", "description": "Raw user input" },
    "filters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "field": { "type": "string" },
          "operator": { "enum": ["EQUALS", "CONTAINS", "GREATER_THAN", "IN"] },
          "value": { "type": ["string", "number", "array"] }
        }
      }
    },
    "page": { "type": "integer", "minimum": 1 },
    "size": { "type": "integer", "maximum": 100 },
    "rankingProfile": { "enum": ["DEFAULT", "STRICT_LEXICAL", "DISCOVERY"] }
  },
  "required": ["universeId", "query"]
}
```

### 6.2 Index Mapping Specification (Conceptual)
```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "entityType": { "type": "keyword" },
      "title": { "type": "text", "analyzer": "standard_english" },
      "description": { "type": "text", "analyzer": "standard_english" },
      "isCanon": { "type": "boolean" },
      "createdAt": { "type": "date" },
      "vectorEmbedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "dot_product"
      }
    }
  }
}
```

---

## Part VII — Consistency & Failure Recovery

### 7.1 Distributed Systems Tradeoffs
In the context of the CAP Theorem, the Search Index prioritizes **Availability (A) and Partition Tolerance (P)** over strong Consistency (C). The primary Entity Store guarantees ACID consistency; the Search Index is explicitly an AP system (Eventual Consistency).

### 7.2 Vector Clocks & Out-of-Order Events
- Every `SearchDocument` tracks the `VersionNumber` of the entity it represents.
- **Out-of-Order Rejection:** If the Indexer receives an event for `Version 5`, but the index already holds `Version 6` (due to network lag causing event #5 to arrive after event #6), the older event is safely ignored to preserve state integrity.

### 7.3 Dead Letter Queue (DLQ) Remediation Matrix
| Failure Reason | Action Taken | Escalation |
|---|---|---|
| Transient Network Error | Retry 3x with exponential backoff | DLQ after 3 fails |
| AI Embedding Timeout | Retry 5x, fallback to Lexical-only index temporarily | Alert AI Domain Owner |
| Mapping Parsing Error | Immediately route to DLQ (Poison Pill) | Alert Search Administrator |
| Index Out of Space | Block indexing queue, alert Critical | Trigger Auto-Scale |

---

## Part VIII — Detailed Security & RBAC Matrices

### 8.1 Attribute-Based Access Control (ABAC) in Search
Because RBAC is difficult to encode into inverted indices, StoryOS uses ABAC applied at query time.

| Actor Role | Injected Predicate | Resulting Behavior |
|---|---|---|
| **Anonymous/Reader** | `AND isSecret: false` | Secrets hidden entirely. |
| **Editor (Universe)** | `AND (isSecret: false OR ownerId: $USER)` | Can see own secrets. |
| **Admin (Universe)** | `(No restriction)` | Full visibility within Universe. |
| **AI Agent (Scoped)** | `AND branchId: $AGENT_BRANCH` | Sandboxed to agent's timeline. |

### 8.2 Right to be Forgotten (GDPR)
When a user exercises their right to be forgotten:
1. The Entity Domain hard-deletes the canonical record.
2. An `EntityHardDeletedEvent` is broadcast.
3. The Search Indexer intercepts this and issues a hard `DELETE` operation to the cluster.
4. The document is purged from the Lucene segments during the next merge cycle.

---

## Part IX — Domain Integration Workflows

### 9.1 Entity Domain Integration
- **Flow:** Entity mutations emit events.
- **Dependency:** Search depends entirely on the canonical JSON shape defined by the Entity Domain.

### 9.2 Knowledge Graph Integration
- **Flow:** Nightly batch job calculates PageRank across the Story Universe graph.
- **Dependency:** Search imports these scores via a bulk update to the `graphCentrality` field, which boosts heavily connected entities without requiring real-time graph traversal.

### 9.3 Versioning Domain Integration
- **Flow:** Branch forks emit `BranchCreatedEvent`.
- **Dependency:** Search documents contain a nested map: `branchStates: { "Branch_A": { ...delta... } }`. The query parser checks the user's active branch and applies a nested query to retrieve the delta payload if it exists.

---

## Part X — Infrastructure & Cluster Topologies

### 10.1 Cluster Sizing Guidelines
- **Master Nodes:** 3 dedicated nodes to prevent split-brain.
- **Data Nodes (Hot):** NVMe SSDs, high CPU. Stores Canon and active branches.
- **Data Nodes (Warm):** HDDs, high storage. Stores archived entities and deeply historic branches.
- **Ingest/ML Nodes:** Dedicated nodes for computing KNN vector distances to offload CPU from standard data nodes.

### 10.2 Shard Allocation Strategies
- Small Universes (< 10,000 entities) = 1 Primary Shard.
- Large Universes (> 1,000,000 entities) = 5 Primary Shards.
- Replicas = `N+1` based on availability zones.

---

## Part XI — Best Practices & Architectural Rules Summary

### 11.1 Naming Conventions
- Index Alias (Read): `{universeId}_search_read`
- Index Alias (Write): `{universeId}_search_write`
- Physical Index: `{universeId}_v{schemaVersion}`
- Facet Name: `facet_{domain}_{field}`

### 11.2 Performance Guidelines
1. **Never use Wildcard Prefix Queries:** Queries like `*agon` scan the entire dictionary space.
2. **Pre-Filter Before Semantic Search:** Always apply boolean filters before executing vector math.
3. **Limit Pagination:** Enforce a hard limit of 10,000 documents.
4. **Cache Aggregations:** Facet aggregations must be cached at the application layer (30s TTL).

### 11.3 Common Mistakes to Avoid
- ❌ **Mistake 1:** Search as the Source of Truth.
- ❌ **Mistake 2:** Ignoring Branch Context resulting in Canon bleed.
- ❌ **Mistake 3:** Over-Indexing every system field.
- ❌ **Mistake 4:** Synchronous Indexing on the Write Path blocking databases.
- ❌ **Mistake 5:** Text-Only Fallback for RAG instead of Hybrid RRF.

### 11.4 Architectural Rules Summary
1. **ARCH-SCH-001** Absolute Universe Isolation
2. **ARCH-SCH-002** Asynchronous Eventual Consistency
3. **ARCH-SCH-003** Branch and Canon Awareness
4. **ARCH-SCH-004** Hybrid Retrieval Mandate
5. **ARCH-SCH-005** Zero-Downtime Schema Evolution

---
## Appendix A: Exhaustive API Contracts

### A.1 Endpoint: POST /v1/search/query
Executes a hybrid search request.

**Request Body:**
```json
{
  "universeId": "u_9a8b7c",
  "branchId": "canon",
  "query": "The fallen king",
  "filters": [
    {
      "field": "entityType",
      "operator": "EQUALS",
      "value": "CHARACTER"
    },
    {
      "field": "isSecret",
      "operator": "EQUALS",
      "value": false
    }
  ],
  "facets": ["tags", "status"],
  "pagination": {
    "page": 1,
    "size": 25
  },
  "rankingProfile": "DISCOVERY"
}
```

**Response Body:**
```json
{
  "meta": {
    "queryId": "q_12345",
    "executionTimeMs": 42,
    "totalHits": 156,
    "isPartial": false
  },
  "documents": [
    {
      "id": "e_999",
      "score": 1.45,
      "payload": {
        "title": "Aric the Fallen",
        "entityType": "CHARACTER",
        "description": "Once the king of the northern realms, now wandering."
      },
      "highlights": {
        "title": ["Aric the <em>Fallen</em>"],
        "description": ["Once the <em>king</em> of the northern realms"]
      }
    }
  ],
  "facets": {
    "tags": [
      { "key": "Royal", "count": 12 },
      { "key": "Exile", "count": 5 }
    ],
    "status": [
      { "key": "ACTIVE", "count": 150 },
      { "key": "ARCHIVED", "count": 6 }
    ]
  }
}
```

### A.2 Endpoint: POST /v1/search/index
Asynchronously indexes a document. (Internal Service API)

**Request Body:**
```json
{
  "universeId": "u_9a8b7c",
  "documentId": "e_999",
  "version": 42,
  "payload": {
    "entityType": "CHARACTER",
    "title": "Aric the Fallen",
    "description": "Once the king of the northern realms, now wandering.",
    "isCanon": true,
    "isSecret": false,
    "metadata": [
      { "key": "alignment", "value": "Chaotic Neutral" }
    ],
    "vectorEmbedding": [0.12, -0.44, 0.89, "... 1533 more floats ..."],
    "graphCentrality": 0.85
  }
}
```

## Appendix B: Comprehensive Glossary of Search Terminology

| Term | Definition |
|---|---|
| **Analyzed Text** | Text that has been broken down into tokens, lowercased, and stemmed before indexing. |
| **ANN (Approximate Nearest Neighbor)** | Algorithm used to find vectors in high-dimensional space that are close to the query vector, trading perfect accuracy for massive speed. |
| **BM25** | Best Matching 25. A ranking function used by search engines to estimate the relevance of documents to a given search query. |
| **Blue/Green Indexing** | A deployment strategy where a new index (Green) is built alongside the live index (Blue). Traffic is swapped only when Green is fully built, ensuring zero downtime. |
| **Cosine Similarity** | A metric used to measure how similar two vectors are irrespective of their size. It measures the cosine of the angle between two vectors projected in a multi-dimensional space. |
| **Dead Letter Queue (DLQ)** | A service queue where messages (events) that cannot be processed successfully are sent for manual or automated review. |
| **Document Frequency (DF)** | The number of documents in the index that contain a specific term. Used to calculate IDF. |
| **Doc Values** | On-disk, column-oriented data structures built at document index time, used for sorting, aggregations (facets), and accessing field values in scripts. |
| **Eventual Consistency** | A distributed computing model where updates to the system will eventually propagate to all nodes, meaning a read might temporarily return stale data immediately after a write. |
| **Facet** | A categorized aggregation of search results. E.g., showing how many results belong to "Type: Character" vs "Type: Location". |
| **Highlighting** | The process of returning text snippets from a document with the matching query terms wrapped in emphasis tags (e.g., `<em>`). |
| **HNSW (Hierarchical Navigable Small World)** | A graph-based indexing algorithm used for fast approximate nearest neighbor search in vector spaces. |
| **Hybrid Search** | A search execution that simultaneously runs lexical (keyword) and semantic (vector) queries, merging the results for optimal relevance. |
| **Inverted Index** | A database index storing a mapping from content, such as words or numbers, to its locations in a document or a set of documents. |
| **Keyword Field** | A string field that is NOT analyzed. It is indexed exactly as provided and is used for exact filtering, sorting, and aggregations. |
| **Micro-batching** | Collecting incoming streaming events into small batches (e.g., 5 seconds of events) and processing them together to reduce write overhead on the storage layer. |
| **Reciprocal Rank Fusion (RRF)** | A simple but highly effective algorithm for combining the ranked results of multiple search strategies (e.g., BM25 and Vector) into a single unified ranked list. |
| **Stemming** | The process of reducing inflected (or sometimes derived) words to their word stem, base, or root form (e.g., 'running' to 'run'). |
| **Stop Words** | Commonly used words (such as "the", "a", "an", "in") that are programmed to be ignored by search analyzers to save space and improve performance. |
| **Synonym Expansion** | Automatically augmenting a user's query or a document's index tokens with synonymous words (e.g., expanding "Blade" to include "Sword"). |
| **Term Frequency (TF)** | The number of times a term occurs in a document. Used in BM25 scoring. |
| **Vector Embedding** | A mathematical representation of text, images, or audio as an array of floating-point numbers, capturing semantic meaning. |

## Appendix C: Monitoring and Observability Metrics

The Search Domain exports the following Prometheus metrics for operational observability:

| Metric Name | Type | Description | Alert Threshold |
|---|---|---|---|
| `search_query_latency_ms` | Histogram | Latency of executing the full RRF query pipeline. | p99 > 200ms |
| `search_indexing_lag_seconds` | Gauge | Time difference between event creation and index commit. | > 60s |
| `search_dlq_depth` | Gauge | Number of events trapped in the Dead Letter Queue. | > 0 |
| `search_zero_hit_queries_total` | Counter | Number of queries that returned 0 results. | N/A (Analytical) |
| `search_cluster_heap_usage_bytes` | Gauge | JVM heap usage across data nodes. | > 85% |
| `search_circuit_breaker_trips` | Counter | Number of times a query was aborted to prevent OOM. | > 5 per minute |

## Appendix D: Advanced Semantic Tuning (Future Phase 2)

As StoryOS scales, the following advanced semantic tuning mechanisms will be introduced:

1. **Fine-Tuned Embedding Models:** Training a custom embedding model on fantasy/sci-fi literature to better understand universe-specific jargon (e.g., understanding that "Warp Drive" is related to "FTL" but not "Warped Wood").
2. **Learning to Rank (LTR):** Implementing a machine learning model that ingests user click-through data to automatically adjust the weights (W1, W2) in the RRF formula on a per-universe basis.
3. **Cross-Encoder Re-Ranking:** Applying a computationally heavy cross-encoder model exclusively to the Top 50 results retrieved by RRF to achieve maximum precision for the first page of results.

## Appendix E: Search Result Formatting Algorithms

In addition to ranking, the visual presentation of results relies on server-side highlighting to give creators immediate context.
\n
### Scenario Example: Search Edge Case 1
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 2
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 3
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 4
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 5
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 6
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 7
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 8
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 9
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 10
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 11
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 12
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 13
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 14
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 15
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 16
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 17
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 18
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 19
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 20
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 21
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 22
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 23
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 24
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 25
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 26
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 27
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 28
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 29
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 30
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 31
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 32
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 33
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 34
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 35
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 36
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 37
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 38
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 39
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 40
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 41
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 42
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 43
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 44
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 45
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 46
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 47
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 48
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 49
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 50
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 51
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 52
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 53
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 54
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 55
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 56
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 57
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 58
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 59
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 60
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 61
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 62
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 63
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 64
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 65
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 66
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 67
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 68
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 69
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 70
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 71
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 72
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 73
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 74
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 75
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 76
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 77
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 78
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 79
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 80
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 81
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 82
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 83
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 84
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 85
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 86
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 87
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 88
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 89
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 90
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 91
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 92
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 93
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 94
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 95
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 96
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 97
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 98
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 99
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 100
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 101
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 102
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 103
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 104
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 105
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 106
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 107
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 108
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 109
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 110
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 111
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 112
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 113
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 114
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 115
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 116
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 117
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 118
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 119
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 120
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 121
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 122
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 123
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 124
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 125
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 126
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 127
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 128
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 129
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 130
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 131
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 132
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 133
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 134
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 135
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 136
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 137
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 138
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 139
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 140
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 141
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 142
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 143
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 144
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 145
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 146
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 147
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 148
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.

### Scenario Example: Search Edge Case 149
**Context:** User executes complex query involving multi-hop graph assumptions.
**Query:** `Find all artifacts created before the Great War`
**Execution Steps:**
1. NLP Parser detects temporal constraint `before the Great War`.
2. Knowledge Graph lookup resolves `Great War` to Timestamp `T-1000`.
3. AST generated: `type: ARTIFACT AND createdAt < T-1000`.
4. Semantic Search executed on `artifacts`.
5. RRF Fusion completes in 45ms.
6. Return Top 10 results.
\n> *End of Appendix E*