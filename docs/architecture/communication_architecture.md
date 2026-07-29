# Communication Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.2 — Communication Architecture
> **Depends On:** `service_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.3 — Security Architecture

---

## Preface: The Nervous System of StoryOS

If Task 2.1 defined the organs of the StoryOS platform (Modules/Bounded Contexts), Task 2.2 defines the central nervous system. How do modules securely, reliably, and consistently talk to each other and the outside world? 

In a distributed environment, the network is fundamentally unreliable. The StoryOS Communication Architecture assumes total network hostility. It embraces idempotency, strict contract versioning, decoupled asynchronous events, and unified API gateways to ensure that temporary faults never cascade into systemic outages.

This document outlines the strict communication rules governing both Inter-Process Communication (IPC) within the Modular Monolith, and future network communication across extracted Microservices.

---

## Part I — API Taxonomy

APIs in StoryOS are not monolithic. They are categorized into four distinct zones, each with its own lifecycle, security posture, and rate-limiting rules.

### 1.1 API Zones

| Taxonomy | Consumer | Protocol | Security Bound | Volatility |
|---|---|---|---|---|
| **External (Public) API** | Web UI, Mobile App | GraphQL (Federated) | Edge Gateway (OIDC/JWT) | Low. Strict backward compatibility. |
| **Partner API** | 3rd Party Integrations | REST / JSON | Edge Gateway (mTLS / API Key) | Very Low. Requires 6-month deprecation. |
| **Internal (Module) API** | Peer Modules | gRPC (Future) / In-Process | Service-to-Service (SPI) | Medium. Monorepo synchronization. |
| **AI API (Tool Calling)**| Autonomous Agents | JSON-RPC / REST | Agent Sandbox & Scoped Token | High. Evolves with LLM capabilities. |

### 1.2 GraphQL Federation Strategy
The External API utilizes GraphQL Federation. The API Gateway acts as the Supergraph router, combining the schemas of the `Story Module` and `Knowledge Module` into a single, unified graph. Clients issue exactly one query; the Supergraph resolves it across multiple internal module boundaries without the client understanding the underlying service topography.

---

## Part II — Communication Paradigms

### 2.1 Synchronous vs Asynchronous Matrix

StoryOS favors asynchronous, event-driven communication to minimize runtime coupling. Synchronous calls are strictly limited.

| Scenario | Paradigm | Permitted Protocol | Rationale |
|---|---|---|---|
| UI fetching User Dashboard | **Synchronous Query** | GraphQL | Immediate response required for UX. |
| User updating a Character | **Synchronous Command**| REST / GraphQL Mutation | Immediate validation (ACK) required. |
| Story Module $\to$ Knowledge Module | **Asynchronous Event** | Kafka / Outbox | Avoid distributed transactions (Sagas). |
| AI Module indexing new Lore | **Asynchronous Event** | Kafka | Prevents slow LLM calls from blocking writes. |

### 2.2 Command vs Query Segregation (CQRS)
At the API boundary, StoryOS strictly separates Commands (mutations that change state) from Queries (reads that return state).
- **Commands:** Must be executed over REST (`POST`, `PUT`, `DELETE`) or GraphQL Mutations. They return a simple ACK/NACK or Task ID, never complex object graphs.
- **Queries:** Executed exclusively via GraphQL or REST `GET`. They never alter the state of the system.

---

## Part III — Event-Driven Architecture (EDA)

### 3.1 Event Bus Topology
StoryOS utilizes an **Outbox Pattern + CDC (Change Data Capture)** over Apache Kafka (or equivalent Enterprise Message Bus) to guarantee *At-Least-Once* delivery without relying on distributed Two-Phase Commits (2PC).

**The Flow:**
1. Transaction Start.
2. `StoryModule` updates the `Character` table.
3. `StoryModule` inserts an `EntityUpdatedEvent` into its local `Outbox` table.
4. Transaction Commit (Atomic).
5. Background CDC worker reads the Outbox table and publishes to the Kafka Topic `storyos.entity.events`.
6. `KnowledgeModule` and `SearchModule` independently consume the topic.

### 3.2 Event Contract Versioning
Events are the durable, public contracts of the platform. Once emitted, an event schema cannot be arbitrarily changed.
- **Serialization:** All domain events are serialized using Avro or Protobuf, relying on a central Schema Registry.
- **Forward Compatibility:** Consumers must ignore unknown fields.
- **Breaking Changes:** Deleting a field or changing its data type requires creating a `V2` event type (e.g., `EntityUpdatedEventV2`) while the producer simultaneously emits `V1` until all consumers have migrated.

---

## Part IV — Resilience & Fault Tolerance

### 4.1 Idempotency Rules
Because the Event Bus guarantees *At-Least-Once* delivery, consumers will inevitably process duplicate messages. Every mutating API and Event Consumer in StoryOS must be strictly Idempotent.
- **Idempotency Key:** External APIs must accept an `Idempotency-Key` header (usually a UUID4).
- **Evaluation:** `f(f(x)) = f(x)`. Applying the same command twice must yield the exact same end state without duplicating business entities or throwing arbitrary errors.

### 4.2 Retry & Dead Letter Strategy
- **Transient Failures (e.g., Network timeout):** Handled via exponential backoff with jitter (e.g., 2s, 4s, 8s, 16s).
- **Terminal Failures (e.g., Parsing Error, 400 Bad Request):** Never retried. The message is immediately routed to the Dead Letter Queue (DLQ).
- **DLQ Topology:** Each module maintains its own logical DLQ topic. DLQ messages include headers indicating the original failure reason, timestamp, and exception stack trace.

---

## Part V — Routing & Observability

### 5.1 API Gateway Responsibilities
Modules do not expose themselves directly to the internet. The API Gateway is the single point of ingress and performs:
1. **SSL Termination.**
2. **Global Rate Limiting:** Enforced via Redis (e.g., 100 req/sec per User IP).
3. **Authentication:** Validates incoming JWTs and maps them to a platform `SecurityContext`.
4. **WAF (Web Application Firewall):** Blocks malicious payloads and OWASP Top 10 vectors.
5. **Request Correlation Injection.**

### 5.2 Request Correlation & Trace Propagation
To achieve absolute observability across decoupled modules, StoryOS utilizes OpenTelemetry standard context propagation (W3C Trace Context).
- **Trace ID:** The API Gateway generates a global `traceparent` (e.g., `00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01`).
- **Propagation:** This ID is injected into the HTTP Header of every downstream API call, into the MDC (Mapped Diagnostic Context) of every thread, and into the header of every Kafka event.
- **Result:** A single user click can be tracked seamlessly from the UI, through the Story Module, across the Event Bus, and into the Search Module.

---

## Part VI — Security & Compliance

### 6.1 Service-to-Service Authentication
Even within the Modular Monolith, modules must mathematically prove their identity if communicating over IPC or gRPC.
- **Mechanism:** SPI (Service Provider Interfaces) carry the original user's `SecurityContext`.
- **Future Extraction:** When extracted to microservices, modules will utilize mTLS (Mutual TLS) managed by a Service Mesh (e.g., Istio) to authenticate system-to-system calls, preventing lateral movement if a single container is compromised.

---

## Part VII — Communication Governance

### 7.1 Contract Testing Strategy
End-to-End (E2E) testing distributed systems is notoriously brittle. StoryOS utilizes Consumer-Driven Contract Testing (e.g., Pact).
- Consumers (e.g., Web UI, AI Module) define the exact shape of the JSON they expect.
- These expectations are compiled into a "Contract."
- The Producer (e.g., Story Module) runs a CI job against the Contract. If the Producer breaks the JSON shape, its build fails before deployment.

### 7.2 Communication Governance Rules (Automated Constraints)

**COM-001: No Synchronous Cascades**
*Rule:* A synchronous API request cannot trigger a downstream synchronous API request to another module.
*Enforcement:* Tracing spans detect depth $>2$. Violations trigger alerting.
*Rationale:* Prevents cascading timeouts and thread exhaustion.

**COM-002: Mandatory Idempotency Key**
*Rule:* All state-mutating endpoints (`POST`, `PUT`, `PATCH`) must validate the presence of the `Idempotency-Key` header.

**COM-003: Strict Payload Limits**
*Rule:* No API or Event payload can exceed 5 MB.
*Enforcement:* API Gateway and Kafka broker hard-limits.
*Rationale:* Large files (Images, Exported Lore) must use the Claim-Check pattern (uploading to Object Storage and sending only the URI).

**COM-004: Backward Compatibility Window**
*Rule:* API schema fields marked as `@Deprecated` must remain fully functional for exactly 90 days before deletion. CI pipelines enforce this window mathematically based on git history.

---

> *"Architecture is not just about the components you build; it is entirely defined by how you connect them. A brittle connection destroys a brilliant component."*

---

**Document End**
**Next:** Task 2.3 — Security Architecture
