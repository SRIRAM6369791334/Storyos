# StoryOS Repository Engineering Blueprint

> **Document Status:** Active v1.0 — Enterprise Standard  
> **Classification:** Internal — Engineering Restricted  
> **Owner:** Chief Software Architect & Principal Engineer  
> **Phase:** 12 — Engineering Foundation  
> **Task:** 12.3 — Repository Blueprint  
> **Cross-References:** `docs/architecture/architecture.md`, `docs/governance/coding_principles.md`, `docs/domain/domain_model.md`

---

## 1. Repository Philosophy & Architecture

StoryOS is structured as a **Single Enterprise Monorepo** managed via **Nx Workspaces** (or Turborepo). The monorepo layout enforces strong modular boundaries between **Applications** (`apps/`), **Core Domain Libraries** (`libs/domain/`), **Infrastructure Adapters** (`libs/infrastructure/`), **AI Engine Services** (`libs/ai-engine/`), and **Developer SDKs** (`libs/sdk/`).

### Monorepo Core Principles
1. **Single Source of Truth:** All application code, infrastructure as code (IaC), database migrations, AI prompt definitions, and documentation reside in a single versioned Git repository (`g:\StoryOS`).
2. **Strict Bounded Context Isolation:** Domain modules (`libs/domain/*`) MUST NOT import from infrastructure adapters or application services. All external communication is mediated through TypeScript Interfaces / Hexagonal Ports.
3. **Atomic Commit Traceability:** Feature releases, schema migrations, and prompt updates are committed atomically, ensuring exact environment reproducibility.
4. **Shared Code Reusability:** DTOs, domain value objects, and utility libraries are published as internal workspace packages without code duplication.

---

## 2. Monorepo Directory Tree

```
StoryOS/
├── .github/                       # GitHub Actions workflows & PR templates
│   ├── workflows/                 # CI/CD pipeline definitions
│   └── ISSUE_TEMPLATE/            # Standardized bug and feature specs
├── apps/                          # Deployable Applications & Services
│   ├── web-app/                   # Next.js 14 React Enterprise Web Application
│   ├── api-gateway/               # Kong / NestJS Public & Internal API Gateway
│   ├── worker-service/            # Background Worker Service (Sagas, Jobs, Webhooks)
│   ├── agent-orchestrator/        # Dedicated AI Agent Execution Service
│   └── developer-portal/          # Docusaurus / Next.js Developer Portal
├── libs/                          # Modular Shared Libraries (DDD Bounded Contexts)
│   ├── domain/                    # Pure Domain Core (Entities, Value Objects, Events)
│   │   ├── universe/              # Story Universe Bounded Context
│   │   ├── character/             # Character Bounded Context
│   │   ├── world/                 # World Building & Lore Bounded Context
│   │   ├── timeline/              # Chronology & Timeline Bounded Context
│   │   ├── knowledge-graph/       # Graph Node & Edge Bounded Context
│   │   └── canon/                 # Canon Management Bounded Context
│   ├── application/               # Application Layer (CQRS Commands, Queries, Sagas)
│   │   ├── command-handlers/      # Write model execution logic
│   │   ├── query-handlers/        # Read model projection handlers
│   │   └── use-cases/             # Application orchestration workflows
│   ├── infrastructure/            # Outbound Adapters & External Systems
│   │   ├── database-postgres/     # PostgreSQL TypeORM/Prisma RLS Repositories
│   │   ├── database-neo4j/        # Neo4j Driver & Cypher Repositories
│   │   ├── database-milvus/       # Milvus Vector Repositories
│   │   ├── messaging-kafka/       # Kafka Event Producers & Consumers
│   │   └── cache-redis/           # Redis Cache & Session Managers
│   ├── ai-engine/                 # AI Subsystem Libraries
│   │   ├── prompt-compiler/       # Prompt Template Engine & Context Assembly
│   │   ├── model-router/          # vLLM / OpenAI / Anthropic Routing
│   │   ├── memory-manager/        # Multi-tier Memory Subsystem
│   │   └── safety-guard/          # Moderation & Content Safety Enforcers
│   └── sdk/                       # Generated SDKs & API Clients
│       ├── typescript/            # Official TS/JS Client
│       ├── python/                # Official Python Data Science / ML Client
│       ├── go/                    # Official Go Client
│       └── csharp/                # Official C# Game Client (Unity/Unreal)
├── infra/                         # Infrastructure as Code (IaC)
│   ├── terraform/                 # AWS / GCP Cloud Resource Provisioning
│   ├── k8s/                       # Native Kubernetes Manifests
│   │   ├── base/                  # Base K8s Deployments, Services, ConfigMaps
│   │   └── overlays/              # Environment Overlays (dev, staging, prod)
│   ├── helm/                      # Custom Helm Charts (StoryOS Cluster Stack)
│   └── docker/                    # Local Docker Compose Stack Definition
├── docs/                          # Enterprise Documentation (The Constitution)
│   ├── architecture/              # 77+ Architecture Specification Documents
│   ├── adr/                       # Architecture Decision Records (ADR-0001 to 0007)
│   ├── domain/                    # Domain Model & Entity Definitions
│   ├── engineering/               # Test Strategy, Repository Blueprint
│   └── governance/                # Coding Standards & Policy Enforcements
├── scripts/                       # DevOps & Maintenance Scripts
│   ├── bootstrap.sh               # Local developer onboarding environment script
│   ├── db-migrate.sh              # Unified schema migration runner
│   └── generate-sdk.sh            # OpenAPI/GraphQL code generator runner
├── nx.json                        # Nx Monorepo Build Graph Configuration
├── package.json                   # Root Dependencies & Scripts
├── tsconfig.base.json             # Base TypeScript Strict Configuration
├── biome.json                     # Code Formatter & Linter Configuration
└── project_state.md               # Master Project State Tracker
```

