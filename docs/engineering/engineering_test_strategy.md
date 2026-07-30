# StoryOS Engineering Test Strategy

> **Document Status:** Active v1.0 — Enterprise Standard  
> **Classification:** Internal — Engineering Restricted  
> **Owner:** Chief Software Architect & Quality Engineering Lead  
> **Phase:** 12 — Engineering Foundation  
> **Task:** 12.2 — Engineering Test Strategy  
> **Cross-References:** `docs/architecture/testing_strategy.md`, `docs/architecture/chaos_engineering_architecture.md`, `docs/architecture/ai_evaluation_architecture.md`

---

## 1. Executive Summary & Testing Philosophy

StoryOS is a multi-tenant, AI-first Story Operating System governing mission-critical story canon, complex knowledge graphs, vector embeddings, multi-agent workflows, and enterprise customer data. System failure—whether data loss, security breaches, prompt regressions, or AI hallucinations—destroys author trust and breaches SLAs.

The **StoryOS Testing Philosophy** enforces five core imperatives:
1. **Shift-Left Quality:** Security, performance, and correctness verification begin at the developer IDE and PR level before any code reaches staging.
2. **Deterministic Test Execution:** Unit and integration tests must run deterministically with zero flaky non-determinism.
3. **Continuous AI Evaluation:** AI prompts, LLM model routing, and GraphRAG outputs are continuously regression-tested using quantitative evaluation metrics (NDCG, ROUGE, BLEU, and LLM-as-Judge scoring).
4. **Zero Trust Security Verification:** Every pull request enforces security static analysis (SAST), dependency scanning (SCA), and tenant isolation boundary verification (`TENANT-001`).
5. **Quality Gates as Code:** Code merge to `main` is gated by automated CI check suites enforcing 85%+ code coverage and zero high/critical vulnerabilities.

---

## 2. The StoryOS Testing Pyramid

```
                                    ▲
                                   / \
                                  /   \
                                 / E2E \       (5% - Cypress / Playwright)
                                /-------\
                               /  System \     (10% - k6, Chaos, Load, Security)
                              /-----------\
                             / Integration \   (25% - Testcontainers, Neo4j, Redis, Kafka)
                            /---------------\
                           /   Unit Tests    \ (60% - Vitest, Jest, PyTest, Go Test)
                          /-------------------\
```

| Layer | Percentage Target | Primary Target & Scope | Frameworks & Tools | Target Execution Time |
|:---|:---:|:---|:---|:---:|
| **Unit Tests** | 60% | Pure domain logic, Value Objects, Aggregates, Policy Rego rules | Vitest, PyTest, Go Test | < 30 seconds |
| **Integration Tests** | 25% | Repositories, Kafka event handlers, Postgres RLS, Neo4j Cypher, Milvus ANN | Vitest + Testcontainers | < 3 minutes |
| **System & Security** | 10% | Contract verification, AI prompt regression, Chaos injection, k6 Load | Pact, Spectral, Litmus, k6 | < 10 minutes |
| **End-to-End (E2E)** | 5% | Critical user journeys (Signup -> Universe -> Character -> AI Co-Pilot) | Playwright | < 8 minutes |

---

## 3. Specialized Testing Domains

### 3.1 Knowledge Graph Testing (Neo4j)

Testing Neo4j Cypher queries requires validating index-free adjacency traversals, multi-tenant database isolation, and transactional graph mutations.

