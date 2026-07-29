# Domain Execution Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.2 — Domain Execution Architecture
> **Depends On:** `domain_model.md`, `application_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Heart of StoryOS

If the Application Layer is the "bureaucrat," the **Domain Layer is the mathematical absolute**. 

In StoryOS, the Domain Layer has zero dependencies. It does not know about PostgreSQL, Kafka, Kubernetes, or JSON. It consists purely of Typescript/Java objects executing business logic. 

This document defines how the core concepts established in Phase 1 (Characters, Universes, Timelines) execute as highly protected, invariant-enforcing state machines inside system memory.

---

## Part I — Aggregates and Entities

### 1.1 Aggregate Root Design Principles
An Aggregate is a cluster of associated objects treated as a single unit for data changes. The **Aggregate Root** is the only object external layers may reference.
- **Strict Isolation:** A `Character` Aggregate cannot hold a direct reference to a `Location` Aggregate. It may only hold the `LocationId`.
- **Consistency Boundaries:** Everything inside the Aggregate must remain transactionally consistent 100% of the time. If it can be eventually consistent, it belongs in a different Aggregate.

### 1.2 Entity Lifecycle and Invariant Enforcement
An Entity is defined by its identity and continuity, not its attributes.
- **Rich Domain Model Guidelines:** "Anemic Domain Models" (Entities that only have getters and setters) are banned. 
- **Invariant Enforcement:** Entities never expose `setX()` methods. They expose business-intent methods (e.g., `character.sufferWound(severity)`). The method executes validation (invariants) and throws a `DomainException` if the action violates business rules (e.g., cannot wound a dead character).

---

## Part II — Value Objects and Types

### 2.1 Value Object Patterns
A Value Object (VO) is defined strictly by its attributes and possesses no identity.
- **Immutability:** VOs (e.g., `Coordinates`, `MonetaryValue`, `TimelineDate`) must be 100% immutable.
- **Self-Validation:** A VO validates itself upon construction. (e.g., `EmailAddress` throws an exception if the format is invalid during `new EmailAddress(raw)`). The Application Layer never validates VOs; it simply attempts to construct them.
- **Equivalence:** VOs are compared by their structural values, never by memory references.

---

## Part III — Domain Services and Factories

### 3.1 Domain Service Criteria
When business logic involves multiple Aggregates and does not logically belong inside one of them, it belongs in a **Domain Service**.
- **Statelessness:** Domain Services hold no state.
- **Criteria:** Use a Domain Service ONLY when forcing the logic into an Aggregate Root breaks the Single Responsibility Principle (e.g., `CanonConflictResolutionService` taking a `Character` and a `TimelineEvent`). 

### 3.2 Factory Patterns
Complex Aggregates must not be instantiated via massive constructors.
- **Domain Factories:** encapsulate the logic of creating an Aggregate in a valid state (e.g., `CharacterFactory.createProtagonist(name, originStory)`). Factories execute business rules that only apply during creation.

---

## Part IV — The Specification Pattern

### 4.1 Encapsulating Query Logic
Business rules used for querying or validation are encapsulated using the **Specification Pattern**.
- Instead of writing `if (character.isAlive() && character.hasMagic())`, developers write `new MagicCapableSurvivorSpec().isSatisfiedBy(character)`.
- **Why?** Specifications can be combined (AND/OR), tested in isolation, and translated into SQL criteria by the Infrastructure layer without leaking DB logic into the domain.

---

## Part V — Events and Concurrency

### 5.1 Domain Event Lifecycle
Domain Events capture memory of something that happened in the domain.
- **Internal Publishing:** When an Aggregate Root method mutates state, it adds a `DomainEvent` (e.g., `CharacterKilledEvent`) to an internal array (`this.domainEvents.push(...)`).
- **External Dispatch:** As defined in Task 3.1, the Application Service pulls these events from the Aggregate just before saving it and commits them to the Outbox.

### 5.2 Optimistic Concurrency Strategy
Because multiple AI Agents and Humans can edit StoryOS concurrently, the Domain Layer enforces strict Optimistic Locking.
- Every Aggregate Root possesses a `version` attribute (Long).
- Every mutation increments the version in memory.
- The Infrastructure Repository executes: `UPDATE table SET ... WHERE id = X AND version = Y`. If `Y` has changed, the database rejects the write, the infrastructure throws a `ConcurrencyException`, and the Application Layer retries or aborts.

### 5.3 Domain Versioning and Evolution
If an Aggregate schema changes significantly (e.g., migrating a `Character` from v1 to v2 ruleset), the domain does not mutate the historical record.
- Following the Versioning Architecture (Task 1.7), mutations create new Snapshots. The Domain Layer understands `EntityVersion`, allowing a V1 entity to be instantiated using legacy rules while V2 entities use modern rules.

---

## Part VI — Repositories (The Illusion of Memory)

### 6.1 Repository Contracts
The Domain Layer defines the *Interfaces* for Repositories. The Infrastructure Layer implements them.
- **Contract Rule:** Repositories mimic an in-memory collection. They do not expose database concepts (`save`, `delete`, `findById`). They never expose `join` or `commit`.
- **No Query Leakage:** Repositories only return Aggregate Roots. They do not return partial DTOs or projections. (Queries are handled by the CQRS read-path, completely bypassing the Domain Layer).

---

## Part VII — Domain-Layer Governance Rules

**DOM-001: The Pure Domain Rule**
*Rule:* The `domain` package MUST NOT import any library related to HTTP, JSON, SQL, Kafka, or Cloud Providers. The only allowed imports are standard language libraries and strict utility frameworks (e.g., Lodash/Guava).
*Enforcement:* ArchUnit dependency verification strictly bans `java.sql.*`, `org.springframework.*`, or `express` from the domain space.

**DOM-002: Invariant Protection (No Setters)**
*Rule:* Aggregate Roots and Entities must not expose public `setX()` methods. All state mutation must occur through named business methods enforcing invariants.
*Enforcement:* AST (Abstract Syntax Tree) scanning during CI pipeline.

**DOM-003: Aggregate Reference Boundary**
*Rule:* An Aggregate Root may only hold string/UUID identifiers to other Aggregate Roots. It must never hold a direct object reference to another Aggregate Root.
*Enforcement:* ArchUnit relationship scanning.

---

> *"The Domain Layer is paranoid. It trusts no one, assumes all incoming data is invalid, and refuses to change its state unless every mathematical and business invariant is perfectly satisfied."*

---

**Document End**