---

## 3. Dependency & Layer Architecture Rules

StoryOS strictly enforces **Hexagonal / Clean Architecture Layering** using Nx Module Boundary Rules (`@nx/eslint-plugin`).

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  LAYER DEPENDENCY MATRIX                                    │
├───────────────────┬──────────────┬─────────────────┬──────────────────┬─────────────────────┤
│ Source Layer      │ Domain Core  │ Application Lyr │ Infrastructure   │ Applications (Apps) │
├───────────────────┼──────────────┼─────────────────┼──────────────────┼─────────────────────┤
│ Domain Core       │ ALLOWED      │ FORBIDDEN ❌    │ FORBIDDEN ❌     │ FORBIDDEN ❌        │
│ Application Layer │ ALLOWED      │ ALLOWED         │ FORBIDDEN ❌     │ FORBIDDEN ❌        │
│ Infrastructure    │ ALLOWED      │ ALLOWED         │ ALLOWED          │ FORBIDDEN ❌        │
│ Applications      │ ALLOWED      │ ALLOWED         │ ALLOWED          │ ALLOWED             │
└───────────────────┴──────────────┴─────────────────┴──────────────────┴─────────────────────┘
```

### Enforced ESLint Module Boundary Rule (`.eslintrc.json`)
```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "allow": [],
        "depConstraints": [
          {
            "sourceTag": "type:domain",
            "onlyDependOnLibsWithTags": ["type:domain"]
          },
          {
            "sourceTag": "type:application",
            "onlyDependOnLibsWithTags": ["type:domain", "type:application"]
          },
          {
            "sourceTag": "type:infrastructure",
            "onlyDependOnLibsWithTags": ["type:domain", "type:application", "type:infrastructure"]
          },
          {
            "sourceTag": "type:app",
            "onlyDependOnLibsWithTags": ["type:domain", "type:application", "type:infrastructure", "type:ai-engine", "type:sdk"]
          }
        ]
      }
    ]
  }
}
```

---

## 4. Git Workflow & Branch Strategy

StoryOS uses **Trunk-Based Development** with short-lived feature branches to maximize integration velocity and prevent long-lived merge conflicts.

```
  main ───────●───────────────●──────────────────────● (Deploy to Staging/Prod)
               \             /                      /
  feat/char ────●───●───────┘                      /
                     \                            /
  fix/graph ──────────●────────●─────────────────┘
