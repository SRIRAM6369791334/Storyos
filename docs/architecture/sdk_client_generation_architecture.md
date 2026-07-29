# API SDK & Client Generation Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 5 — Developer Platform Architecture
> **Task:** 5.3 — API SDK & Client Generation Architecture
> **Depends On:** `api_presentation_architecture.md`, `plugin_extension_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Client Foundation

Tasks 5.1 and 5.2 defined how developers write plugins and scripts inside StoryOS. This document defines how external applications, game engines, mobile apps, and third-party integrations communicate with StoryOS from the outside.

Handwritten API client SDKs are a major source of enterprise debt; they drift from backend schemas, lack unified authentication, and handle retries inconsistently. The **API SDK & Client Generation Architecture** defines a fully automated, contract-first pipeline that compiles StoryOS OpenAPI v3 and GraphQL schemas into strongly typed, resilient SDKs across TypeScript, Python, Go, and C# (.NET/Unity).

---

## Part I — Schema Engine & Code Generation Pipeline

### 1.1 Schema Engine (Single Source of Truth)
Re-enforcing Task 3.7 (`API-001`), no SDK code is written by hand.
- **REST Schemas:** Derived from `storyos-openapi.yaml`.
- **GraphQL Schemas:** Derived from `storyos-schema.graphql`.
- **Pipeline Trigger:** A merge to `main` containing API schema updates automatically triggers the CI/CD Client Generation Pipeline (OpenAPI Generator / GraphQL Code Generator).

### 1.2 Multi-Language SDK Architecture
The pipeline outputs official client SDKs for four core ecosystems:
1. **TypeScript / JavaScript:** Target: Node.js, Web Browsers, Wasm Plugins (`@storyos/client`).
2. **Python:** Target: AI research, data pipelines, script automations (`storyos-python`).
3. **Go:** Target: High-throughput backend microservices (`storyos-go`).
4. **C# / .NET:** Target: Unity game engine integration, desktop apps (`StoryOS.SDK`).

---

## Part II — Resilience, Auth, and Offline Mechanics

### 2.1 Unified Authentication Integration
SDKs abstract authentication protocols behind a clean `AuthProvider` interface:
- Supports API Keys (server-to-server), OAuth2/OIDC JWT Bearer tokens (user interactive), and Short-lived Session Tokens.
- Automatically handles token refresh flows (`HTTP 401` $\to$ Refresh Token $\to$ Re-try Request) transparently without throwing exceptions to the application code.

### 2.2 Resilient Client Transport Layer
Every generated SDK incorporates an internal HTTP/gRPC transport wrapper enforcing:
- **Automatic Retries with Jitter:** Retries idempotent operations (`GET`, `PUT`, `DELETE`) on network drops or `HTTP 502/503/504` errors using exponential backoff + jitter.
- **Circuit Breaking:** Prevents cascading client app freezes by failing fast if the StoryOS API gateway is unreachable.
- **Offline Queueing (Mobile/Unity):** StoryOS client SDKs support optional optimistic local persistence. Mutations emitted while offline are queued to SQLite/IndexedDB and synced when connectivity restores.

---

## Part III — Release, Package Management, and Compatibility

### 3.1 SDK Release & Package Management
Generated SDKs are automatically built, signed, versioned, and published via CI/CD to public/private package registries:
- npm (`@storyos/client`)
- PyPI (`storyos-sdk`)
- Go Modules (`github.com/storyos/sdk-go`)
- NuGet (`StoryOS.SDK`)

### 3.2 API Version Compatibility Strategy
- **Semantic Versioning (SemVer):** SDK major versions mirror API major versions (e.g., SDK `v1.x.x` maps to API `/api/v1/`).
- **90-Day Deprecation Window (COM-004):** If an API field is deprecated, the generated SDK emits a runtime console warning (`[StoryOS SDK Warning]: Field 'legacyAttr' is deprecated and will be removed in v2.0`).

---

## Part IV — Observability and Testing

### 4.1 SDK Observability & Diagnostics
- **Client Telemetry:** SDKs inject standard tracing headers (`traceparent`, `tracestate`) into all HTTP/gRPC requests, connecting client-side calls directly to backend OpenTelemetry distributed traces (Task 2.6).
- **Client Metrics:** Exposes hooks for client-side latency, retry counts, and offline sync queue depth.

### 4.2 Compatibility Testing Strategy
- **Automated Mock Server Testing:** CI spins up a Prism / WireMock server loaded with the latest OpenAPI specification. Generated SDKs execute an exhaustive test suite against the stub server to verify serialization/deserialization correctness.
- **Contract Verification:** Consumer-driven contract tests (Pact) verify that SDK requests strictly conform to backend expectations.

---

## Part V — SDK Governance Rules

**SDK-001: 100% Generated Code Mandate**
*Rule:* Core API request methods, DTO models, and URL endpoints in official SDKs MUST be generated automatically from API schemas. Manual editing of generated client code is an architectural violation.
*Enforcement:* CI pipeline overwrite check.

**SDK-002: Mandatory Transport Resilience**
*Rule:* All generated SDKs MUST wrap network calls in standard transport middleware featuring exponential backoff, jitter, and automatic token refresh. Raw un-wrapped HTTP clients are banned.
*Enforcement:* Code Generator template validation.

**SDK-003: Distributed Trace Context Propagation**
*Rule:* SDKs MUST automatically inject OpenTelemetry trace headers into outbound requests to maintain end-to-end observability from client to database.
*Enforcement:* SDK Core Transport layer unit tests.

---

> *"Handcrafted SDKs drift and break. Generated, contract-driven SDKs make external integration as reliable and strongly typed as internal function calls."*

---

**Document End**
