# API & Presentation Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.7 — API & Presentation Architecture
> **Depends On:** `application_architecture.md`, `read_model_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Public Contract

Every internal component in StoryOS—from strictly isolated Domain Aggregates to federated Search Engines and Saga Orchestrators—exists for a single purpose: to serve the user.

However, internal execution complexity must never leak to the client. The **API & Presentation Architecture** defines the outermost boundary of StoryOS. It enforces API-First design, strict Backend-for-Frontend (BFF) segregation, and rigid interface contracts to ensure the platform can evolve aggressively without breaking the client experience.

---

## Part I — Interface Strategies and Patterns

### 1.1 The Quad-Interface Strategy
StoryOS exposes different protocols tailored to specific consumer profiles:
1. **REST (JSON):** The default for resource-oriented Commands (Writes), Partner integrations, and Webhooks. Follows strict Level 2+ Richardson Maturity Model.
2. **GraphQL:** The exclusive standard for Client Queries (Reads). Allows Web and Mobile clients to traverse the massive StoryOS Read Models (Task 3.4) without over-fetching.
3. **gRPC:** Reserved strictly for high-throughput Internal Service-to-Service communication and official StoryOS SDKs.
4. **Server-Sent Events (SSE) / WebSockets:** Used for real-time streaming (e.g., AI token streaming, live collaboration cursors).

### 1.2 Backend-for-Frontend (BFF)
Clients do not talk directly to the core Application APIs.
- StoryOS deploys independent **BFF layers** (e.g., `StoryOS-Web-BFF`, `StoryOS-Mobile-BFF`).
- The BFF orchestrates multiple underlying Application APIs, translating them into UI-optimized payloads.
- *Dependency Rule:* The BFF depends on the core APIs; core APIs know nothing about Web or Mobile rendering requirements.

---

## Part II — Resource Modeling and Standards

### 2.1 URI Conventions and Resource Modeling
REST API URIs must reflect domain nouns, not infrastructure verbs.
- **Valid:** `POST /api/v1/universes/{universeId}/characters`
- **Invalid:** `POST /api/v1/createCharacter`
- Sub-resources must not exceed 3 levels of depth to prevent unbounded graph traversal via REST (which is GraphQL's job).

### 2.2 Request/Response Standards
- **Mutations (Writes):** Must return `201 Created` with a `Location` header, or `202 Accepted` for async Saga workflows.
- **Identifiers:** Internal database integers (e.g., `id: 45`) are banned from API responses. All identifiers must be cryptographically unpredictable strings (e.g., UUIDv7, ULIDs, or Hashids).

### 2.3 Error Response Contract (RFC 7807)
All HTTP APIs must implement **RFC 7807 (Problem Details for HTTP APIs)**.
```json
{
  "type": "https://api.storyos.com/errors/domain-invariant-violation",
  "title": "Character Already Dead",
  "status": 409,
  "detail": "Cannot inflict wound; character died at timeline_event_id: 998.",
  "instance": "/api/v1/characters/abc-123/wounds",
  "traceId": "x-b3-traceid-848483"
}
```
Stack traces are strictly stripped from all 500-level errors at the API Gateway.

---

## Part III — Security and API Governance

### 3.1 Authentication and Authorization
As defined in Task 3.1, the API boundary is where external Identity (JWT) becomes internal `SecurityContext`.
- **Gateway Validation:** The Edge Gateway validates the cryptographic signature of the JWT and checks token revocation lists.
- **Attribute-Based Access Control (ABAC):** Authorization is evaluated at the API Controller layer based on the intersection of the User's Roles and the targeted Universe's policies.

### 3.2 Rate Limiting and Quotas
APIs are protected by dynamic, tier-based rate limiting (Token Bucket) implemented at the API Gateway (e.g., Envoy).
- **Free Tier:** 100 req/min.
- **Enterprise Tier:** 5000 req/min.
- A HTTP 429 response must include standard `X-RateLimit-Reset` headers.

---

## Part IV — Evolution and Documentation

### 4.1 API Versioning and Deprecation Policy
- **URI Versioning:** Breaking changes require a new URI (`/api/v2/...`).
- **COM-004 Enforcement:** A v1 API cannot be deleted until a 90-day deprecation window is completed. During this window, requests to v1 return a `Deprecation: true` HTTP header.
- **GraphQL Evolution:** GraphQL schema breaking changes (e.g., removing a field) are banned. Fields are marked `@deprecated` and usage is tracked via Apollo Studio. Once usage hits 0%, the field can be removed.

### 4.2 OpenAPI Governance
- **API-First Design:** Code is generated from OpenAPI definitions; OpenAPI definitions are never generated from code.
- Developers write the `storyos-openapi.yaml` contract, which must pass CI linting (e.g., Spectral) before a single line of Java/Go code is written.

---

## Part V — Observability and Testing

### 5.1 Performance Budgets and API SLIs
- **Query APIs (GraphQL):** 99th percentile response time $< 150ms$.
- **Command APIs (REST):** 99th percentile response time $< 250ms$.
- **Availability (SLO):** $99.99\%$ uptime.
- Errors must be tracked in Prometheus by `HTTP Status Class` (4xx vs 5xx). A spike in 5xx triggers a P1, whereas a spike in 4xx triggers a security anomaly investigation.

### 5.2 Testing Strategy
- **Contract Testing (Pact):** The Web and Mobile teams (consumers) write Pact tests against the core API. Core API CI fails if a change breaks the frontend.
- **Performance Testing (k6):** Nightly load tests blast the `/api/v1` endpoints to guarantee performance budgets remain intact over time.

---

## Part VI — API Governance Rules

**API-001: The API-First Mandate**
*Rule:* No endpoint can be deployed without a corresponding, Spectral-linted OpenAPI v3 or GraphQL Schema definition merged into the central API registry.
*Enforcement:* CI/CD blocks deployment without schema validation.

**API-002: Banned Internal Leakage**
*Rule:* Stack traces, SQL exception strings, and internal infrastructure IP addresses MUST NEVER be serialized in an API response.
*Enforcement:* Edge Gateway interception and rewriting of generic 500 errors.

**API-003: Strict Protocol Segregation**
*Rule:* GraphQL is strictly for Queries (Read Models). REST is strictly for Commands (Write Models). gRPC is strictly for Internal Services.
*Enforcement:* Code Review / Architecture Review Board.

---

> *"The API is the company. If the API is brittle, the product is brittle. A rigorous API contract allows infinite chaos behind the scenes without the customer ever knowing."*

---

**Document End**
