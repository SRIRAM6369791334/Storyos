# System Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Depends On:** `docs/requirements/prs.md` — v1.0 Approved
> **Next:** `docs/database/database_design.md`

---

## 1. Architecture Overview

StoryOS is architected as an **AI-native Story Operating System** — a platform that treats story not as a collection of documents, but as a living, structured knowledge universe that AI agents can reason over, and creators can manage with precision.

Unlike conventional writing tools that place text at the center and add AI as a layer, StoryOS places structured knowledge at the center. Text, AI responses, and creative outputs are all derived from — and validated against — an authoritative story knowledge representation.

The platform is organized around three foundational concepts:

**Entity** — Everything in a story that can be named, described, and related to something else. Characters, locations, events, factions, items, and concepts are all entities. Entities are the atomic building blocks of story knowledge.

**Relationship** — The typed, directed connections between entities that give a story its structure. Relationships carry attributes, history, and temporal scope. The network of all entities and relationships constitutes the Knowledge Graph.

**Canon** — The confirmed, authoritative state of story truth at any given moment. Canon is the system of record against which all AI reasoning, consistency checking, and content validation is performed.

StoryOS coordinates across eight distinct architectural layers to bring these concepts to life, from creator-facing interfaces through to long-term storage and AI reasoning pipelines.

---

## 2. Architectural Principles

The following principles are inviolable constraints on every architectural and design decision made within StoryOS. They take precedence over convenience, development velocity, and feature requests.

### P1 — AI First
The architecture does not accommodate AI as an add-on. Every data structure, every module interface, and every system event is designed with AI reasoning as a primary consumer. AI agents are peers of human users in the system model, not afterthoughts.

### P2 — Entity Centric
The entity — not the document, not the scene, not the chapter — is the fundamental unit of the platform. All features, all storage models, and all AI operations are organized around entities and their relationships.

### P3 — Knowledge Driven
Behavior in StoryOS is driven by what the system knows about the story, not by hardcoded rules. Consistency checking, AI memory, search, and recommendations all derive from a continuously enriched Knowledge Graph.

### P4 — Event Driven
All significant state changes within the platform emit events. Events are the mechanism by which modules remain loosely coupled. AI agents, notifications, audit systems, and workflow engines all respond to events rather than direct invocations.

### P5 — Domain Isolated
Each core domain — Character, World, Timeline, Relationship, Knowledge Graph, AI, Workflow — operates within a defined boundary. Domains communicate through well-defined interfaces. No domain reaches into another domain's internal state.

### P6 — Canon Sovereign
No system component, including AI agents, may modify Canon without confirmed creator intent. The Canon state is the most protected data in the system. All mutation paths through Canon require explicit, audited authorization.

### P7 — Extensible by Design
The platform is built for extension, not modification. New entity types, new AI agents, new workflow stage types, and new output formats are added by extending the system through defined extension points — not by modifying existing components.

### P8 — Metadata Driven
Behavior is configured through metadata, not through code changes. Entity schemas, relationship types, workflow definitions, and AI agent scopes are all expressed as structured metadata managed at runtime.

### P9 — Security First
Security is a structural property, not a feature layer. Access control, data isolation, and audit logging are embedded in the architecture at every layer. They cannot be bypassed by any path through the system.

### P10 — Consistency Over Convenience
When a conflict arises between convenience and correctness, correctness wins. Partial data, ambiguous states, and unverified AI inferences are surfaced to creators rather than resolved silently.

---

## 3. High-Level Architectural Layers

StoryOS is organized into eight distinct layers. Each layer has a clear responsibility and communicates with adjacent layers through defined interfaces. No layer bypasses the layers beneath it.

