# Domain Model Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Depends On:** `docs/architecture/architecture.md` — v1.0 Approved
> **Methodology:** Domain-Driven Design (DDD)
> **Next:** `docs/database/database_design.md`

---

## 1. Domain Overview

### 1.1 What Is a Domain Model?

A Domain Model is the structured representation of all business knowledge within a system. It defines every significant concept, the rules that govern those concepts, and the relationships between them — in the language of the business, not the language of technology.

In Domain-Driven Design (DDD), the Domain Model is the most important artifact before any database, API, or code is designed. It answers: *What does this system know about, and how does that knowledge relate?*

### 1.2 Guiding Rule

> **The domain model dictates the database. The database never dictates the domain model.**

This rule governs every design decision from this document forward. Tables, columns, indices, and schemas are implementation details. Domains, aggregates, and entities are architectural truth.

### 1.3 Domain Hierarchy

StoryOS domains are organized into six categories:

| Category | Role | Examples |
|---|---|---|
| **Core Domains** | The primary business value — why StoryOS exists | Story Universe, Character, World, Timeline |
| **Supporting Domains** | Enable core domains to operate at scale | Workflow, Versioning, Search, Media |
| **Generic Domains** | Commodity capabilities shared across all domains | Notifications, Audit, Metadata |
| **AI Domains** | Intelligent reasoning over story knowledge | AI Memory, Agent, Inference, Consistency |
| **Security Domains** | Trust, identity, and access governance | Identity, Authorization, Organization |
| **Collaboration Domains** | Coordinating human team production | Collaboration, Review, Task |

### 1.4 Domain Count Summary

| Category | Domain Count |
|---|---|
| Core Domains | 9 |
| Supporting Domains | 7 |
| Generic Domains | 4 |
| AI Domains | 5 |
| Security Domains | 5 |
| Collaboration Domains | 4 |
| **Total** | **34 Primary Domains** |

Each primary domain contains multiple sub-domains and value objects, bringing the total modeled concepts to approximately 200+.

---

## 2. Core Domains

Core domains represent the irreducible heart of StoryOS — the business capabilities that no competing tool adequately provides, and that define the platform's unique value.

---

### 2.1 Story Universe Domain

**Purpose:**
The root organizational container and identity boundary for all story knowledge. Every entity, relationship, and event in StoryOS belongs to exactly one Story Universe.

**Responsibilities:**
- Define the existence, identity, and scope of a story world
- Maintain the Universe's canonical state, health status, and configuration
- Govern which entities and knowledge belong within this Universe's boundary
- Serve as the isolation boundary for AI memory, access control, and data partitioning

**Owned Objects:**
- `StoryUniverse` — the root aggregate; defines the world's identity, status, genre, medium classification, and configuration
- `UniverseProfile` — descriptive metadata about the world (tagline, synopsis, tone, audience)
- `UniverseSettings` — per-universe configuration (entity schemas, custom relationship types, Canon rules)
- `UniverseHealth` — computed status reflecting consistency, completeness, and activity levels
- `UniverseLink` — a declared relationship between two Story Universes within the same Organization (shared-universe management)
- `UniverseSnapshot` — a named, point-in-time capture of the full Universe state

**Depends On:** Organization Domain, Security Domain

**Used By:** All Core Domains (every entity belongs to a Universe), AI Memory Domain, Workflow Domain

---

### 2.2 Character Domain

**Purpose:**
The complete modeling of intelligent beings within a Story Universe — their identity, inner life, physical presence, history, capabilities, and evolution across the story.

**Responsibilities:**
- Define and maintain all dimensions of a character as a structured knowledge object
- Track how every character attribute changes over story time
- Maintain character arcs — the structured record of transformation
- Provide the psychological and voice model that AI agents use for consistency
- Register character knowledge in the Knowledge Graph

**Owned Objects:**

*Identity Sub-Domain:*
- `Character` — the aggregate root; the character's existence and core identity
- `CharacterIdentity` — names, aliases, titles, codes, epithets across the story timeline
- `CharacterRole` — narrative function (protagonist, antagonist, mentor, foil, etc.)
- `CharacterStatus` — alive / dead / missing / unknown / fictional-within-fiction, with timestamps

*Appearance Sub-Domain:*
- `PhysicalDescription` — body, features, distinctive marks, style
- `AppearanceHistory` — how physical description changes over story time (aging, injury, transformation)
- `CharacterArt` — associated visual media references

*Psychology Sub-Domain:*
- `PsychologyProfile` — beliefs, worldview, cognitive style, emotional baseline
- `Motivation` — what the character wants and why; layered (surface desire vs. deep need)
- `Fear` — what the character avoids and why
- `Flaw` — internal limitations that create story conflict
- `Virtue` — core positive qualities
- `MoralCode` — the ethical system the character operates within
- `CharacterArc` — the structured record of psychological transformation across events

*Voice Sub-Domain:*
- `VoiceProfile` — vocabulary, sentence structure, tone, speech patterns, verbal tics
- `DialogueHistory` — AI-indexed record of confirmed dialogue for voice consistency

*History Sub-Domain:*
- `BackStory` — pre-story history and formative events
- `CharacterTimeline` — the character's personal event history within the Story Universe
- `Secret` — hidden history elements with visibility rules

*Capability Sub-Domain:*
- `Skill` — learned abilities with proficiency levels
- `Talent` — innate abilities
- `Knowledge` — what the character knows and doesn't know (diegetic knowledge, not just narrative)
- `Limitation` — capability restrictions (injury, curse, training gap)

*Inventory Sub-Domain:*
- `CharacterInventory` — items owned or carried by the character
- `ItemOwnershipHistory` — provenance chain of item ownership

**Depends On:** Story Universe Domain, Timeline Domain, Knowledge Graph Domain

**Used By:** Relationship Domain, Narrative Domain, AI Memory Domain, Workflow Domain

---

### 2.3 World Building Domain

**Purpose:**
The complete structural model of the story world — the geography, societies, systems, and physical reality that characters inhabit and stories unfold within.

**Responsibilities:**
- Define all physical and conceptual structures of the story world
- Establish and enforce the rules by which the world operates
- Provide the spatial and social context for all events and relationships
- Register world knowledge in the Knowledge Graph

**Owned Objects:**

