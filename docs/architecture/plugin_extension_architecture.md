# Plugin & Extension Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 5 — Developer Platform Architecture
> **Task:** 5.1 — Plugin & Extension Architecture
> **Depends On:** `integration_architecture.md`, `ai_tool_capability_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: Governed Extensibility

StoryOS cannot anticipate every custom rule, world-building UI widget, or AI generator a third-party developer might want to build.

However, third-party code is inherently untrusted. A malicious or poorly written plugin must never be able to crash the core platform, access another tenant's data, or bypass Domain Invariants. The **Plugin & Extension Architecture** establishes a safe, sandboxed, and event-driven extensibility framework that allows external developers to extend StoryOS capabilities without compromising platform security, stability, or performance.

---

## Part I — Plugin SDK & Manifest Specification

### 1.1 Plugin Manifest Specification (`storyos-plugin.json`)
Every plugin must supply a signed, declarative manifest defining its identity, requested permissions, and extension hooks.
```json
{
  "id": "com.vendor.map-generator",
  "name": "Fantasy Map Generator",
  "version": "1.2.0",
  "minPlatformVersion": "3.0.0",
  "permissions": ["READ_WORLD_BUILDING", "REGISTER_AI_TOOL"],
  "capabilities": [
    { "type": "UI_WIDGET", "slot": "character.dashboard.tab" },
    { "type": "AI_TOOL", "schema": "schemas/map_tool.json" }
  ],
  "hooks": ["onCharacterCreated", "onCanonUpdated"]
}
```

### 1.2 Plugin SDK Architecture
Developers build plugins using the official `@storyos/sdk`.
- **Language Agnostic:** SDKs are available for TypeScript/JavaScript (WebAssembly/Node) and Python (Isolated Container Workers).
- **Facade Pattern:** The SDK exposes typed facade interfaces wrapping StoryOS GraphQL/REST APIs (Task 3.7). Direct access to internal platform libraries or databases is impossible.

---

## Part II — Sandboxing, Isolation, and Security

### 2.1 WebAssembly (Wasm) & Container Sandboxing
Third-party code is executed in isolated runtime sandboxes based on execution profile:
- **Lightweight Logic & UI Widgets $\to$ Wasm Sandbox:** Runs in an isolated WebAssembly runtime (e.g., Wasmtime / WasmEdge) embedded in the Edge Gateway. Memory is hard-capped (e.g., 64MB) with zero access to file system or network sockets.
- **Heavy Data/AI Pipelines $\to$ Isolated Container Sandbox:** Runs as a sidecar/ephemeral pod in a dedicated Kubernetes Sandbox namespace with strict NetworkPolicies blocking internal VPC access.

### 2.2 Granular Plugin Permissions
Plugins use a **Least-Privilege Permission Model**.
- Permissions (e.g., `READ_CHARACTER`, `WRITE_TIMELINE`) must be explicitly declared in the manifest.
- **Tenant Approval Gate:** When a tenant administrator installs a plugin, they are presented with an OAuth2-style consent screen. A plugin requesting `READ_CHARACTER` cannot invoke `WRITE_TIMELINE` APIs; the platform Gateway drops unauthorized calls with `HTTP 403 Forbidden`.

---

## Part III — Lifecycle, Events, and Marketplace

### 3.1 Extension Lifecycle State Machine
`INSTALLED` $\to$ `VALIDATED` $\to$ `ENABLED` $\to$ `RUNNING` $\to$ `DISABLED` $\to$ `UNINSTALLED`
- **Validation Stage:** Upon upload, the platform validates the manifest signature, scans Wasm binaries for malicious instructions, and verifies JSON Schema compliance.

### 3.2 Event System & Hooks
Plugins extend platform behavior via asynchronous **Event Hooks**:
- **Interception Hooks (Pre-Commit):** Allow plugins to validate data before a command completes (e.g., `onBeforeCharacterSave`). Must respond within a strict 200ms deadline or be bypassed.
- **Notification Hooks (Post-Commit):** Asynchronous integration events (e.g., `onCharacterCreated`) delivered via Kafka to the plugin's Wasm or container worker.

### 3.3 Marketplace Architecture & Version Compatibility
- **Marketplace Registry:** StoryOS hosts a central Plugin Marketplace where developers publish extensions.
- **Binary Code Signing:** All published plugins must be cryptographically signed with developer certificates registered in the platform Trust Store.
- **Semantic Versioning (SemVer):** The platform rejects plugins whose `minPlatformVersion` is incompatible with the running StoryOS cluster version.

---

## Part IV — Observability and Testing

### 4.1 Plugin Observability (SLIs)
Extending platform telemetry (Task 2.6):
- **Plugin Execution Latency:** Time spent inside a plugin Wasm hook. Target: $< 50ms$.
- **Sandbox Memory Utilization:** Tracks memory consumption per plugin instance.
- **Plugin Fault Rate:** Tracks unhandled exceptions inside plugin code. A plugin exceeding a 5% error rate is automatically disabled by the platform Circuit Breaker.

### 4.2 Testing Strategy for Extensions
- **SDK Test Harness:** The `@storyos/sdk/testing` package provides local mocks for all StoryOS APIs, allowing developers to unit-test plugins in isolation.
- **Compatibility Suite:** Automated CI runners execute candidate plugins against breaking API changes in nightly platform builds.

---

## Part V — Plugin Governance Rules

**EXT-001: The Manifest Contract Rule**
*Rule:* A plugin MUST NOT execute capabilities, access endpoints, or consume events that are not explicitly declared in its `storyos-plugin.json` manifest and approved by the installing Tenant Admin.
*Enforcement:* Edge Gateway interception of non-declared API requests.

**EXT-002: Mandatory Wasm/Container Isolation**
*Rule:* Third-party plugin code MUST NEVER execute directly in the primary StoryOS application process or pod memory space. All execution MUST occur within a Wasm or Container Sandbox.
*Enforcement:* Architecture Review Board & deployment pipeline validation.

**EXT-003: Strict Hook Execution Timeouts**
*Rule:* Synchronous pre-commit extension hooks MUST complete within a hard 200ms timeout. Hooks exceeding the timeout are aborted, logged, and bypassed to protect platform latency.
*Enforcement:* Wasm runtime execution deadline enforcement.

---

> *"Extensibility is power; unconstrained extensibility is chaos. By isolating plugins in Wasm sandboxes and governing them via declarative manifests, StoryOS becomes an infinite ecosystem without sacrificing enterprise security."*

---

**Document End**
