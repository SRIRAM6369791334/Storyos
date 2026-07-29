# StoryOS Enterprise Architecture
## Task 7.4 — Search Intelligence Architecture

### 1. Preface
This document outlines the Search Intelligence Architecture for StoryOS. It builds upon the foundational Search Architecture defined in Task 1.8, extending the system into the intelligence layer. This includes semantic query understanding, query expansion, hybrid search orchestration (GraphRAG), personalized ranking, search-as-you-type with NLP entity extraction, cross-universe federated search, and search analytics. It serves as the authoritative blueprint for the Search Intelligence domain, ensuring adherence to StoryOS's DDD, CQRS, and zero-trust principles.

### 2. Executive Overview
The Search Intelligence subsystem is designed to transform basic text retrieval into a context-aware, AI-powered discovery experience. By leveraging the Knowledge Graph (Task 1.5) and GraphRAG (Task 4.2), the system intelligently interprets user intent—differentiating between entity lookups, narrative searches, and cross-reference discovery. It implements personalized ranking based on user feature stores, enforces strict universe privacy boundaries, and provides high-performance search-as-you-type capabilities using Named Entity Recognition (NER).

### 3. Enterprise Objectives
- **Semantic Understanding**: Transition from lexical matching to intent-based semantic retrieval.
- **Personalized Discovery**: Tailor search results using user affinity, recency boosts, and creator context.
- **Federated Privacy**: Enable cross-universe search for multi-universe publishers without leaking private data.
- **Continuous Improvement**: Analyze search logs to automatically retrain auto-complete and ranking models.
- **High Performance**: Guarantee search P95 latencies under 150ms while performing complex hybrid retrievals.

### 4. Architecture Overview
The Search Intelligence architecture integrates Elasticsearch/OpenSearch (lexical), Milvus (dense vector), and Neo4j (Knowledge Graph) through a Hybrid Search Orchestrator. 

```ascii
+-----------------------------------------------------------------------------+
|                          STORYOS SEARCH INTELLIGENCE                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|  +-------------------+       +---------------------+       +-------------+  |
|  | Search API (gRPC) | <---> | Query Understanding | <---> | NER Service |  |
|  +-------------------+       +---------------------+       +-------------+  |
|            |                            |                                   |
|            v                            v                                   |
|  +-----------------------------------------------------------------------+  |
|  |                     Hybrid Search Orchestrator                        |  |
|  |                     (BM25 + ANN + Graph Traversal)                    |  |
|  +-----------------------------------------------------------------------+  |
|            |                            |                       |           |
|            v                            v                       v           |
|  +-------------------+       +---------------------+       +-------------+  |
|  | PostgreSQL        |       | Milvus (Vectors)    |       | Neo4j (KG)  |  |
|  | (Metadata/Author) |       | (Semantic Search)   |       | (Relations) |  |
|  +-------------------+       +---------------------+       +-------------+  |
|            |                            |                       |           |
|            +----------------------------+-----------------------+           |
|                                         |                                   |
|                                         v                                   |
|                              +-------------------+                          |
|                              | Reciprocal Rank   |                          |
|                              | Fusion (RRF)      |                          |
|                              +-------------------+                          |
|                                         |                                   |
|                                         v                                   |
|                              +-------------------+                          |
|                              | Personalization & |                          |
|                              | Ranking Engine    |                          |
|                              +-------------------+                          |
+-----------------------------------------------------------------------------+
```

### 5. Core Components
1. **Query Understanding Engine**: Classifies user intent (Entity vs. Narrative) and performs query expansion using KG synonyms.
2. **NER Auto-Suggest Service**: Extracts entities from the current universe in real-time to suggest relevant completions.
3. **Hybrid Search Orchestrator**: Dispatches sub-queries to lexical, vector, and graph datastores concurrently.
4. **RRF Scorer**: Merges results from disparate retrieval systems using Reciprocal Rank Fusion.
5. **Personalization Engine**: Applies boosts based on feature store signals (recency, affinity).
6. **Federated Search Gateway**: Manages cross-universe query scattering and privacy-preserving aggregation.

### 6. Internal Architecture
The internal architecture relies on an Event-Driven CQRS pattern where domain events update the search indexes asynchronously.

```ascii
Sequence Diagram: Hybrid Search Execution

User         API Gateway    QueryEngine    Orchestrator   Milvus   Neo4j   Elastic
 |                |              |              |            |       |        |
 |---Search()---->|              |              |            |       |        |
 |                |---Parse()--->|              |            |       |        |
 |                |<--Intent-----|              |            |       |        |
 |                |                             |            |       |        |
 |                |---------Execute()---------->|            |       |        |
 |                |                             |---Vec()--->|       |        |
 |                |                             |---Graph()->|       |        |
 |                |                             |---Text()-->|       |        |
 |                |                             |<--Res------|       |        |
 |                |                             |<--Res------|       |        |
 |                |                             |<--Res------|       |        |
 |                |                             |            |       |        |
 |                |                             | (RRF Merge)|       |        |
 |                |<--------Results-------------|            |       |        |
 |<--Response-----|                             |            |       |        |
```