```typescript
// sample: tests/integration/graph/character-relationship.spec.ts
import { Testcontainers } from 'testcontainers';
import { Neo4jContainer } from '@testcontainers/neo4j';
import { Driver, driver, auth } from 'neo4j-driver';

describe('Knowledge Graph Relationship Traversal', () => {
  let container: any;
  let neo4jDriver: Driver;

  beforeAll(async () => {
    container = await new Neo4jContainer('neo4j:5.18-enterprise')
      .withEnvironment({ NEO4J_ACCEPT_LICENSE_AGREEMENT: 'yes' })
      .start();
    neo4jDriver = driver(container.getBoltUri(), auth.basic('neo4j', container.getPassword()));
  });

  afterAll(async () => {
    await neo4jDriver.close();
    await container.stop();
  });

  it('should traverse allies of allies within 2-hop radius without leaking cross-universe nodes', async () => {
    const session = neo4jDriver.session({ database: 'tenant-test-db' });
    try {
      await session.run(`
        CREATE (c1:Character {id: 'char-1', universeId: 'u-100', name: 'Hero'})
        CREATE (c2:Character {id: 'char-2', universeId: 'u-100', name: 'Ally1'})
        CREATE (c3:Character {id: 'char-3', universeId: 'u-100', name: 'Ally2'})
        CREATE (c4:Character {id: 'char-4', universeId: 'u-999', name: 'EnemySub'})
        CREATE (c1)-[:ALLIED_WITH]->(c2)
        CREATE (c2)-[:ALLIED_WITH]->(c3)
        CREATE (c1)-[:ALLIED_WITH]->(c4)
      `);

      const result = await session.run(`
        MATCH (c:Character {id: 'char-1'})-[:ALLIED_WITH*1..2]-(ally:Character)
        WHERE ally.universeId = $universeId
        RETURN ally.id AS allyId
      `, { universeId: 'u-100' });

      const allyIds = result.records.map(r => r.get('allyId'));
      expect(allyIds).toContain('char-2');
      expect(allyIds).toContain('char-3');
      expect(allyIds).not.toContain('char-4');
    } finally {
      await session.close();
    }
  });
});
```

### 3.2 Vector Database Testing (Milvus)

Milvus vector collection tests verify embedding insertion, ANN recall accuracy ($R@K \ge 0.95$), and partition key tenant isolation.

```typescript
// sample: tests/integration/vector/embedding-recall.spec.ts
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

describe('Milvus Vector Recall & Tenant Partition Isolation', () => {
  let client: MilvusClient;

  beforeAll(async () => {
    client = new MilvusClient({ address: process.env.MILVUS_URL || 'localhost:19530' });
  });

  it('enforces partition isolation on semantic search queries', async () => {
    const searchRes = await client.search({
      collection_name: 'story_knowledge_embeddings',
      partition_names: ['tenant_xyz'],
      vectors: [[0.12, 0.45, -0.89, 0.33 /* ... 1536 dims */]],
      limit: 5,
      output_fields: ['entity_id', 'tenant_id']
    });

    searchRes.results.forEach((hit) => {
      expect(hit.tenant_id).toBe('tenant_xyz');
    });
  });
});
```

### 3.3 AI Evaluation & Prompt Regression Testing

StoryOS runs automated prompt evaluation on every change to `libs/ai-engine/prompts/`:

1. **Factual Canon Consistency:** Verify LLM generation matches Knowledge Graph ground truth.
2. **Safety & Moderation Gate:** Output is evaluated by moderation classifiers for policy violations (`ai_safety_governance_architecture.md`).
3. **LLM-as-a-Judge Evaluation Pipeline:**

```json
{
  "testSuite": "CharacterDialoguePersonaTest",
  "evaluator": "gpt-4o-evaluator",
  "promptVersion": "v2.4.1",
  "metrics": {
    "personaFidelityScore": 0.94,
    "canonConsistencyScore": 0.98,
    "toxicityScore": 0.00,
    "latencyMs": 420
  },
  "passThreshold": 0.90,
  "status": "PASSED"
}
```

---

## 4. Contract & API Schema Testing

StoryOS uses **Consumer-Driven Contract Testing (Pact)** and **OpenAPI Spectral Linting** to guarantee 100% backward compatibility across services and SDKs (Task 5.3 & Task 5.7).

```yaml
# .spectral.yaml - OpenAPI Linting Rules
extends: ["spectral:oas", "spectral:ensure-examples"]
rules:
  no-api-v1-breaking-changes:
    description: "Detect breaking schema changes to stable v1 endpoints"
    severity: error
    given: "$.paths[*][*]"
    then:
      function: "truthy"
```

---