*Geography Sub-Domain:*
- `Location` — the aggregate root for places; any named geographic or architectural space
- `LocationHierarchy` — parent-child structure (continent → region → city → district → building → room)
- `LocationDescription` — sensory and atmospheric attributes of a place
- `LocationHistory` — how a location changes over story time (construction, destruction, conquest)
- `LocationMap` — spatial representation reference

*Political Sub-Domain:*
- `Polity` — any governing entity (kingdom, republic, empire, city-state, tribe, corporation)
- `Government` — structure of governance within a Polity
- `Law` — legal codes, customs, and enforcement within a jurisdiction
- `PoliticalHistory` — rise and fall of Polities over story time
- `Territory` — the geographic claim of a Polity

*Society Sub-Domain:*
- `Faction` — any organized group with shared identity and purpose (guild, cult, family, army, movement)
- `FactionStructure` — internal hierarchy and role definitions
- `FactionHistory` — founding, events, transformation, dissolution
- `Culture` — the shared practices, values, arts, and customs of a society
- `SocialClass` — stratification systems within a society
- `Tradition` — recurring cultural practices and their meanings

*Species & Biology Sub-Domain:*
- `Species` — any distinct sentient or significant non-sentient biological category
- `Race` — sub-classifications within a Species (may be cultural or biological)
- `BiologyRules` — species-specific physical capabilities, limitations, and biology

*Belief Sub-Domain:*
- `Religion` — organized belief system with cosmology, practice, and institution
- `Deity` — divine or supernatural being within a religion
- `Mythology` — the narrative tradition of a belief system
- `Ritual` — structured religious or cultural practice
- `Philosophy` — secular worldview or ethical system

*Language Sub-Domain:*
- `Language` — a named communication system within the story world
- `LanguageFamily` — relationships between languages
- `Script` — writing system associated with a language
- `Dialect` — regional or social variation of a language

*Economy Sub-Domain:*
- `Currency` — medium of exchange within an economy
- `TradeRoute` — economic connections between Locations and Polities
- `Resource` — material of economic or strategic significance
- `EconomicSystem` — the rules governing production, trade, and wealth

*Systems Sub-Domain (World Rules):*
- `MagicSystem` — the rules governing supernatural ability (source, cost, limits, practitioners)
- `Technology` — technological capability level and specific technologies within the world
- `WorldRule` — any rule of the world's physics, metaphysics, or reality
- `WorldRuleViolation` — flagged content that contradicts an established world rule

**Depends On:** Story Universe Domain, Timeline Domain, Knowledge Graph Domain

**Used By:** Character Domain, Timeline Domain, Narrative Domain, Relationship Domain, AI Memory Domain

---

### 2.4 Timeline Domain

**Purpose:**
The authoritative management of all temporal structure within a Story Universe — ordering events, detecting paradoxes, and modeling complex time configurations including parallel and nested timelines.

**Responsibilities:**
- Maintain the master chronological record of all events in the Story Universe
- Detect and report temporal paradoxes and causal violations
- Model complex time structures: parallel, branching, nested, and circular
- Provide the temporal context for all entities and their state changes

**Owned Objects:**

*Calendar Sub-Domain:*
- `Calendar` — the in-universe system for measuring and naming time
- `Era` — a named historical period within the calendar
- `TimeUnit` — the calendar's base units (cycles, seasons, years, moons)
- `DateFormat` — rules for expressing dates in this calendar

*Event Sub-Domain:*
- `Event` — the aggregate root for story occurrences; any notable happening within the Universe
- `EventDescription` — what happened, how, and significance
- `EventParticipant` — characters involved, with roles in the event
- `EventLocation` — where the event took place
- `EventOutcome` — the confirmed result and consequences of the event
- `EventStatus` — Canon / Rumored / Disputed / Erased
- `CausalLink` — the directional dependency between two events (Event A caused Event B)

*Timeline Structure Sub-Domain:*
- `Timeline` — a named, ordered sequence of events (the master timeline plus named subsidiary timelines)
- `TimelineType` — linear / parallel / branching / nested / circular
- `TimelineBranch` — a divergent timeline path (alternate reality, time travel consequence)
- `TimelineParadox` — a detected logical impossibility in the temporal record

*Narrative Time Sub-Domain:*
- `NarrativeOrder` — the sequence in which events are presented to the audience (vs. Story Time order)
- `Flashback` — a nested timeline structure where earlier events are revealed within later narrative
- `Foreshadowing` — a flagged forward reference to a future event

**Depends On:** Story Universe Domain, Knowledge Graph Domain

**Used By:** Character Domain (CharacterTimeline), Narrative Domain, Consistency Domain

---

### 2.5 Relationship Domain

**Purpose:**
The complete modeling of all connections between entities within a Story Universe — who knows whom, what controls what, what caused what — giving the Knowledge Graph its edges.

**Responsibilities:**
- Define, type, and attribute all inter-entity connections
- Track how relationships evolve across story time
- Maintain the logical consistency of relationship states
- Provide the relational context essential for AI reasoning

**Owned Objects:**

*Interpersonal Sub-Domain:*
- `Relationship` — the aggregate root; a typed, directed connection between two entities
- `RelationshipType` — the classification of the connection (ally, rival, mentor, family, employer, etc.)
- `RelationshipAttributes` — strength, sentiment, trust level, formality, and context
- `RelationshipHistory` — how this relationship changed across events
- `RelationshipStatus` — current state (active / broken / secret / one-sided / deceased)

*Group Membership Sub-Domain:*
- `Membership` — a character's belonging to a Faction, Polity, or Organization
- `MembershipRole` — the character's rank or function within the group
- `MembershipHistory` — join date, role changes, and departure from the group

*Conflict Sub-Domain:*
- `Conflict` — a structured enmity, rivalry, or opposition between entities
- `ConflictOrigin` — the event or condition that initiated the conflict
- `ConflictEscalation` — how the conflict intensified over time
- `ConflictResolution` — the event or condition that ended the conflict (if applicable)

*Secret Relationship Sub-Domain:*
- `SecretRelationship` — a relationship hidden from public knowledge within the story world
- `RevealEvent` — the story event at which the secret relationship becomes known

*Custom Relationship Sub-Domain:*
- `CustomRelationshipType` — a relationship type defined at the Story Universe level, beyond the standard taxonomy

**Depends On:** Story Universe Domain, Character Domain, World Building Domain, Timeline Domain, Knowledge Graph Domain

