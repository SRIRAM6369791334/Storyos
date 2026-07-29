# AI Platform Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.4 — AI Platform Architecture
> **Depends On:** `service_architecture.md`, `security_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.5 — Workflow Architecture

---

## Preface: AI-Native, Not AI-Enabled

Legacy applications simply bolt LLM API calls onto existing CRUD endpoints. This is "AI-Enabled". StoryOS is an "AI-Native Platform". AI is not a feature; it is the core execution substrate. 

To achieve enterprise-grade reliability, determinism, and cost control, the AI Platform Architecture abstracts the raw non-determinism of foundational models behind a strict Control Plane, a multi-stage execution pipeline, and a rigid Governance framework. In StoryOS, LLMs are merely stateless compute engines. State, routing, planning, and memory are owned entirely by the Platform.

---

## Part I — Control Plane vs. Data Plane

StoryOS segregates AI operations into two distinct network and logical planes.

### 1.1 The AI Data Plane
- **Responsibility:** High-throughput, stateless inference execution.
- **Components:** The LLM Gateway, the Model Router, and the raw embedding generators.
- **Rule:** The Data Plane holds no memory. It receives a fully hydrated prompt (Context + Instructions) and returns a raw text/JSON completion.

### 1.2 The AI Control Plane
- **Responsibility:** Agent lifecycle, context assembly, memory management, and policy enforcement.
- **Components:** Agent Registry, Prompt Pipeline, Memory Engine, and Tool Registry.
- **Rule:** The Control Plane dictates *what* the Data Plane executes. It handles security boundaries (ABAC), RAG orchestration, and Human-in-the-Loop (HITL) suspensions.

---

## Part II — The Model Router & Execution

Hardcoding a specific model (e.g., `gpt-4o`) into business logic is architecturally forbidden.

### 2.1 Capability-Aware Routing
The Model Router dynamically selects the optimal foundational model per request based on a multidimensional heuristic:
- **Cost Budget:** (e.g., Use `Claude-3-Haiku` for summarization, `GPT-4o` for complex logic).
- **Latency SLA:** If `Model A` p95 latency degrades beyond 2000ms, fallback to `Model B`.
- **Capability Tags:** Requests requiring 128k context windows are routed only to models tagged with `Context:Large`.
- **Tenant Constraints:** Dedicated tenants can enforce strict "No OpenAI" policies, routing all traffic to local/VPC-hosted open-weight models (e.g., Llama-3).

---

## Part III — The Cognitive Pipeline

An Agent does not blindly execute a user prompt. Every task passes through the **PREV Pipeline** (Planner $\to$ Reasoner $\to$ Executor $\to$ Validator).

### 3.1 The PREV Pipeline
1. **Planner (O1/Claude-3.5-Sonnet):** Deconstructs the user request ("Make a war in Region X") into a Directed Acyclic Graph (DAG) of atomic sub-tasks (Create Factions, Update Geography, Write Lore).
2. **Reasoner:** Analyzes the DAG against the Knowledge Graph for logical contradictions.
3. **Executor (Fast Model):** Executes the sub-tasks in parallel or sequence, invoking necessary Tools.
4. **Validator (Critic Model):** An adversarial AI agent that critiques the Executor's output against the original prompt and system guardrails. If validation fails, it triggers an internal retry loop before presenting to the user.

---

## Part IV — Memory & Context Architecture

### 4.1 Memory Hierarchy
Agents require temporal awareness. Memory is structured mirroring human cognition:
- **Working Memory (Context Window):** Ephemeral. Holds the current PREV pipeline state and active tool outputs. Flushed upon task completion.
- **Episodic Memory (Event Sourcing):** A chronological ledger of all past interactions between the user and the agent, stored in a document database.
- **Semantic Memory (Knowledge Graph):** Hard facts extracted from Episodic Memory (e.g., "The user prefers dark fantasy tone"). Stored as Nodes and Edges.
- **Vector Memory (Embeddings):** High-dimensional mathematical representations of the Canon for semantic similarity searches.

### 4.2 Context Assembly & Multi-Source RAG
The Prompt Pipeline hydrates the Working Memory before invoking the Data Plane:
1. **Instruction Injection:** Loads the base Persona and System Rules.
2. **Multi-Source RAG:** Queries both the Vector Store (Semantic Search) and the BM25 Index (Lexical Search) using Hybrid RRF (Task 1.8).
3. **Graph Traversal:** Extracts immediate relational edges (1-hop) from the Knowledge Graph.
4. **Token Truncation:** If the assembled context exceeds the model's window, the pipeline utilizes a recursive summarization algorithm to compress older Episodic memory.

---

## Part V — Agency & Tooling

### 5.1 Agent Registry & Lifecycle
Agents are stateful entities managed by the Control Plane.
- **Created:** Provisioned with a specific Persona and Toolset.
- **Active:** Executing the PREV pipeline.
- **Suspended (HITL):** Paused indefinitely waiting for a Human Administrator to approve a high-risk Tool execution (e.g., `DeleteCanonBranch`).
- **Terminated:** Task completed, Working Memory flushed, final state persisted to Episodic Memory.

### 5.2 Tool Registry & Contracts
Agents interact with StoryOS via standardized Tools (e.g., `ExecuteGraphQLMutation`).
- **Tool Contracts:** Every tool is defined by a strict JSON Schema (OpenAPI/Function Calling).
- **Tool Sandbox:** Tools execute within a restricted sandboxed thread. The Agent cannot bypass the Tool Registry to execute arbitrary code.

---

## Part VI — Governance, Guardrails, & Observability

### 6.1 Guardrails & Policy Enforcement
Guardrails sit between the Control Plane and the Data Plane.
- **Input Guardrails:** Detects and blocks Prompt Injection (e.g., "Ignore previous instructions").
- **Output Guardrails:** Uses regex and lightweight classifiers to ensure the LLM output does not contain PII, toxicity, or violate the defined JSON schema.

### 6.2 AI Observability (Telemetry)
StoryOS emits standard OpenTelemetry metrics augmented for LLM workloads:
- **Token Telemetry:** Prompt Tokens, Completion Tokens, Total Tokens (tracked per `universeId` and `agentId`).
- **Financial Telemetry:** Real-time cost calculation based on the specific Model Router choice.
- **Latency Telemetry:** Time-to-First-Token (TTFT) and Inter-Token Latency (ITL).
- **Hallucination Index:** The Validator model scores the Executor's output for factual drift against the RAG context, emitting a metric to Prometheus.

### 6.3 AI Governance (MLOps)
- **Prompt Versioning:** Prompts are treated as code. They are versioned in Git, deployed via CI/CD, and never altered directly in production.
- **Evaluation Datasets:** Before deploying `Prompt V2`, it must run against a golden dataset of 1,000 historical tasks. If the Validator score drops, the CI build fails.
- **Shadow Deployments:** New Foundational Models are deployed in "Shadow Mode"—processing live traffic asynchronously to evaluate response quality without impacting the user experience.

---

> *"An LLM is a chaotic statistical engine. The AI Platform Architecture is the mathematical cage that forces it to produce deterministic, safe, and enterprise-grade value."*

---

**Document End**
**Next:** Task 2.5 — Workflow Architecture