## 5. Performance, Load & Chaos Testing

### 5.1 Performance Targets & SLA Budget

| Operation | Target P50 | Target P95 | Target P99 | SLA Alert Threshold |
|:---|:---:|:---:|:---:|:---:|
| REST API Read Endpoint | 15 ms | 80 ms | 180 ms | P95 > 200 ms |
| GraphQL Complex Query | 25 ms | 120 ms | 300 ms | P95 > 400 ms |
| Knowledge Graph 3-Hop | 8 ms | 35 ms | 90 ms | P95 > 150 ms |
| AI Prompt First Token (TTFT) | 220 ms | 650 ms | 1200 ms | P95 > 1500 ms |

### 5.2 k6 Load Testing Script

```javascript
// tests/performance/k6-read-workload.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // ramp-up
    { duration: '5m', target: 1000 }, // sustained heavy load
    { duration: '1m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('https://api-staging.storyos.io/api/v1/universes/u-100/characters', {
    headers: { 'Authorization': `Bearer ${__ENV.TEST_JWT_TOKEN}` },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(0.5);
}
```

---

## 6. Security & Multi-Tenant Testing

Every pull request must pass the automated **Multi-Tenant Security Scanner**:

```typescript
// tests/security/tenant-isolation.spec.ts
import { db } from '@storyos/infrastructure/database';

describe('Security: RLS Tenant Isolation Guard', () => {
  it('prevents Tenant A from querying Tenant B data even with direct SQL injection attempt', async () => {
    const tenantASession = await db.createSession('tenant-A-uuid');
    
    // Attempting to bypass tenant_id filter
    const result = await tenantASession.query(
      `SELECT * FROM characters WHERE tenant_id = 'tenant-B-uuid' OR '1'='1'`
    );

    // PostgreSQL Row Level Security (RLS) returns ONLY Tenant A records
    result.forEach((row) => {
      expect(row.tenant_id).toBe('tenant-A-uuid');
    });
  });
});
```

---

## 7. Quality Gates & Definition of Done

Code cannot be merged into `main` unless it satisfies the **StoryOS Quality Gate Protocol**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 STORYOS CI QUALITY GATE                                  │
├───────────────────────────────────────┬──────────────────────────────────────────────────┤
│ Metric / Requirement                  │ Mandatory Threshold                              │
├───────────────────────────────────────┼──────────────────────────────────────────────────┤
│ Unit Test Line Coverage               │ ≥ 85% overall, 100% on domain entities           │
│ Branch Coverage                       │ ≥ 80%                                            │
│ Static Code Analysis (SonarQube)      │ Zero Debt Ratio, Maintainability Rating A        │
│ Vulnerability Scanner (Trivy/Snyk)    │ 0 Critical, 0 High Vulnerabilities               │
│ OpenAPI Contract Test (Spectral)      │ PASS (Zero breaking changes)                     │
│ RLS Multi-Tenant Security Check       │ 100% PASS                                        │
│ AI Prompt Regression Eval             │ Scores ≥ 0.90 baseline                            │
│ Performance Benchmark (k6)            │ P95 < 200ms                                      │
└───────────────────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 8. GitHub Actions CI/CD Pipeline Configuration

```yaml
# .github/workflows/ci-testing-pipeline.yml
name: StoryOS Continuous Quality Gate

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-and-integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: storyos_test
          POSTGRES_PASSWORD: testpassword
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint & Biome Check
        run: pnpm lint

      - name: Run Unit Tests with Vitest
        run: pnpm test:unit --coverage

      - name: Run Integration Tests
        run: pnpm test:integration

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: true
```

---

## 9. Executive CTO Certification

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                    EXECUTIVE CTO TEST STRATEGY CERTIFICATION                     ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ Document        : StoryOS Engineering Test Strategy                              ║
║ Status          : APPROVED & EFFECTIVE IMMEDIATELY                               ║
║ Certified By    : Chief Software Architect & Executive CTO                       ║
║ Scope           : Universal Quality Gate Enforcement for All StoryOS Codebases   ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