**Used By:** Knowledge Graph Domain (as edge source), Narrative Domain, AI Memory Domain

---

### 2.6 Knowledge Graph Domain

**Purpose:**
The structured, queryable intelligence repository of the Story Universe — the complete network of all entities and their relationships, continuously enriched and validated.

**Responsibilities:**
- Maintain the graph of all entities and their typed relationships
- Process queries over story knowledge in natural language and structured forms
- Distinguish Canon knowledge from inferred and proposed knowledge
- Detect contradictions and surface them for creator resolution
- Track provenance — the origin of every fact

**Owned Objects:**
- `KnowledgeNode` — a graph representation of any entity, carrying its attributes and Canon status
- `KnowledgeEdge` — a graph representation of any relationship, carrying its type, attributes, and Canon status
- `KnowledgeFact` — an atomic statement of truth within the Story Universe (e.g., "Character A killed Character B at Event C")
- `FactProvenance` — the story content and author that established a given fact
- `InferredFact` — a fact derived by AI reasoning; not Canon until creator-confirmed
- `Contradiction` — a detected conflict between two or more facts in the Knowledge Graph
- `KnowledgeQuery` — a stored representation of a search or reasoning query over the graph
- `GraphSnapshot` — a point-in-time capture of the complete Knowledge Graph state
- `CanonStatement` — a creator-confirmed fact, permanently attributed and version-stamped

**Depends On:** Story Universe Domain, all entity-producing Core Domains

**Used By:** AI Memory Domain, Consistency Domain, Search Domain, all Core Domains (as knowledge authority)

---

### 2.7 Narrative Domain

**Purpose:**
The management of the actual written content of a Story Universe — the scenes, chapters, scripts, and documents that constitute the story as experienced by its audience.

**Responsibilities:**
- Organize narrative content into structured hierarchies
- Link narrative content to the entities and events it describes
- Serve as the source material from which AI agents extract story knowledge
- Track the Canon status of narrative content

**Owned Objects:**

*Content Hierarchy Sub-Domain:*
- `NarrativeUnit` — the generic root for any unit of story content
- `Series` — a collection of related Works
- `Work` — a complete narrative product (novel, screenplay, game, comic volume)
- `Volume` — a major subdivision of a Work
- `Chapter` — a named section of a Volume
- `Scene` — the atomic unit of narrative — a single continuous action in one time and place
- `Beat` — the smallest unit of narrative action within a Scene

*Script Sub-Domain:*
- `Screenplay` — a Work formatted for visual production
- `Act` — a major structural division of a Screenplay
- `SequenceBlock` — a group of related scenes in a Screenplay
- `ScriptScene` — a formatted scene with action lines and dialogue

*Dialogue Sub-Domain:*
- `DialogueBlock` — a structured unit of conversation between characters
- `Line` — a single character utterance, attributed to a character and scene
- `Stage Direction` — non-dialogue narrative instruction

*Quest & Structure Sub-Domain (for Game Narrative):*
- `Quest` — a structured narrative mission with objective, conditions, and outcomes
- `QuestBranch` — a conditional narrative path within a Quest
- `QuestOutcome` — the results of completing or failing a Quest

*Content Status Sub-Domain:*
- `DraftStatus` — the current workflow stage of a narrative unit
- `CanonNarrative` — a narrative unit confirmed as Canon within the Universe

**Depends On:** Story Universe Domain, Character Domain, World Building Domain, Timeline Domain, Workflow Domain

**Used By:** AI Memory Domain (as extraction source), Knowledge Graph Domain (as provenance source)

---

### 2.8 Item Domain

**Purpose:**
The complete modeling of significant objects within a Story Universe — artifacts, weapons, documents, technologies, and any physical or conceptual object with story relevance.

**Responsibilities:**
- Define and maintain all attributes of significant items
- Track item ownership and location history
- Model item significance, power, and constraints
- Register items in the Knowledge Graph

**Owned Objects:**
- `Item` — the aggregate root for any significant object in the story world
- `ItemDescription` — physical and sensory attributes of the item
- `ItemCategory` — weapon / artifact / document / tool / vehicle / creature / relic / technology
- `ItemPower` — supernatural, technological, or symbolic capabilities of the item
- `ItemHistory` — origin, creation, and historical events involving the item
- `ItemOwnershipChain` — the complete record of every owner in sequence
- `ItemLocation` — current and historical location of the item
- `ItemCondition` — state of the item (intact, damaged, destroyed, lost, hidden)
- `ItemLore` — cultural meaning, mythology, and reputation of the item

**Depends On:** Story Universe Domain, Character Domain, World Building Domain, Timeline Domain

**Used By:** Knowledge Graph Domain, Narrative Domain, Relationship Domain

---

### 2.9 Canon Management Domain

**Purpose:**
The governance layer for story truth — defining, protecting, and evolving what is officially true within a Story Universe.

**Responsibilities:**
- Maintain the definitive Canon state for all story facts
- Process Canon change requests from creators and AI agents
- Enforce the rule that Canon modification always requires explicit creator confirmation
- Provide Canon history — the complete record of every fact that was ever Canon

**Owned Objects:**
- `CanonRecord` — the master record of all confirmed story facts with attribution and timestamp
- `CanonChangeRequest` — a proposed modification to Canon, awaiting creator review
- `CanonChangeDecision` — the creator's response to a change request (accept / reject / defer)
- `CanonConflict` — a detected contradiction between two or more Canon facts
- `CanonHistory` — the complete versioned history of the Canon state
- `NonCanon` — facts explicitly marked as not part of official story truth (drafts, discarded ideas, fan content)
- `Speculative` — facts that may become Canon pending a story decision (unresolved plot threads)

**Depends On:** Story Universe Domain, Knowledge Graph Domain, Versioning Domain

**Used By:** AI Memory Domain (as the source of AI knowledge), Consistency Domain, all Core Domains

---

## 3. Supporting Domains

Supporting domains enable core domains to operate at production scale. They are not the reason StoryOS exists, but without them, core domains cannot function in a real production environment.

---

### 3.1 Workflow Domain

**Purpose:**
Structured production pipeline management — governing how story content and entity records move from initial creation through review to final approval.

**Responsibilities:**
- Define and manage workflow templates as configurable state machines
- Execute workflow instances for assigned content
- Enforce role-based stage gate rules
- Maintain the production state of all content in the system

