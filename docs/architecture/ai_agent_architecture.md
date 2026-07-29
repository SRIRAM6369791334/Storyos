# AI Agent Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 4 — AI Architecture
> **Task:** 4.1 — AI Agent Architecture
> **Depends On:** `ai_platform_architecture.md`, `application_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: Intelligence as a System Actor

StoryOS fundamentally rejects the paradigm of treating AI as a "stateless function call" that a UI blindly pings for text completion.

In StoryOS, AI is modeled as an **Agentic System Actor**. An Agent possesses memory, tools, permission boundaries, and the ability to collaborate with other Agents to achieve a goal. This document defines the internal architecture of how Intelligence executes, communicates, and remains mathematically constrained within the enterprise platform.

---

## Part I — Agent Taxonomy and Topologies

### 1.1 The Agent Taxonomy
StoryOS utilizes a specialized hierarchy of agents to break down complex world-building tasks (e.g., "Generate a 3-act plot based on my existing Universe"):
1. **Orchestrator Agent:** The routing layer. Decomposes the user's intent into a DAG (Directed Acyclic Graph) of sub-tasks and assigns them. Never executes tools directly.
2. **Planner Agent:** Creates step-by-step logical plans for complex tasks.
3. **Executor Agent:** The workhorse. Invokes external tools, modifies data, and executes specific tasks (e.g., *Character Generator*).
4. **Reviewer / Critic Agent:** An adversarial agent that inspects the Executor's output against the Canon and Domain Rules. Can reject output and force a retry loop.
5. **Memory Agent:** A specialized background agent that continuously synthesizes conversation history into dense Graph/Vector context (Detailed fully in upcoming Task 4.2).

### 1.2 Agent-to-Agent Communication Protocols
Agents do not share memory space. They communicate via **Structured Message Passing** (Event Bus/Kafka).
- **Protocol:** `AgentMessage { sender_id, receiver_id, payload (JSON), trace_id }`.
- An Executor cannot "read the mind" of an Orchestrator. It receives a strict JSON prompt and returns a strict JSON outcome.

---

## Part II — Context, Prompts, and Execution

### 2.1 The Prompt Assembly Pipeline
A prompt in StoryOS is never a static string. It is a compiled artifact.
1. **System Directive:** The immutable core persona and behavioral constraints.
2. **Dynamic Context Injection:** The API queries the Neo4j Knowledge Graph and Milvus Vector DB (retrieval) and injects the top-K relevant facts directly into the prompt (RAG).
3. **Working Memory:** The recent conversational turns (sliding window).
4. **User Intent:** The actual command.
- *Compilation:* The Prompt Compiler hashes this assembled string for strict deterministic caching.

### 2.2 Agent Lifecycle and Execution States
An Agent session is tracked as a durable state machine:
- **States:** `INITIALIZING` $\to$ `PLANNING` $\to$ `EXECUTING_TOOLS` $\to$ `WAITING_FOR_HUMAN` $\to$ `SYNTHESIZING` $\to$ `COMPLETED` | `ESCALATED`

---

## Part III — Tool Invocation and Capabilities

### 3.1 Tool Invocation Architecture
LLMs in StoryOS are stateless compute engines. They cannot "do" anything without Tools.
- **Model Context Protocol (MCP) / Tool Registry:** StoryOS exposes business capabilities as strictly typed Tools defined via JSON Schema (e.g., `execute_graphql_query`, `update_character_attribute`).
- When an Agent decides to use a Tool, it emits a `ToolCallRequest`. The StoryOS Application Layer executes the Tool and returns a `ToolCallResponse`.

### 3.2 Capability Models and Permission Boundaries
Agents are subject to the same strict RBAC (Role-Based Access Control) as humans.
- **Agent Roles:** When an Agent is spawned, it is assigned a `SecurityContext` bound to the User who invoked it.
- **Least Privilege:** An AI Agent helping a User edit "Character A" is structurally barred from executing the `DeleteUniverse` tool, even if it hallucinates the intent to do so. The Application Layer (Task 3.1) drops the request with `HTTP 403 Forbidden`.

---

## Part IV — Safety and Human-in-the-Loop (HITL)

### 4.1 Human-in-the-Loop Approval Boundaries
StoryOS enforces strict Human-In-The-Loop (HITL) boundaries for destructive or highly-consequential operations (re-enforcing ADR-004 from Phase 1).
- **Execution Pause:** If an Executor Agent generates a `DeleteFaction` tool call, the Agent state transitions to `WAITING_FOR_HUMAN`.
- **Approval Flow:** The User receives a push notification outlining the proposed action. If approved, the Agent resumes. If rejected, the Agent receives an `Error: User Rejected` prompt and must pivot its strategy.

### 4.2 Failure Handling, Retries, and Escalation
- **Parsing Failures:** If an LLM outputs malformed JSON, the framework catches the error and auto-prompts the LLM with the exact parser error to self-correct (Max retries: 3).
- **Escalation:** If a Critic Agent rejects an Executor's output 3 times in a row (infinite loop prevention), the Agent transitions to `ESCALATED` and alerts the user that it requires manual intervention to proceed.

### 4.3 AI Safety Guardrails
- **Input/Output Scanners:** Every prompt and every response passes through a synchronous Guardrail layer (e.g., NeMo Guardrails) to detect prompt injection, PII leakage, or extreme content violations before the LLM ever sees it.

---

## Part V — Observability and Testing

### 5.1 Agent Observability
AI introduces new dimensions of operational risk. Extends Task 2.6:
- **Token Usage (SLI):** Tracked per-User, per-Agent, and per-Session for FinOps billing.
- **Tool Call Latency (SLI):** Time taken for the StoryOS platform to execute the Agent's tool request.
- **Success/Escalation Rate (SLI):** Tracks the percentage of Agent goals achieved autonomously vs. those requiring HITL escalation.

### 5.2 Testing Strategy
Testing stochastic models requires rigid frameworks.
- **Deterministic Replay:** Tests inject fixed mock responses for LLM API calls, verifying that the Agent Orchestrator parses the JSON and dispatches the correct sub-agents.
- **Evaluation Simulation (LLM-as-a-Judge):** Nightly CI runs a suite of 1,000 prompts against the live models. A separate, high-parameter Critic Model (e.g., GPT-4) grades the output against StoryOS canonical rubrics, ensuring quality does not drift over time.

---

## Part VI — AI Governance Rules

**AI-001: The Stateless Model Rule**
*Rule:* Application state MUST NEVER be trusted to an LLM's context window. The LLM is a stateless function; the StoryOS platform owns the state, memory, and history.
*Enforcement:* Architecture Review Board.

**AI-002: Banned Direct Writes**
*Rule:* An AI Agent CANNOT directly issue SQL or mutate the database. It MUST invoke an explicitly registered, heavily validated Tool (Command Handler).
*Enforcement:* Application Layer RBAC blocks non-Application layer credentials.

**AI-003: Mandatory Auto-Correction Caps**
*Rule:* Autonomous Agent loops (e.g., Executor $\to$ Critic $\to$ Executor) MUST be hard-capped at a maximum of 3 iterations. Infinite token loops are a P1 financial security risk.
*Enforcement:* Hardcoded framework loop counters throwing `EscalationExceptions`.

---

> *"An AI Agent without strict boundaries is an expensive liability. An AI Agent constrained by tools, schemas, and human oversight is an enterprise force multiplier."*

---

**Document End**
