# Architecture Decision Records

This directory contains all Architecture Decision Records (ADRs) for StoryOS.

ADRs document significant architectural decisions — what was decided, why, what alternatives were considered, and what the trade-offs are.

## Index

| ADR | Title | Status | Date |
|---|---|---|---|
| [ADR-0001](ADR-0001.md) | Knowledge Graph as Central Architectural Model | Accepted | 2026-07-29 |
| [ADR-0002](ADR-0002.md) | AI Agents as First-Class System Peers | Accepted | 2026-07-29 |
| [ADR-0003](ADR-0003.md) | Immutable Audit Trail with Cryptographic Chaining | Accepted | 2026-07-29 |
| [ADR-0004](ADR-0004.md) | Canon Modification Requires Explicit Human Confirmation | Accepted | 2026-07-29 |
| [ADR-0005](ADR-0005.md) | Event-Driven Inter-Module Communication | Accepted | 2026-07-29 |
| [ADR-0006](ADR-0006.md) | Story Universe as Hard Data Isolation Boundary | Accepted | 2026-07-29 |

## How to Add a New ADR

1. Copy the template from any existing ADR
2. Number it sequentially (ADR-0007, ADR-0008, ...)
3. Set status to `Proposed` until approved by CTO
4. Update this README index
5. Reference the ADR from architecture.md if it modifies an existing decision

## Statuses

- **Proposed** — Under review, not yet approved
- **Accepted** — Approved by CTO and active
- **Superseded** — Replaced by a later ADR (reference the replacing ADR)
- **Deprecated** — No longer relevant
