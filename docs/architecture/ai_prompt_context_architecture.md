# AI Prompt Engineering & Context Assembly Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 4 — AI Architecture
> **Task:** 4.5 — AI Prompt Engineering & Context Assembly Architecture
> **Depends On:** `ai_agent_architecture.md`, `ai_memory_architecture.md`, `ai_tool_capability_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: Prompts as Compiled Code

In naive AI applications, prompts are ad-hoc string interpolations. In StoryOS, a prompt is an immutable, compiled execution artifact produced by a deterministic compilation pipeline.

The **AI Prompt Engineering & Context Assembly Architecture** governs the compilation pipeline that transforms agent state, memory queries, capability schemas, security constraints, and user intent into a secure, token-optimized payload tailored for specific foundation models.

---

## Part I — Prompt Compiler & Layered Architecture

### 1.1 The Prompt Compiler
The Prompt Compiler is a high-performance pipeline operating before every LLM invocation.
- **Inputs:** Agent Persona, User Intent, Memory Store (Task 4.2), Tool Registry (Task 4.4), SecurityContext (Task 3.1).
- **Output:** An immutable, typed `CompiledPromptPayload` containing structured messages, tool definitions, and token allocation metadata.

### 1.2 Multi-Layered Instruction Hierarchy
Instructions are composed in a strict stack where higher layers override lower layers:
1. **Layer 0 (System Core):** Unalterable platform rules (safety, tool usage syntax, anti-jailbreak directives).
2. **Layer 1 (Developer Base):** Agent role template (e.g., Orchestrator vs. Critic persona) inherited from the Prompt Template Taxonomy.
3. **Layer 2 (Runtime Environment):** Dynamic context injection (RAG facts, filtered tool schemas, temporal clocks, current universe state).
4. **Layer 3 (User Request):** The immediate user input, sanitized and wrapped in isolated execution XML tags.

---

## Part II — Context Prioritization, Fusion, and Budgeting

### 2.1 Token Allocation & Budgeting
To prevent context overflow and control FinOps expenditure, every compiled prompt enforces a strict token budget:

| Segment | Token Allocation % | Truncation Priority |
| :--- | :--- | :--- |
| **System Core & Safety** | 10% | Never Truncated (Hard Lock) |
| **Tool Schemas (Filtered)** | 15% | High Priority (Drop via RBAC Omission) |
| **Authoritative Canon (Graph)** | 35% | High Priority (Truncate oldest nodes) |
| **Semantic Context (Vector)** | 20% | Medium Priority (Prune lowest score) |
| **Working Conversation History** | 15% | Low Priority (Sliding window eviction) |
| **User Request & Buffer** | 5% | Never Truncated |

### 2.2 Context Fusion & Conflict Resolution
When memory retrieval returns conflicting information (e.g., Vector DB says "Character is dead", Relational Canon says "Character is alive"):
- The Compiler applies the **Canon Dominance Rule**: Relational Canon (PostgreSQL) always overrides Vector/Graph retrieval.
- Contradictory semantic facts are stripped during compilation before reaching the prompt.

---

## Part III — Security, Adaptation, and Caching

### 3.1 Security & Prompt Injection Defense
- **XML Boundaries:** User input is strictly wrapped in `<user_input_untrusted>` tags. The System Core instructs the LLM that instructions within untrusted tags must never modify system rules.
- **Secret Redaction:** Before final serialization, the compiler passes the text through a regex/NER redactor to strip API keys, tokens, and PII.

### 3.2 Model-Specific Prompt Adaptation
Different foundation models (Claude 3.5 Sonnet, GPT-4o, Llama 3) respond differently to prompt structures.
- The Compiler utilizes **Model Adapters** (e.g., `AnthropicPromptAdapter`, `OpenAIPromptAdapter`).
- Adapters transform the generic `CompiledPromptPayload` into vendor-native structures (e.g., converting tool definitions into OpenAI JSON schema vs. Anthropic XML tags).

### 3.3 Prompt Caching and Invalidation
- **Prefix Hashing:** The Compiler computes a SHA-256 hash of the static layers (System Core + Developer Base + Tool Schemas).
- This hash is supplied to provider APIs (e.g., Anthropic Prompt Caching), achieving up to **80% latency and cost reduction** on repetitive agent loops.

---

## Part IV — Observability and Testing

### 4.1 Prompt Observability (SLIs)
Extending AI Platform Observability:
- **Assembly Latency (SLI):** Time taken to compile and assemble the prompt. Target: $< 50ms$.
- **Prompt Cache Hit Rate (SLI):** Percentage of tokens served from provider prompt caches. Target: $> 75\%$.
- **Token Utilization Ratio:** Percentage of total allocated context window actually utilized.

### 4.2 Testing Strategy
- **Compiler Unit Tests:** Verify that template inheritance, token budgeting, and instruction layering assemble deterministically given identical inputs.
- **Injection Fuzzing:** Automated security test suites inject known prompt injection payloads into Layer 3 to verify that Layer 0 safety rules are maintained.

---

## Part V — AI Prompt Governance Rules

**PROMPT-001: The Immutable Core Rule**
*Rule:* Layer 0 (System Core) safety instructions MUST be prepended to every prompt assembly. No developer template, agent persona, or user input may override or strip Layer 0 instructions.
*Enforcement:* Hardcoded compiler pipeline enforcement.

**PROMPT-002: Mandatory Input Isolation**
*Rule:* All dynamic runtime data and user input MUST be wrapped in explicit structural delimiters (e.g., XML tags) and marked as untrusted to prevent prompt injection.
*Enforcement:* Compiler AST verification.

**PROMPT-003: Model Neutrality**
*Rule:* Prompt templates in the repository MUST be written in the vendor-agnostic Canonical Prompt Format. Model-specific formatting MUST be applied exclusively by Model Adapters during compilation.
*Enforcement:* Code Review / Architecture Review Board.

---

> *"A prompt is not text. It is an executable memory payload compiled just-in-time under strict security, cost, and structural constraints."*

---

**Document End**
