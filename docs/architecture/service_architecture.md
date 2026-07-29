# Service Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.1 — Service Architecture
> **Depends On:** Phase 1 Domain Models
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.2 — Communication Architecture

---

## Preface: The Modular Monolith Strategy

Enterprise systems often fail due to the premature adoption of microservices, which introduces distributed transaction overhead, network unreliability, and complex deployment topologies before the domain boundaries are properly understood. 

StoryOS rejects the "Microservices-First" dogma. The platform follows a strict evolutionary progression:
**Bounded Contexts $\to$ Modular Monolith $\to$ Strict Service Boundaries $\to$ Future Extraction Strategy.**

All StoryOS domains execute within a single physical runtime boundary (The Modular Monolith). However, the internal logical boundaries between modules are enforced with the same rigor as network boundaries. A module cannot directly query another module's database, nor can it bypass the API contract of a peer module. This guarantees that if a module *does* need to scale independently in the future, it can be extracted into a microservice without refactoring business logic.

---

## Part I — Bounded Context Map

To prevent the "Big Ball of Mud" anti-pattern, the 9 core architectural domains of StoryOS are clustered into isolated Service Modules based on their functional cohesion and change lifecycle.

### 1.1 The Module Topology

```text
StoryOS Core Runtime
│
├── [ Story Module ] (High Write / Authoritative Canon)
│   ├── Universe Domain
│   ├── Character Domain
│   ├── Narrative Domain
│   └── Timeline Domain
│
├── [ Knowledge Module ] (High Read / Relational Topology)
│   ├── Entity Domain
│   ├── Metadata Domain
│   ├── Relationship Domain
│   └── Knowledge Graph Domain
│
├── [ AI Intelligence Module ] (High Compute / Asynchronous)
│   ├── Agent Registry
│   ├── Inference Engine
│   ├── Vector Memory
│   └── Tool Calling Engine
│
└── [ Versioning Module ] (High I/O / Cryptographic)
    ├── Branch Engine
    ├── Delta Management
    └── Canon Governance
```

### 1.2 Boundary Imperatives
- **Physical Boundary:** All four modules deploy as a single binary (e.g., a single Docker container).
- **Data Boundary:** Each module has a dedicated database schema. The Story Module cannot execute a `JOIN` against the Knowledge Module's tables.
- **Process Boundary:** Within the runtime, modules communicate via asynchronous in-memory events or strict synchronous API interfaces (Ports and Adapters), never by directly instantiating another module's internal classes.

---

## Part II — Dependency Rules (The Architectural DAG)

To prevent circular dependencies and spaghetti code, module dependencies in StoryOS form a strict Directed Acyclic Graph (DAG). 

### 2.1 Import & Invocation Matrix

| Module | Can Synchronously Call (Import) | Cannot Call (Forbidden) | Primary Integration Method |
|---|---|---|---|
| **Story Module** | Knowledge Module (Read-only) | AI Module, Versioning Module | Asynchronous Events (Write) |
| **Knowledge Module** | None (Root level domain) | Story Module, AI Module | Exposes APIs to all modules |
| **Versioning Module**| Story Module, Knowledge Module | AI Module | Subscribes to Entity Events |
| **AI Intelligence**  | Story Module, Knowledge Module | Versioning Module | RAG queries via Search/Graph |

### 2.2 The Anti-Corruption Layer (ACL)
When the AI Module needs to understand a "Character" from the Story Module, it does not import the `Character` domain entity. It maps the incoming data through an Anti-Corruption Layer into an `AIAwareEntity` DTO. This ensures that changes to the core Story schema do not crash the AI inference pipelines.

---

## Part III — Architectural Fitness Functions

Human discipline degrades over time. Service boundaries in StoryOS are enforced by automated Architectural Fitness Functions (e.g., using ArchUnit or equivalent AST parsing tools) that run during the CI/CD pipeline. Breaking these rules fails the build.

### 3.1 Automated Boundary Checks

**FIT-001: No Cross-Module Database Access**
*Rule:* Classes within `com.storyos.ai.*` cannot import or reference `com.storyos.story.repository.*`.
*Enforcement:* AST static analysis blocks any cross-package repository injection.