```
┌─────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                        │
│          Creator Interfaces · Admin Interfaces              │
│          AI Agent Interaction Surface · Plugin UI           │
├─────────────────────────────────────────────────────────────┤
│                   APPLICATION LAYER                         │
│      Request Orchestration · Session Management             │
│      Authorization Enforcement · Event Dispatch             │
├─────────────────────────────────────────────────────────────┤
│                     DOMAIN LAYER                            │
│   Story · Character · World · Timeline · Relationship       │
│   Workflow · Search · Media · Collaboration · Versioning    │
├─────────────────────────────────────────────────────────────┤
│                   KNOWLEDGE LAYER                           │
│     Knowledge Graph Engine · Canon Manager                  │
│     Provenance Tracker · Consistency Validator              │
├─────────────────────────────────────────────────────────────┤
│                      AI LAYER                               │
│    AI Memory Manager · Agent Orchestrator                   │
│    Inference Engine · AI Audit Logger                       │
├─────────────────────────────────────────────────────────────┤
│                   WORKFLOW LAYER                            │
│    Workflow Engine · Stage Manager · Notification Broker    │
│    Audit Log System · Task Scheduler                        │
├─────────────────────────────────────────────────────────────┤
│                    STORAGE LAYER                            │
│    Entity Store · Graph Store · Document Store              │
│    Media Store · Version Store · Audit Store                │
├─────────────────────────────────────────────────────────────┤
│                  INTEGRATION LAYER                          │
│    Plugin Gateway · Export Engine · Import Pipeline         │
│    Notification Dispatcher · Webhook Manager                │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Presentation Layer

The interface through which all human users and external consumers interact with StoryOS. This layer renders story knowledge, exposes creator tools, and surfaces AI agent outputs.

The Presentation Layer is stateless — it holds no story data. All state originates from the Application Layer. The layer is responsible for rendering clarity, accessibility compliance, and appropriate information density for each user role.

### 3.2 Application Layer

The coordination layer that sits between the presentation surface and the domain logic. It is responsible for:

- Validating and routing all incoming requests
- Enforcing authentication and role-based authorization on every operation
- Coordinating cross-domain operations that involve multiple domain modules
- Dispatching domain events to the event bus
- Managing session context for human users and AI agents

The Application Layer does not contain business logic. It delegates to the Domain Layer and ensures every action is authorized, logged, and correctly orchestrated.

### 3.3 Domain Layer

The heart of StoryOS business logic. The Domain Layer contains all rules, behaviors, and processes that define how story knowledge is created, validated, related, and evolved.

Each domain module owns its entities and enforces its rules. Domains communicate through events and defined interfaces — never through shared state. The Domain Layer has no knowledge of how data is stored or how it is presented.

### 3.4 Knowledge Layer

A specialized layer sitting beneath the Domain Layer that manages the structured representation of all story knowledge. This layer owns:

- The Knowledge Graph — the network of all entities and relationships
- The Canon Manager — the system of record for confirmed story truth
- The Provenance Tracker — the record of where every fact originated
- The Consistency Validator — the engine that detects logical contradictions

The Knowledge Layer is the most critical layer in the system. All AI reasoning depends on the integrity of this layer. All domain modules write their entity and relationship data through this layer.

### 3.5 AI Layer

The layer responsible for all AI agent operations. It does not own story data — it reads from the Knowledge Layer and writes only to designated output spaces. The AI Layer manages:

- AI agent lifecycles — starting, scoping, monitoring, and terminating agents
- Persistent memory — maintaining per-universe knowledge state across sessions
- Inference — coordinating AI reasoning tasks over structured story knowledge
- AI audit — logging all agent reads, writes, and reasoning steps

The AI Layer enforces strict isolation: an agent's memory context for Universe A is completely inaccessible to any operation on Universe B.

### 3.6 Workflow Layer

The operational coordination layer that manages structured production processes. The Workflow Layer is responsible for:

- Executing workflow state machines — moving content through defined stage sequences
- Enforcing stage-level role permissions
- Dispatching workflow notifications and escalations
- Scheduling time-bounded workflow operations
- Maintaining the immutable audit log for all system events

The Workflow Layer observes domain events and responds to them without coupling to domain internals.

### 3.7 Storage Layer

The persistence layer that manages all durable data in the system. It provides specialized storage services for different data characteristics:

- **Entity Store** — Structured storage for all entity attribute data with full versioning
- **Graph Store** — Optimized storage for the Knowledge Graph — nodes, edges, and their properties
- **Document Store** — Storage for long-form narrative content and reference documents
- **Media Store** — Binary asset storage for images, attachments, and media files
- **Version Store** — Append-only storage for all historical versions of every entity and content item
- **Audit Store** — Immutable, tamper-evident storage for the complete audit trail

The Storage Layer exposes abstract interfaces to the layers above. No layer above Storage has knowledge of how data is physically organized.

### 3.8 Integration Layer

The boundary layer that governs all communication between StoryOS and external systems. It manages:

- **Plugin Gateway** — The sandboxed interface through which approved plugins access story data
- **Export Engine** — Transformation and packaging of story data into external formats
- **Import Pipeline** — Ingestion, validation, and conversion of external data into StoryOS entities
- **Notification Dispatcher** — Routing of platform notifications to external channels (email, webhooks)
- **Webhook Manager** — Configuration and delivery of outbound event notifications to registered endpoints

The Integration Layer enforces the same access control rules as the Application Layer. No plugin or external system can bypass authorization through the integration boundary.

---

## 4. Core Modules

### 4.1 Story Universe Module

**Purpose:** The root organizational container for all story knowledge. Manages the lifecycle and configuration of Story Universes.

**Responsibilities:**
- Create, configure, archive, and manage Story Universes
- Manage Universe-level access control and user assignments
- Maintain Universe health status and metadata
- Coordinate Universe-level operations (duplication, linking, export)
- Provide the contextual scope within which all other modules operate

**Inputs:** Organization configuration, user assignments, Universe metadata
**Outputs:** Universe context for all downstream modules, Universe health reports
**Dependencies:** Security Module, Versioning System, Audit System

---

### 4.2 Character Module

**Purpose:** Complete lifecycle management of character entities within a Story Universe.

**Responsibilities:**
- Create and manage character entities and their full attribute sets
- Track character attribute history — every change is recorded with timestamp and author
- Manage character arcs — structured records of how characters evolve across story events
- Maintain character psychology profiles as structured, queryable data
- Manage character voice profiles for AI dialogue consistency
- Detect attribute contradictions and surface them for creator review
- Register characters in the Knowledge Graph with full relationship context

**Inputs:** Creator-authored character data, story content (for AI extraction), relationship definitions
**Outputs:** Structured character entities, contradiction alerts, Knowledge Graph registrations, character arc records
**Dependencies:** Knowledge Graph Module, Versioning System, AI Memory Module, Consistency Validator

---

### 4.3 World Building Module

**Purpose:** Construction and management of the complete story world — geography, society, rules, and physical reality.

**Responsibilities:**
- Create and manage location entities with hierarchical geographic relationships
- Create and manage faction entities with internal structures and inter-faction relationships
- Create and manage item entities with ownership chains and historical records
- Create and manage concept entities — religions, ideologies, technologies, languages
- Define and enforce world rules — structured statements of how the story world operates
- Detect content that contradicts established world rules
- Maintain versioned world lore documents as authoritative reference texts

**Inputs:** Creator-authored world data, story content (for AI extraction), world rule definitions
**Outputs:** Structured world entities, world rule violations alerts, Knowledge Graph registrations
**Dependencies:** Knowledge Graph Module, Versioning System, Consistency Validator, AI Memory Module

---

### 4.4 Timeline Module

**Purpose:** Authoritative management of story chronology — ordering all events, detecting paradoxes, and supporting complex temporal structures.

**Responsibilities:**
- Create and manage story event entities with full temporal and spatial context
- Maintain the master in-universe timeline, ordering all events chronologically
- Support parallel timelines, alternate realities, and branching story paths
- Support nested timelines — events containing sub-events (flashbacks, dreams, prophecies)
- Detect and flag timeline paradoxes — logical impossibilities in event ordering or causality
- Distinguish between Story Time (in-universe chronology) and Narrative Time (presentation order)
- Support custom in-universe calendar systems
- Track causal relationships between events

**Inputs:** Event definitions, character and location references, timeline configuration
**Outputs:** Ordered timeline views, paradox alerts, causal chain maps, temporal cross-references
**Dependencies:** Knowledge Graph Module, Character Module, World Building Module, Consistency Validator

---

### 4.5 Relationship Module

**Purpose:** Definition, management, and reasoning over all connections between story entities.

**Responsibilities:**
- Create and manage typed, directed relationships between any two entities
- Maintain relationship attributes — strength, sentiment, temporal scope, and contextual notes
- Track relationship history — how connections change across story events
- Support custom relationship type definitions at the Story Universe level
- Maintain group membership relationships between characters and factions
- Detect orphaned entities — entities with no relationships in Canon
- Manage secret relationships with visibility controls tied to narrative reveal events

**Inputs:** Entity references, relationship type definitions, event timestamps
**Outputs:** Structured relationship records, Knowledge Graph edges, orphan alerts, relationship history
**Dependencies:** Knowledge Graph Module, Character Module, World Building Module, Timeline Module

---

### 4.6 Knowledge Graph Module

**Purpose:** The central intelligence repository of StoryOS — the structured, queryable network of all story knowledge.

**Responsibilities:**
- Maintain the complete entity-relationship graph for each Story Universe
- Accept entity and relationship registrations from all domain modules
- Process natural language queries over the Knowledge Graph
- Support graph traversal operations — finding connected entities across N degrees of separation
- Distinguish and separately manage explicit knowledge (stated in story) and inferred knowledge (AI-derived)
- Maintain knowledge provenance — tracing every fact to its source content
- Detect and surface internal contradictions within the graph
- Support point-in-time Knowledge Graph snapshots
- Version all graph mutations — additions, modifications, and deletions

**Inputs:** Entity registrations, relationship definitions, AI inferences (marked as proposed), creator confirmations
**Outputs:** Query results, traversal paths, contradiction reports, snapshot archives, provenance traces
**Dependencies:** Canon Manager, Provenance Tracker, Consistency Validator, Storage Layer (Graph Store)

---

### 4.7 AI Memory Module

**Purpose:** Persistent, scoped, and auditable AI knowledge management — the memory substrate that allows AI agents to know a story the way a creator knows it.

**Responsibilities:**
- Maintain a persistent Memory Graph per Story Universe — synchronized with current Canon
- Provide AI agents with full, scoped access to story knowledge on every query
- Enforce Story Universe isolation — complete prevention of cross-universe knowledge leakage
- Update AI memory when Canon is officially modified
- Support memory scoping — restricting agent access to defined subsets of story knowledge
- Detect conflicts between AI memory state and current Canon
- Allow creators to inspect agent memory at any time
- Log all memory reads and writes for audit

**Inputs:** Canon updates, creator-confirmed knowledge changes, agent memory queries
**Outputs:** Memory states per agent per Universe, memory conflict alerts, audit logs, memory inspection reports
**Dependencies:** Knowledge Graph Module, Canon Manager, Audit System, Security Module

---

### 4.8 Search Module

**Purpose:** Fast, intelligent, and contextually relevant retrieval of story knowledge across all entity types and content.

**Responsibilities:**
- Maintain a continuously updated search index across all story entities and content
- Execute full-text search across all narrative content within a Story Universe
- Execute structured attribute search — multi-criteria queries over entity properties
- Process natural language search queries, leveraging AI interpretation
- Execute relationship-based search — finding entities connected by specific relationship types
- Execute timeline search — events within date ranges, involving specific entities
- Support saved search configurations and notification subscriptions
- Enforce Story Universe access scope on all search results

**Inputs:** Search queries (text, structured, natural language), scope context (user's authorized universes)
**Outputs:** Ranked, source-attributed results sets; change notifications for saved searches
**Dependencies:** Knowledge Graph Module, AI Memory Module, Security Module, All domain modules (as index sources)

---

### 4.9 Workflow Module

**Purpose:** Structured production pipeline management — ensuring story content moves through defined creation, review, and approval stages with full auditability.

**Responsibilities:**
- Manage workflow template definitions — configurable stage sequences with role assignments
- Execute workflow state machines for assigned content items
- Enforce role-based stage transition permissions
- Dispatch stage-entry notifications to assigned users and AI agents
- Record all workflow actions in an immutable log
- Support parallel review stages with configurable completion rules
- Manage workflow deadlines and escalation notifications
- Provide workflow progress reporting and bottleneck identification

**Inputs:** Workflow template definitions, content assignments, stage transition events, reviewer decisions
**Outputs:** Content status updates, transition notifications, workflow audit records, completion reports
**Dependencies:** Notification Module, Audit System, Security Module, all domain modules (as content sources)

---

### 4.10 Versioning System

**Purpose:** Complete, immutable historical record of every entity and content change across the entire platform.

**Responsibilities:**
- Capture a complete version record for every state-changing operation on any entity or content item
- Associate every version with its author, timestamp, and operation type
- Provide version retrieval — restoring any entity to any historical state
- Provide version comparison — side-by-side diff between any two historical versions
- Support named snapshots — user-labeled point-in-time captures of a full Story Universe state
- Support experimental branching — creating isolated parallel states of a Story Universe
- Enforce immutability — historical versions cannot be deleted through any operational path

**Inputs:** All domain module write operations (intercepted at the Application Layer)
**Outputs:** Version records, restoration results, diff reports, snapshot archives, branch states
**Dependencies:** Storage Layer (Version Store), Audit System, Security Module

---

### 4.11 Collaboration Module

**Purpose:** Real-time and asynchronous coordination capabilities for teams working within shared Story Universes.

**Responsibilities:**
- Manage concurrent user access to the same Story Universe with conflict prevention
- Provide structured comment and threaded discussion threads on any entity or content item
- Process @mention notifications — alerting users and AI agents referenced in discussions
- Maintain a real-time activity feed of all changes across a Story Universe
- Manage task assignments — associating creation or review responsibilities with specific users
- Support guest access — time-bounded, limited-scope access for external collaborators
- Display real-time presence indicators for active users

**Inputs:** User actions, discussion submissions, task assignments, access configuration
**Outputs:** Activity feeds, notification events, task records, presence updates, discussion threads
**Dependencies:** Notification Module, Audit System, Security Module, Workflow Module

---

### 4.12 Media Module

**Purpose:** Organized management of all visual and documentary assets associated with story entities.

**Responsibilities:**
- Accept and store image, document, and attachment uploads associated with story entities
- Maintain a structured media library per Story Universe, organized by entity type
- Manage media metadata — title, creator, license, date, and AI-origin labeling
- Enforce media access control consistent with Story Universe permissions
- Maintain media version history
- Manage per-organization storage quotas
- Ensure creator media assets are never used for AI training without explicit consent

**Inputs:** Media uploads, entity association requests, metadata definitions
**Outputs:** Media records, storage usage reports, media retrieval responses, quota alerts
**Dependencies:** Storage Layer (Media Store), Security Module, Audit System, Entity modules

---

### 4.13 Import Pipeline

**Purpose:** Controlled, validated ingestion of external story data into the StoryOS entity model.

**Responsibilities:**
- Accept structured data imports in defined formats
- Accept unstructured document uploads for AI-assisted entity extraction
- Generate import previews — showing entity candidates before commit
- Support partial imports — selective acceptance of individual items from a batch
- Detect conflicts between import data and existing Canon
- Validate all import data against the Story Universe's entity schema
- Support import rollback within a defined window
- Log all import operations

**Inputs:** External data files, creator import decisions, conflict resolutions
**Outputs:** Import preview reports, committed entity records, conflict alerts, rollback confirmations
**Dependencies:** Knowledge Graph Module, Entity modules, Consistency Validator, Audit System, AI Layer (for extraction)

---

### 4.14 Export Engine

**Purpose:** Complete, accurate, and format-flexible extraction of story knowledge for external use.

**Responsibilities:**
- Package complete Story Universe exports in open, documented formats
- Support selective export — specific entities, entity types, or Knowledge Graph subsets
- Transform story knowledge into multiple output formats
- Include full provenance metadata in all exports
- Enforce Organization Admin export authorization requirements
- Log all export operations

**Inputs:** Export scope definitions, format selections, authorization approvals
**Outputs:** Export archives with embedded metadata, export audit records
**Dependencies:** Knowledge Graph Module, Storage Layer, Security Module, Audit System

---

### 4.15 Plugin System

**Purpose:** Governed extensibility — allowing approved third-party capabilities to augment StoryOS without compromising security or data integrity.

**Responsibilities:**
- Manage plugin registry — cataloging available and installed plugins
- Enforce plugin sandboxing — isolating plugin execution from core platform resources
- Validate plugin data access declarations at installation time
- Enforce Organization Admin whitelist/blacklist policies
- Log all plugin data access operations
- Manage plugin versioning and organization-level version pinning
- Support plugin lifecycle operations — install, enable, disable, remove

**Inputs:** Plugin packages, Organization configuration, access scope declarations
**Outputs:** Sandboxed plugin execution environments, access-controlled data responses, plugin audit logs
**Dependencies:** Security Module, Audit System, Knowledge Graph Module (read-only access to plugins)

---

### 4.16 Notification Module

**Purpose:** Reliable, configurable delivery of platform events to users and external systems.

**Responsibilities:**
- Maintain notification subscriptions per user per event type
- Dispatch in-platform notifications for all subscribed events
- Dispatch email notifications according to user preferences
- Dispatch webhook events to registered external endpoints
- Maintain per-user notification history
- Respect user-configured quiet hours and preference filters

**Inputs:** System events from all modules, user notification preferences, subscription configurations
**Outputs:** In-platform notification records, email deliveries, webhook payloads
**Dependencies:** Workflow Module, Collaboration Module, AI Layer, all domain modules (as event sources)

---

### 4.17 Administration Module

**Purpose:** Platform governance, organizational management, and operational control.

**Responsibilities:**
- Manage Organizations — creation, configuration, and suspension
- Manage user accounts, role assignments, and access policies
- Configure platform-wide and organization-wide feature flags
- Monitor system health and surface operational alerts
- Manage AI agent deployment configurations
- Execute data governance operations — retention, export for compliance, account deletion

**Inputs:** Administrative commands, system health metrics, compliance requests
**Outputs:** Configuration changes, user account updates, health reports, compliance data packages
**Dependencies:** Security Module, Audit System, all modules (as operational subjects)

---

### 4.18 Security Module

**Purpose:** The foundational trust layer — enforcing all access control decisions and security policies across the entire platform.

**Responsibilities:**
- Authenticate all users and system actors on every request
- Authorize every operation against the role hierarchy and resource-level permissions
- Enforce the principle of least privilege — every actor accesses only what their role explicitly permits
- Manage session lifecycles — issuance, validation, timeout, and forced revocation
- Enforce rate limiting and abuse prevention across all interfaces
- Manage multi-factor authentication requirements
- Enforce plugin and AI agent access sandboxing

**Inputs:** Authentication credentials, operation requests with actor and resource context
**Outputs:** Authorization decisions (permit/deny), session tokens, security audit events
**Dependencies:** Audit System (for security event logging), Administration Module (for policy configuration)

---

### 4.19 Audit System

**Purpose:** The immutable record of everything that has ever happened on the platform — the foundation of trust, compliance, and forensic capability.

**Responsibilities:**
- Record every create, update, delete, and sensitive read operation by any actor
- Capture actor identity, timestamp, affected entity, operation type, and state change (before/after) for every event
- Record all AI agent reasoning steps as separate, linked audit entries
- Record all access control changes — role assignments, permission modifications
- Maintain audit records with tamper-evident integrity
- Provide query access to audit records for authorized administrators
- Support audit record export for compliance reporting
- Generate alerts for anomalous audit patterns

**Inputs:** All operation completion events from all system layers
**Outputs:** Immutable audit records, query responses, compliance exports, anomaly alerts
**Dependencies:** Storage Layer (Audit Store) only — the Audit System must depend on as few other components as possible to ensure its own reliability

---

## 5. System Data Flow

This section describes how information moves through StoryOS during key operational scenarios.

### 5.1 Standard Entity Creation Flow

```
Creator (Presentation Layer)
    ↓ submits entity creation request
