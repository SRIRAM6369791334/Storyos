# Workflow Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.5 — Workflow Architecture
> **Depends On:** `communication_architecture.md`, `ai_platform_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.6 — Observability Architecture

---

## Preface: Execution Beyond the Request/Response Cycle

In StoryOS, many business processes (e.g., Canonizing a branch, orchestrating an AI narrative generation, syncing external platforms) take hours, days, or even weeks to complete. Traditional synchronous APIs and background message queues fail at this scale because they lose state upon process crash.

The Workflow Architecture introduces a **Durable Execution Engine** (e.g., Temporal, AWS Step Functions). It mathematically guarantees that a long-running business process will run to completion, exactly once, maintaining its exact local state regardless of node failures, deployments, or network timeouts.

---

## Part I — Core Engine & Orchestration

### 1.1 Workflow Engine Architecture
StoryOS relies on a centralized **State Machine Orchestrator**. 
- **Workflows (The Orchestrator):** Define the control flow (`if`, `while`, `sleep`). Workflows must be strictly deterministic (no API calls, no random numbers, no thread sleeping). 
- **Activities (The Executors):** Execute the actual side-effects (DB writes, LLM calls, 3rd party APIs). Activities can fail, retry, and block indefinitely.

### 1.2 Saga Orchestration vs. Choreography
StoryOS explicitly mandates **Saga Orchestration** over Saga Choreography.
- **Why not Choreography?** In Choreography, modules emit events and react blindly. This creates an implicit, untraceable state machine spread across the entire codebase ("event pinball").
- **Why Orchestration?** A central Coordinator (the Workflow) explicitly calls `Module A`, then `Module B`. The exact state of the distributed transaction is visible in a single execution graph.

### 1.3 State Machine Model & Durable Execution
When a Workflow executes an Activity, the Engine records the `ActivityTaskScheduled` and `ActivityTaskCompleted` events into a central Event History database. If the worker container crashes mid-execution, a new container replays the Event History to reconstruct the exact variable state before the crash, and resumes execution seamlessly. 

---

## Part II — Resilience & Transactions

### 2.1 Compensation & Rollback Strategies
Distributed systems do not have `BEGIN TRANSACTION` and `ROLLBACK` spanning multiple databases.
- **Rule:** Every state-mutating Activity in a Saga must have a corresponding **Compensation Activity**.
- **Execution:** If step 4 of a Saga fails terminally, the Workflow catches the exception and executes the compensations for steps 3, 2, and 1 in reverse order, restoring the system to eventual consistency.

### 2.2 Retry, Timeout & Escalation Policies
Workflows do not hang infinitely.
- **Schedule-To-Start Timeout:** How long an Activity can wait in the queue (prevents silent queue buildup).
- **Start-To-Close Timeout:** How long a single execution attempt can take (e.g., AI LLM call capped at 60s).
- **Retry Policy:** Exponential backoff is configured per Activity. Non-retryable errors (e.g., `400 Bad Request`) bypass the retry logic and immediately trigger Saga Compensation.

### 2.3 Idempotent Activity Execution
Because the engine guarantees "At-Least-Once" execution of Activities (due to network retries), every Activity must be strictly idempotent. 
- *Constraint:* An Activity cannot rely on local state. It must use the Workflow's generated `IdempotencyKey` when interacting with external APIs or databases (aligning with `COM-002` from Task 2.2).

---

## Part III — Advanced Control Flow

### 3.1 Timers, Delays & Scheduled Activities
Because execution state is durable, workflows can literally "sleep" for months without consuming CPU threads.
- **Temporal Pauses:** Workflows can execute `await Workflow.sleep(30.days)`. The state is serialized to the database and cleanly awoken later. This eliminates the need for complex `cron` job architectures and polling databases for "status = pending".

### 3.2 Human-in-the-Loop (HITL) Workflow Integration
Certain AI workflows require human approval before committing destructive actions.
- **Signal Architecture:** The workflow reaches an `awaitApproval` state. It sends a notification to the UI and suspends itself (consuming zero CPU).
- **Resumption:** The human clicks "Approve". The UI sends a Signal to the Engine, which awakens the specific Workflow ID and passes the human's payload, allowing the saga to proceed.

---

## Part IV — Code Lifecycle & Modeling

### 4.1 Workflow Definition DSL
Workflows are defined as code (e.g., Java/TypeScript Interfaces), not drag-and-drop UI charts. This allows workflows to be unit-tested, version-controlled, and code-reviewed.

### 4.2 Workflow Versioning & Migration
Updating the code of a long-running workflow is dangerous. If a workflow sleeping for 30 days wakes up to new code, the replayed Event History will not match the new code path (Non-Determinism Error).
- **Versioning Rule:** Workflows use branching logic (`if (getVersion() == 2)`) to handle in-flight executions. 
- **Migration:** Old code paths can only be deleted once the Observability dashboard proves that $0$ active executions remain on V1.

---

## Part V — Governance & Observability

### 5.1 Workflow Observability
The Workflow Engine exposes a strictly segregated UI/API for tracing.
- **Execution Graph:** Visualizes the Saga, showing green (success) and red (failure) paths.
- **State Transitions:** Every variable change and activity result is logged in the Event History.
- **Stuck Workflow Detection:** Prometheus metrics track `workflows_running_duration_seconds`. Alerts fire if a workflow meant to take 5 minutes is stuck in an execution state for 2 hours.

### 5.2 Workflow Governance Rules

**WF-001: No Non-Deterministic Code in Workflows**
*Rule:* Workflow definitions cannot generate UUIDs, random numbers, read local files, or make network calls. All side-effects MUST be delegated to Activities.
*Enforcement:* Static code analysis blocks forbidden IO libraries within the `workflow` package.

**WF-002: Concurrency Limits & Quotas**
*Rule:* Tenant-based executions are rate-limited. If Tenant A triggers 1,000,000 workflows, it must not starve Tenant B. 
*Enforcement:* The engine routes tasks using `TaskQueues` grouped by tenant tier, with hard concurrency limits enforced per worker pool.

**WF-003: Mandatory Saga Compensation**
*Rule:* Any Saga defined in the system must mathematically implement a `catch` block that executes compensation logic for all previously successful steps.

---

> *"A robust Workflow Architecture doesn't try to prevent failures. It mathematically ensures that when failures inevitably happen, the system state never corrupts, and business processes always run to a guaranteed conclusion."*

---

**Document End**
**Next:** Task 2.6 — Observability Architecture
