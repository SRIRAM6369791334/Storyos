# Deployment Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 2 — Platform Architecture
> **Task:** 2.7 — Deployment Architecture
> **Depends On:** All Phase 1 & 2 Platform Architectures
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** Task 2.8 — Platform Governance

---

## Preface: Infrastructure is Code

In StoryOS, the physical runtime environment is an exact mathematical projection of the architectural constraints defined in Phase 2. Servers are never manually provisioned, configurations are never manually edited in production, and deployments do not require SSH access. 

The Deployment Architecture establishes a rigorous GitOps-driven, Kubernetes-native runtime model. It physically enforces the boundaries of the Modular Monolith, guarantees zero-downtime upgrades via Progressive Delivery, and mathematical recovery mechanisms during regional disaster scenarios.

---

## Part I — Deployment Topology & Kubernetes Architecture

StoryOS deploys its entire application and data plane onto **Kubernetes (K8s)**, utilizing strict node segregation to optimize for disparate workload profiles.

### 1.1 The Physical Topology
1. **Edge Tier:** Global CDN (Content Delivery Network), DDoS Protection, and WAF.
2. **Gateway Tier:** Ingress Controllers (NGINX/Envoy) routing traffic to the Service Mesh.
3. **Application Tier:** The core Modular Monolith pods processing synchronous API requests.
4. **AI Compute Tier:** GPU-provisioned Node Pools running the AI Agent runtime and local inference.
5. **Storage Tier:** Managed Cloud Databases (PostgreSQL for Entity, VectorDB for Search, Kafka for Events).

### 1.2 Kubernetes Logical Architecture
Kubernetes Namespaces act as strict physical boundaries for environments and tenant isolation.
- **Node Pools & Scheduling:** 
  - *Standard Pool:* CPU-optimized nodes for the Modular Monolith.
  - *Compute Pool:* GPU-enabled nodes exclusively tainted and toleration-bound for AI execution workloads.
  - *Observer Pool:* Dedicated nodes for the OpenTelemetry Collector and OPA sidecars to prevent application spikes from starving telemetry agents.

---

## Part II — Service Mesh & Network Controls

To satisfy the requirements of Task 2.3 (Security Architecture), the K8s cluster operates a **Service Mesh (Istio or Linkerd)**.

### 2.1 The Mesh Responsibilities
- **mTLS (Mutual TLS):** 100% of internal Pod-to-Pod communication is cryptographically authenticated.
- **Traffic Shaping:** The mesh routes percentages of traffic (e.g., 90% / 10%) to different versions of the Modular Monolith for Canary testing.
- **Circuit Breaking:** Enforces localized connection limits to prevent cascading failures without altering application code.

---

## Part III — GitOps & Infrastructure as Code (IaC)

Deployments to StoryOS are push-less. CI pipelines do not execute `kubectl apply`.

### 3.1 Infrastructure as Code
- **Tooling:** Terraform (OpenTofu) provisions all underlying cloud resources (VPCs, K8s Clusters, Managed DBs, KMS). 
- **State Management:** Terraform state files are locked in centralized backend storage with strict RBAC.

### 3.2 The GitOps Workflow (Argo CD)
1. Developer merges code to `main`.
2. CI builds the container, signs it, and pushes it to the Registry.
3. CI updates the `storyos-manifests` Git repository with the new image SHA.
4. **Argo CD** (running inside the K8s cluster) detects the divergence between the Git repo and the physical cluster state, and automatically pulls the new state into reality.

### 3.3 Supply Chain Security
- **Image Lifecycle:** All Docker images are built from distroless base images (zero shell access).
- **Signing:** Images are cryptographically signed using Cosign. The K8s admission controller rejects any image that lacks a valid signature, preventing malicious injections into the supply chain.

---

## Part IV — Progressive Delivery & Autoscaling

Big-bang deployments are banned. StoryOS utilizes **Progressive Delivery** to mathematically limit the blast radius of a bad release.