**Owned Objects:**
- `WorkflowTemplate` — a named, reusable workflow definition with configured stages and transitions
- `WorkflowStage` — a single named state within a workflow (Draft, Review, Revision, Approved, Published)
- `StageTransitionRule` — conditions and role requirements for moving between stages
- `WorkflowInstance` — an active workflow execution for a specific piece of content
- `WorkflowAssignment` — the user or AI agent responsible for a given stage
- `StageDecision` — the recorded action taken at a stage (Approve / Return / Escalate)
- `WorkflowDeadline` — a time constraint on a stage with configured escalation behavior
- `WorkflowComment` — structured feedback attached to a stage decision

**Depends On:** Security Domain, Organization Domain, Notification Domain, Audit Domain

**Used By:** Narrative Domain, all Core Domains (for production content)

---

### 3.2 Versioning Domain

**Purpose:**
Complete, immutable historical memory of every change to every entity and content item in the platform.

**Responsibilities:**
- Capture version records for all state-changing operations
- Provide version retrieval and diff comparison
- Support named snapshots and experimental branching

**Owned Objects:**
- `Version` — a complete record of an entity's or content item's state at a specific point in time
- `VersionDiff` — the structured comparison between two versions
- `VersionAuthor` — the actor (human or AI) who caused this version to be created
- `NamedSnapshot` — a user-labelled capture of a full Story Universe state
- `Branch` — an experimental parallel version of a Story Universe
- `BranchMergeRequest` — a proposal to incorporate branch changes back into Canon

**Depends On:** Storage Domain, Audit Domain

**Used By:** All Core Domains (every entity is versioned), Canon Management Domain

---

### 3.3 Search Domain

**Purpose:**
Fast, intelligent, access-controlled retrieval of any story knowledge across all entity types and content.

**Responsibilities:**
- Maintain continuously updated search indices
- Process full-text, structured, and natural-language queries
- Enforce access scope on all results

**Owned Objects:**
- `SearchIndex` — the maintained searchable representation of all story knowledge within a Universe
- `SearchQuery` — a structured or natural-language query submitted by a user or AI agent
- `SearchResult` — a ranked, source-attributed result item
- `SavedSearch` — a stored query configuration with optional change notification subscription
- `SearchSubscription` — a notification trigger on a saved search

**Depends On:** Knowledge Graph Domain, Security Domain, AI Domain (for NL query interpretation)

**Used By:** All user-facing interfaces, AI agents (for knowledge retrieval)

---

### 3.4 Media Domain

**Purpose:**
Organized management of all visual and documentary assets associated with story entities.

**Responsibilities:**
- Accept, store, and associate media assets with story entities
- Maintain media metadata and version history
- Enforce creator IP protection — no training data use without consent

**Owned Objects:**
- `MediaAsset` — any image, document, audio, or binary file attached to a story entity
- `MediaMetadata` — title, creator, license, date, MIME type, AI-origin flag
- `MediaAssociation` — the link between a media asset and a specific story entity
- `MediaLibrary` — the per-Universe collection of all media assets
- `StorageQuota` — the per-Organization storage allocation and current usage
- `ConsentRecord` — explicit creator permission record for any non-standard data use

**Depends On:** Story Universe Domain, Security Domain, Storage Domain

**Used By:** All Core Domains (entities attach media), Narrative Domain

---

### 3.5 Import Domain

**Purpose:**
Controlled ingestion of external story data into the StoryOS entity model with conflict detection and creator review.

**Responsibilities:**
- Process external data into StoryOS entity candidates
- Surface conflicts with existing Canon before committing
- Support partial, reviewed imports

**Owned Objects:**
- `ImportJob` — an active import operation with its configuration and status
- `ImportSource` — the origin of the imported data (format, file reference, extraction method)
- `ImportCandidate` — a single entity or relationship proposed by an import, pending creator decision
- `ImportConflict` — a detected contradiction between an import candidate and existing Canon
- `ImportDecision` — creator's choice for each candidate (accept / reject / modify)
- `ImportRollback` — a reversal of a committed import operation

**Depends On:** Knowledge Graph Domain, Canon Management Domain, AI Domain (for extraction)

**Used By:** Organization Admins, Writers (self-import)

---

### 3.6 Export Domain

**Purpose:**
Complete, accurate, and format-flexible extraction of story knowledge for use outside StoryOS.

**Responsibilities:**
- Package story knowledge in open, documented formats
- Support selective and full-universe exports
- Maintain provenance in all exported data

**Owned Objects:**
- `ExportJob` — an active export operation with scope, format, and status
- `ExportScope` — the defined set of entities and content included in this export
- `ExportFormat` — the target format specification
- `ExportArtifact` — the completed export file with embedded metadata
- `ExportAuthorization` — the recorded approval for a restricted export operation

**Depends On:** Knowledge Graph Domain, Security Domain, Audit Domain

**Used By:** Organization Admins, Writers, Integration Layer

---

### 3.7 Notification Domain

**Purpose:**
Reliable, configurable delivery of platform events to users and external systems.

**Responsibilities:**
- Manage notification subscriptions and preferences
- Route and deliver notifications through configured channels
- Maintain notification history

**Owned Objects:**
- `NotificationEvent` — a system event that may trigger notifications
- `NotificationSubscription` — a user's registered interest in a specific event type
- `NotificationPreference` — user configuration for channels, frequency, and quiet hours
- `Notification` — a single notification record targeted at a specific recipient
- `NotificationChannel` — the delivery mechanism (in-platform / email / webhook)
- `WebhookEndpoint` — a registered external URL for outbound event delivery
- `QuietHours` — a user-configured time window during which non-urgent notifications are suppressed

**Depends On:** Security Domain, Organization Domain

**Used By:** Workflow Domain, Collaboration Domain, AI Domain, all Core Domains (as event sources)

---

## 4. Generic Domains

Generic domains provide commodity capabilities that any complex software platform requires. They are not unique to StoryOS but are essential for it to operate professionally.

---

### 4.1 Audit Domain

**Purpose:**
The immutable record of everything that has ever happened — the foundation of trust, compliance, and forensic capability.

**Responsibilities:**
- Record all significant system operations with full attribution
- Maintain cryptographic integrity of audit records
- Provide query access to authorized administrators