Application Layer
    ↓ validates session, enforces role authorization
    ↓ dispatches to Domain Layer
Domain Module (e.g., Character Module)
    ↓ applies domain validation rules
    ↓ constructs entity record
    ↓ registers entity with Knowledge Layer
Knowledge Layer
    ↓ Canon Manager: assigns Canon status (Pending until confirmed)
    ↓ Provenance Tracker: records source and author
    ↓ Graph Store: commits entity as new node
    ↓ Consistency Validator: checks new entity against existing Canon
    ↓ returns graph registration confirmation
Domain Module
    ↓ emits EntityCreated event to event bus
Workflow Layer (Audit System)
    ↓ writes immutable audit record
Versioning System
    ↓ captures initial version record
Notification Module
    ↓ dispatches subscribed user notifications
Application Layer
    ↓ returns success response to Presentation Layer
```

### 5.2 AI Consistency Check Flow

```
Event Trigger (new content submitted / scheduled check)
    ↓
AI Layer — Agent Orchestrator
    ↓ selects appropriate AI agent for consistency domain
    ↓ scopes agent access to the relevant Story Universe
AI Agent
    ↓ reads Canon state from Knowledge Layer (Memory Graph)
    ↓ reads submitted content entities from Domain Layer
    ↓ performs consistency reasoning against Canon
    ↓ identifies potential contradictions
    ↓ constructs structured violation report with evidence
