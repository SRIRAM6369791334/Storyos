# StoryOS — Docker-Dependent Pending Work

> **Status:** DEFERRED — Docker disabled to preserve PC performance  
> **Resume When:** Docker Desktop re-enabled after project phase completion  
> **Last Updated:** 2026-08-05

---

## Why This File Exists

All integration tests, real infrastructure verification, and end-to-end flows
require Docker containers running locally. These are intentionally deferred and
tracked here so nothing is forgotten when Docker is re-enabled.

---

## Docker Services Required (docker-compose.yml)

| Service | Image | Port | Used By |
|---------|-------|------|---------|
| **PostgreSQL** | `postgres:16-alpine` | `5432` | Universe, Character, Location, Event domains |
| **Neo4j** | `neo4j:5-community` | `7474`, `7687` | Relationship domain (Cypher graph queries) |
| **Apache Kafka** | `confluentinc/cp-kafka` | `9092` | All domains (domain event publishing) |
| **Zookeeper** | `confluentinc/cp-zookeeper` | `2181` | Kafka dependency |
| **Redis** | `redis:7-alpine` | `6379` | Cache layer (future sprints) |
| **Milvus** | `milvusdb/milvus` | `19530` | Vector search (future AI sprints) |

**Start command:**
```bash
docker compose up -d
```

**Stop command:**
```bash
docker compose down
```

**Check all container status:**
```bash
docker compose ps
```

---

## Pending Work Items

### 1. Sprint Integration Tests (Sprints 1-5)

Each sprint has a real integration test that connects to actual Docker infra.
These ONLY pass when Docker is running.

| Sprint | Test File | Infra Required |
|--------|-----------|----------------|
| Sprint 1 — Universe | `libs/infrastructure/database-postgres/src/universe.integration.spec.ts` | Postgres + Kafka |
| Sprint 2 — Character | `libs/infrastructure/database-postgres/src/character.integration.spec.ts` | Postgres + Kafka |
| Sprint 3 — Location | `libs/infrastructure/database-postgres/src/location.integration.spec.ts` | Postgres + Kafka |
| Sprint 4 — Relationship | `libs/infrastructure/database-neo4j/src/relationship.integration.spec.ts` | Neo4j + Postgres + Kafka |
| Sprint 5 — Event | `libs/infrastructure/database-postgres/src/event.integration.spec.ts` | Postgres + Kafka |
| Sprint 7 - Narrative | `libs/infrastructure/database-postgres/src/narrative.integration.spec.ts` | Postgres + Kafka |

**Run command (when Docker is up):**
```bash
pnpm test:integration
```

---

### 2. API Gateway — Deep Health Check Verification

The `/health/deep` endpoint checks all 5 infrastructure components.
Currently returns DOWN because Docker is off. This is correct behavior.

**Verification step (when Docker is up):**
```bash
curl http://localhost:3000/health/deep
```

Expected response:
```json
{
  "status": "UP",
  "components": {
    "postgres": { "status": "healthy" },
    "neo4j":    { "status": "healthy" },
    "redis":    { "status": "healthy" },
    "milvus":   { "status": "healthy" },
    "kafka":    { "status": "healthy" }
  }
}
```

---

### 3. Database Schema Migrations (PostgreSQL)

PostgreSQL tables are created via SQL migration scripts.
These need to run once against a live Postgres container.

| Migration | Creates Tables |
|-----------|----------------|
| `001_create_universes.sql` | `universes` |
| `002_create_characters.sql` | `characters` |
| `003_create_locations.sql` | `locations` |
| `004_create_events.sql` | `events`, `event_participants` |

**Run when Docker is up:**
```bash
docker compose up -d postgres
pnpm db:migrate
```

---

### 4. Neo4j Graph Schema Setup

Neo4j constraints and indexes for the Relationship domain need to be applied
once against a live Neo4j instance.

**Cypher commands to run in Neo4j Browser (http://localhost:7474):**
```cypher
CREATE CONSTRAINT relationship_id_unique IF NOT EXISTS
  FOR (r:Relationship) REQUIRE r.relationshipId IS UNIQUE;

CREATE INDEX relationship_universe_idx IF NOT EXISTS
  FOR (r:Relationship) ON (r.universeId);
```

Default credentials: `neo4j / neo4j` (change on first login)

---

### 5. End-to-End API Flow Verification

Full flow: Create Universe -> Create Character -> Create Location ->
Create Relationship -> Create Event -> verify all via GET endpoints.

```bash
# Create Universe
curl -X POST http://localhost:3000/universes \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Universe","createdBy":"user-001"}'

# Create Character (replace {universeId} with ID from above)
curl -X POST http://localhost:3000/universes/{universeId}/characters \
  -H "Content-Type: application/json" \
  -d '{"primaryName":"Arjun","createdBy":"user-001"}'
```

---

### 6. Web App — Live API Connectivity Test

Full UI flow only works when Docker infra is running and gateway has data.

```bash
# Terminal 1
docker compose up -d

# Terminal 2
pnpm --filter api-gateway dev

# Terminal 3
pnpm --filter web-app dev

# Browser: http://localhost:3001
```

---

### 7. Future Sprint Integration Tests (Not Yet Implemented)

| Sprint | Domain | Infra Required |
|--------|--------|----------------|
| Sprint 8 | Knowledge Graph queries | Neo4j + Postgres |
| Sprint 9+ | AI/Embedding features | Milvus + Redis |

---

## Quick Resume Checklist

When you are ready to re-enable Docker, follow this exact order:

```
[ ] 1. Start Docker Desktop
[ ] 2. cd G:\StoryOS
[ ] 3. docker compose up -d
[ ] 4. Wait 30-60 seconds for all containers to become healthy
[ ] 5. pnpm test:integration         (should pass all 5 sprint integration tests)
[ ] 6. pnpm --filter api-gateway dev
[ ] 7. curl http://localhost:3000/health/deep   (expect all "healthy")
[ ] 8. Continue with Sprint 7 implementation
```

---

## What Does NOT Need Docker

These always work even without Docker:

| Command | Works Without Docker |
|---------|---------------------|
| `pnpm test:unit` | YES — 103/103 tests pass (uses mocks) |
| `pnpm lint` | YES — 0 errors |
| `pnpm --filter web-app build` | YES — Next.js build succeeds |
| `GET /health` (liveness) | YES — returns UP |
| `GET /health/deep` (readiness) | NO — requires all 5 Docker services |
| `pnpm test:integration` | NO — requires Docker |
| Any POST/GET to domain endpoints | NO — requires Postgres/Neo4j |
