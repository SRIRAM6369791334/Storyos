# Application Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.1 — Application Layer
> **Depends On:** All Phase 1 Domain Architectures & Phase 2 Platform Architectures
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Execution Bridge

Phase 1 established the *Domain Model* (the pure business rules). Phase 2 established the *Platform Runtime* (the physical execution environment). Phase 3 establishes the **Application Architecture**—the precise layer of code that connects the outside world to the Domain.

The Application Layer is entirely devoid of business logic. Its sole purpose is **Orchestration**. It translates raw external API payloads into Domain commands, manages database transaction lifecycles, enforces security policies, and publishes events. This document strictly defines the execution boundaries of every StoryOS feature.

---

## Part I — CQRS & The Execution Flow

StoryOS strictly implements **Command Query Responsibility Segregation (CQRS)**. Reading data and writing data operate on entirely different architectural pathways.

### 1.1 API-to-Domain Interaction Flow
- **Commands (Mutations):** `Controller` $\to$ `Command DTO` $\to$ `Command Handler` $\to$ `Application Service (Use Case)` $\to$ `Domain Entity` $\to$ `Repository (Write)`.
- **Queries (Reads):** `Controller` $\to$ `Query DTO` $\to$ `Query Handler` $\to$ `Read Model Projection (Search Index / DB View)`. Queries completely bypass the Domain Entities and Repositories to maximize performance.

### 1.2 Handlers & Use Case Orchestration
Every feature in StoryOS is represented by a single, isolated **Use Case** (e.g., `CanonizeBranchUseCase`). 
- The Use Case acts as the `CommandHandler`.
- It cannot hold state.
- It performs exactly three steps: (1) Fetch entity from Repository, (2) Invoke Domain Entity method, (3) Save entity to Repository.

---

## Part II — DTOs, Ports, and Validation

### 2.1 Application Services and Ports (Hexagonal Architecture)
The Application Layer interacts with the outside world exclusively through **Ports** (interfaces).
- **Primary (Inbound) Ports:** Interfaces implemented by the Use Cases (e.g., `CreateCharacterUseCase`).
- **Secondary (Outbound) Ports:** Interfaces the Use Case calls but does not implement (e.g., `CharacterRepository`, `EventPublisher`). The Platform layer implements these.

### 2.2 DTO and Validation Strategy
Entities never cross the API boundary. 
- **DTOs:** All incoming requests are mapped to immutable `Command` or `Query` DTOs.
- **Fail-Fast Validation:** Syntactic validation (e.g., "Email is not null", "Name < 50 chars") occurs at the DTO edge via annotations (e.g., JSR-380 / Zod). If syntactic validation fails, the payload is rejected before reaching the Application Layer.
- **Semantic Validation:** Business validation (e.g., "Does this Character exist in this Universe?") occurs inside the Domain Entity, not the DTO.

---

## Part III — Transactions, Events, and Sagas

### 3.1 Transaction Boundaries
- **Rule of One:** A single synchronous Application Service transaction may only mutate **one** Aggregate Root.
- **Why?** Modifying multiple aggregates in a single synchronous ACID database transaction causes massive lock contention and violates Bounded Contexts.

### 3.2 Domain Event Publication (The Outbox)
To achieve consistency across multiple aggregates without massive database locks, the Application Layer publishes **Domain Events**.
1. The Use Case mutates `Aggregate A`.
2. The Use Case generates `AggregateAUpdatedEvent`.
3. The Use Case commits the Aggregate state AND the Event to the `Outbox` table in a single atomic database transaction.
4. The CDC platform (defined in Task 2.2) sweeps the Outbox.

### 3.3 Sagas and Application-Level Orchestration
When a business process (e.g., User Deletion) touches multiple Bounded Contexts, the Application Layer does not use synchronous REST calls. It utilizes a **Saga Orchestrator** (Temporal workflow, per Task 2.5). 
- The Saga Orchestrator dispatches asynchronous Commands to various Application Services.
- Each Application Service operates idempotently within its own transaction boundary.

---

## Part IV — Security, Idempotency, and Errors

### 4.1 Application Security Context Propagation
Application Services must never parse HTTP headers or JWTs. 
- The API Gateway / Edge Controller parses the token and constructs a `SecurityContext` (User ID, Tenant/Universe ID, Roles).
- This Context is passed explicitly into the Use Case (e.g., `execute(command, securityContext)`), ensuring the Application Layer is fully protocol-agnostic (can be invoked by HTTP, gRPC, or CLI).

### 4.2 Idempotency and Retry Behavior
- **Handler Idempotency:** The Application Service evaluates the `IdempotencyKey` provided in the Command DTO against an Idempotency table. If a match is found, the handler returns the cached success response without re-executing the Domain logic.
- **Retry Logic:** Application Services do not implement loop retries for domain failures. Transient network failures (e.g., DB connection drop) are caught and retried by the outer Workflow/Platform layer.

### 4.3 Error Mapping and Exception Strategy
StoryOS defines a strict exception hierarchy to prevent internal stack traces from leaking to clients.
- **DomainExceptions:** Violations of business rules (e.g., `CharacterAlreadyDeadException`). Mapped to `HTTP 422 Unprocessable Entity`.
- **ValidationExceptions:** DTO syntactic failures. Mapped to `HTTP 400 Bad Request`.
- **SecurityExceptions:** ABAC/RBAC failures. Mapped to `HTTP 403 Forbidden`.
- **InfrastructureExceptions:** Database timeouts. Mapped to `HTTP 500 Internal Server Error`, triggering P1/P2 alerts in the Observability stack.

---

## Part V — Testing and Governance

### 5.1 Testing Strategy for Application Services
Because the Application Layer contains no business logic (only orchestration), testing it focuses purely on integration.
- **Unit Tests:** Minimal. Used primarily to mock Repositories and ensure the Use Case calls `save()` and `publishEvent()` in the correct order.
- **Integration Tests (Subcutaneous):** The primary testing tier. Operates just beneath the HTTP layer, invoking the Application Service directly against a test database (e.g., Testcontainers) to verify Transaction Boundaries and Outbox publication.

### 5.2 Application Layer Governance Rules

**APP-001: No Domain Logic in Handlers**
*Rule:* Application Services cannot contain `if/else` branches evaluating business rules. If a calculation is required, it must occur inside the Domain Entity.
*Enforcement:* ArchUnit / Code Review.

**APP-002: Strict Aggregate Isolation**
*Rule:* A single Use Case transaction block cannot invoke `save()` on two different Aggregate Root repositories. 
*Enforcement:* Static analysis flags multiple distinct repository `save()` invocations in a single method.

**APP-003: Entity Secrecy**
*Rule:* Application Services must never return a Domain Entity to the Controller. They must map the Entity to a Response DTO.
*Enforcement:* ArchUnit fails the build if any REST Controller return type belongs to the `com.storyos.*.domain` package.

---

> *"The Application Layer is a relentless bureaucrat. It makes no business decisions. It simply takes the request, checks the ID, hands it to the Domain expert, records the result, and publishes the paperwork."*

---

**Document End**