### 4.1 Blue/Green vs. Canary Deployment
- **Blue/Green:** Used for underlying Platform Service updates. Traffic is instantly cut over once the Green environment passes readiness checks.
- **Canary:** Used for the core Modular Monolith. Traffic is shifted incrementally (5% $\to$ 25% $\to$ 100%).
- **Automatic Rollback:** If the Observability Error Budget (Task 2.6) triggers an alert during the Canary phase (e.g., 500 error rate spikes), Argo Rollouts automatically aborts the deployment and shifts 100% of traffic back to the stable version.

### 4.2 Autoscaling Architecture
- **HPA (Horizontal Pod Autoscaler):** Scales Application Pods based on CPU/Memory thresholds.
- **KEDA (Kubernetes Event-driven Autoscaling):** Scales background worker pods based on Kafka queue depth and Temporal workflow backlogs, rather than basic CPU utilization.
- **VPA (Vertical Pod Autoscaler):** Recommends resource constraint adjustments for long-running stateful services.

---

## Part V — Disaster Recovery, RPO & RTO

StoryOS operates in an Active-Passive Multi-Region configuration for maximum resilience.

### 5.1 RPO and RTO Definitions
- **Recovery Point Objective (RPO):** Maximum acceptable data loss. *Target: 5 minutes* (achieved via continuous Cross-Region Database Replication).
- **Recovery Time Objective (RTO):** Maximum acceptable downtime. *Target: 15 minutes* (achieved via IaC bringing up the passive region).

### 5.2 Multi-Region Failover Strategy
1. **Primary Region:** Processes 100% of traffic.
2. **Passive Region:** Maintains a minimal footprint of the K8s cluster and active read-replicas of the databases.
3. **Failover Execution:** In a catastrophic failure, Global DNS shifts traffic to the Passive Region, and GitOps automatically scales the Application Tier from minimal footprint to full capacity in under 5 minutes.

### 5.3 Backup and Restore
- **Databases:** Automated hourly snapshots + continuous WAL (Write-Ahead Logging) archiving.
- **WORM Audit Logs:** Backed up to cross-region Immutable Object Storage.
- **Verification:** Automated restoration drills execute in a sterile staging environment weekly to prove backups are not corrupted.

---

## Part VI — Configuration and Secrets

### 6.1 Secret Distribution
- Kubernetes `Secrets` resources are never stored in plain text in Git.
- **External Secrets Operator (ESO):** Fetches secrets dynamically from the KMS (HashiCorp Vault) and injects them into the Pod's in-memory volume at runtime, maintaining compliance with Task 2.3.

### 6.2 Runtime Configuration
- **ConfigMaps:** Manage non-sensitive environment variables.
- **Feature Flags:** Decouple "Deployment" from "Release". Code can be deployed to production, but the feature remains hidden until explicitly toggled via the central Feature Flag control plane (LaunchDarkly equivalent).

---

## Part VII — Deployment Governance Rules

Automated deployment gates protect the production environment.

**DEP-001: Zero Downtime Database Migrations**
*Rule:* Schema migrations must never lock tables. Deployments follow the Expand/Contract pattern. (1) Add new column, (2) Deploy code that writes to both, (3) Backfill, (4) Deploy code that drops old column.

**DEP-002: Immutable Artifacts**
*Rule:* A container image built in CI cannot be modified. The exact same SHA hash deployed to Staging MUST be the hash deployed to Production.

**DEP-003: Mandatory Environment Promotion**
*Rule:* No artifact can be deployed to Production without a mathematically verifiable successful deployment and test pass in the Staging environment.

**DEP-004: Release Gates**
*Rule:* If the P1 Alert Count > 0 or Error Budget < 10% (Task 2.6), the CI/CD pipeline automatically hard-locks and prevents all production deployments except hotfixes.

---

> *"Hope is not a deployment strategy. The production environment is a chaotic system; deployment architecture is the mathematical formula that forces it back into order."*

---

**Document End**
**Next:** Task 2.8 — Platform Governance