AI Layer — AI Audit Logger
    ↓ logs all reasoning steps, reads, and conclusions
AI Layer → Application Layer
    ↓ submits violation report as proposed knowledge
Knowledge Layer
    ↓ stores violations as flagged, non-Canon inferences
Notification Module
    ↓ notifies creator of detected violations
Creator (Presentation Layer)
    ↓ reviews each violation
    ↓ accepts: Canon is updated; or
    ↓ rejects: violation is dismissed and logged
Canon Manager
    ↓ updates Canon state based on creator decision
AI Memory Module
    ↓ synchronizes agent memory with updated Canon
```

### 5.3 Knowledge Graph Query Flow

```
Query Source (Creator or AI Agent)
    ↓ submits natural language or structured query
Application Layer
    ↓ validates authorization — confirms query scope matches actor's permitted universes
Search Module / Knowledge Graph Module
    ↓ parses query intent (structured parse or AI interpretation)
    ↓ translates to graph traversal operation
Graph Store
    ↓ executes traversal
    ↓ returns raw node and edge results
Knowledge Graph Module
    ↓ filters results by Canon status (Canon-only by default)
    ↓ attaches provenance metadata to each result
    ↓ ranks results by relevance
Application Layer
    ↓ returns scoped, ranked results to query source
Audit System
    ↓ records query event (for sensitive operations)