**Owned Objects:**
- `AuditRecord` — a single immutable record of a system operation (actor, timestamp, entity, action, before/after state)
- `AuditChain` — the cryptographic linkage between consecutive audit records
- `SecurityAuditRecord` — a specific audit subtype for security events (failed auth, permission change)
- `AIAuditRecord` — a specific audit subtype for AI agent reasoning steps
- `AnomalyAlert` — an automated alert triggered by anomalous audit patterns
- `ComplianceReport` — a generated report over audit data for regulatory purposes

**Depends On:** Storage Domain (Audit Store) only

**Used By:** All domains (as event consumer), Administration Domain, Security Domain

---

### 4.2 Metadata Domain

**Purpose:**
The flexible labeling and classification system that allows all entities and content to carry structured, queryable additional information.

**Responsibilities:**
- Define and manage metadata schema for entity types and content
- Store and retrieve metadata values
- Enable metadata-based filtering and querying

**Owned Objects:**
- `MetadataSchema` — the definition of valid metadata fields for an entity type within a Universe
- `MetadataField` — a single defined field (name, type, constraints, default value)
- `MetadataValue` — the stored value of a metadata field for a specific entity instance
- `Tag` — a freeform label applied to any entity or content for organization
- `TagCollection` — a named grouping of related tags

**Depends On:** Story Universe Domain

**Used By:** All Core Domains (entities carry metadata), Search Domain

---

### 4.3 Storage Domain

**Purpose:**
The abstract persistence capability that all other domains depend on — without knowledge of physical storage implementation.

**Responsibilities:**
- Provide durable, consistent persistence for all system data
- Expose specialized storage interfaces for different data characteristics
- Ensure no data loss on any completed write operation

**Owned Objects:**
- `EntityRecord` — the persisted state of any domain entity
- `GraphRecord` — the persisted state of a Knowledge Graph node or edge
- `DocumentRecord` — the persisted state of long-form narrative content
- `MediaRecord` — the persisted binary asset
- `VersionRecord` — an immutable historical state record
- `AuditRecord` — an immutable, append-only operation record

**Depends On:** Nothing — this is the foundational layer

**Used By:** All domains (as the persistence substrate)

---

### 4.4 Plugin Domain

**Purpose:**
The governed extension framework through which approved third-party capabilities augment StoryOS without compromising security or data integrity.

**Responsibilities:**
- Manage plugin lifecycle and registry
- Enforce sandboxed execution and scope constraints
- Log all plugin data access

**Owned Objects:**
- `Plugin` — the registered definition of a third-party extension
- `PluginManifest` — the plugin's declared identity, capabilities, and access scope requirements
- `PluginInstallation` — the per-Organization installation record of a Plugin
- `PluginScope` — the approved data access boundaries for this Plugin in this Organization
- `PluginVersion` — a specific release of a Plugin; Organizations can pin to versions
- `PluginSandbox` — the isolated execution context for a Plugin runtime

**Depends On:** Security Domain, Audit Domain, Organization Domain

**Used By:** Integration Layer, all data domains (as guarded data sources)

---

## 5. AI Domains

AI domains define the intelligent reasoning layer of StoryOS. They do not own story data — they reason over it.

---

### 5.1 AI Agent Domain

**Purpose:**
The lifecycle management of all AI agents operating within StoryOS — their identity, capabilities, assignment, and operational boundaries.

**Responsibilities:**
- Define agent types and their operational capabilities
- Manage agent assignment to Story Universes
- Enforce agent permission boundaries

**Owned Objects:**
- `AIAgent` — the aggregate root; the identity and configuration of an AI agent instance
- `AgentType` — the classification of the agent (Continuity, Character, World, Timeline, Extraction, Search, Review)
- `AgentAssignment` — the mapping of an agent to a specific Story Universe with defined scope
- `AgentCapability` — the declared set of operations this agent type can perform
- `AgentStatus` — current operational state (initializing / active / idle / terminated)
- `AgentConfiguration` — operational parameters (response behavior, proactivity level, scope limits)

**Depends On:** Story Universe Domain, Security Domain, Audit Domain

**Used By:** AI Memory Domain, Inference Domain, Consistency Domain

---

### 5.2 AI Memory Domain

**Purpose:**
Persistent, scoped, and auditable knowledge management for AI agents — allowing them to know a story world as deeply and durably as a creator does.

**Responsibilities:**
- Maintain a synchronized Memory Graph per agent type per Story Universe
- Provide agents with fast, scoped access to story knowledge
- Detect conflicts between agent memory and current Canon

**Owned Objects:**
- `MemoryGraph` — the agent's persistent representation of story knowledge for a Universe; synchronized from Canon
- `MemoryScope` — the defined subset of Universe knowledge accessible to this agent
- `MemoryRecord` — a single persisted fact in the agent's memory with Canon-sync timestamp
- `MemoryConflict` — a detected divergence between agent memory and current Canon state
- `MemoryInspectionReport` — a human-readable view of an agent's current knowledge state

**Depends On:** Knowledge Graph Domain, Canon Management Domain, AI Agent Domain

**Used By:** Inference Domain, Consistency Domain, Search Domain (AI-assisted queries)

---

### 5.3 Inference Domain

**Purpose:**
The reasoning engine that derives new knowledge from existing story facts and surfaces it as proposals for creator review.

**Responsibilities:**
- Execute AI reasoning tasks over Memory Graph data
- Generate structured knowledge proposals
- Never commit inferences to Canon without creator confirmation

**Owned Objects:**
- `InferenceTask` — a defined reasoning job with its scope, method, and status
- `InferenceResult` — the output of an inference task; always marked as AI-derived, never Canon
- `KnowledgeProposal` — a structured suggestion to add, modify, or connect facts in the Knowledge Graph, awaiting creator review
- `ProposalEvidence` — the story facts and reasoning chain supporting a knowledge proposal
- `ProposalDecision` — creator's decision on a proposal (accept / reject / defer)

**Depends On:** AI Memory Domain, Knowledge Graph Domain, Canon Management Domain

**Used By:** Consistency Domain, Search Domain, Workflow Domain (AI review stages)

---

### 5.4 Consistency Domain

**Purpose:**
The automated guardian of story truth — continuously monitoring the Knowledge Graph for contradictions, paradoxes, and logic violations.

**Responsibilities:**
- Detect attribute contradictions across characters and world entities
- Detect timeline paradoxes and causal violations
- Detect world rule violations in story content
- Surface all detected violations as structured reports for creator review

