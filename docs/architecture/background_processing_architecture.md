# Background Processing & Job Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 3 — Application Architecture
> **Task:** 3.6 — Background Processing Architecture
> **Depends On:** `application_architecture.md`, `deployment_architecture.md`
> **Governed By:** `docs/architecture/platform_governance.md`

---

## Preface: The Hidden Engine

Not all business execution occurs synchronously in an HTTP thread. Not all asynchronous execution requires the complex state-machine orchestration of a Temporal Saga (Task 2.5).

When StoryOS needs to generate a massive PDF export, clean up abandoned sessions, or execute a daily AI consistency check, it relies on the **Background Processing Architecture**. This document defines how ephemeral, decoupled tasks are executed safely, fairly, and reliably behind the scenes without degrading the synchronous user experience.

---

## Part I — Job Taxonomy and Lifecycle

### 1.1 The Job Taxonomy
All asynchronous jobs must be classified into one of four rigid execution profiles:
1. **Immediate (Fire-and-Forget):** High priority. Executed as soon as a worker is free (e.g., Send password reset email).
2. **Delayed:** Executed once, but at a specific future timestamp (e.g., Send follow-up notification 24 hours after sign-up).
3. **Scheduled (Singleton):** Executed exactly once at a specific time, but distinct from delayed in that they are globally unique (e.g., End of season tournament computation).
4. **Recurring (Cron):** Executed infinitely on a fixed schedule (e.g., Nightly database vacuum/analytics rollup).

### 1.2 Job Lifecycle and State Transitions
Jobs are not opaque processes; they are state machines tracked in a fast, in-memory datastore (e.g., Redis).
- **States:** `QUEUED` $\to$ `PROCESSING` $\to$ `COMPLETED` | `FAILED` | `RETRYING` | `DEAD`
- **Visibility Timeout:** When a worker picks up a job, it is not deleted. It is marked `PROCESSING` with a timeout. If the worker crashes (OOM/Segfault) and fails to `ACK` the job before the timeout, the job transitions back to `QUEUED` for another worker to claim.

---

## Part II — Queue Architecture and Worker Topology

### 2.1 Worker Topology
Workers do not run in the same Kubernetes Pods as the synchronous Application API.
- As established in Task 2.7 (Deployment Architecture), background workers execute in **Dedicated Worker Node Pools**.
- This physically prevents an infinitely looping background job from exhausting CPU and starving the user-facing REST API.

### 2.2 Priority Queues and Fairness Policies
- **Strict Priority Queues:** Jobs are routed to `critical`, `default`, and `bulk` queues.
- **Fairness Policy:** A single tenant importing a 10GB world-building file cannot block the `bulk` queue for other tenants. Workers pull from queues using a Round-Robin per-tenant multiplexing strategy, preventing "Noisy Neighbor" queue starvation.

---

## Part III — Reliability and Concurrency

### 3.1 Retry, Backoff, and Dead-Letter Handling
- **Transient Failures:** Network timeouts trigger an automatic retry using **Exponential Backoff and Jitter** to prevent thundering herds on recovering internal microservices.
- **Terminal Failures:** A `NullPointerException` or `ValidationException` is deemed unrecoverable. The job is NOT retried. It is immediately moved to the **Dead Letter Queue (DLQ)**.
- **Operator Recovery:** DLQs are exposed via an internal admin dashboard. An engineer can review the payload, fix the code, and trigger a replay.

### 3.2 Idempotent Job Execution
- Background workers operate under the assumption of "At-Least-Once Delivery." A worker *will* eventually process the same job twice.
- **Rule:** Every background job MUST be idempotent. It must query the database or an Idempotency Cache to check if `JobID: X` has already completed before executing its side-effects.

### 3.3 Distributed Locking and Singleton Jobs
- For Scheduled Singleton or Recurring jobs (e.g., Nightly Analytics), multiple workers might wake up simultaneously.
- **Distributed Lock:** Workers must acquire a Redis-based distributed lock (e.g., Redlock) or a PostgreSQL advisory lock before executing. If a worker fails to acquire the lock, it silently skips the job.

---

## Part IV — Batch Processing and Schedulers

### 4.1 Batch Processing and Chunking
Loading 1,000,000 records into memory to process a background job guarantees an Out-Of-Memory (OOM) crash.
- **Chunking Strategy:** Batch jobs must utilize cursor-based chunking (e.g., `Spring Batch` or equivalent). 
- The job reads 1,000 records, processes them, commits the transaction, and repeats. This keeps memory overhead perfectly flat regardless of dataset size and prevents massive transaction log locks.

### 4.2 Cron and Scheduler Architecture
- The system bans localized, in-memory `@Scheduled` annotations on application pods.
- All Recurring jobs are registered with a **Central Scheduler Control Plane**. The Control Plane pushes a job to the Redis queue at the scheduled time. This allows the cluster to scale to 500 pods without executing 500 overlapping cron jobs.

---

## Part V — Observability and Testing

### 5.1 Worker Autoscaling and Queue SLIs
Extending Task 2.7 (Deployment):
- **KEDA (Kubernetes Event-driven Autoscaling):** The cluster dynamically provisions more Worker Pods based directly on the queue depth in Redis, scaling to 0 when idle.
- **Queue Latency (SLI):** Time between `QUEUED` and `PROCESSING`. Target: $< 5s$ for `critical`, $< 5m$ for `bulk`.
- **Failure Rate (SLI):** Percentage of jobs ending in `DEAD` state. Triggers P2 Alert if $> 1\%$.

### 5.2 Testing Strategy for Workers
- **Isolation:** The worker logic (the `JobHandler`) is decoupled from the queue framework. The `JobHandler` is unit-tested by passing in raw DTOs.
- **Failure Recovery Testing:** Integration tests explicitly simulate worker crashes (forcing visibility timeouts) to prove that the queue correctly re-delivers the payload to a secondary worker.

---

## Part VI — Job Governance Rules

**JOB-001: The Out-Of-Band Rule**
*Rule:* Synchronous HTTP API threads MUST NEVER execute background work. If an action takes longer than 500ms or involves external network calls not strictly required for the immediate response, it MUST be queued to a background worker.
*Enforcement:* APM / Trace analysis identifying slow synchronous paths.

**JOB-002: Mandatory Idempotency**
*Rule:* All `JobHandlers` must implement idempotency checks before mutating state.
*Enforcement:* Code Review and chaos testing (intentionally duplicating job payloads in staging).

**JOB-003: Payload Size Limit**
*Rule:* Job payloads in the queue must not exceed 64KB. The payload must only contain identifiers (e.g., `characterId: 123`). The worker must fetch the full entity from the database upon execution.
*Enforcement:* Queue infrastructure rejects oversized payloads, forcing DLQ routing.

---

> *"The queue is the shock absorber of the enterprise. It absorbs the chaotic spikes of user traffic and flattens them into a steady, mathematically predictable stream of background work."*

---

**Document End**
