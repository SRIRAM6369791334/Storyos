# Integration Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.5 — Integration Architecture
> **Depends On:** `application_architecture.md`, `platform_governance.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Hostile Perimeter

StoryOS is not a closed ecosystem. It integrates with external AI providers, Enterprise SSO platforms, publisher webhook streams, and third-party writing tools.

Every external system is treated architecturally as **hostile, unreliable, and eventually deprecated**. If a third-party API outage or schema change causes an internal StoryOS domain to fail or require a code rewrite, the architecture has failed. 

This document defines the **Integration Architecture**: the rigid boundaries, adapter patterns, and resilience mechanisms that protect the StoryOS core from external chaos.

---

## Part I — External System Boundaries & Adapters

### 1.1 Ports and Adapters Strategy
StoryOS implements a strict Hexagonal (Ports and Adapters) architecture to handle external dependencies.
- **The Port (Interface):** Defined *inside* the StoryOS Application Layer. (e.g., `interface AiCompletionService`).
- **The Adapter (Implementation):** Defined in the outermost infrastructure ring. (e.g., `class OpenAICompletionAdapter implements AiCompletionService`).
- **Dependency Rule:** The Adapter depends on the Port. The Application Layer NEVER imports the Adapter.

### 1.2 Data Transformation and Canonical Models
External systems speak foreign dialects. StoryOS speaks its own **Canonical Model**.
- **Anti-Corruption Translation:** When `OpenAICompletionAdapter` receives an external JSON response, it immediately translates the raw payload into a StoryOS canonical DTO. 
- The external JSON structure (e.g., OpenAI's specific nested message array) is never allowed to leak into the Application or Domain layers.

---

## Part II — Resilience and Failure Handling

Third-party APIs will fail, rate-limit, and timeout. Integration Adapters must mathematically protect the platform's stability.

### 2.1 Circuit Breakers
- Every outbound REST/gRPC call is wrapped in a **Circuit Breaker** (e.g., Resilience4j / Envoy Mesh configuration).
- If an external AI provider fails 50% of requests over 10 seconds, the Circuit Breaker trips to `OPEN`. Subsequent internal calls immediately fail-fast rather than exhausting thread pools waiting for network timeouts.

### 2.2 Retries and Backoff Strategies
- **Idempotent Reads:** Retried up to 3 times with **Exponential Backoff and Jitter** (e.g., 200ms, 400ms+jitter, 800ms+jitter) to prevent thundering herds upon recovery.
- **Non-Idempotent Writes:** Never retried blindly by the Adapter. Passed up to the Saga Orchestrator (Task 2.5) for managed, idempotent execution or compensation.

### 2.3 Rate Limiting
- Outbound adapters utilize a Token Bucket algorithm to proactively throttle outbound requests to match the vendor's API limits, preventing HTTP 429 penalties.

---

## Part III — AI and Third-Party Integrations

### 3.1 AI Provider Integration Abstraction
The AI Platform Architecture (Task 2.4) established the routing logic. This document establishes the physical execution boundary.
- **Provider Agnosticism:** The system is explicitly designed to hot-swap LLMs. `AnthropicAdapter`, `OpenAIAdapter`, and `LocalOllamaAdapter` all implement the exact same Port.
- **Capability Fallback:** If `PrimaryModelAdapter` trips its circuit breaker, the Application Layer automatically reroutes the prompt to the `FallbackModelAdapter`.

### 3.2 Webhook Architecture and Event Ingestion
When external systems push data to StoryOS (e.g., a publisher payment webhook):
1. **The Gateway:** An edge controller receives the webhook.
2. **Synchronous Validation:** The controller validates the cryptographic signature (HMAC) and returns `HTTP 202 Accepted` immediately. It does NO processing.
3. **Asynchronous Ingestion:** The payload is pushed to an ingestion Kafka topic, where an integration worker processes the external payload into a StoryOS internal command.

### 3.3 Import / Export Pipelines
Massive data movements (e.g., importing a 10GB world-building wiki) bypass the synchronous Application Layer entirely.
- They utilize a batch processing framework (e.g., Spring Batch / Temporal Activities) writing directly to the Command pipeline via Chunking to prevent memory exhaustion and database lock saturation.

---

## Part IV — Security and Federation

### 4.1 External Authentication Federation (SSO)
StoryOS never stores enterprise passwords.
- **Protocols:** The platform supports OIDC, OAuth2, and SAML 2.0.
- **Identity Mapping:** The External Identity Provider (IdP) returns a token. The StoryOS API Gateway maps the IdP claims (e.g., `OktaGroupID`) to internal StoryOS Roles, generating the internal `SecurityContext` defined in Task 3.1. The Domain Layer remains completely unaware of Okta or EntraID.

### 4.2 Integration Security
- **Inbound Security:** Webhooks require strict HMAC signature verification.
- **Outbound Security:** Adapters communicating with trusted partners use mTLS (Mutual TLS). API Keys for AI providers are fetched dynamically at runtime via the Secrets Operator (Task 2.7) and never logged.

---

## Part V — Observability and Testing

### 5.1 Integration Observability and SLIs
Extending Task 2.6, external integrations are heavily monitored.
- **Third-Party Latency (SLI):** Tracked separately from internal latency. A spike in OpenAI response time must not be misdiagnosed as a StoryOS database issue.
- **Circuit Breaker State:** Monitored as a P2 Alert. Frequent flipping between `CLOSED` and `OPEN` indicates a degraded external vendor.

### 5.2 Testing Strategy
- **External Dependency Simulation:** Integration tests NEVER hit live external APIs (e.g., OpenAI, Stripe).
- **WireMock / Hoverfly:** Adapters are tested against a local stub server that perfectly mimics the external provider's HTTP responses (including simulating HTTP 500s and 429s to test Circuit Breaker logic).
- **Contract Tests:** Outbound payloads are verified against the provider's published OpenAPI schema in the CI pipeline.

---

## Part VI — Integration Governance Rules

**INT-001: The Vendor Agnostic Rule**
*Rule:* A vendor-specific SDK (e.g., `openai-java`, `stripe-node`) MUST NEVER be imported outside of its specific Adapter package. The Application and Domain layers must rely solely on standard primitives and Canonical DTOs.
*Enforcement:* ArchUnit package boundary enforcement.

**INT-002: Mandatory Circuit Breakers**
*Rule:* Any network call leaving the StoryOS cluster boundary MUST be wrapped in a Circuit Breaker and a Timeout configuration. Infinite blocking calls are architectural defects.
*Enforcement:* AST scanning of HTTP Client instantiations.

**INT-003: Immediate Webhook Acknowledgment**
*Rule:* Inbound webhook controllers must not execute business logic before responding. They must authenticate, queue the raw payload to the event bus, and immediately return HTTP 202.
*Enforcement:* Code Review / Architecture Review Board.

---

> *"An API is a promise. A third-party API is a promise that will eventually be broken. The Integration Architecture ensures that when the promise breaks, the platform survives."*

---

**Document End**