**Owned Objects:**
- `ConsistencyCheck` — a defined validation job, either triggered by events or scheduled
- `ConsistencyViolation` — a detected contradiction with evidence, severity, and affected entities
- `ViolationReport` — a structured summary of all detected violations in a check run
- `ViolationDecision` — creator's response to a violation (fix / dismiss / mark-as-intentional)
- `ConsistencyBaseline` — the expected state of consistency for a Universe (used to track trends)

**Depends On:** Knowledge Graph Domain, AI Memory Domain, Canon Management Domain, Timeline Domain

**Used By:** Canon Management Domain (consistency is a Canon-change trigger), Notification Domain (alerts creators)

---

### 5.5 AI Extraction Domain

**Purpose:**
The specialized capability to parse unstructured narrative content and extract structured story knowledge candidates from it.

**Responsibilities:**
- Process raw text, documents, and imported content
- Identify entity mentions, relationship statements, and event references
- Generate structured extraction candidates for creator review

**Owned Objects:**
- `ExtractionJob` — a processing task applied to a specific document or content unit
- `ExtractionCandidate` — a proposed entity or relationship extracted from unstructured content
- `ExtractionSource` — the content item from which this candidate was extracted
- `ExtractionConfidence` — the AI system's confidence score for this extraction
- `ExtractionDecision` — creator's decision on each candidate (accept / reject / modify)

**Depends On:** Narrative Domain, AI Memory Domain, Import Domain

**Used By:** Import Domain, Knowledge Graph Domain (as a candidate source)

---

## 6. Security Domains

Security domains enforce trust, identity, and access governance across the entire platform.

---

### 6.1 Identity Domain

**Purpose:**
The management of all actor identities on the platform — human users, AI agents, and system integrations.

**Responsibilities:**
- Establish and verify the identity of every actor
- Manage authentication credential lifecycle
- Enforce multi-factor authentication requirements

**Owned Objects:**
- `UserAccount` — the aggregate root for a human user's platform identity
- `UserCredential` — authentication material (managed securely, never in domain model detail)
- `MFAConfiguration` — multi-factor authentication settings for an account
- `Session` — an authenticated working context for a user or agent, with defined lifetime
- `APICredential` — authentication material for system integrations and plugins
- `IdentityProvider` — a configured external identity source (for SSO/enterprise login)

**Depends On:** Audit Domain, Organization Domain

**Used By:** Authorization Domain, all domains (as the actor identity source)

---

### 6.2 Authorization Domain

**Purpose:**
The enforcement of what every authenticated actor is permitted to do — everywhere, on every operation, without exception.

**Responsibilities:**
- Maintain the role permission matrix
- Evaluate every operation request against actor roles and resource ownership
- Record all authorization decisions

**Owned Objects:**
- `Role` — a named set of permissions (Super Admin, Organization Admin, Writer, Editor, Reviewer, AI Agent, Reader)
- `Permission` — a granular operation allowance (CREATE_CHARACTER, READ_KNOWLEDGE_GRAPH, APPROVE_WORKFLOW, etc.)
- `RoleAssignment` — the mapping of a User to a Role within a specific Organization or Story Universe
- `PermissionMatrix` — the complete mapping of Roles to Permissions
- `ResourcePolicy` — additional constraints on a specific resource (e.g., a Story Universe with restricted export)
- `AuthorizationDecision` — the recorded permit/deny outcome for a specific operation request

**Depends On:** Identity Domain, Organization Domain, Audit Domain

**Used By:** All domains (every operation is authorized through this domain)

---

### 6.3 Organization Domain

**Purpose:**
The management of the enterprise organizational unit — the business entity that holds Story Universes, manages users, and operates within StoryOS.

**Responsibilities:**
- Define and manage Organization identities and configurations
- Manage Organization membership and billing status
- Enforce Organization-level policies across all held Story Universes

**Owned Objects:**
- `Organization` — the aggregate root; a business entity operating on StoryOS
- `OrganizationProfile` — name, description, industry, tier, and contact information
- `OrganizationSettings` — feature flags, default workflow templates, plugin policies
- `OrganizationMembership` — a user's belonging to an Organization with their role
- `OrganizationTier` — the service tier (Personal / Team / Studio / Enterprise) with associated capability limits
- `DataResidencyPolicy` — the Organization's configured geographic data constraints

**Depends On:** Identity Domain, Audit Domain

**Used By:** Story Universe Domain (Universes belong to Organizations), Authorization Domain, all domains

---

### 6.4 Access Control Domain

**Purpose:**
Resource-level permission management — fine-grained controls on specific entities and content beyond the standard role hierarchy.

**Responsibilities:**
- Define and enforce per-resource access rules
- Manage secret content visibility rules
- Control time-bounded access grants

**Owned Objects:**
- `AccessPolicy` — a resource-specific set of access rules, applied on top of role permissions
- `GuestAccess` — a time-bounded, scope-limited access grant for an external user
- `ContentRestriction` — a specific content item marked as restricted beyond the standard role rules
- `VisibilityRule` — a condition under which a secret entity or relationship becomes visible

**Depends On:** Authorization Domain, Identity Domain

**Used By:** Collaboration Domain, Relationship Domain (SecretRelationship visibility), Story Universe Domain

---

### 6.5 Compliance Domain

**Purpose:**
The governance of data protection obligations, creator rights, and regulatory requirements.

**Responsibilities:**
- Manage consent records for any non-standard data use
- Process personal data export and deletion requests
- Maintain records of data processing activities

**Owned Objects:**
- `ConsentRecord` — a creator's explicit, timestamped permission for a specific data use (e.g., AI training opt-in)
- `DataSubjectRequest` — a user's formal request for personal data export or deletion
- `DataProcessingRecord` — a log of what personal data is processed, for what purpose, and on what basis
- `PrivacyPolicy` — the current platform privacy policy version accepted by a user
- `RetentionPolicy` — the configured data retention rules for an Organization

**Depends On:** Identity Domain, Audit Domain, Organization Domain

**Used By:** Media Domain (consent for AI use), AI Domain (consent for training use)

---

## 7. Collaboration Domains

Collaboration domains coordinate human team members working together on shared story production.

---

### 7.1 Collaboration Domain

**Purpose:**
Real-time and asynchronous coordination of teams working within shared Story Universes.

**Responsibilities:**
- Manage concurrent access with conflict prevention
- Provide structured discussions and annotations
- Maintain team activity awareness