```

### Branch Naming Standards
- `feat/feature-name` — New feature implementation (e.g. `feat/character-relationship-graph`)
- `fix/bug-name` — Bug fixes (e.g. `fix/neo4j-connection-leak`)
- `refactor/scope` — Refactoring without behavioral change (e.g. `refactor/cqrs-command-bus`)
- `docs/doc-name` — Architecture & documentation updates (e.g. `docs/adr-0007-update`)
- `chore/scope` — Tooling, dependency, or CI pipeline changes

### Commit Message Convention (Conventional Commits)
All commit messages MUST adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

**Valid Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.  
**Example:** `feat(character): add RLS tenant validation to character repository (#142)`

---

## 5. Coding Standards & Tooling Configuration

StoryOS enforces strict, automated code quality formatting across TypeScript, Python, SQL, and YAML files.

### 5.1 TypeScript Configuration (`tsconfig.base.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true
  }
}
```

### 5.2 Biome Formatting & Linting (`biome.json`)
```json
{
  "$schema": "https://biomejs.dev/schemas/1.8.0/schema.json",
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "error",
        "useConst": "error"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

---

## 6. Developer Onboarding & Sprint Workflow

New engineers can stand up the entire StoryOS development environment in under 5 minutes using the automated local stack:

```bash
# 1. Clone Monorepo
git clone git@github.com:storyos/storyos.git
cd StoryOS

# 2. Run Automated Developer Bootstrap Script
./scripts/bootstrap.sh

# 3. Bootstrap Script performs:
#    - Validates Node.js (v20+), pnpm (v9+), Docker, and Git
#    - Installs pnpm workspace dependencies
#    - Spawns Docker Compose stack (Postgres, Neo4j, Milvus, Redis, Kafka, Stub LLM)
#    - Runs database migrations (Flyway / TypeORM)
#    - Seeds mock universe & character data
#    - Executes unit test suite to verify installation

# 4. Start Local Web App & API Services
pnpm dev
```

---

## 7. Definition of Ready (DoR) & Definition of Done (DoD)

### Definition of Ready (DoR)
Before a story or task enters a development Sprint, it must satisfy:
- [x] Clear business value statement and user story description.
- [x] Fully articulated Acceptance Criteria (AC).
- [x] Architectural design reference to relevant `docs/architecture/*.md` specification.
- [x] Identified dependencies and database schema changes documented.

### Definition of Done (DoD)
A story is considered complete only when:
- [x] All code implemented adhering to Clean Architecture & Layering rules.
- [x] Unit test coverage $\ge 85\%$ achieved on new domain code.
- [x] Integration tests pass with Testcontainers (Postgres, Neo4j, Milvus).
- [x] PR passes all GitHub Actions CI checks (ESLint, Biome, Spectral, Trivy).
- [x] Zero breaking API changes introduced without deprecation notice.
- [x] Documentation updated in `docs/` if architectural boundaries were affected.
- [x] Code reviewed and approved by at least 2 Senior Staff/Principal Engineers.

---

## 8. Executive CTO Certification

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                   EXECUTIVE CTO REPOSITORY BLUEPRINT CERTIFICATION               ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║ Document        : StoryOS Repository Engineering Blueprint                        ║
║ Status          : APPROVED & EFFECTIVE IMMEDIATELY                               ║
║ Certified By    : Chief Software Architect & Executive CTO                       ║
║ Scope           : Universal Monorepo Structure & Development Baseline           ║
╚══════════════════════════════════════════════════════════════════════════════════╝
```
