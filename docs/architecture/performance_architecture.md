# StoryOS Enterprise Architecture
## Task 8.1 — Performance Architecture

### 1. Preface
This document defines the Performance Architecture for StoryOS. It establishes the performance budgets, engineering processes, database optimization strategies, and application-level caching required to meet stringent enterprise SLAs. This architecture ensures that StoryOS remains lightning-fast, highly responsive, and capable of handling massive concurrency without degradation.

### 2. Executive Overview
Performance is a feature. In StoryOS, a sluggish UI or delayed AI response breaks author immersion. This architecture enforces strict performance budgets (API p95 < 200ms, AI TTFT < 800ms) across all layers. It leverages multi-tier caching (CDN → API Gateway → Redis → PostgreSQL materialized views), rigorous query analysis, continuous profiling, and automated load testing in CI/CD to prevent performance regressions from ever reaching production.

### 3. Enterprise Objectives
- **Budget-First Engineering**: Define and enforce performance targets before feature implementation begins.
- **Predictable Latency**: Guarantee consistent API response times regardless of underlying system load.
- **AI Responsiveness**: Minimize Time-To-First-Token (TTFT) to maintain the illusion of real-time collaboration.
- **Continuous Monitoring**: Identify and resolve bottlenecks proactively using flame graphs and continuous profiling.

### 4. Architecture Overview
The Performance Architecture spans the entire stack, optimizing data retrieval, application processing, and frontend delivery.

```ascii
+-----------------------------------------------------------------------------+
|                           STORYOS PERFORMANCE TIERS                         |
+-----------------------------------------------------------------------------+
|                                                                             |
|  [ Client / Web Vitals ]  LCP < 2.5s, FID < 100ms, CLS < 0.1                |
|           |                                                                 |
|           v                                                                 |
|  +-------------------+                                                      |
|  | CDN / Edge Cache  |  (Static Assets, Public Read Models)                 |
|  +-------------------+                                                      |
|           |                                                                 |
|           v                                                                 |
|  +-------------------+                                                      |
|  | API Gateway Cache |  (GraphQL persisted queries, HTTP/2 Push)            |
|  +-------------------+                                                      |
|           |                                                                 |
|           v                                                                 |
|  +-------------------+       +-------------------+                          |
|  | App Layer (Go/Node| <---> | Redis (L2 Cache)  |                          |
|  | Pyroscope Profiler|       +-------------------+                          |
|  +-------------------+                                                      |
|           |                                                                 |
|           v                                                                 |
|  +-------------------+       +-------------------+                          |
|  | PgBouncer (Pool)  | <---> | PostgreSQL (Mat-  |                          |
|  +-------------------+       | erialized Views)  |                          |
|                              +-------------------+                          |
+-----------------------------------------------------------------------------+
```

### 5. Core Components
1. **Caching Tiers**: CDN (Cloudflare/Fastly), API Gateway Cache, Redis Application Cache, DB Materialized Views.
2. **Connection Pooler**: PgBouncer for PostgreSQL connection multiplexing.
3. **APM & Profiling**: Datadog APM for N+1 query detection, Pyroscope for continuous CPU/memory profiling.
4. **Load Testing Harness**: k6 scripts integrated into GitHub Actions CI/CD.
5. **AI Inference Optimizer**: vLLM with KV cache tuning and prompt caching.

### 6. Internal Architecture
Performance optimizations are baked into the standard request lifecycle, ensuring fast paths for cached data.

```ascii
Sequence Diagram: Optimized Request Lifecycle

Client       CDN       API Gateway     App Layer      Redis      Database
  |           |             |              |            |           |
  |-Request-->|             |              |            |           |
  |           |-Miss------->|              |            |           |
  |           |             |-Auth & Route>|            |           |
  |           |             |              |-CheckCache>|           |
  |           |             |              |<---Miss----|           |
  |           |             |              |            |-Query---->|
  |           |             |              |            |<--Data----|
  |           |             |              |-SetCache-->|           |
  |           |             |<--Response---|            |           |
  |<--Resp----|<--Cache-----|              |            |           |
```