```

### 5.4 Workflow Progression Flow

```
Content created / updated by Writer
    ↓
Workflow Module
    ↓ checks active workflow assignment for this content
    ↓ advances content to first workflow stage (e.g., Draft)
    ↓ records stage entry in audit log
Notification Module
    ↓ notifies assigned Editor of content at Review stage
Editor (Presentation Layer)
    ↓ reviews content
    ↓ approves or returns with comments
Workflow Module
    ↓ records decision in immutable workflow log
    ↓ advances to next stage or returns to Writer
    ↓ emits WorkflowStageTransition event
AI Agent (if assigned as reviewer at this stage)
    ↓ receives stage notification
    ↓ performs consistency analysis
    ↓ submits AI review as structured comments
Workflow Module
    ↓ final approval: marks content as Published
    ↓ triggers Knowledge Graph update (marks content entities as Canon-confirmed)
```

---

## 6. AI Processing Flow

StoryOS supports multiple specialized AI agents that operate in parallel, each with a defined domain of expertise. The following describes the complete AI processing architecture.

### 6.1 Agent Types

| Agent Type | Domain | Primary Function |
|---|---|---|
| **Continuity Agent** | Cross-domain | Detects contradictions across all entity types and story content |
| **Character Agent** | Character | Maintains character consistency — attributes, voice, psychology, arc |
| **World Agent** | World Building | Enforces world rules — physics, magic, culture, geography |
| **Timeline Agent** | Timeline | Validates chronological consistency, detects paradoxes |
| **Relationship Agent** | Relationships | Monitors relationship logic and evolution consistency |
| **Extraction Agent** | Import | Extracts entities and relationships from unstructured content |
| **Search Agent** | Search | Interprets and optimizes natural language search queries |
| **Review Agent** | Workflow | Performs AI-driven content review at designated workflow stages |

### 6.2 Agent Lifecycle

Every AI agent operates through a defined lifecycle:

```
INITIALIZATION
    ↓ Agent is assigned to a Story Universe
    ↓ AI Memory Module loads complete Canon into agent memory scope
    ↓ Agent scope is locked — only the assigned Universe's data is accessible