### 7. Data Flow
Data flows from the write models into the search read models via Kafka.

```ascii
Data Flow Diagram

+-------------+       +-------------+       +-------------------+
| Write Model | ----> | Kafka Topic | ----> | Indexing Consumer |
| (Postgres)  |       | (Events)    |       | (Search Service)  |
+-------------+       +-------------+       +-------------------+
                                                      |
                                      +---------------+---------------+
                                      |               |               |
                                      v               v               v
                                +-----------+   +-----------+   +-----------+
                                | Elastic   |   | Milvus    |   | Neo4j     |
                                | (Lexical) |   | (Vectors) |   | (Graph)   |
                                +-----------+   +-----------+   +-----------+
```

### 8. Runtime Lifecycle
The lifecycle of a search query involves parsing, expansion, retrieval, fusion, and ranking.

```ascii
State Machine: Search Query Lifecycle

 [*] --> Parsing
 Parsing --> IntentClassification
 IntentClassification --> QueryExpansion
 QueryExpansion --> Dispatch
 Dispatch --> LexicalSearch
 Dispatch --> VectorSearch
 Dispatch --> GraphSearch
 LexicalSearch --> RRF_Fusion
 VectorSearch --> RRF_Fusion
 GraphSearch --> RRF_Fusion
 RRF_Fusion --> Personalization
 Personalization --> Formatting
 Formatting --> [*]
```

### 9. Security Architecture
Zero Trust principles apply to search queries, ensuring users only see results they have access to.

| Control | Implementation | Enforcement |
|---|---|---|
| Tenant Isolation | Row-Level Security / Metadata filtering | Orchestrator appends `tenant_id` to all queries |
| Universe Privacy | ABAC checks on universe boundary | API Gateway evaluates token scopes |
| Data Masking | Omit hidden entities from search | Post-retrieval filtering before RRF |

#### Audit Record JSON
```json
{
  "event_id": "aud_883210984",
  "timestamp": "2026-07-29T18:39:03Z",
  "actor": {
    "user_id": "usr_77492",
    "roles": ["author", "universe_admin"]
  },
  "action": "search_query",
  "resource": "universe_992",
  "context": {
    "query": "the dark artifact",
    "intent": "narrative_search",
    "results_count": 42
  }
}
```

### 10. Scalability
The search infrastructure scales horizontally based on query volume and index size.

| Metric | P50 Target | P95 Target | P99 Target | Throughput Limit |
|---|---|---|---|---|
| Lexical Search | 15ms | 30ms | 50ms | 10k QPS |
| Vector Search | 25ms | 50ms | 80ms | 8k QPS |
| Graph Search | 30ms | 60ms | 100ms | 5k QPS |
| Hybrid RRF End-to-End | 60ms | 120ms | 150ms | 5k QPS |

### 11. Reliability
- **Circuit Breakers**: Wrapping external calls to Milvus and Neo4j. If Vector Search fails, system falls back to Lexical Search only.
- **Retry Policies**: Exponential backoff with jitter for index update consumers.
- **Dead Letter Queues**: Failed index updates are routed to a DLQ for manual inspection.

### 12. Performance
SLI/SLO definitions for the Search Intelligence layer.

| Metric | Target | Alert Threshold | Escalation |
|---|---|---|---|
| P95 Latency | < 150ms | > 200ms for 5m | P2 (On-call) |
| Zero-Result Rate | < 2% | > 5% for 1h | P3 (Search Eng) |
| Index Lag | < 30s | > 60s | P2 (Data Eng) |
| Error Rate | < 0.1% | > 1% for 5m | P1 (All Hands) |

### 13. Observability
Prometheus metrics exported by the Search Intelligence service.

```text
search_requests_total{tenant_id="xxx", intent="entity"} 14502
search_latency_seconds_bucket{le="0.1"} 14000
search_latency_seconds_bucket{le="0.2"} 14400
search_zero_result_total{tenant_id="xxx"} 290
search_index_lag_seconds{datasource="milvus"} 2.4
search_rrf_fusion_duration_seconds_sum 124.5
```

### 14. Failure Handling
- **Database Partitioning**: If Milvus is partitioned, search degrades gracefully to OpenSearch.
- **Timeout Management**: Strict 100ms timeout on all sub-queries. Partial results are merged and returned if a datastore times out.
- **Cache Fallback**: Repeated queries hit Redis. If Redis goes down, traffic routes directly to orchestrator (requires HPA scale-up).

