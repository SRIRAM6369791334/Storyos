# Observability Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.6 — Observability Architecture
> **Depends On:** All prior Phase 1 & 2 Documents
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.7 — Deployment Architecture

---

## Preface: The Operating System of the Platform

A system without observability is a black box waiting for a catastrophic failure. "It works on my machine" is an invalid statement in a distributed platform. 

In StoryOS, Observability is not merely "logging errors." It is treated as the foundational operating system of the entire architecture. By mathematically correlating AI executions, durable workflows, API traffic, and security policies into a unified telemetry stream, StoryOS allows engineers to answer *unknown unknowns* in production without SSH access. 

This document defines the strict standard by which all subsystems in StoryOS are monitored, measured, and operated.

---

## Part I — The Telemetry Model & OpenTelemetry

StoryOS standardizes 100% of its observability on **OpenTelemetry (OTel)**. Vendor lock-in to proprietary agents (e.g., Datadog, New Relic) is forbidden at the code level.

### 1.1 The Four Pillars of Telemetry
1. **Logs:** Immutable, timestamped text records of discrete events.
2. **Metrics:** Aggregated numerical data (Counters, Gauges, Histograms) used for alerting and dashboards.
3. **Traces:** A directed acyclic graph (DAG) of spans representing the lifecycle of a single request across multiple modules.
4. **Events:** High-fidelity, structured records of significant state changes (bridging the gap between Logs and Metrics).

### 1.2 OpenTelemetry Architecture
- **Instrumentation:** Application modules use OTel SDKs (auto-instrumented where possible) to emit telemetry.
- **OTel Collector:** A sidecar or DaemonSet that receives all raw telemetry via OTLP (gRPC), batches it, scrubs PII, and exports it to the backend storage (e.g., Prometheus for metrics, Jaeger for traces, Loki for logs).

---

## Part II — Logging & Tracing Standards

### 2.1 Structured Logging Standards
Unstructured string logging (`logger.info("User logged in")`) is strictly forbidden. 
- **Format:** All logs must be emitted as JSON.
- **Mandatory Fields:** Every log must contain `timestamp`, `level`, `traceId`, `spanId`, `universeId`, `tenantId`, and `module`.
- **Log Levels:** 
  - `ERROR`: Requires immediate human intervention (Alerting).
  - `WARN`: Degradation handled by the system (e.g., AI fallback routed).
  - `INFO`: Significant state changes (Workflow started).
  - `DEBUG`: Verbose execution paths (Dropped in production).

### 2.2 Distributed Trace Topology
Implementing the requirement from `communication_architecture.md`, trace context propagation is mandatory.
- **W3C Trace Context:** The `traceparent` header is injected at the API Gateway.
- **Boundary Crossings:** The `traceId` remains identical as the request moves from HTTP $\to$ Kafka Event Bus $\to$ Temporal Workflow $\to$ AI LLM invocation.
- **Trace Sampling:** 100% of errors are sampled. Successful requests use a dynamic tail-sampling policy (e.g., 5% base rate, 100% for high-latency outliers).

---

## Part III — Metrics Taxonomy & SLOs

### 3.1 Metrics Taxonomy
Metrics in StoryOS are strictly categorized to prevent dashboard clutter.

| Category | Example Metrics | Use Case |
|---|---|---|
| **Business** | `canon_branches_created_total`, `active_writers` | Product Analytics. |
| **Platform** | `http_request_duration_seconds`, `db_connection_pool` | Infrastructure Health. |
| **Workflow** | `workflows_running_duration`, `activity_retries_total` | Saga Execution Health. |
| **AI** | `llm_token_usage_total`, `hallucination_index_score` | AI Cost & Quality. |
| **Security** | `auth_failures_total`, `abac_policy_denials` | Intrusion Detection. |

