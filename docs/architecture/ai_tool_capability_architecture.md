# AI Tool & Capability Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 4 — AI Architecture
> **Task:** 4.4 — AI Tool & Capability Architecture
> **Depends On:** `ai_agent_architecture.md`, `integration_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Illusion of AI Agency

An LLM cannot delete a database. It cannot send an email. It can only emit a string of text. 

In StoryOS, AI "Agency" is simply the LLM emitting a structured JSON string requesting that the *Platform* execute a specific function on its behalf. The **AI Tool & Capability Architecture** governs that exact boundary. It defines how tools are registered, discovered, sandboxed, and authorized, ensuring that an Agent's capabilities are mathematically bounded by enterprise security and platform governance.

---

## Part I — Tool Registry and Lifecycle

### 1.1 The Enterprise Tool Registry
Tools are not hardcoded into prompts. They are managed dynamically via a central **Tool Registry**.
- The Registry is a catalog of all executable functions available to Agents across the platform.
- When an Orchestrator Agent (Task 4.1) plans a DAG, it queries the Tool Registry to discover available capabilities.

### 1.2 Tool Lifecycle and Versioning
A Tool in StoryOS is treated with the exact same rigor as a public REST API (Task 3.7).
- **Registration:** Developers register a Tool via an OpenAPI-compliant JSON Schema definition.
- **Validation:** CI pipelines reject Tools that lack descriptive parameter documentation (because LLMs require semantic descriptions to understand when to invoke them).
- **Versioning:** Tools are versioned (`v1`, `v2`). A breaking change to a Tool's JSON schema forces a major version bump, coexisting for the 90-day `COM-004` deprecation window to prevent inflight DAG failures.
- **Retirement:** Deprecated tools trigger Agent Planner warnings before being ultimately removed.

---

## Part II — Security and Capability Scoping

### 2.1 Capability Scoping by SecurityContext
Just because a Tool exists in the Registry does not mean an Agent can use it.
- **Dynamic Context Injection:** When an Agent is spawned, it inherits the Human User's `SecurityContext`.
- **Capability Negotiation:** The API Gateway intercepts the LLM prompt assembly and filters the Tool List. If the Human lacks `Universe:Delete` permissions, the `delete_universe` tool schema is entirely omitted from the LLM's system prompt. The LLM mathematically cannot call a tool it does not know exists.

### 2.2 Tool Execution Authentication
When the LLM outputs `{"name": "create_character", "args": {...}}`, it is an untrusted payload.
- The **Tool Execution Pipeline** intercepts the JSON.
- It attaches the inherited `SecurityContext` (JWT claims) to the execution thread.
- The request is routed to the Application Layer (Task 3.1), which executes standard ABAC (Attribute-Based Access Control) to verify the command.

---

## Part III — Execution, Isolation, and Chaining

### 3.1 Tool Sandboxing and Isolation
Tools that execute arbitrary logic (e.g., executing user-generated Python scripts for procedural generation) are classified as **High-Risk**.
- High-Risk tools are strictly sandboxed. They execute via isolated Kubernetes Jobs (or WebAssembly sandboxes) with no network access to the internal StoryOS cluster and no mounted volumes.

### 3.2 Tool Composition and Chaining Policies
- **Sequential Chaining Ban:** Agents are structurally forbidden from chaining mutations in a single, unbounded loop (e.g., `Tool(A) -> Tool(B) -> Tool(C)`). 
- As defined in Task 4.3, multi-step execution requires the Orchestrator to generate a DAG, passing execution control back to the deterministic Workflow Engine between every single tool invocation.

---

## Part IV — External Capability Integration

### 4.1 External MCP Server Integration
StoryOS does not build every tool natively. It embraces the **Model Context Protocol (MCP)**.
- **External Integration:** StoryOS can mount external MCP Servers (e.g., a Github MCP server, a Slack MCP server).
- **Proxying:** The StoryOS Tool Registry proxies the MCP tool definitions into the LLM context.
- **Execution:** When the LLM calls an MCP tool, StoryOS acts as the MCP Client, wrapping the external call in the Circuit Breakers and Resilience patterns defined in the Integration Architecture (Task 3.5).

---

## Part V — Observability and Testing

### 5.1 Tool Observability (SLIs)
Extending the AI SLIs from Task 4.1:
- **Tool Latency (SLI):** Time from the Tool Pipeline intercepting the JSON to the Application Layer returning the result.
- **Tool Reliability (SLI):** Percentage of Tool calls resulting in HTTP 500.
- **LLM Syntax Failure Rate:** Percentage of times the LLM hallucinates non-existent arguments or fails JSON Schema validation. Triggers prompt engineering alerts if $> 2\%$.

### 5.2 Testing Strategy for Tool Contracts
- **JSON Schema Contract Tests:** Every tool's execution handler must be tested against its declared JSON Schema.
- **Simulation (Fuzzing):** CI injects malformed JSON (simulating LLM hallucinations) into the Tool Execution Pipeline to verify that the parsing and validation layer catches the errors before they hit the Domain.

---

## Part VI — AI Tool Governance Rules

**TOOL-001: The Schema Supremacy Rule**
*Rule:* No Tool may be registered without a complete, rigorously typed JSON Schema, including semantic descriptions for every parameter. LLMs cannot guess intent; schemas must document it.
*Enforcement:* CI/CD spectral linting of Tool Registry definitions.

**TOOL-002: Capability Omission**
*Rule:* The Prompt Assembly Pipeline MUST dynamically omit the schemas of any Tools the calling User is not authorized to execute. The LLM must not be tempted with forbidden capabilities.
*Enforcement:* ABAC intersection logic during prompt compilation.

**TOOL-003: Stateless Tool Execution**
*Rule:* A Tool Execution Handler MUST NOT store session state. It receives a Command, executes it against the Application Layer, and returns a JSON result. The Memory Agent (Task 4.2) is the sole owner of state.
*Enforcement:* Architecture Review Board.

---

> *"Tools are the only physical hands an AI possesses. By strictly governing the shape, permissions, and execution of those hands, we guarantee the safety of the entire system."*

---

**Document End**