**Owned Objects:**
- `Comment` — a structured annotation attached to any entity or content item
- `CommentThread` — a nested discussion within a Comment
- `Mention` — a reference to a user or AI agent within a comment
- `ActivityFeed` — the ordered stream of recent changes and actions in a Story Universe
- `ActivityEvent` — a single item in the Activity Feed (entity created, comment added, workflow advanced, etc.)
- `PresenceRecord` — a real-time indication of which users are currently viewing or editing

**Depends On:** Identity Domain, Authorization Domain, Notification Domain

**Used By:** All Core Domains (as an overlay on any entity), Workflow Domain

---

### 7.2 Task Domain

**Purpose:**
Lightweight project management — assigning and tracking discrete work items within a Story Universe.

**Responsibilities:**
- Create and assign story-related tasks
- Track task status and deadlines
- Link tasks to specific entities and content

**Owned Objects:**
- `Task` — a discrete piece of work assigned to a team member within a Story Universe
- `TaskDescription` — what needs to be done and why
- `TaskAssignment` — the designated owner and their acceptance status
- `TaskStatus` — not-started / in-progress / blocked / complete / cancelled
- `TaskDeadline` — the target completion date with optional escalation
- `TaskLink` — an association between a Task and a specific entity, content item, or workflow stage

**Depends On:** Identity Domain, Notification Domain, Authorization Domain

**Used By:** Workflow Domain, Collaboration Domain

---

### 7.3 Review Domain

**Purpose:**
Structured review and annotation of story content — capturing expert feedback in a form that can be acted upon and tracked.

**Responsibilities:**
- Manage review assignments and structured feedback
- Track review completion status
- Provide a structured record of all editorial decisions

**Owned Objects:**
- `Review` — a formal review of a specific content item or entity
- `ReviewAssignment` — the link between a Review and its assigned Reviewer
- `ReviewAnnotation` — inline feedback attached to a specific location within content
- `ReviewDecision` — the formal outcome of a Review (Approved / Approved with Changes / Returned)
- `ReviewHistory` — the complete record of all reviews on a content item

**Depends On:** Identity Domain, Authorization Domain, Workflow Domain

**Used By:** Workflow Domain (Review is a workflow stage type), Narrative Domain

---

### 7.4 Invitation Domain

**Purpose:**
Managing the process of bringing new members and guest collaborators into Organizations and Story Universes.

**Responsibilities:**
- Issue, track, and revoke invitations
- Manage guest access lifecycle

**Owned Objects:**
- `Invitation` — a pending offer to join an Organization or Story Universe
- `InvitationRole` — the role the invitee will be assigned upon acceptance
- `InvitationExpiry` — the deadline after which the invitation is no longer valid
- `GuestSession` — a time-bounded, scope-limited access session for an external collaborator

**Depends On:** Identity Domain, Authorization Domain, Notification Domain

**Used By:** Organization Domain, Story Universe Domain

---

## 8. Domain Relationships

The following describes how primary domains depend upon and interact with each other.

```
SECURITY FOUNDATION
Organization ← Identity ← Authorization
       ↓
Story Universe (isolation boundary)
       ↓
┌──────────────────────────────────────────────────┐
│                 CORE DOMAIN RING                  │
│                                                    │
│  Character ←→ Relationship ←→ World Building       │
│       ↓              ↓              ↓              │
│       └──────────────┴──────────────┘              │
│                      ↓                            │
│             Knowledge Graph                        │
│                      ↓                            │
│             Canon Management                       │
│                      ↓                            │
│                  Timeline                          │
│                      ↓                            │
│                  Narrative                         │
│                      ↓                            │
│                    Item                            │
└──────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────┐
│                  AI DOMAIN RING                    │
│                                                    │
│  AI Agent → AI Memory → Inference → Consistency    │
│                                ↑                  │
│                         Extraction                 │
└──────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────┐
│             SUPPORTING DOMAIN RING                 │
│                                                    │
│  Workflow · Versioning · Search · Media            │
│  Import · Export · Notification                    │
└──────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────┐
│               GENERIC DOMAIN RING                  │
│                                                    │
│  Audit · Metadata · Storage · Plugin               │
└──────────────────────────────────────────────────┘
```

**Critical relationship rules:**
- Core domains depend on Knowledge Graph and Canon Management, but NOT on each other directly
- AI domains read from Knowledge Graph; they never write to Canon directly
- Supporting domains serve Core domains; they never own story knowledge themselves
- Generic domains serve everyone; they have no domain-specific knowledge
- Security domains underpin all other domains; they have no upward dependencies

---

## 9. Domain Boundaries

Domain boundaries define what each domain owns exclusively and what it must not reach into.

| Domain | Owns Exclusively | Must NOT Access |
|---|---|---|
| Character | All character sub-domain objects | World Building internals, Timeline event internals |
| World Building | All world sub-domain objects | Character internals |
| Timeline | Event ordering, paradox detection | Character internals, World internals |
| Knowledge Graph | The graph structure and query engine | The content of narrative documents |
| Canon Management | Canon state and change governance | The Knowledge Graph's internal storage |
| AI Memory | Agent memory state | Canonical story facts (reads only, never modifies) |
| Consistency | Violation detection and reporting | Canon modification (proposes only) |
| Workflow | Stage state machines and transitions | Story entity content |
| Audit | Audit records | Any operational data (write-only from the outside) |
| Security | Authorization decisions | Business logic of any domain |

**The golden rule of domain boundaries:**
> A domain that needs data from another domain requests it through that domain's defined interface. It never accesses another domain's internal storage or objects directly.

---

## 10. Aggregate Roots

An Aggregate Root is the primary entity through which all access to a cluster of related objects is made. In StoryOS, the following are the designated Aggregate Roots:

| Aggregate Root | Owns |
|---|---|
| `StoryUniverse` | All Universe-level configuration and health objects |
| `Character` | All character sub-domain value objects (Identity, Psychology, Voice, History, Capability, Inventory) |
| `Location` | LocationHierarchy, LocationDescription, LocationHistory |
| `Faction` | FactionStructure, FactionHistory, Membership records |
| `Event` | EventDescription, EventParticipant, EventOutcome, CausalLinks |
| `Timeline` | TimelineBranch, TimelineParadox records |
| `Relationship` | RelationshipAttributes, RelationshipHistory |
| `KnowledgeFact` | FactProvenance, InferredFact markers |
| `WorkflowTemplate` | WorkflowStage, StageTransitionRule definitions |
| `WorkflowInstance` | StageDecision, WorkflowComment history |
| `AIAgent` | AgentAssignment, AgentConfiguration, AgentStatus |
| `MemoryGraph` | MemoryRecord, MemoryScope, MemoryConflict |
| `Organization` | OrganizationMembership, OrganizationSettings |
| `UserAccount` | Session, MFAConfiguration, NotificationPreference |
| `Plugin` | PluginManifest, PluginInstallation, PluginScope |
| `AuditRecord` | AuditChain (immutable; no modification permitted) |

**Aggregate boundary rule:** Operations on an aggregate's owned objects are always routed through the Aggregate Root. External domains reference an aggregate by its Root ID only — they never hold direct references to internal value objects.

---

## 11. Bounded Contexts

Bounded Contexts define the explicit scope within which a specific domain model and its language apply. Within a Bounded Context, terms have precise, unambiguous meaning. The same word may mean something different in another Bounded Context.

| Bounded Context | Domains Included | Defining Language |
|---|---|---|
| **Story Knowledge** | Character, World Building, Item, Relationship, Timeline, Narrative, Canon Management | Entity, Canon, Relationship, Event, World Rule |
| **Knowledge Intelligence** | Knowledge Graph, Inference, Consistency, AI Extraction | Node, Edge, Fact, Contradiction, Proposal |
| **AI Operations** | AI Agent, AI Memory, Inference | Agent, Memory, Scope, Reasoning, Proposal |
| **Production Operations** | Workflow, Review, Task, Collaboration, Versioning | Stage, Approval, Version, Branch, Comment |
| **Platform Governance** | Organization, Identity, Authorization, Access Control, Compliance | Organization, Role, Permission, Consent |
| **System Infrastructure** | Audit, Metadata, Storage, Notification, Plugin | Record, Event, Channel, Scope, Sandbox |

**Context mapping rules:**
- `Event` in Story Knowledge means a story occurrence (a battle, a meeting, a revelation)
- `Event` in System Infrastructure means a system notification (entity-created, workflow-advanced)
- These are different concepts — the bounded context determines which is meant
- When a domain in one context needs data from another context, a translation layer (Anti-Corruption Layer) maps the external model into the consuming context's language

---

## 12. Ubiquitous Language

The following terms have precise, platform-wide definitions. All documentation, discussion, and design must use these terms consistently. Ambiguity in language is a precursor to ambiguity in design.

| Term | Precise Definition |
|---|---|
| **Story Universe** | The complete, isolated world of a story. The root isolation boundary. Not "project", not "world", not "setting". |
| **Entity** | Any discrete, named, persistable object within a Story Universe. |
| **Canon** | Officially confirmed story truth. Not "official", not "approved", not "confirmed". Always: Canon. |
| **Non-Canon** | Explicitly excluded story content. Not "unofficial" or "draft". |
| **Speculative** | Facts whose Canon status is not yet determined. |
| **Relationship** | A typed, directed connection between two entities. Not "link", not "connection", not "association". |
| **Event** | A story occurrence with temporal placement. Not "scene", not "happening", not "incident". |
| **World Rule** | A defined constraint on how the story world operates. Not "lore rule", not "world law". |
| **AI Agent** | An autonomous AI system with a defined role and scoped memory. Not "AI", not "bot", not "assistant". |
| **Memory Graph** | An AI agent's persistent, scoped representation of story knowledge. Not "AI context", not "AI knowledge base". |
| **Inferred Knowledge** | AI-derived facts not yet confirmed as Canon. Not "AI knowledge", not "AI suggestions". |
| **Knowledge Proposal** | A specific AI-generated suggestion awaiting creator review. Not "AI recommendation", not "AI edit". |
| **Contradiction** | A detected conflict between two story facts. Not "inconsistency" (when used as a formal domain term), not "error". |
| **Aggregate Root** | The primary entry point for all operations on a cluster of related domain objects. |
| **Bounded Context** | An explicit scope within which a domain model and its language apply precisely. |
| **Provenance** | The traceable origin of a story fact. Not "source", not "reference". |
| **Workflow Stage** | A single named state within a production workflow. Not "step", not "phase". |
| **Version** | A complete historical state record of an entity at a specific point in time. |
| **Branch** | An experimental parallel state of a Story Universe. Not "draft copy", not "fork". |

---

## 13. Future Domains

The following domains are anticipated as StoryOS evolves. They are not in scope for the initial release but must not be architecturally precluded by current design decisions.

| Future Domain | Purpose | Anticipated Phase |
|---|---|---|
| **Analytics Domain** | Aggregate story complexity metrics, pacing analysis, character distribution, narrative pattern intelligence | Year 2 |
| **Universal Graph Domain** | Anonymized, consent-governed cross-universe narrative pattern intelligence | Year 3 |
| **Localization Domain** | Translation management, multi-language Canon synchronization, locale-specific content variants | Year 2 |
| **Rights Management Domain** | Intellectual property ownership records, licensing, rights chain tracking | Year 2 |
| **Reader Domain** | Consumer-facing access to published story content; read-only story universe exploration | Year 2 |
| **Game Engine Integration Domain** | Structured story data delivery to external game engine toolchains | Year 3 |
| **Visual Asset Intelligence Domain** | AI reasoning over character art, location maps, and storyboards for visual consistency | Year 4 |
| **Community Domain** | Moderated fan engagement, community canon, and co-creation spaces | Year 3 |
| **Voice & Audio Domain** | Voice recording management, audio script versioning, narrator assignment | Year 3 |
| **Physical Production Domain** | Props, costumes, set design, and physical asset tracking linked to story entities | Year 4 |
| **Marketplace Domain** | Template sharing, world-building asset marketplace, plugin marketplace | Year 3 |
| **Educational Domain** | Story structure guidance, narrative theory resources, creator development tools | Year 4 |

---

> *"A domain model is the most honest thing a software team can produce. It shows exactly what they believe the business is, what concepts matter, and how those concepts relate. If the domain model is wrong, everything built on top of it will drift further from the truth over time."*

---

**Document End**
**Previous:** `docs/architecture/architecture.md` — v1.0 Approved
**Next:** `docs/database/database_design.md` — Database Design Document