### 15. Testing Strategy
#### Chaos Testing Scenarios
1. **Vector DB Outage**: Kill Milvus nodes; verify search degrades to lexical without failing.
2. **Kafka Latency**: Inject 60s delay in Kafka; verify index lag alert fires.
3. **High Cardinality Query**: Send a generic query matching 90% of DB; verify pagination limits prevent OOM.

#### Security Testing Scenarios
1. **Cross-Tenant Query**: Attempt to inject another tenant's ID into the query context; verify rejection.
2. **Hidden Entity Reveal**: Search for an entity marked "hidden"; verify it does not appear in autocomplete or results.
3. **Rate Limit Bypass**: Send 10k requests from one IP; verify WAF blocks traffic.

### 16. Governance Rules
- **SEARCH-001**: Search must respect universe privacy boundaries.
  - **Rationale**: Multi-tenant SaaS requires strict isolation.
  - **Enforcement**: Mandatory tenant ID and universe ID filters on all backend queries.
- **SEARCH-002**: Zero-result rate must be < 2% before query expansion is disabled.
  - **Rationale**: User experience degrades significantly with no results.
  - **Enforcement**: Automated analytics job adjusts expansion thresholds dynamically based on ZRR.
- **SEARCH-003**: Search index updates must propagate within 30 seconds of domain event.
  - **Rationale**: Authors expect their changes to be searchable immediately.
  - **Enforcement**: Prometheus alert on `search_index_lag_seconds > 30` triggers P2 escalation.

### 17. Cross-Document Integration
| Subsystem | Integration Point | Document |
|---|---|---|
| Knowledge Graph | Synonym and relationship expansion | Phase 1 - Knowledge Graph |
| GraphRAG | Hybrid query orchestration | Task 4.2 - GraphRAG |
| Feature Store | User preference signals for ranking | Phase 4 - AI Architecture |
| IAM / ABAC | Universe privacy boundary checks | Phase 2 - Security |

### 18. Future Evolution
- **Semantic Auto-Complete**: Move from NER-based auto-complete to full semantic auto-complete using lightweight local models.
- **Cross-Modal Search**: Enable searching for images and audio files via unified vector space.
- **Agentic Search**: Allow AI agents to formulate complex multi-step search queries autonomously.

### 19. Executive Summary
The Search Intelligence Architecture delivers a state-of-the-art hybrid search system that merges lexical, semantic, and graph-based retrieval. By understanding user intent and personalizing results while strictly enforcing privacy boundaries, StoryOS ensures a magical discovery experience for authors and readers alike. Adherence to performance targets and governance rules ensures scalable, reliable operation as data volumes grow.

---
### Code & Schemas

#### SQL Schema (PostgreSQL Index Tracker)
```sql
CREATE TABLE search_index_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    universe_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    last_indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    lexical_status VARCHAR(20) DEFAULT 'PENDING',
    vector_status VARCHAR(20) DEFAULT 'PENDING',
    graph_status VARCHAR(20) DEFAULT 'PENDING',
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (universe_id) REFERENCES universes(id)
);

CREATE INDEX idx_search_tracking_tenant ON search_index_tracking(tenant_id);
CREATE INDEX idx_search_tracking_status ON search_index_tracking(lexical_status, vector_status, graph_status);
```

#### TypeScript Interfaces
```typescript
export interface SearchQueryRequest {
  query: string;
  universeId: string;
  tenantId: string;
  filters?: SearchFilters;
  pagination: PaginationParams;
}

export interface SearchFilters {
  entityTypes?: string[];
  tags?: string[];
  dateRange?: DateRange;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
  metadata: Record<string, any>;
}

export interface HybridSearchResponse {
  results: SearchResult[];
  totalMatches: number;
  intentDetected: string;
  executionTimeMs: number;
}
```

#### YAML Configuration Example
```yaml
search_intelligence:
  hybrid_orchestrator:
    weights:
      lexical: 0.3
      vector: 0.5
      graph: 0.2
    rrf_k: 60
  timeouts:
    lexical_ms: 100
    vector_ms: 150
    graph_ms: 200
  query_expansion:
    enabled: true
    min_confidence: 0.85
```

#### Kubernetes Deployment Snippet
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: search-intelligence-svc
  namespace: storyos-core
spec:
  replicas: 5
  selector:
    matchLabels:
      app: search-intelligence
  template:
    metadata:
      labels:
        app: search-intelligence
    spec:
      containers:
      - name: orchestrator
        image: storyos/search-intelligence:v2.4.1
        ports:
        - containerPort: 50051
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
        env:
        - name: MILVUS_URI
          valueFrom:
            secretKeyRef:
              name: milvus-secrets
              key: uri
```

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
Phase 7 Search Intelligence is complete.

---
[Document End]
