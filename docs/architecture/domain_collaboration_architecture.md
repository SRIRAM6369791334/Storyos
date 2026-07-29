# Domain Collaboration Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.3 — Domain Collaboration Architecture
> **Depends On:** `application_architecture.md`, `domain_execution_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: Independent but Coordinated

StoryOS comprises nine Core Domains (e.g., Character, Timeline, Canon, World Building). As dictated by Task 3.2, these domains are strictly isolated; a Character Aggregate cannot hold a reference to a Timeline Aggregate. 

Yet, when a Character dies, the Timeline must update. How do isolated domains cooperate without sacrificing autonomy or breaking bounded context integrity?

This document defines **Domain Collaboration Architecture**—the rigorous patterns, context mapping strategies, and integration event schemas that allow independent domains to orchestrate complex business flows safely and asynchronously.

---

## Part I — Context Mapping and Relationships

Domains do not communicate randomly. The relationship between any two domains in StoryOS must be explicitly classified using Eric Evans's Context Mapping patterns.

### 1.1 The Context Map
1. **Customer-Supplier (Upstream/Downstream):** The downstream domain relies on the upstream domain. The upstream team agrees to accommodate the downstream team's needs. (e.g., `Canon Management` is Upstream to `Story Universe`).
2. **Conformist:** The downstream domain blindly accepts the upstream domain's models because the upstream will not change for them (e.g., `External AI APIs` $\to$ `AI Platform`).
3. **Shared Kernel:** Rarely used in StoryOS. Two domains share a tiny, extremely stable library of Value Objects (e.g., `UniverseId`, `TimelineDate`). Modifications to the Shared Kernel require joint ARB approval.
4. **Anti-Corruption Layer (ACL):** Essential for maintaining domain purity.

### 1.2 The Anti-Corruption Layer (ACL)
When Domain B consumes data from Domain A, Domain B **must not** adopt Domain A's models.
- The Application Layer of Domain B implements an ACL.
- The ACL translates the incoming `IntegrationEvent` from Domain A into a Domain Command natively understood by Domain B's Aggregates.
- *Result:* Domain A can change its internal structure entirely, and only Domain B's ACL requires updating; Domain B's core logic remains untouched.

---

## Part II — Event Taxonomy and Contracts

### 2.1 Domain Events vs. Integration Events
This is a critical distinction in StoryOS architecture.
- **Domain Events:** Highly detailed, state-heavy events used *internally* within a single Bounded Context. They are allowed to change rapidly.
- **Integration Events:** Filtered, minimal, public events broadcast to *other* Bounded Contexts via the Event Bus (Kafka). They represent a **Published Language**.

### 2.2 Published Language and Schemas
- **Event Contracts:** Integration Events are strictly versioned data contracts defined using **AsyncAPI** or **Avro** schemas.
- **Event Catalog:** All Integration Events are registered in a centralized Schema Registry. A domain cannot publish an event that fails schema validation against the Registry.
- **Fat vs. Thin Events:** StoryOS prefers **Thin Events** (`CharacterDiedEvent { characterId, universeId, timestamp }`). If a downstream domain needs more context, it queries the upstream domain via API, rather than placing massive, quickly-staled payloads into the event.

---

## Part III — Collaboration Mechanics

### 3.1 Domain Event Choreography
When cross-domain consistency is needed but strict transactional coupling is not, domains use Choreography.
1. `Character` Domain emits `IntegrationEvent: CharacterKilled`.
2. `Timeline` Domain's ACL listens to the event bus.
3. `Timeline` Domain translates it to `AddDeathEventCommand`.
4. `Timeline` Aggregate executes the command independently.

### 3.2 Cross-Domain Consistency Boundaries
- **Eventual Consistency:** Choreographed events are explicitly eventually consistent. Downstream domains must be mathematically designed to tolerate delays (e.g., the Timeline might not show the Character's death for 500ms).
- **Synchronous Consistency (Banned):** Bounded Contexts must never execute blocking synchronous calls to other Bounded Contexts to complete an internal transaction.

---

## Part IV — Failure Handling and Compensation

### 4.1 When Choreography Fails
Because inter-domain communication is asynchronous, downstream failures are inevitable (e.g., `Timeline` database is down when it receives `CharacterKilled`).
- **Idempotent Consumers:** The downstream ACL must be idempotent. If Kafka delivers the event twice, the ACL ignores the duplicate.
- **Dead Letter Queues (DLQ):** If the ACL fails to process an event after exponential retries, it moves to a DLQ. A human operator (or AI agent) reviews DLQs via Observability dashboards.

### 4.2 Cross-Context Sagas (Compensation)
When a business process spanning domains requires absolute rollback guarantees (e.g., transferring Canon ownership), Choreography is insufficient.
- As defined in Task 2.5, **Saga Orchestration** (via Temporal) takes over.
- The Orchestrator dispatches Commands to Domain A, then Domain B.
- If Domain B fails terminally, the Orchestrator invokes the **Compensation Command** on Domain A to undo the action, maintaining business consistency across the Bounded Contexts.

---

## Part V — Evolution and Testing

### 5.1 Event Evolution and Versioning
Integration Events are Public APIs.
- **Additive Changes Only:** Fields can be added, but never removed or renamed without a major version bump.
- **v1 vs v2:** If `CharacterKilledEvent` requires a breaking change, the upstream domain must publish *both* `CharacterKilledEvent_v1` and `CharacterKilledEvent_v2` for the duration of the 90-day deprecation window defined in `COM-004`.

### 5.2 Testing Strategies for Inter-Domain Collaboration
- **Consumer-Driven Contract Testing:** StoryOS utilizes Pact (or equivalent).
- The *Consumer* (Domain B) writes a test defining the exact JSON shape it expects from `CharacterKilledEvent`.
- This test is published to the broker. The *Producer* (Domain A) CI pipeline automatically downloads and runs this test. If Domain A changes the event shape in a way that breaks Domain B, Domain A's build fails.

---

## Part VI — Collaboration Governance Rules

**COL-001: The Anti-Corruption Mandate**
*Rule:* A Bounded Context must never import or utilize the DTOs, Entities, or specific Value Objects of another Bounded Context (except the officially sanctioned Shared Kernel). 
*Enforcement:* ArchUnit package boundary enforcement.

**COL-002: Integration Event Separation**
*Rule:* `DomainEvents` must never be serialized directly onto the public message bus. They must be explicitly mapped to `IntegrationEvents` by the Application Layer.
*Enforcement:* Code Review / AST analysis ensuring event bus producer methods only accept classes implementing the `IntegrationEvent` interface.

**COL-003: Contract-Driven Publishing**
*Rule:* An Integration Event cannot be pushed to production unless its schema is registered in the Central Schema Registry and passes Consumer-Driven Contract tests.
*Enforcement:* CI/CD pipeline blocking.

---

> *"Good fences make good neighbors. Good Anti-Corruption Layers make good micro-modules. A domain is only autonomous if it can entirely ignore the internal chaos of the domains surrounding it."*

---

**Document End**