ACTIVE
    ↓ Agent receives task triggers (events, queries, workflow stage notifications)
    ↓ Agent reads from Memory Graph (never from raw Storage directly)
    ↓ Agent performs reasoning
    ↓ Agent writes outputs to designated output space (never to Canon directly)
    ↓ All reads and writes are logged by AI Audit Logger

PROPOSAL
    ↓ Agent submits inferences as proposed knowledge changes
    ↓ Proposals are flagged as AI-inferred, not Canon
    ↓ Creator reviews and confirms or rejects each proposal

SYNCHRONIZATION
    ↓ Canon changes trigger Memory Graph synchronization
    ↓ Agent memory is updated to reflect confirmed Canon
    ↓ Memory conflict detection runs on synchronization

TERMINATION
    ↓ Agent session ends (natural completion or timeout)
    ↓ Reasoning log is finalized and sealed
    ↓ Memory state is persisted for next session
```

### 6.3 AI Memory Architecture

```
Story Universe Canon
        ↓ synchronized to
Memory Graph (per Universe, per Agent Type)
        ↓ accessed by
AI Agent (scoped, read-optimized view)
        ↓ outputs to
Proposal Queue (AI-inferred, non-Canon)
        ↓ reviewed by
Creator
        ↓ confirmed changes flow back to
Canon → Memory Graph (cycle closes)
```

### 6.4 AI Safety Boundaries

The following boundaries are enforced structurally — they are not configurable policy settings:

- An AI agent cannot write to Canon. This path does not exist in the architecture.
- An AI agent cannot access a Story Universe it is not assigned to. Memory scope is enforced at the AI Layer boundary.
- AI agent outputs are always marked with their AI origin. The system never presents AI-derived knowledge as Canon-equivalent without creator confirmation.
- AI reasoning logs are written to the Audit System simultaneously with the reasoning — they cannot be selectively suppressed.

---

## 7. Plugin Architecture

### 7.1 Extension Philosophy

StoryOS is designed to be extended without modification. The core platform defines a stable set of extension points. Plugins interact with the platform exclusively through these points. Core platform code is never modified to accommodate a plugin.

### 7.2 Plugin Boundary

```
External Plugin
    ↓ authenticated plugin identity
