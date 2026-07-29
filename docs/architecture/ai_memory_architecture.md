# AI Memory Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 4 — AI Architecture
> **Task:** 4.2 — AI Memory Architecture
> **Depends On:** `ai_agent_architecture.md`, `read_model_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Persistence of Intelligence

An LLM has an attention span exactly equal to its context window. Once a session ends, the model forgets everything. 

In StoryOS, intelligence must persist across sessions, years, and billions of words. The **AI Memory Architecture** defines how ephemeral conversational data is transformed into durable knowledge. It explicitly models memory not as a single database table, but as a hierarchical biological system—mapping Working, Episodic, Semantic, and Procedural memory to highly optimized storage engines.

---

## Part I — Memory Taxonomy and Storage Mapping

### 1.1 The Cognitive Memory Taxonomy
StoryOS maps cognitive science concepts directly to database infrastructure:
1. **Working Memory:** The immediate, sliding context window of the current conversation (e.g., the last 10 messages).
2. **Episodic Memory:** The chronological history of "what happened" (e.g., "The user asked me to generate a villain yesterday").
3. **Semantic Memory:** Synthesized, factual knowledge extracted from conversations (e.g., "The user prefers dark fantasy tropes").
4. **Procedural Memory:** Learned rules on *how* to do things (e.g., "When generating combat scenes for this user, always roll virtual D20s").
5. **Long-Term Canon:** The authoritative domain state (e.g., The actual Character and Timeline entities stored in PostgreSQL).

### 1.2 Infrastructure Mapping
- **Working Memory $\to$ Redis:** Lightning-fast, ephemeral, expires after 24 hours of session inactivity.
- **Episodic Memory $\to$ Relational (PostgreSQL):** Stored as structured `ChatHistory` logs.
- **Semantic/Procedural Memory $\to$ Vector DB (Milvus) + Graph (Neo4j):** Embedded as text chunks for semantic similarity searches, and mapped as nodes in the Knowledge Graph for deterministic relationship traversal.

---

## Part II — The Memory Lifecycle

### 2.1 Creation, Consolidation, and Archival
Memory in StoryOS is not static. It is a continuous background pipeline.
1. **Creation:** A user interacts with an Agent. The raw JSON transcript is saved to Episodic Memory.
2. **Consolidation (The Sleep Cycle):** During idle periods, a specialized **Memory Agent** reads the day's Episodic Memory. It extracts facts, updates preferences, and generates Semantic Memory (Vectors/Graph Nodes). It then summarizes the raw episodic transcript to save tokens.
3. **Archival & Expiration:** Raw conversational logs older than 90 days are moved to Object Storage (S3/Glacier). Only the consolidated Semantic Memory remains active.

### 2.2 Memory Consistency and Invalidation
Semantic Memory is inherently lossy. If a user states, "The villain's name is Malakor," the Memory Agent creates a Semantic fact.
- **Invalidation Policy:** If the user later renames the villain to "Voldor" via the UI, the Application Layer emits a `CanonUpdatedEvent`. The Memory Agent listens to this event and explicitly invalidates/deletes the old "Malakor" vector embedding to prevent hallucinations.

---

## Part III — Retrieval and Context Assembly

### 3.1 Indexing and Retrieval Strategies
When a user asks a question, StoryOS utilizes **Hybrid Search (GraphRAG)**:
1. **Vector Search (Semantic):** Queries Milvus for unstructured similarity (e.g., finding past conversations with a similar tone).
2. **Graph Traversal (Deterministic):** Queries Neo4j for structural facts (e.g., `(Character)-[LIVES_IN]->(Location)`).
3. **Reciprocal Rank Fusion (RRF):** The results from Vector and Graph are merged, re-ranked, and passed to the Orchestrator Agent.

### 3.2 Context Window Budgeting
LLM Context Windows (e.g., 128k tokens) are massive but expensive. StoryOS enforces strict Token Budgets per prompt:
- **System Directive:** 10% (Immutable rules)
- **Working Memory:** 20% (Recent chat sliding window)
- **Semantic Retrieval (Vectors):** 30% (Relevant past context)
- **Graph Retrieval (Canon):** 30% (Hard facts)
- **Scratchpad / Output Generation:** 10%

---

## Part IV — Ownership, Privacy, and Isolation

### 4.1 Cross-Agent Memory Sharing
- **Private Memory:** Working and Episodic memory are strictly bound to a single `SessionID` and `AgentID`. Agents cannot read another agent's active working memory.
- **Shared Memory:** Consolidated Semantic and Procedural memory are promoted to the `UniverseID` scope. If the Planner Agent learns a formatting rule, the Executor Agent has access to that rule via the Shared Semantic Vector space.

### 4.2 Tenant Isolation and Security
StoryOS enforces hard mathematical boundaries for memory.
- **Vector Metadata Filtering:** Every vector embedded in Milvus is tagged with `TenantID` and `UniverseID`. A search query is structurally incapable of retrieving vectors across tenant boundaries, preventing catastrophic Cross-Tenant Data Leakage (CTDL) at the AI layer.

---

## Part V — Observability and Testing

### 5.1 Memory Observability (SLIs)
- **Retrieval Latency (SLI):** Time to execute Hybrid Search (Graph + Vector). Target: $< 200ms$.
- **Hit Rate / Relevance Score (SLI):** Tracks how often retrieved chunks are actually referenced or cited by the LLM in its final output. If retrieval yields a $< 10\%$ citation rate, the semantic chunking strategy is degraded.

### 5.2 Testing Strategy for Memory Drift
- **Golden Retrieval Sets:** A static dataset of queries and expected document IDs. CI pipelines assert that Vector and Graph retrieval consistently return the exact expected documents in the top-K results, preventing "Retrieval Drift" when embedding models are upgraded.
- **Deterministic Replay:** Memory Agents are tested by feeding them a fixed JSON transcript of a mock conversation and asserting that the exact expected Graph Nodes and Vectors are generated.

---

## Part VI — AI Memory Governance Rules

**MEM-001: The Ephemeral Window Rule**
*Rule:* Active Working Memory (the raw conversational context window) MUST be strictly bounded. Once it exceeds the configured token limit, it MUST be aggressively summarized and evicted to Episodic storage.
*Enforcement:* Hardcoded sliding-window token counters in the Prompt Assembly pipeline.

**MEM-002: Hard Tenant Isolation**
*Rule:* No query can be executed against a Vector or Graph database without an explicit, mandatory `UniverseID` filter predicate.
*Enforcement:* Data Access Layer query interceptors.

**MEM-003: Memory Overrides Canon**
*Rule: (Inverse)* Semantic Memory must NEVER override the authoritative Domain Canon (Relational DB). If the Vector DB claims the character is dead, but the Relational DB claims they are alive, the Relational DB is absolute truth.
*Enforcement:* Architecture Review Board / RAG Fusion weighting logic.

---

> *"An agent is only as intelligent as the context it can retrieve. Unstructured memory is noise; governed, categorized, and aggressively pruned memory is knowledge."*

---

**Document End**