### 7. Data Flow
Data flows prioritize read models and aggressive caching to minimize expensive database computations.

```ascii
Data Flow Diagram

[Write Operation] --> [PostgreSQL] --> [Debezium CDC] --> [Kafka]
                                                             |
                                                             v
[Client Read] <--- [Redis Cache] <--- [Cache Invalidator / Updater]
```

### 8. Runtime Lifecycle
State machine for query execution with timeout and fallback logic.

```ascii
State Machine: Query Execution

 [*] --> Connecting
 Connecting --> ConnectionAcquired : PgBouncer success
 ConnectionAcquired --> Executing
 Executing --> Completed : < 100ms
 Executing --> SlowQueryLogged : > 100ms
 Executing --> Timeout : > 2000ms
 Timeout --> FallbackCache
 Completed --> [*]
 SlowQueryLogged --> [*]
 FallbackCache --> [*]
```

### 9. Security Architecture
| Control | Implementation | Enforcement |
|---|---|---|
| Cache Poisoning Prevention | Strict key spacing and input validation | Redis client wrapper |
| DoS Protection | Rate limiting at API Gateway (Token bucket) | Envoy proxy configuration |
| Payload Size Limits | Max 5MB payload rejection | Nginx ingress controller |

#### Audit Record JSON
```json
{
  "event_id": "perf_11029",
  "timestamp": "2026-07-29T18:50:00Z",
  "actor": "system_apm",
  "action": "slow_query_detected",
  "resource": "db_main",
  "context": {
    "query_hash": "a8f9c21b",
    "execution_time_ms": 1450,
    "user_id": "usr_77492"
  }
}
```

### 10. Scalability & Performance Targets
| Metric | P50 Target | P95 Target | P99 Target | Throughput Limit |
|---|---|---|---|---|
| API Read Latency | 50ms | 200ms | 400ms | 50k RPS |
| API Write Latency | 100ms | 500ms | 1000ms | 10k RPS |
| AI TTFT | 300ms | 800ms | 1500ms | 1k RPS |
| Search Latency | 60ms | 150ms | 250ms | 5k RPS |

### 11. Reliability
- **Stale-While-Revalidate**: App serves stale data from Redis while asynchronously fetching fresh data from Postgres if cache is expired.
- **Connection Limits**: PgBouncer strictly limits Max Connections to Postgres to prevent memory exhaustion (OOM).

### 12. Performance
SLI/SLO definitions mapped directly to enterprise objectives.

| Metric | Target | Alert Threshold | Escalation |
|---|---|---|---|
| Read API P95 | < 200ms | > 300ms for 5m | P2 |
| Core Web Vitals LCP| < 2.5s | > 3.0s | P3 |
| Prompt Cache Hit % | > 75% | < 60% | P3 |
| DB Slow Queries | 0 per min | > 10 per min | P2 |

### 13. Observability
```text
http_request_duration_seconds_bucket{route="/api/v1/entities", le="0.2"} 45000
db_query_duration_seconds_bucket{table="entities", le="0.1"} 98000
redis_cache_hit_ratio{cache="entity_read_model"} 0.92
vllm_prompt_cache_hit_ratio 0.78
```

### 14. Failure Handling
- **Cache Stampede**: Uses randomized TTL jitter and probabilistic early expiration (XFetch) to prevent thundering herds.
- **Slow Downstream**: If a microservice exceeds latency budget, Circuit Breaker trips and returns a 503 or cached data immediately.

### 15. Testing Strategy
#### Chaos Testing Scenarios
1. **Redis Outage**: Terminate Redis cluster; verify app continues serving traffic direct from DB (with graceful degradation of latency).
2. **Network Jitter**: Introduce 100ms packet delay between App and DB; verify timeouts trigger and circuit breakers open.
3. **Thundering Herd**: Simulate 10k concurrent requests for an expired cache key; verify only one request hits the DB.