Plugin Gateway (Integration Layer)
    ↓ scope validation (declared access vs. requested access)
    ↓ rate limiting
    ↓ sandboxed execution context
    ↓ authorized data access only (read-only by default)
Knowledge Graph Module / Domain Modules
    ↓ results returned through gateway
Plugin Gateway
    ↓ response filtering (strips data outside declared scope)
    ↓ audit log entry written
External Plugin
    ↑ receives scoped, filtered data
```

### 7.3 Plugin Scope Model

Every plugin declares its required access scopes at installation time. Organization Admins review and approve these declarations. The approved scope is the maximum access the plugin will ever receive — the gateway enforces this structurally.

Plugin scope dimensions:
- **Entity types** — which entity types the plugin may read
- **Story Universes** — which universes the plugin is authorized for
- **Operations** — read only, or specific write operations (rare, requires explicit justification)
- **AI agent access** — whether the plugin may trigger AI agent operations

### 7.4 AI Agent Plugins

Third-party AI agents are a special plugin category. They operate under all standard plugin constraints plus additional AI-specific restrictions:

- They operate within the same AI Layer memory boundaries as native agents
- Their reasoning is logged identically to native agents
- They cannot be assigned Canon-write operations regardless of scope declaration
- Their integration must implement the standard Agent Lifecycle interface

---

## 8. Security Architecture

### 8.1 Security Perimeter

StoryOS enforces security at three distinct perimeters:

**Identity Perimeter** — Every actor (human user, AI agent, plugin) is authenticated on every request. There are no anonymous operations that touch story data. Sessions are cryptographically bound and continuously validated.

**Authorization Perimeter** — Every operation is checked against the role hierarchy before execution. Authorization is evaluated at the Application Layer — it cannot be bypassed by calling domain modules directly. The check is synchronous and blocking.

**Data Perimeter** — Every data retrieval is scoped to the actor's authorized Story Universes. Cross-universe data access is structurally prevented — not configurable. Audit records are append-only and cannot be reached through any standard data access path.

### 8.2 Role Hierarchy Enforcement

```
Request arrives at Application Layer
    ↓
Security Module: verify actor identity (session valid?)
    ↓ fail → reject with 401
Security Module: resolve actor's role for this Story Universe
    ↓
Security Module: evaluate operation against role permission matrix
    ↓ deny → reject with 403, log security event
    ↓ permit → proceed to Domain Layer
Domain Module: execute operation
    ↓