**FIT-002: Strict API Encapsulation**
*Rule:* Modules can only communicate through classes suffixed with `*Api` or `*Gateway`. Accessing internal application services of another module is forbidden.
*Enforcement:* Internal classes are package-private; public APIs are explicitly registered in a module contract interface.

**FIT-003: No Circular Module Dependencies**
*Rule:* Module A depends on Module B $\implies$ Module B cannot depend on Module A.
*Enforcement:* Build-time DAG resolution (e.g., Gradle/Maven module strict boundaries) ensures circular imports fail to compile.

**FIT-004: UI Isolation**
*Rule:* Domain and Application layers cannot depend on the Presentation (Web/GraphQL) layer.
*Enforcement:* No `import javax.servlet.*` or `import graphql.*` allowed outside of the presentation module.

---

## Part IV — Extraction Readiness Matrix

Extracting a module from the Monolith into a standalone Microservice is an expensive operational decision. A module is **not** permitted to be extracted just because "traffic is high." It must satisfy the following measurable thresholds.

### 4.1 Microservice Extraction Criteria

| Metric / Characteristic | Threshold Required for Extraction | Rationale |
|---|---|---|
| **Scaling Profile** | CPU/Memory utilization differs by $>3\times$ compared to other modules. | E.g., The AI Module consumes heavy GPU/Memory while the Story module is CPU-bound. |
| **Deployment Frequency** | Requires deployments $>5\times$ more frequently than the core monolith. | Decouples fast-moving AI experiments from stable Canon governance. |
| **Team Size & Isolation** | Module is owned by a dedicated team of $\ge 5$ engineers with no overlapping responsibilities. | Conway's Law: Don't create technical boundaries without organizational boundaries. |
| **Data Gravity** | $> 80\%$ of transactions within the module do not require synchronous reads from other modules. | Extracting highly coupled data results in severe network latency and distributed monoliths. |
| **Operational Blast Radius** | Module failures (e.g., LLM timeouts) are cascading and bringing down core read/write operations. | Extraction isolates fault domains (Bulkhead pattern). |

**Current Assessment (Day 1):** Only the *AI Intelligence Module* is a candidate for early extraction (Phase 4/5) due to its specialized compute (GPU) requirements and high failure rate (LLM hallucination/timeout). All other modules remain in the monolith.

---

## Part V — Cross-Cutting Platform Services

Service Modules must focus entirely on business logic. Cross-cutting concerns are handled by unified Platform Services injected via middleware or sidecars, preventing redundant code and security loopholes.

### 5.1 Authentication & Authorization
- **Rule:** Modules do not parse JWTs, validate passwords, or manage sessions.
- **Mechanism:** The API Gateway validates tokens and passes a `SecurityContext` (containing UserID, UniverseID, Roles) into the Modular Monolith's thread context. Modules check the `SecurityContext` against ABAC rules.

### 5.2 Logging & Tracing
- **Rule:** Modules do not write directly to files or configure log appenders.
- **Mechanism:** All modules use a unified `PlatformLogger`. Every entry is automatically enriched with a `traceId` (for distributed tracing) and the `universeId`.

### 5.3 Audit Trailing
- **Rule:** Modules do not manage their own audit tables.
- **Mechanism:** To satisfy Compliance, modules emit a standard `AuditActionCreated` domain event. A centralized Audit Platform Service asynchronously writes this to cold storage.

### 5.4 Event Publishing (Outbox)
- **Rule:** Modules do not directly interact with Kafka/RabbitMQ.
- **Mechanism:** Modules write events to a local `Outbox` table within their own schema (guaranteeing atomic transaction consistency). A background Platform CDC (Change Data Capture) process reads the Outbox and pushes it to the message broker.

---

> *"Good architecture is about delaying decisions. A well-designed Modular Monolith delays the microservice decision until the exact moment it becomes a mathematical necessity, not a moment sooner."*

---

**Document End**
**Next:** Task 2.2 — Communication Architecture (APIs and Events)
