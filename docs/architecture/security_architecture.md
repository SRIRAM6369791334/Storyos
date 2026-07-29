# Security Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.3 — Security Architecture
> **Depends On:** `communication_architecture.md`, `service_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.4 — AI Platform Architecture

---

## Preface: The Perimeter is Dead

In legacy enterprise systems, security was defined by the network perimeter (firewalls and VPNs). Once inside the network, components trusted each other implicitly. 

StoryOS explicitly rejects perimeter-based security. The platform is designed under a **Zero Trust Architecture (ZTA)** paradigm. We assume the network is already compromised, that malicious AI prompt injections will occur daily, and that inside threats are as dangerous as external ones. 

Security in StoryOS is not merely an Authentication gateway; it is a pervasive, multi-layered framework encompassing Identity, Cryptography, Authorization Policies, Tenant Isolation, AI Sandboxing, and Immutable Auditing. Every request, whether originating from a human user on the internet or an internal AI Agent within the data center, must cryptographically prove its identity, context, and authorization intent.

---

## Part I — Identity Model

Identity is the foundational anchor of the Zero Trust model. StoryOS defines four distinct classes of actors within its unified identity matrix.

### 1.1 Actor Taxonomy

| Identity Class | Definition | Credential Type | Lifespan |
|---|---|---|---|
| **Human Users** | Creators, Readers, Editors. | Passkey (FIDO2) / OIDC Token | Persistent |
| **Organizations** | B2B Tenants (Studios, Publishers). | Tenant ID + Policy Domain | Persistent |
| **Service Accounts** | Internal background jobs (e.g., CDC Workers, Indexers). | mTLS Certificate / SPIFFE ID | Ephemeral (Rotated 24h) |
| **AI Agents** | Autonomous planners or narrative generators. | Scoped JWT (Agent Context Token) | Ephemeral (Task Scoped) |

### 1.2 The AI Agent Identity
Unlike traditional systems, AI Agents are treated as first-class identities, not just background processes. When an AI Agent is spawned to perform a task (e.g., "Review Lore for contradictions"), it is assigned a cryptographic identity that inherits a mathematically limited subset of its human invoker's permissions, strictly scoped to a specific `UniverseId` and `BranchId`.

---

## Part II — Authentication Architecture

Authentication answers: *Are you who you say you are?*

### 2.1 The Edge Auth Strategy
StoryOS standardizes entirely on **OAuth 2.1** and **OpenID Connect (OIDC)** for all human identities, delegating the physical storage of PII and passwords to a hardened external Identity Provider (IdP) (e.g., Auth0, Keycloak).

- **Primary Factor:** Passkeys (WebAuthn/FIDO2) are the default authentication method, eliminating phishing vectors associated with passwords.
- **Tokens:** The IdP issues short-lived Access Tokens (JWT, TTL: 15 mins) and long-lived Refresh Tokens (rotated upon use).

### 2.2 Token Exchange & Service-to-Service
1. **Ingress:** The Edge Gateway receives the external JWT, cryptographically validates the signature, and inspects the claims.
2. **Context Mapping:** The Gateway maps the external JWT into a standardized internal `SecurityContext` object and serializes it into an internal SPI token.
3. **Internal Auth:** Downstream modules authenticate each other using **mTLS (Mutual TLS)** managed by a Service Mesh, ensuring that lateral movement by a compromised network node is impossible.

---

## Part III — Authorization Model (ABAC + RBAC)

Authorization answers: *Are you allowed to do this specific action right now?*

### 3.1 The Policy Engine
Hardcoding `if (user.role == "ADMIN")` inside domain logic is forbidden. StoryOS utilizes an externalized **Policy Decision Point (PDP)** (e.g., Open Policy Agent - OPA) running as a sidecar to the Modular Monolith.

### 3.2 Evaluation Strategy
StoryOS combines Role-Based Access Control (RBAC) with Attribute-Based Access Control (ABAC):
- **RBAC (Coarse-Grained):** Determines basic interface visibility (e.g., "Can this user access the Lore Editor?").
- **ABAC (Fine-Grained):** Determines row-level and state-level mutations. 
  - *Example Policy:* User `U1` can execute `PublishCanonEvent` **IF** `U1.Role == EDITOR` **AND** `Event.UniverseId == U1.UniverseId` **AND** `Event.Status != ARCHIVED`.

### 3.3 Authorization Context Propagation
The PDP evaluates policies at the API boundary, but for massive read queries, evaluating 10,000 rows individually through a sidecar is too slow. Instead, the Security Domain compiles the ABAC rules into an Abstract Syntax Tree (AST) predicate, which is injected directly into the Database or Search Query by the Gateway (Row-Level Security).

---

## Part IV — Tenant Isolation & Multi-Tenancy

StoryOS operates a **Logical Multi-Tenancy** model optimized for high density, with strict mathematical isolation.

### 4.1 The Universe Boundary
- **Rule of Absolute Segregation:** Every database table, search index, and event topic must contain a mandatory `universeId` column/field. 
- **Enforcement:** Application services DO NOT manually append `WHERE universeId = X`. The underlying ORM/Data Access Layer intercepts the `SecurityContext` from the thread and automatically appends the isolation predicate. A developer literally cannot write a cross-universe query by accident.

### 4.2 Resource Isolation
- High-tier enterprise tenants (Studios) can be provisioned on **Physical Isolation** infrastructure (Dedicated Database Shards and Search Clusters) seamlessly, as the routing layer dynamically resolves the physical target based on the `universeId`.

---

## Part V — AI Security Model

Integrating Large Language Models introduces fundamentally new attack vectors. Traditional SQL Injection defenses do not work against non-deterministic natural language engines.

### 5.1 Prompt Injection Defense
- **Instruction Segregation:** System prompts (rules) and User inputs (data) are strictly segregated using advanced templating and ChatML syntax. 
- **Pre-Flight Sanitization:** All user text is passed through a lightweight classifier model specifically trained to detect jailbreak attempts before the expensive generation LLM is invoked.

### 5.2 Tool Permission Model
AI Agents are equipped with tools (e.g., `UpdateEntity`, `SearchKnowledgeGraph`).
- **Least Privilege Execution:** An Agent attempting to execute a tool must sign the request with its ephemeral JWT. The Policy Engine evaluates if the Agent is permitted to modify the specific entity.
- **Human-in-the-Loop (HITL) Enforcement:** For destructive actions (e.g., `DeleteBranch`, `ModifyCanon`), the Tool Execution Engine suspends the Agent's thread and issues an asynchronous approval request to a human Administrator. The Agent cannot bypass this mathematical gate.

### 5.3 Context Isolation
An AI Agent generating narrative for Universe A must physically not be able to retrieve embeddings from Universe B. The `universeId` is hard-coded into the Agent's memory connection string by the orchestration layer at spawn time.

---

## Part VI — Cryptography, Secrets, and Data Protection

### 6.1 Data Classification

| Classification | Definition | Encryption Requirements |
|---|---|---|
| **Public** | Published Canon lore. | TLS 1.3 in transit. |
| **Internal** | Drafts, AI proposals, branch data. | Encrypted at rest (AES-256). |
| **Restricted** | Payment data, PII, User emails. | Field-level encryption. Tokenized. |
| **System Secret** | API Keys, LLM Provider Tokens, DB Certs. | Never stored in DB. Managed by KMS. |

### 6.2 Key Management System (KMS)
- **Secrets Injection:** Environment variables are forbidden from holding secrets. Services boot, authenticate via their SPIFFE ID to the KMS (e.g., HashiCorp Vault), and dynamically load secrets into protected memory.
- **Rotation:** Application DB credentials and LLM API keys are rotated automatically every 30 days.

### 6.3 Field-Level Encryption (FLE)
For PII (e.g., Author's legal name, email), the data is encrypted at the application layer *before* being written to the database. Even a rogue DBA with raw SQL access cannot read the data. 

---

## Part VII — Audit, Compliance, and Threat Modeling

### 7.1 Immutable Audit Trails
To achieve SOC 2 and GDPR compliance, StoryOS maintains a mathematically immutable audit log.
- **Trigger:** Every state mutation (Command) and high-sensitivity query (e.g., cross-tenant admin view) automatically emits an `AuditActionCreated` event.
- **Storage:** The Audit Platform Service writes these events to a WORM (Write-Once-Read-Many) compliant cold storage bucket.
- **Cryptographic Chaining:** Following the Versioning Architecture rules, audit blocks are hashed chronologically (SHA-256) to prove the log has not been tampered with.

### 7.2 GDPR Right to be Forgotten
When a user exercises their right to deletion, an orchestration saga:
1. Deletes the physical record from the Entity Store.
2. Emits a `HardDeleteEvent` which instructs the Search Index and AI Memory Vector stores to expunge the vectors.
3. Overwrites PII in the immutable Audit Log with a cryptographically verifiable irreversible hash (`"USER_99" -> "REDACTED_8f4a..."`), preserving the structural integrity of the audit chain while destroying the PII.

### 7.3 Threat Modeling (STRIDE) Summary

| Threat Type (STRIDE) | Primary StoryOS Mitigation |
|---|---|
| **Spoofing** | OIDC Identity, mTLS for internal IPC, Passkeys. |
| **Tampering** | Cryptographic hash chaining on Canon / Audit logs. |
| **Repudiation** | 100% Immutable Event Sourcing & WORM Audit storage. |
| **Information Disclosure** | Automated ABAC Predicate injection at DB level. |
| **Denial of Service** | Edge Rate Limiting, API Gateway Payload Caps (5MB), Circuit Breakers. |
| **Elevation of Privilege** | Externalized OPA Policy Engine, strict HITL Agent gates. |

---

## Part VIII — Security Governance Rules

Automated compliance is the only scalable compliance. The following rules are enforced in CI pipelines and runtime guardrails.

**SEC-001: No Hardcoded Secrets**
*Rule:* Static code analysis (e.g., TruffleHog) fails the build if high-entropy strings or known credential patterns are detected in any commit.

**SEC-002: Mandatory Security Context**
*Rule:* Any API controller or event consumer that lacks a `@RequiresPolicy` annotation (or equivalent structural policy binding) will fail to compile. Default-deny is enforced at the compiler level.

**SEC-003: JWT TTL Caps**
*Rule:* The system will mathematically reject any incoming JWT with an expiration time `exp` greater than 1 hour from the current clock.

**SEC-004: Dependency Vulnerability Blocking**
*Rule:* CI pipelines must execute Software Composition Analysis (SCA). Any imported library with a known CVE (CVSS score > 7.0) automatically halts the deployment to staging or production.

**SEC-005: AI Sandbox Egress Blocking**
*Rule:* Network policies (e.g., Calico/Cilium) block AI Agent pods from initiating outbound connections to the internet. Agents can only communicate with internal Tools through the verified Gateway API.

---

> *"Security is not a gateway you pass through; it is the fabric the platform is woven from. If you cannot mathematically prove your system is secure, assume it is already compromised."*

---

**Document End**
**Next:** Task 2.4 — AI Platform Architecture