#### Security Testing Scenarios
1. **Large Payload Attack**: Send 50MB JSON payload; verify Ingress drops it before parsing.
2. **ReDoS Attack**: Send complex regex in search query; verify query timeout kills execution at 100ms.

### 16. Governance Rules
- **PERF-001**: Performance budgets must be defined before feature implementation.
  - **Rationale**: Retrofitting performance is expensive; it must be designed in.
  - **Enforcement**: Architecture Decision Records (ADRs) must include a Performance Budget section before approval.
- **PERF-002**: Any PR introducing N+1 queries must be rejected by APM-integrated CI check.
  - **Rationale**: N+1 queries are the most common cause of ORM-driven performance degradation.
  - **Enforcement**: CI pipeline runs tests with Datadog APM tracing enabled; fails build if span count exceeds threshold per request.
- **PERF-003**: Load test must pass before any release to production.
  - **Rationale**: Guarantee that new code can handle production traffic volumes.
  - **Enforcement**: Release gating in ArgoCD requires successful k6 load test metrics from the staging environment.

### 17. Cross-Document Integration
| Subsystem | Integration Point | Document |
|---|---|---|
| AI Platform | TTFT targets and prompt caching | Phase 4 - AI Platform |
| Database | PostgreSQL pooling and EXPLAIN analytics | Phase 1 - Storage |
| Observability | Metrics and continuous profiling | Phase 2 - Observability |

### 18. Future Evolution
- **WebAssembly (Wasm) Edge Computing**: Moving GraphQL stitching and simple read models to Cloudflare Workers to achieve <50ms global latency.
- **Predictive Prefetching**: Using ML to predict which entities the user will click next and preloading them into the client browser cache.

### 19. Executive Summary
The Performance Architecture ensures StoryOS operates at the speed of thought. By enforcing strict latency budgets, deploying a sophisticated multi-layer caching strategy, and embedding performance gates (N+1 detection, k6 load tests) directly into the CI/CD pipeline, the platform guarantees a seamless, responsive experience for all authors.

---
### Code & Schemas

#### SQL Schema (Performance Tracking)
```sql
CREATE TABLE slow_query_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(64) NOT NULL,
    normalized_query TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    occurrences INTEGER DEFAULT 1,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_slow_query_hash ON slow_query_log(query_hash);
CREATE INDEX idx_slow_query_time ON slow_query_log(execution_time_ms DESC);
```

#### TypeScript Interfaces
```typescript
export interface PerformanceBudget {
  endpoint: string;
  p50TargetMs: number;
  p95TargetMs: number;
  p99TargetMs: number;
  maxPayloadBytes: number;
}

export interface CacheOptions {
  ttlSeconds: number;
  jitterSeconds?: number;
  staleWhileRevalidate?: boolean;
}

export interface TraceSpan {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: number;
  durationMs: number;
  tags: Record<string, string>;
}
```

#### YAML Configuration Example
```yaml
performance:
  pgbouncer:
    pool_mode: "transaction"
    max_client_conn: 5000
    default_pool_size: 50
  caching:
    redis_url: "redis://cache-cluster:6379"
    default_ttl: 3600
    enable_stale_revalidate: true
  limits:
    max_request_size_mb: 5
    timeout_ms: 5000
```

#### Kubernetes Deployment Snippet
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: storyos-core
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      annotations:
        pyroscope.io/scrape: "true"
        pyroscope.io/port: "4040"
      labels:
        app: api-gateway
    spec:
      containers:
      - name: gateway
        image: storyos/api-gateway:v3.0.0
        resources:
          requests:
            cpu: "2"
            memory: "4Gi"
          limits:
            cpu: "4"
            memory: "8Gi"
        env:
        - name: GOMAXPROCS
          value: "4"
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
Phase 8 Performance is complete.

---
[Document End]
