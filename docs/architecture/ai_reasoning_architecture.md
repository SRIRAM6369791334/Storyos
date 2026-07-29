# AI Reasoning & Planning Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 4 — AI Architecture
> **Task:** 4.3 — AI Reasoning & Planning Architecture
> **Depends On:** `ai_agent_architecture.md`, `ai_memory_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Engine of Thought

Task 4.1 established *who* executes (Agents). Task 4.2 established *what* they remember (Memory). This document establishes **how they think**.

Without a governed reasoning architecture, an LLM is a random text generator. It will hallucinate tools, execute steps out of order, and fail catastrophically on complex world-building tasks. StoryOS enforces a mathematically rigorous Reasoning & Planning layer that forces agents to decompose intent into explicit Directed Acyclic Graphs (DAGs), evaluate certainty, and critique their own logic before taking action.

---

## Part I — Reasoning Models

StoryOS utilizes a **Hierarchical Reasoning Model** to optimize token cost and latency based on task complexity.

### 1.1 The Reasoning Hierarchy
1. **Reactive Reasoning (Fast System 1):** Used for simple, single-tool queries (e.g., "What is the capital of the Elven Empire?"). Skips planning entirely. Directly maps intent $\to$ ToolCall.
2. **Deliberative Reasoning (Slow System 2):** Used for multi-step goals (e.g., "Create a new faction and assign 3 key members"). Requires the Orchestrator Agent to generate a formal Execution DAG before any tools are invoked.
3. **Hybrid Reasoning:** A deliberative DAG executes, but if a sub-task fails, the Executor Agent uses reactive reasoning to auto-correct the specific failure without unwinding the entire overarching plan.

### 1.2 Chain-of-Thought (CoT) Handling Policy
- **Internal vs. Exposed CoT:** Agents are required to emit a `<thought>` block before emitting a `<tool_call>` block. 
- **The Filter Policy:** The `<thought>` block is strictly internal. The Application Layer strips all CoT XML blocks from the final HTTP JSON response. The user sees *what* was done (the UI state change), not *how* the model justified it, preventing UX clutter and prompt leakage.

---

## Part II — Planning and Task Decomposition

### 2.1 DAG Generation and Dependency Management
When a user requests a complex operation (e.g., "Generate a war between Faction A and Faction B"), the Orchestrator Agent must build a Plan.
- A Plan is a strictly validated **Directed Acyclic Graph (DAG)** in JSON format.
- **Task Decomposition:** The Orchestrator breaks the goal into atomic subgoals (e.g., `Task 1: Fetch Faction A`, `Task 2: Fetch Faction B`, `Task 3: Generate Battle Event (Depends on 1, 2)`).
- **Parallelism:** The StoryOS Workflow Engine evaluates the DAG. Tasks without dependencies (Tasks 1 & 2) are dispatched to Executor Agents *in parallel*.

### 2.2 Replanning and Multi-Step Execution
No plan survives contact with reality.
- **The Replanning Loop:** If `Task 3` fails because a Domain Rule (Task 3.2) is violated (e.g., "Faction B is already dead"), the Orchestrator pauses execution, absorbs the Error Response, and generates a new, modified DAG from the failure point forward.

---

## Part III — Reflection, Critique, and Certainty

### 3.1 Reflection and Self-Critique Loops
StoryOS enforces an adversarial reasoning model.
- **The Critic Agent:** Before a high-impact plan is executed, or before a massive text generation is returned to the user, it is routed to a Critic Agent.
- The Critic is prompted solely to find logical holes, Canon contradictions, or formatting violations. If the Critic scores the output $< 8/10$, it returns a precise rejection to the Executor to try again.

### 3.2 Confidence Estimation and Uncertainty Handling
Agents must calculate certainty before acting.
- **Uncertainty Thresholds:** If an Executor Agent is prompted to update a timeline but its internal confidence calculation is low due to conflicting Semantic Memory, it is structurally forbidden from guessing.
- It must invoke the `ask_user_clarification` tool, pausing the DAG and pushing the uncertainty back to the human.

---

## Part IV — Observability and Testing

### 4.1 Reasoning Observability (SLIs)
Extending the AI Observability from Task 4.1:
- **Planning Latency:** Time taken for the Orchestrator to compile the initial DAG. Target: $< 3000ms$.
- **Plan Success Rate:** Percentage of DAGs that complete without triggering a Replanning Loop.
- **Replanning Frequency:** A spike indicates the Orchestrator is generating invalid or out-of-date plans, signaling a failure in the Memory Retrieval (RAG) layer.

### 4.2 Testing Strategy for Reasoning
- **Deterministic Orchestration Testing:** CI injects a frozen, mock LLM response representing an initial plan. The test framework asserts that the StoryOS DAG parser correctly maps the JSON to the underlying Workflow engine, honoring all dependencies.
- **Reasoning Regression Evaluation:** Nightly CI runs 500 complex prompts through the Orchestrator and uses LLM-as-a-Judge to evaluate if the generated DAGs are logically sound and optimally parallelized.

---

## Part V — AI Reasoning Governance Rules

**REASON-001: The DAG Execution Mandate**
*Rule:* Any user request requiring more than one tool invocation MUST be parsed into a JSON DAG by the Orchestrator and executed by the Application layer. Agents MUST NOT execute multiple sequential tool calls in a single unbounded LLM generation loop.
*Enforcement:* Framework interceptors block array-based sequential tool dispatches.

**REASON-002: Internal Chain-of-Thought Isolation**
*Rule:* All internal reasoning, reflection, and self-critique text MUST be stripped by the API Gateway. It is logged to Observability (Datadog/Elastic) for debugging but NEVER returned to the client UI.
*Enforcement:* Gateway Response Body filters.

**REASON-003: Mandatory Certainty Escalation**
*Rule:* If an Agent detects contradictory facts in its retrieved memory context, it MUST NOT probabilistically guess the correct fact. It must suspend the plan and invoke human clarification.
*Enforcement:* Prompt engineering constraints and Critic Agent adversarial checks.

---

> *"Reasoning is not magic. It is a highly constrained, observable, and adversarial workflow that forces probabilistic models to obey deterministic rules."*

---

**Document End**
