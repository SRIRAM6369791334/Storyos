# Scripting & Automation Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 5 — Developer Platform Architecture
> **Task:** 5.2 — Scripting & Automation Architecture
> **Depends On:** `plugin_extension_architecture.md`, `background_processing_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: Programmable Storytelling

Task 5.1 established how external developers build static extensions and plugins. This document defines how creators, narrative designers, and platform power users write **Scripts and Automations** to orchestrate story logic programmatically.

The **Scripting & Automation Architecture** provides a safe, deterministic, and resumable execution engine that allows users to attach custom script logic to events, cron schedules, or manual triggers without compromising system stability, violating domain invariants, or burning infinite compute.

---

## Part I — Automation Engine & Scripting Language

### 1.1 Automation Engine Architecture
The Automation Engine acts as a lightweight workflow interpreter sitting between the Event Bus and the Application Layer (Task 3.1).
- **Embedded Execution:** User scripts do not run as raw OS commands. They execute inside a deterministic, sandboxed WebAssembly (Wasm) runtime or V8 isolate.
- **Event-Driven Dispatch:** Triggers parse incoming Kafka/Event-Bus events and immediately route matching payloads to the Script Interpreter.

### 1.2 Workflow Scripting Language
StoryOS standardizes on **TypeScript / JavaScript (ES2024 subset)** and **Starlark** (a deterministic, hermetic subset of Python).
- **No Unsafe Primitives:** The scripting language environment strictly omits non-deterministic primitives: `Math.random()` is replaced with seeded PRNGs, `Date.now()` is bound to event execution timestamps, and raw file system / network access is completely omitted.
- **StoryOS Script SDK (`@storyos/script`):** Scripts use a pure function signature:
```typescript
export async function onCharacterWounded(event: CharacterWoundedEvent, ctx: StoryContext) {
  if (event.severity > 8) {
    await ctx.timeline.addEvent({ title: `${event.characterName} suffered a mortal wound!` });
  }
}
```

---

## Part II — Triggers, Scheduling, and Execution

### 2.1 Trigger & Event System
Automations execute based on three trigger classes:
1. **Event Triggers (Reactive):** Subscribes to internal `IntegrationEvents` (e.g., `CanonUpdated`, `CharacterDied`).
2. **Scheduled Triggers (Proactive):** Executes on CRON expressions (e.g., `0 0 * * *` for nightly lore consolidation). Bound to Task 3.6 Schedulers.
3. **Manual / Webhook Triggers:** Executed directly via REST/GraphQL API invocation or button clicks in the UI.

### 2.2 Resumable Execution & State Persistence
Script automations are **durable and resumable**.
- If a script pauses waiting for an external HTTP webhook response or human approval (Task 4.1 HITL), the engine serializes the script's execution state to PostgreSQL/Redis.
- When the event fires, the script resumes execution at the exact instruction pointer, consuming zero CPU during the waiting period.

---

## Part III — Security, Sandboxing, and Resource Limits

### 3.1 Script Sandboxing & Hard Limits
- **Memory Cap:** Max 32MB RAM per script execution context.
- **CPU Deadline (Execution Cap):** Synchronous event scripts must terminate within **100ms**. Asynchronous background scripts must terminate within **5000ms**.
- **Instruction Counter:** The Wasm runtime injects instruction metering; scripts trapped in infinite loops (e.g., `while(true)`) are terminated instantly with a `ScriptQuotaExceededException`.

### 3.2 Automation Permissions & Security
Scripts operate strictly within the `SecurityContext` of the user who authored or enabled the automation.
- If User A does not have permission to delete Factions, a script written by User A will throw an `HTTP 403 Forbidden` error if it attempts to call `ctx.factions.delete()`.

---

## Part IV — Observability and Testing

### 4.1 Debugging, Tracing, and Observability
Extending platform telemetry (Task 2.6):
- **Script Tracing:** Every log statement (`ctx.log.info()`) and state mutation is captured in an auditable Execution Trace correlated with the parent `TraceID`.
- **Script SLIs:** Tracks Execution Latency, Failure Rate per Script ID, and Resource Quota Exceeded Rate.
- **Interactive Debugger:** The UI exposes a dry-run execution simulator allowing creators to step through script executions against historical snapshot states.

### 4.2 Script Testing Framework
- Creators test scripts locally via `@storyos/script-test`, which stubs the `StoryContext` and asserts that expected domain commands were emitted without mutating live database state.

---

## Part V — Scripting Governance Rules

**SCRIPT-001: Deterministic Execution Mandate**
*Rule:* Script runtimes MUST NOT expose non-deterministic primitives (unseeded random generators, system clocks, direct environment variables). All external inputs must be injected via the immutable `StoryContext`.
*Enforcement:* Wasm/V8 Isolate sandbox compilation rules stripping global non-deterministic objects.

**SCRIPT-002: Hard Resource Metering**
*Rule:* All user scripts MUST execute under instruction-metered CPU deadlines (100ms sync / 5000ms async) and strict 32MB memory caps. Infinite loop execution is an architectural defect.
*Enforcement:* Wasm runtime instruction counters.

**SCRIPT-003: Governed State Mutation**
*Rule:* Scripts MUST NOT mutate domain entities directly via raw SQL or memory references. All mutations MUST be dispatched as typed Domain Commands through the `StoryContext` application facade.
*Enforcement:* Sandbox isolation blocking network/DB driver instantiation.

---

> *"Plugins extend what the platform can do. Scripts define what the story does. Governed, metered, and resumable scripting makes narrative logic as programmable as code."*

---

**Document End**