Audit System: record completed operation
```

### 8.3 Data Encryption

All story data is encrypted in transit and at rest. Encryption is not optional or configurable at the organization level — it is a platform invariant.

### 8.4 Plugin and Agent Sandboxing

Plugins and AI agents execute within isolated contexts. They cannot access the file system, network, or any system resource outside their defined access boundary. Resource limits (computation time, data volume per request) are enforced at the Plugin Gateway and AI Layer.

### 8.5 Audit Integrity

The Audit System writes to a dedicated Audit Store that is append-only and cryptographically chained — each record contains a hash reference to the previous record. Any tampering with the audit chain is detectable. The Audit Store is not accessible through any standard data retrieval path — it has its own access layer with Super Admin authorization only.

---

## 9. Scalability Strategy

StoryOS is designed to scale from a single writer's personal story universe to a global enterprise managing thousands of story universes and hundreds of thousands of entities.

### 9.1 Isolation-First Design

Every Story Universe is a fully isolated data partition. A query, write, or AI operation on Universe A has no interaction with data belonging to Universe B. This isolation is the foundation of scalability — individual universes can be moved, replicated, or distributed without affecting the platform's overall consistency.

### 9.2 Independent Component Scaling

Each architectural layer and major module is designed to scale independently:

| Component | Scaling Dimension |
|---|---|
| Knowledge Graph Module | Scale for query volume and graph depth — the largest scaling demand on the platform |
| AI Memory Module | Scale for concurrent agent sessions and memory graph size |
| Search Module | Scale for index size and query throughput |
| Storage Layer | Scale each store independently — entity, graph, document, media, version, audit have fundamentally different growth rates and access patterns |
| Workflow Module | Scale for throughput of workflow state transitions and notifications |
| Audit System | Scale for write throughput — audit volume grows proportionally to all other system activity |

### 9.3 Scalability Tiers

| Tier | Profile | Expected Scale |
|---|---|---|
| **Personal** | Solo creator, single Story Universe | Up to 10,000 entities, 1 user |
| **Team** | Small production team | Up to 100,000 entities, up to 50 users |
| **Studio** | Production studio, multiple IPs | Up to 1,000,000 entities, up to 1,000 users |
| **Enterprise** | Global IP company, multiple studios | Unlimited entities, 10,000+ users, multi-region |

### 9.4 Read vs. Write Optimization

Story knowledge is read far more frequently than it is written. A character is defined once and queried thousands of times across AI agent sessions, searches, and collaborator views. The architecture optimizes aggressively for read performance at every layer, accepting higher write latency where necessary to ensure read efficiency and consistency.

### 9.5 Eventual Consistency Boundaries

Most StoryOS operations require strong consistency — Canon is always the authoritative current state, and all agents must see the same Canon. However, certain non-critical operations (notification delivery, search index updates, activity feed population) operate with bounded eventual consistency to avoid making low-priority operations block on high-consistency guarantees.

---

## 10. Design Decisions

### DD-001 — Knowledge Graph as Central Architecture

**Decision:** Place the Knowledge Graph at the center of the architecture rather than documents or scenes.

**Rationale:** Story knowledge is fundamentally relational. Characters relate to events, events relate to locations, factions relate to characters. A document-centric architecture makes these relationships secondary, forcing workarounds for every AI reasoning task. A graph-centric architecture makes relationships first-class citizens, enabling traversal, consistency checking, and AI reasoning natively.

**Consequence:** Significantly more complex initial data model, but far more powerful querying, AI reasoning, and consistency enforcement.

---

### DD-002 — AI Agents as System Peers, Not External Services

**Decision:** AI agents are implemented as first-class system actors with role-based access control, rather than as external services called through an API.

**Rationale:** External AI services have no persistent state, no access control integration, and no audit trail within the platform. Treating AI agents as system peers allows them to participate in the role hierarchy, have their actions audited, have scoped memory, and be held accountable to Canon exactly like human users.

**Consequence:** Higher architectural complexity. Requires a dedicated AI Layer. Enables persistent AI memory, cross-session continuity, and auditable AI reasoning.

---

### DD-003 — Immutable Audit Trail with Cryptographic Chaining

**Decision:** The audit log is append-only with cryptographic record chaining, stored in a dedicated isolated store.

**Rationale:** Mutable audit logs are not audit logs — they are suggestions. Enterprise and compliance requirements demand that audit records cannot be altered by any operational path, including administrative access. Cryptographic chaining makes tampering detectable.

**Consequence:** Audit storage grows indefinitely and cannot be compacted. This is accepted as a design constraint — audit completeness is non-negotiable.

---

### DD-004 — Canon Confirmation Always Requires Human Action

**Decision:** No automated process, including AI agents, may modify Canon without an explicit human confirmation event.

**Rationale:** Canon is the creator's intellectual truth about their story. AI inference is probabilistic and can be wrong. Allowing AI to silently modify Canon would corrupt the story's authoritative record in ways that might not be noticed until significant damage is done. The extra step of creator confirmation is not friction — it is the guarantee of creator sovereignty.

**Consequence:** AI agent value is delivered through proposals and flagging, not through autonomous action. This may feel limiting to some users, but it is the correct trust model for an enterprise platform.

---

### DD-005 — Event-Driven Module Communication

**Decision:** All inter-module communication for asynchronous operations uses domain events through an event bus, not direct module-to-module calls.

**Rationale:** Direct coupling between modules creates fragile dependencies that make independent scaling, testing, and evolution impossible. Event-driven communication allows any module to evolve its internals without affecting modules that consume its events.

**Consequence:** Eventual consistency in some cross-module state views. More complex debugging. Significantly better independent module evolution and scalability.

---

### DD-006 — Story Universe as Hard Data Isolation Boundary

**Decision:** Story Universe isolation is structural, not configurable policy. Cross-universe data access is architecturally prevented.

**Rationale:** If isolation is implemented as a policy layer, it can be misconfigured or bypassed. At enterprise scale, one organization's story data leaking into another's is a catastrophic trust and IP violation. Structural isolation eliminates this risk class entirely.

**Consequence:** Cross-universe story sharing requires explicit, audited export-and-import operations. This is a deliberate friction that protects creator IP.

---

## 11. Future Architecture Evolution

### Year 1–2: Foundation Solidification

The architecture as described in this document is implemented and validated at production scale. Focus areas: Knowledge Graph performance at large entity counts, AI agent stability across long-running sessions, workflow engine reliability for studio-scale teams.

### Year 2–3: Real-Time Collaboration Layer

Addition of real-time collaborative editing capability — simultaneous multi-user editing with live conflict resolution. This requires a new operational transform or CRDT layer integrated with the Versioning System and Collaboration Module. The event-driven architecture provides the foundation.

### Year 3–4: Universal Story Graph

Aggregation of anonymized, consent-governed narrative patterns across all Story Universes on the platform. The Universal Story Graph becomes a training and research resource for narrative intelligence models. Requires a new Analytics Layer between the Knowledge Layer and Storage Layer.

### Year 4–5: Multi-Modal Intelligence

Extension of AI agents to operate over visual story assets — character art, location maps, storyboards — in addition to structured text knowledge. Requires the Media Module to expose structured visual knowledge to the AI Layer, and new agent types with multi-modal reasoning capability.

### Year 5–7: Platform Intelligence API

Exposure of the Knowledge Graph and AI reasoning capabilities as a governed, versioned intelligence interface for approved external consumers — game engines, publishing platforms, localization services. The Integration Layer expands to a full platform ecosystem interface with its own developer ecosystem.

### Year 7–10: Distributed Story Universe Protocol

Development and publication of an open standard for story knowledge representation and inter-platform story universe exchange. StoryOS becomes the reference implementation of this standard, enabling any compliant tool to interoperate with story knowledge created on the platform.

---

> *"Architecture is the set of decisions that are hardest to change. Every decision in this document was made knowing that it will constrain every line of code written above it. That is precisely why these decisions were made carefully."*

---

**Document End**
**Previous:** `docs/requirements/prs.md` — v1.0 Approved
**Next:** `docs/database/database_design.md` — Database Design Document