### 3.2 SLI / SLO / Error Budget Framework
StoryOS governs reliability through Service Level Objectives (SLOs), not vague promises.
- **SLI (Indicator):** *What are we measuring?* (e.g., GraphQL API Latency).
- **SLO (Objective):** *What is the target?* (e.g., 99.9% of API requests complete in $< 200ms$).
- **Error Budget:** If an SLO is 99.9%, the module has an error budget of 0.1% (43 minutes of downtime per month).
- **Consequence:** If a module burns through its Error Budget, all feature deployments are mathematically halted by the CI/CD pipeline. The team must exclusively ship reliability fixes until the budget recovers.

---

## Part IV — Deep Integrations

### 4.1 AI Observability Integration
Extending the AI Platform Architecture (Task 2.4):
- **Spans:** Every LLM call is wrapped in a distinct Trace Span capturing the exact `PromptTemplate`, `ModelRouterChoice`, and `Temperature`.
- **Metrics:** `TTFT` (Time-to-First-Token) and `ITL` (Inter-Token Latency) are exported as Prometheus Histograms.
- **Data Scrubbing:** Actual user prompts and LLM completions are **never** logged to the central telemetry store to prevent PII leaks. They are stored in the isolated `Episodic Memory` database.

### 4.2 Workflow Observability Integration
Extending the Workflow Architecture (Task 2.5):
- **Execution Graphs:** Telemetry maps directly to Workflow Sagas. A stalled workflow triggers an alert based on `schedule_to_close_timeout` threshold breaches.
- **Metrics:** Compensation executions are tracked as a primary SLI. A spike in compensations indicates a downstream service is failing continuously.

---

## Part V — Incident Management & Compliance

### 5.1 Alert Routing & Escalation Policies
Alerts are routed based on severity and actionable intent.
- **P1 (Critical):** Core SLO breach (e.g., Database down). Paged immediately to On-Call engineer via PagerDuty.
- **P2 (High):** Error budget burning too fast. Routed to Slack channel for next-business-day review.
- **P3 (Info):** Background job took 10% longer. Logged to dashboard; no notification sent.
- *Rule:* If an alert requires no human action, it is deleted. "Alert Fatigue" is treated as an architectural defect.

### 5.2 Dashboard Architecture
Dashboards are purpose-built for three audiences:
1. **Engineering (Micro):** Per-module latency, CPU, GC pauses, SQL query times.
2. **Operations (Macro):** Cross-module SLIs, DLQ depths, Error Budgets.
3. **Business (Executive):** AI Cost per Tenant, DAU, Canonization rates.

### 5.3 Audit vs. Operational Telemetry Boundaries
- **Operational Logs (Loki/Elastic):** Ephemeral. Used for debugging. Retained for 14 days. Can drop packets under extreme load.
- **Audit Logs (WORM Storage):** Immutable. Used for compliance (SOC 2). Retained for 7 years. Guaranteed delivery (Zero data loss tolerated). Refer to Task 2.3 `Security Architecture`.

---

## Part VI — Observability Governance Rules

**OBS-001: Automatic Instrumentation Mandate**
*Rule:* Application logic must not contain explicit timing code (e.g., `long start = now(); ... log(now() - start);`). All latency metrics must be derived via OTel auto-instrumentation agents or decorators.

**OBS-002: Mandatory Trace Propagation**
*Rule:* Any HTTP client, gRPC client, or Kafka producer utilized by the application must be wrapped with the OTel context propagator. Breaking a trace chain is a build failure.

**OBS-003: Metric Naming Conventions**
*Rule:* All custom metrics must follow the Prometheus standard format: `namespace_subsystem_name_unit` (e.g., `storyos_ai_inference_duration_seconds`).

**OBS-004: No PII in Telemetry**
*Rule:* The OTel Collector must run a regex redaction processor. Email addresses, passwords, and credit card numbers are mathematically scrubbed before reaching the logging backend.

---

> *"Observability is not about having dashboards; it is about having answers. If an engineer has to guess why the system failed, the architecture has failed the engineer."*

---

**Document End**
**Next:** Task 2.7 — Deployment Architecture
