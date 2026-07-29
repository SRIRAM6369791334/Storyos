# Entity Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.2 — Entity Architecture
> **Depends On:** `docs/domain/domain_model.md`, `docs/architecture/data_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/metadata_architecture.md` — Task 1.3

---

## Preface

This document defines every entity in StoryOS — what it is, what it contains, how it behaves, and how it relates to everything else.

The Entity Architecture follows directly from the Domain Model and Data Architecture. It does not invent new concepts. Every entity defined here traces to a domain in `domain_model.md` and every attribute carries the data classification from `data_architecture.md`.

> **The database does not exist yet. This document is why.**

When the database is designed in a later phase, it will be a direct translation of the entities defined here — not the other way around.

---

## Part I — Entity Architecture Standards

### 1.1 Aggregate Design Rules

An **Aggregate** is a cluster of domain objects treated as a single unit for data changes. Every aggregate has exactly one **Aggregate Root** — the entry point through which all external interactions occur.

**Rule AGG-001 — Single Root Entry**
All access to objects within an aggregate is through the Aggregate Root. External components hold a reference only to the Aggregate Root identifier, never to internal objects.

**Rule AGG-002 — Aggregate Boundary = Transaction Boundary**
All changes within an aggregate are committed in a single atomic transaction. Cross-aggregate operations are eventually consistent, coordinated through domain events.

**Rule AGG-003 — Aggregates Do Not Span Domains**
An aggregate belongs to exactly one domain. If two domains appear to share an aggregate, the domain boundary is incorrectly drawn.

**Rule AGG-004 — Small Aggregates by Default**
Aggregates are kept as small as possible. Large aggregates create contention. When an object within an aggregate changes frequently and independently, it is a candidate for its own aggregate.

**Rule AGG-005 — Internal Invariants are Enforced by the Root**
The Aggregate Root is responsible for enforcing all consistency rules within its boundary. An invariant that cannot be enforced by the root is a sign that the aggregate boundary is wrong.

---

### 1.2 Entity Identity Rules

An **Entity** is an object whose identity persists through time and state changes. Two entity instances with all the same attribute values are still distinct if their identifiers differ.

**Rule ID-001 — All Entities Have a Platform Identifier**
Every entity carries a platform-generated identifier that is globally unique, immutable after creation, and carries no embedded business meaning.

**Rule ID-002 — Platform Identifier is Opaque**
Platform identifiers are not sequential integers. They reveal no information about creation order, record count, or internal structure.

**Rule ID-003 — Business Identity is Separate from Platform Identity**
Many entities also carry a business-meaningful identity (a character name, a universe title). Business identity may change. Platform identity never changes.

**Rule ID-004 — References Between Aggregates Use Root Identifiers Only**
When one aggregate references another, it stores the target aggregate root's platform identifier. It never stores internal object references.

**Rule ID-005 — Identifiers are Typed**
Each entity type has its own identifier type (CharacterId, EventId, UniverseId). Generic identifiers (UUID, integer) are given semantic type wrappers before use.

---

### 1.3 Value Object Rules

A **Value Object** is an object defined by its attributes, not its identity. Two value objects with the same attributes are interchangeable. Value objects are immutable — to "change" a value object, replace it with a new one.

**Rule VO-001 — Value Objects are Immutable**
A value object is never modified after creation. All mutations produce a new value object instance.

**Rule VO-002 — Value Objects Have No Identifier**
Value objects do not carry a platform identifier. They are identified by their attribute values.

**Rule VO-003 — Value Objects are Owned, Not Shared**
A value object belongs to the entity that created it. If two entities need the same value, each holds its own copy.

**Rule VO-004 — Value Objects Enforce Their Own Validity**
A value object cannot be constructed in an invalid state. If the input data fails validation, construction fails.

**Rule VO-005 — Primitives Become Value Objects When They Carry Business Meaning**
A string carrying a character name is not a raw string — it is a `CharacterName` value object that enforces length, allowed characters, and uniqueness constraints.

---

### 1.4 Entity State Machine Rules

Every entity with a lifecycle moves through a defined set of states. State transitions are explicit, validated, and audited.

**Rule ST-001 — States are Explicit and Finite**
Every entity has a documented, finite set of valid states. "Unknown" or open-ended state sets are not permitted.

**Rule ST-002 — Transitions are Validated**
A state transition that is not defined in the entity's state machine is rejected. Entities cannot jump to arbitrary states.

**Rule ST-003 — Transition Events are Emitted**
Every valid state transition emits a domain event. The event carries the entity identifier, previous state, new state, actor, and timestamp.

**Rule ST-004 — Terminal States are Final**
Once an entity reaches a terminal state (Archived, Deleted, Superseded), it cannot transition back. Terminal state transitions are irreversible.

---

### 1.5 Entity Composition Rules

**Rule COM-001 — Composition over Inheritance**
Entity behavior is extended through composition of value objects and child entities, not through inheritance hierarchies.

**Rule COM-002 — Optional Composition is Explicit**
If a component of an entity is optional (a character may or may not have a VoiceProfile), this is explicitly modeled. The absence of a component is a valid, meaningful state.

**Rule COM-003 — Child Entities Belong to One Aggregate**
A child entity exists within the boundary of exactly one aggregate. It cannot be independently fetched, modified, or referenced by external domains.

---

### 1.6 Entity Naming Standards

| Concept | Naming Convention | Example |
|---|---|---|
| Aggregate Root | PascalCase noun | `Character`, `StoryUniverse`, `Event` |
| Value Object | PascalCase noun | `CharacterName`, `CanonStatus`, `TimePoint` |
| Entity Identifier | EntityName + `Id` suffix | `CharacterId`, `UniverseId`, `EventId` |
| Domain Event | Past-tense verb phrase | `CharacterCreated`, `CanonUpdated`, `EventArchived` |
| Entity State | SCREAMING_SNAKE_CASE noun | `ACTIVE`, `ARCHIVED`, `PENDING_REVIEW` |
| Child Entity | PascalCase, includes parent context | `CharacterArc`, `EventOutcome`, `TimelineBranch` |

---

### 1.7 Entity Lifecycle Standards

Every entity follows this base lifecycle unless explicitly specified otherwise:

```
DRAFT → ACTIVE → [domain-specific states] → ARCHIVED
                         ↓
                    PENDING_REVIEW (optional)
                         ↓
                      CANON (if applicable)
```

- **DRAFT:** Entity created but not yet confirmed. May be incomplete. Not visible to AI agents as authoritative.
- **ACTIVE:** Entity is complete and in use. Visible to all authorized actors.
- **PENDING_REVIEW:** Entity submitted for workflow review. Locked from editing by the submitter.
- **CANON:** Entity has been confirmed as part of official Story Universe truth (applies to story entities only).
- **ARCHIVED:** Entity is no longer in active use. Data preserved. Read-only. Not returned in standard queries.

---

### 1.8 Entity Validation Standards

**Rule VAL-001 — Required Fields Are Enforced at Creation**
An entity cannot be created without all required fields. Partial creation is not permitted.

**Rule VAL-002 — Business Rules Are Enforced in the Domain, Not the Database**
Validation logic lives in the domain entity, not in database constraints, triggers, or application layer code.

**Rule VAL-003 — Validation Failures Return Descriptive Errors**
A validation failure returns the specific field, the violated rule, and a human-readable description. Generic "validation failed" errors are not acceptable.

**Rule VAL-004 — Cross-Aggregate Validation Uses Domain Events**
If validating an entity requires information from another aggregate, the validation is performed asynchronously via domain event — not via direct cross-aggregate query.

---

### 1.9 Entity Reference Standards

**Rule REF-001 — External References Are by Identifier Only**
When Entity A references Entity B (in a different aggregate), it stores only B's root identifier. It never stores a copy of B's attributes.

**Rule REF-002 — References Are Validated at Write Time**
When a reference to an external entity is recorded, the existence of the referenced entity is confirmed at write time. Dangling references are not permitted.

**Rule REF-003 — Broken References Are Detected and Surfaced**
The system continuously validates that all stored references point to existing entities. Broken references (caused by archiving the referenced entity) are surfaced as data health alerts.

**Rule REF-004 — Bidirectional References Are Managed Centrally**
If Entity A references Entity B and Entity B should reference Entity A, both sides of the relationship are managed by the Relationship Domain — not duplicated in both entity stores.

---

## Part II — Core Story Entities

---

### 2.1 StoryUniverse

**Purpose:**
The root container and isolation boundary for all story knowledge. Every entity, relationship, event, and piece of narrative in StoryOS belongs to exactly one Story Universe. The Story Universe defines the scope of a creator's world.

**Owner Domain:** Story Universe Domain
**Aggregate Root:** `StoryUniverse`
**Entity Identifier:** `UniverseId` — platform-generated, opaque, globally unique, immutable

**Business Meaning:**
A Story Universe represents a complete, self-contained fictional world — the totality of what a creator is building. It is the first thing created before any story content, and it is the last thing that persists after all its content is archived.

---

**State Model:**

```
DRAFT ──────────────────────────────────────────► ACTIVE
  │                                                  │
  │                                               ARCHIVED
  │                                                  │
  └─────────────────────────────────────────────► ARCHIVED
```

| State | Description |
|---|---|
| `DRAFT` | Universe created but not yet configured. No collaborators invited. |
| `ACTIVE` | Universe is operational. All features available. |
| `ARCHIVED` | Universe preserved in read-only state. No new content may be created. |

---

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `universeId` | `UniverseId` | Immutable; system-generated |
| `title` | `UniverseTitle` | Non-empty; max 200 chars; unique within Organization |
| `organizationId` | `OrganizationId` | Reference to owning Organization; immutable after creation |
| `createdBy` | `UserId` | Identity of creator; immutable |
| `status` | `UniverseStatus` | DRAFT / ACTIVE / ARCHIVED |
| `createdAt` | `Timestamp` | System-set at creation; immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `synopsis` | `UniverseSynopsis` | Short description of the story world (max 2,000 chars) |
| `genre` | `GenreClassification[]` | One or more genre labels |
| `primaryMedium` | `MediumType` | NOVEL / SCREENPLAY / COMIC / GAME / ANIME / OTHER |
| `targetAudience` | `AudienceClassification` | CHILDREN / YOUNG_ADULT / ADULT / ALL_AGES |
| `maturityRating` | `MaturityRating` | Content advisory classification |
| `archivedAt` | `Timestamp` | Set when status transitions to ARCHIVED |
| `archivedBy` | `UserId` | Actor who archived the Universe |
| `linkedUniverseIds` | `UniverseId[]` | Related Story Universes (shared universe management) |

---

**Value Objects:**

| Value Object | Contains | Validation |
|---|---|---|
| `UniverseTitle` | string | Non-empty; 1–200 chars; printable characters only |
| `UniverseSynopsis` | string | Optional; max 2,000 chars |
| `GenreClassification` | enum value | Must be from defined genre taxonomy |
| `UniverseStatus` | enum | DRAFT / ACTIVE / ARCHIVED |
| `MediumType` | enum | NOVEL / SCREENPLAY / COMIC / GAME / ANIME / OTHER |
| `UniverseHealthScore` | decimal (0.0–1.0) | Computed; not persisted as entity attribute |

**Child Entities (owned within this aggregate):**
- `UniverseSettings` — configuration options for this Universe (entity schemas, custom relationship types, Canon rules)
- `UniverseProfile` — extended descriptive information
- `UniverseSnapshot` — named point-in-time captures of Universe state

**Entity References (cross-aggregate):**
- `organizationId` → Organization aggregate
- `createdBy` → UserAccount aggregate
- `linkedUniverseIds[]` → StoryUniverse aggregates (same Organization only)

---

**Domain Events:**

| Event | Trigger |
|---|---|
| `UniverseCreated` | Universe first created |
| `UniverseActivated` | Status transitions DRAFT → ACTIVE |
| `UniverseArchived` | Status transitions to ARCHIVED |
| `UniverseSettingsUpdated` | Any configuration change |
| `UniverseLinked` | A Universe link relationship is established |
| `UniverseSnapshotCreated` | A named snapshot is captured |

---

**Business Invariants:**

- A Story Universe always belongs to exactly one Organization. This reference is immutable after creation.
- A Story Universe in ARCHIVED state cannot be modified, cannot accept new content, and cannot have new users assigned.
- A Story Universe cannot be linked to a Universe belonging to a different Organization.
- Deleting a Story Universe is not permitted — it may only be archived.
- Every entity created within the system must carry a valid `UniverseId`.

**Validation Rules:**

- `title` must be unique within the Organization at the time of creation. Uniqueness is evaluated against ACTIVE and DRAFT universes (ARCHIVED universes do not compete).
- Status transitions must follow the defined state machine. ARCHIVED → ACTIVE is not permitted.
- `organizationId` must reference an ACTIVE Organization.

**Canon Rules:** The Story Universe entity itself is not subject to Canon classification. It is a container for Canon, not a Canon fact.

**Versioning Rules:** Full versioning applies. Every attribute change creates a new version record.

**Security Rules:**
- Read access: any user assigned to this Universe
- Write access: Organization Admin or assigned Writer (for content); Organization Admin only for configuration
- Archive access: Organization Admin only

**AI Rules:** AI agents read Universe configuration for scope definition. AI agents never modify Universe settings or status.

**Audit Requirements:** All create, update, archive, and link operations are audited with full actor attribution.

**Storage Mapping:** Entity Store (primary attributes); Graph Store (linked universe relationships).

---

### 2.2 Character

**Purpose:**
The complete structured model of any intelligent being — real, fictional, or AI-generated — within a Story Universe. A Character is the most complex entity in StoryOS, containing multiple sub-domains each modeled as separate child entities or value objects within the Character aggregate.

**Owner Domain:** Character Domain
**Aggregate Root:** `Character`
**Entity Identifier:** `CharacterId` — platform-generated, opaque, globally unique, immutable

**Business Meaning:**
A Character is not just a name and a description. It is a complete, structured knowledge object representing a being's identity, psychology, physical presence, history, capabilities, and evolution. Every dimension of a character that matters to story consistency is modeled explicitly.

---

**State Model:**

```
DRAFT → ACTIVE ────────────────┬──────────────────► ARCHIVED
                               │
                   PENDING_CANON_REVIEW
                               │
                            CANON
```

| State | Description |
|---|---|
| `DRAFT` | Character created but not yet confirmed or fully populated |
| `ACTIVE` | Character is in use; attributes may be edited |
| `PENDING_CANON_REVIEW` | Character submitted for Canon confirmation |
| `CANON` | Character confirmed as official story truth |
| `ARCHIVED` | Character no longer active; data preserved read-only |

---

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `characterId` | `CharacterId` | Immutable; system-generated |
| `universeId` | `UniverseId` | Owning universe; immutable after creation |
| `primaryName` | `CharacterName` | Non-empty; the character's main designation |
| `status` | `CharacterStatus` | DRAFT / ACTIVE / PENDING_CANON_REVIEW / CANON / ARCHIVED |
| `canonStatus` | `CanonStatus` | DRAFT / PENDING / CANON / NON_CANON / SPECULATIVE |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `aliases` | `CharacterAlias[]` | Alternative names, titles, epithets across the story |
| `narrativeRole` | `NarrativeRole` | PROTAGONIST / ANTAGONIST / SUPPORTING / MENTOR / FOIL / MINOR |
| `diegetic_status` | `DiegeticStatus` | ALIVE / DEAD / MISSING / UNKNOWN / FICTIONAL_WITHIN_FICTION |
| `diegetic_status_timestamp` | `StoryTimePoint` | In-universe time at which status was established |
| `species` | `SpeciesReference` | Reference to Species entity |
| `faction_memberships` | `FactionMembershipId[]` | References to Membership entities |

---

**Value Objects within Character aggregate:**

| Value Object | Description | Mutability |
|---|---|---|
| `CharacterName` | Primary name with validation (non-empty, max 300 chars, printable) | Replaced on change |
| `CharacterAlias` | Secondary name + context (era, relationship, language) | Replaced on change |
| `NarrativeRole` | Character's functional role in the story | Replaced on change |
| `DiegeticStatus` | In-world existence status with timestamp | Replaced on change |
| `CanonStatus` | DRAFT / PENDING / CANON / NON_CANON / SPECULATIVE | Replaced on change |
| `AgeRange` | Approximate age with era reference (not a precise integer — in-world ages are complex) | Replaced on change |

---

**Child Entities (owned within Character aggregate):**

| Child Entity | Purpose | Required? |
|---|---|---|
| `PhysicalDescription` | Body, features, distinctive marks, style, transformation history | Optional |
| `PsychologyProfile` | Beliefs, worldview, emotional baseline, cognitive style | Optional |
| `Motivation` | Layered motivation model: surface desire, deep need, conscious vs. unconscious | Optional |
| `CharacterFear` | Structured fear record with origin and manifestation | Optional |
| `CharacterFlaw` | Internal limitation with story impact | Optional |
| `CharacterVirtue` | Positive quality with manifestation | Optional |
| `MoralCode` | The ethical system the character operates within | Optional |
| `CharacterArc` | Structured transformation record across story events | Optional |
| `VoiceProfile` | Vocabulary, sentence structure, verbal tics, tone (for AI dialogue consistency) | Optional |
| `BackStory` | Pre-story history and formative events | Optional |
| `SkillRecord` | Named skills with proficiency levels and acquisition history | Optional |
| `TalentRecord` | Innate abilities | Optional |
| `KnowledgeRecord` | What the character knows (diegetic knowledge) | Optional |
| `CharacterLimitation` | Capability restrictions with cause and scope | Optional |
| `CharacterInventory` | Items owned or carried, with acquisition history | Optional |

---

**Entity References (cross-aggregate):**

| Reference | Target | Cardinality |
|---|---|---|
| `universeId` | StoryUniverse | Many-to-one (many Characters per Universe) |
| `createdBy` | UserAccount | Many-to-one |
| `species` | Species (World Building) | Optional; many-to-one |
| `events_participated` | Event (Timeline) | Via Knowledge Graph edges, not direct reference |
| `relationships` | Relationship (Relationship Domain) | Via Relationship aggregate, not direct reference |

---

**Domain Events:**

| Event | Trigger |
|---|---|
| `CharacterCreated` | Character first created |
| `CharacterAttributeUpdated` | Any attribute modified |
| `CharacterStatusChanged` | Status transitions |
| `CharacterCanonConfirmed` | Creator confirms Character as Canon |
| `CharacterArcRecorded` | A new arc stage is documented |
| `CharacterArchived` | Character transitioned to ARCHIVED state |
| `CharacterContradictionDetected` | AI consistency check finds attribute conflict |

---

**Business Invariants:**

- A Character belongs to exactly one Story Universe. This is immutable.
- A Character in `diegetic_status = DEAD` may still appear in flashbacks, visions, and memories. Status applies to the present in-universe timeline, not to narrative presence.
- A Character marked NON_CANON is not included in consistency checks or AI Memory.
- The `primaryName` of a Canon Character cannot be changed without a Canon Change Request.
- A Character cannot be permanently deleted if it has Canon relationships or Canon event participations.

**Validation Rules:**
- `primaryName` must be non-empty and maximum 300 characters.
- `canonStatus` transitions must follow: DRAFT → PENDING → CANON or DRAFT → NON_CANON. CANON → DRAFT is not permitted without an explicit demotion event.
- `diegetic_status` changes must include a `storyTimePoint` reference — an in-universe timestamp for when the status change occurred.

**Canon Rules:**
- Character attributes in CANON status are the authoritative record for all AI reasoning.
- AI agents may propose changes to CANON attributes via the KnowledgeProposal mechanism. They may never write directly to Canon character attributes.
- A VoiceProfile in CANON state is used by the AI Character Agent for dialogue consistency enforcement.

**Versioning Rules:**
- Full versioning applies to the Character root and all child entities independently.
- VoiceProfile and PsychologyProfile have their own independent version chains (they change frequently and independently).
- Archiving a Character creates a terminal version record.

**Security Rules:**
- Read: Any user assigned to the Universe
- Create/Edit: Writer or higher role within the Universe
- Canon confirmation: Organization Admin or designated Editor
- Archive: Organization Admin only

**AI Rules:**
- AI agents read all CANON character attributes to enforce consistency.
- VoiceProfile is specifically consumed by the Character AI Agent for dialogue generation and consistency.
- PsychologyProfile is consumed by the Character AI Agent for behavioral consistency.
- AI agents submit `CharacterContradictionDetected` events when conflicts are found; they do not resolve conflicts directly.

**Audit Requirements:** All attribute changes, status transitions, Canon confirmations, and archive operations are audited with actor, timestamp, before-state, and after-state.

**Storage Mapping:** Entity Store (all character attributes and child entities); Graph Store (character node in Knowledge Graph with relationship edges).

---

### 2.3 Location

**Purpose:**
Any named place within a Story Universe — geographic, architectural, cosmological, or conceptual — that serves as the spatial context for characters, events, and world rules.

**Owner Domain:** World Building Domain
**Aggregate Root:** `Location`
**Entity Identifier:** `LocationId`

---

**State Model:** DRAFT → ACTIVE → CANON / NON_CANON → ARCHIVED

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `locationId` | `LocationId` | Immutable; system-generated |
| `universeId` | `UniverseId` | Immutable |
| `name` | `LocationName` | Non-empty; unique within parent location scope |
| `locationType` | `LocationType` | CONTINENT / REGION / NATION / CITY / DISTRICT / BUILDING / ROOM / NATURAL / COSMOLOGICAL / OTHER |
| `canonStatus` | `CanonStatus` | DRAFT / PENDING / CANON / NON_CANON |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `parentLocationId` | `LocationId` | Hierarchical parent (city contains district) |
| `description` | `LocationDescription` | Sensory and atmospheric description |
| `geographicContext` | `GeographicContext` | Climate, terrain, size, notable features |
| `politicalController` | `FactionId` | Reference to Faction or Polity currently controlling this Location |
| `foundedAt` | `StoryTimePoint` | In-universe time of establishment |
| `destroyedAt` | `StoryTimePoint` | In-universe time of destruction (if applicable) |
| `mapCoordinate` | `MapCoordinate` | Optional spatial placement on a Universe map |

**Value Objects:** `LocationName`, `LocationType`, `GeographicContext`, `MapCoordinate`, `StoryTimePoint`

**Child Entities:** `LocationHistory` (how the location changed over story time), `LocationLore` (cultural meaning and significance)

**Entity References:** `parentLocationId` → Location; `politicalController` → Faction

**Domain Events:** `LocationCreated`, `LocationUpdated`, `LocationCanonConfirmed`, `LocationDestroyed`, `LocationArchived`, `LocationControllerChanged`

**Business Invariants:**
- A Location cannot be its own parent (no circular hierarchies).
- A destroyed Location (with `destroyedAt` set) is still ACTIVE in the system — it is a historical fact, not an archived record.
- A Location in a higher hierarchy level cannot be nested within a Location of a lower hierarchy level (a ROOM cannot contain a CITY).

**Validation Rules:** `name` must be unique within the scope of `parentLocationId` within the Universe. `locationType` must be consistent with parent's `locationType` (a CONTINENT cannot be inside a BUILDING).

**Canon Rules:** Location in CANON status is authoritative for AI World Agent consistency checking of scene settings.

**Versioning / Security / AI / Audit / Storage:** Same as Character entity — full versioning, role-based access, AI read-only, full audit, Entity Store + Graph Store node.

---

### 2.4 Faction

**Purpose:**
Any organized group with shared identity, structure, and purpose within a Story Universe — governments, guilds, families, armies, cults, corporations, or any named collective entity.

**Owner Domain:** World Building Domain
**Aggregate Root:** `Faction`
**Entity Identifier:** `FactionId`

---

**State Model:** DRAFT → ACTIVE → CANON / NON_CANON → DISSOLVED / ARCHIVED

| State | Description |
|---|---|
| `DRAFT` | Faction defined but not yet confirmed |
| `ACTIVE` | Faction operational in the story world |
| `CANON` | Faction confirmed as story truth |
| `DISSOLVED` | Faction ceased to exist in the story world (historical fact, not archive) |
| `ARCHIVED` | Removed from active use; data preserved |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `factionId` | `FactionId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `name` | `FactionName` | Non-empty; max 300 chars |
| `factionType` | `FactionType` | GOVERNMENT / GUILD / MILITARY / FAMILY / RELIGION / CRIMINAL / CORPORATION / MOVEMENT / OTHER |
| `canonStatus` | `CanonStatus` | Standard canon states |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `parentFactionId` | `FactionId` | Parent organization (a guild within an empire) |
| `foundedAt` | `StoryTimePoint` | In-universe founding time |
| `dissolvedAt` | `StoryTimePoint` | In-universe dissolution time |
| `primaryLocation` | `LocationId` | Headquarters or origin location |
| `motto` | `FactionMotto` | Short text motto |
| `publicReputation` | `ReputationRecord` | In-world reputation across social strata |
| `secretStatus` | `SecretFlag` | Whether this Faction's existence is secret within the story world |

**Value Objects:** `FactionName`, `FactionType`, `FactionMotto`, `ReputationRecord`, `SecretFlag`

**Child Entities:** `FactionStructure` (internal hierarchy and roles), `FactionHistory` (founding, events, transformation), `FactionGoal` (organized goals and motivations)

**Entity References:** `parentFactionId` → Faction; `primaryLocation` → Location; members tracked via Relationship Domain

**Domain Events:** `FactionCreated`, `FactionUpdated`, `FactionCanonConfirmed`, `FactionDissolved`, `FactionLeadershipChanged`, `FactionArchived`

**Business Invariants:**
- A Faction cannot be its own parent.
- A DISSOLVED Faction retains all its historical data and relationships. Dissolution is a story event, not a data archive action.
- Membership in a Faction is tracked by the Relationship Domain, not within the Faction aggregate.

**Canon / Versioning / Security / AI / Audit / Storage:** Same patterns as Location.

---

### 2.5 Event

**Purpose:**
Any notable occurrence within a Story Universe that is placed in time, involves participants, has a location, and produces consequences. Events are the fundamental units of the Timeline.

**Owner Domain:** Timeline Domain
**Aggregate Root:** `Event`
**Entity Identifier:** `EventId`

---

**State Model:**

```
DRAFT → ACTIVE → PENDING_CANON_REVIEW → CANON
                                           │
                                        DISPUTED
                                           │
                              ERASED (soft-removed from Canon)
```

| State | Description |
|---|---|
| `DRAFT` | Event created but not yet confirmed |
| `ACTIVE` | Event is in use within the Timeline |
| `PENDING_CANON_REVIEW` | Awaiting creator Canon confirmation |
| `CANON` | Officially confirmed as having occurred in the Story Universe |
| `DISPUTED` | Conflicting accounts exist; Canon status uncertain |
| `ERASED` | Previously Canon but retconned out; historical record preserved |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `eventId` | `EventId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `title` | `EventTitle` | Non-empty; max 400 chars |
| `storyTimePoint` | `StoryTimePoint` | In-universe time of occurrence; required for Timeline placement |
| `canonStatus` | `EventCanonStatus` | DRAFT / CANON / DISPUTED / ERASED |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `duration` | `StoryDuration` | How long the event lasted in in-universe time |
| `locationId` | `LocationId` | Where the event occurred |
| `description` | `EventDescription` | What happened, how, and to whom |
| `significance` | `EventSignificance` | MAJOR / MODERATE / MINOR / BACKGROUND |
| `narrativeTimePoint` | `NarrativeTimePoint` | When this event is revealed to the audience (may differ from storyTimePoint) |
| `timelineId` | `TimelineId` | Which timeline this event belongs to (master or named subsidiary) |
| `erasedAt` | `Timestamp` | When Canon status was changed to ERASED |
| `erasedBy` | `UserId` | Who performed the retcon |

**Value Objects:** `EventTitle`, `StoryTimePoint`, `StoryDuration`, `EventSignificance`, `EventCanonStatus`, `NarrativeTimePoint`

**Child Entities:**
- `EventParticipant` — a Character's involvement with their specific role (ACTOR / OBSERVER / VICTIM / INSTIGATOR / BYSTANDER)
- `EventOutcome` — the confirmed results and consequences of the event
- `CausalLink` — a directional dependency: this Event caused another Event (referenced by EventId)

**Entity References:** `locationId` → Location; `timelineId` → Timeline; participants referenced via EventParticipant child entities

**Domain Events:** `EventCreated`, `EventUpdated`, `EventCanonConfirmed`, `EventDisputed`, `EventErased`, `EventParticipantAdded`, `EventOutcomeRecorded`, `CausalLinkEstablished`

**Business Invariants:**
- An Event cannot cause itself (no self-referential causal links).
- An ERASED Event's historical record is preserved. Erasure is Canon — the retcon itself is a story fact.
- An Event's `storyTimePoint` cannot be changed without a Canon Change Request if the Event is in CANON status.
- CausalLinks cannot create circular causality chains (Event A caused Event B caused Event A).

**Validation Rules:**
- `storyTimePoint` must be a valid point within the Story Universe's calendar system.
- If `timelineId` is specified, it must reference an ACTIVE Timeline within the same Universe.
- Paradox detection: if setting this Event's storyTimePoint creates a causal loop, the system rejects the update and raises a `TimelineParadoxDetected` event.

**Canon / Versioning / Security / AI / Audit / Storage:** Full versioning; Canon requires creator confirmation; AI Timeline Agent reads Canon events for paradox detection; full audit; Entity Store + Graph Store.

---

### 2.6 Timeline

**Purpose:**
A named, ordered sequence of events within a Story Universe. Every Universe has a master Timeline. Additional named timelines support parallel realities, alternate histories, and time travel structures.

**Owner Domain:** Timeline Domain
**Aggregate Root:** `Timeline`
**Entity Identifier:** `TimelineId`

---

**State Model:** DRAFT → ACTIVE → ARCHIVED

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `timelineId` | `TimelineId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `name` | `TimelineName` | Non-empty; "Master Timeline" reserved for the primary timeline |
| `timelineType` | `TimelineType` | MASTER / PARALLEL / BRANCH / NESTED / CIRCULAR |
| `isMasterTimeline` | `Boolean` | True for exactly one Timeline per Universe |
| `createdAt` | `Timestamp` | Immutable |
| `createdBy` | `UserId` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `parentTimelineId` | `TimelineId` | For BRANCH and NESTED timelines, the timeline they diverge from |
| `branchOriginEventId` | `EventId` | The Event at which this timeline diverges from its parent |
| `description` | `TimelineDescription` | Explanation of what this timeline represents |
| `calendarId` | `CalendarId` | Custom in-universe calendar system used on this timeline |
| `isConsistent` | `Boolean` | Derived; set to false when paradox is detected |

**Value Objects:** `TimelineName`, `TimelineType`, `TimelineDescription`

**Child Entities:** `TimelineBranch` (records of branching points), `TimelineParadox` (detected logical violations)

**Entity References:** `parentTimelineId` → Timeline; `branchOriginEventId` → Event; `calendarId` → Calendar

**Domain Events:** `TimelineCreated`, `TimelineBranchCreated`, `TimelineParadoxDetected`, `TimelineParadoxResolved`, `TimelineArchived`

**Business Invariants:**
- Exactly one Timeline per Universe has `isMasterTimeline = true`. This cannot be changed.
- The Master Timeline cannot be archived while the Universe is ACTIVE.
- A NESTED timeline must have a parent timeline that is not itself NESTED (maximum one level of nesting for clarity).
- A CIRCULAR timeline must have its circularity explicitly defined in its description and validated by the creator.
- A Timeline with detected paradoxes (`isConsistent = false`) generates creator alerts until resolved.

---

### 2.7 Relationship

**Purpose:**
A typed, directed, attributed connection between any two entities in the Knowledge Graph. Relationships give the graph its meaning — they represent how entities interact, depend on, oppose, or belong to each other.

**Owner Domain:** Relationship Domain
**Aggregate Root:** `Relationship`
**Entity Identifier:** `RelationshipId`

---

**State Model:** DRAFT → ACTIVE → ENDED / ARCHIVED

| State | Description |
|---|---|
| `DRAFT` | Relationship defined but not yet confirmed |
| `ACTIVE` | Relationship is current in the story world |
| `ENDED` | Relationship has formally ended in the story (historical fact) |
| `ARCHIVED` | Removed from active use; data preserved |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `relationshipId` | `RelationshipId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `sourceEntityId` | `EntityId` | The entity from which the relationship originates; immutable |
| `sourceEntityType` | `EntityType` | Type of the source entity; immutable |
| `targetEntityId` | `EntityId` | The entity toward which the relationship points; immutable |
| `targetEntityType` | `EntityType` | Type of the target entity; immutable |
| `relationshipType` | `RelationshipType` | Typed classification (see RelationshipType taxonomy) |
| `canonStatus` | `CanonStatus` | Standard canon states |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `strength` | `RelationshipStrength` | 1 (weak) to 5 (defining); creator-assessed |
| `sentiment` | `RelationshipSentiment` | POSITIVE / NEUTRAL / NEGATIVE / COMPLEX |
| `startEventId` | `EventId` | The Event that initiated this relationship |
| `endEventId` | `EventId` | The Event that ended this relationship |
| `isSecret` | `SecretFlag` | Whether this relationship is hidden within the story world |
| `secretRevealEventId` | `EventId` | The Event at which the secret is revealed |
| `notes` | `RelationshipNote` | Creator notes on this relationship (not AI-visible unless confirmed) |
| `directionality` | `DirectionalityFlag` | DIRECTED (A → B only) / MUTUAL (A ↔ B) |

**Value Objects:** `RelationshipType`, `RelationshipStrength`, `RelationshipSentiment`, `SecretFlag`, `DirectionalityFlag`, `RelationshipNote`

**Child Entities:**
- `RelationshipHistoryEntry` — a recorded change in the relationship state at a specific story time point
- `RelationshipConflict` — a structured record of enmity or opposition with origin, escalation, and resolution

**Entity References:** `sourceEntityId`, `targetEntityId` → any entity type; `startEventId`, `endEventId`, `secretRevealEventId` → Event

**Domain Events:** `RelationshipCreated`, `RelationshipUpdated`, `RelationshipEnded`, `RelationshipSecretRevealed`, `RelationshipCanonConfirmed`, `RelationshipArchived`

**Business Invariants:**
- A Relationship cannot have the same entity as both source and target (no self-relationships).
- A secret Relationship (`isSecret = true`) with `secretRevealEventId` set becomes visible to all authorized readers once that Event is marked as CANON.
- An ENDED Relationship retains all historical records. Ending is a story fact.
- A Relationship in CANON status cannot have its `sourceEntityId`, `targetEntityId`, or `relationshipType` changed without a Canon Change Request.

**RelationshipType Taxonomy (standard types; extensible per Universe):**

| Category | Types |
|---|---|
| Interpersonal | ALLY, ENEMY, RIVAL, FRIEND, MENTOR, STUDENT, FAMILY, ROMANTIC_PARTNER, FORMER_PARTNER |
| Professional | EMPLOYER, EMPLOYEE, COLLEAGUE, SUPERIOR, SUBORDINATE |
| Political | RULER, SUBJECT, DIPLOMAT, PRISONER, ALLY_STATE, ENEMY_STATE |
| Causal | CREATOR, CREATION, CAUSE, EFFECT |
| Ownership | OWNER, OWNED_BY, GUARDIAN, WARD |
| Membership | MEMBER_OF, LEADER_OF, FOUNDED |
| Custom | Defined per Story Universe |

---

### 2.8 KnowledgeFact

**Purpose:**
An atomic, structured statement of story truth within a Story Universe's Knowledge Graph. A KnowledgeFact is the smallest unit of story knowledge that can be independently confirmed, disputed, or superseded.

**Owner Domain:** Knowledge Graph Domain
**Aggregate Root:** `KnowledgeFact`
**Entity Identifier:** `FactId`

---

**State Model:**

```
PROPOSED (AI-inferred) ──► PENDING_REVIEW ──► CANON
                                │
                             REJECTED ──► ARCHIVED
```

| State | Description |
|---|---|
| `PROPOSED` | AI-inferred; not yet reviewed |
| `PENDING_REVIEW` | Submitted for creator review |
| `CANON` | Creator-confirmed as true |
| `REJECTED` | Creator confirmed as not true in this Universe |
| `SUPERSEDED` | Previously Canon; replaced by a newer Canon fact |
| `ARCHIVED` | No longer relevant; preserved for history |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `factId` | `FactId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `factStatement` | `FactStatement` | Human-readable statement of the fact; non-empty |
| `subjectEntityId` | `EntityId` | Primary entity this fact is about |
| `subjectEntityType` | `EntityType` | Type of the subject entity |
| `factType` | `FactType` | ATTRIBUTE / RELATIONSHIP / EVENT / STATE / WORLD_RULE |
| `canonStatus` | `FactCanonStatus` | PROPOSED / PENDING_REVIEW / CANON / REJECTED / SUPERSEDED |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `objectEntityId` | `EntityId` | Secondary entity involved in this fact (for RELATIONSHIP facts) |
| `sourceContentRef` | `ContentReference` | Reference to the narrative content that established this fact |
| `inferenceAgentId` | `AIAgentId` | If AI-inferred, which agent produced this fact |
| `inferenceConfidence` | `ConfidenceScore` | AI confidence 0.0–1.0 (informational only; does not affect Canon status) |
| `provenanceNote` | `ProvenanceNote` | Human note on why this fact was established |
| `supersededByFactId` | `FactId` | Reference to the newer Canon fact that replaced this one |

**Value Objects:** `FactStatement`, `FactType`, `FactCanonStatus`, `ConfidenceScore`, `ContentReference`, `ProvenanceNote`

**Domain Events:** `FactProposed`, `FactSubmittedForReview`, `FactCanonConfirmed`, `FactRejected`, `FactSuperseded`, `FactContradictionDetected`

**Business Invariants:**
- A KnowledgeFact in PROPOSED state is never used by AI agents as authoritative for further reasoning without explicit labeling.
- AI agents may not create CANON facts directly. All AI-created facts begin in PROPOSED state.
- A SUPERSEDED fact retains its complete record. The fact that something was once true in the Canon is itself a historical truth.
- A CANON fact cannot transition back to PROPOSED. It can only become SUPERSEDED by a new CANON fact.

**AI Rules:**
- AI agents create KnowledgeFacts in PROPOSED state as the output of inference tasks.
- AI agents read only CANON KnowledgeFacts when reasoning. PROPOSED and REJECTED facts are excluded from AI reasoning input unless specifically requested for contradiction analysis.
- The `inferenceConfidence` score is informational for creators only. The system does not auto-promote high-confidence inferences to CANON.

---

### 2.9 Narrative

**Purpose:**
Any unit of actual story content — text written by creators that constitutes the story as experienced by its audience. Narrative units are the primary source from which AI agents extract KnowledgeFacts.

**Owner Domain:** Narrative Domain
**Aggregate Root:** `NarrativeUnit`
**Entity Identifier:** `NarrativeId`

---

**State Model:** DRAFT → IN_REVIEW → REVISION → APPROVED → PUBLISHED → ARCHIVED

| State | Description |
|---|---|
| `DRAFT` | Initial creation; not yet ready for review |
| `IN_REVIEW` | Submitted through workflow; under review |
| `REVISION` | Returned for changes after review |
| `APPROVED` | Reviewed and approved; ready for publication |
| `PUBLISHED` | Released as finished content |
| `ARCHIVED` | No longer active; preserved |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `narrativeId` | `NarrativeId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `narrativeType` | `NarrativeType` | SERIES / WORK / VOLUME / CHAPTER / SCENE / BEAT / SCREENPLAY_ACT / QUEST / DIALOGUE_BLOCK |
| `title` | `NarrativeTitle` | Non-empty for SERIES, WORK, VOLUME, CHAPTER; optional for SCENE, BEAT |
| `status` | `NarrativeStatus` | State machine states above |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `parentNarrativeId` | `NarrativeId` | Hierarchical parent (Scene belongs to Chapter) |
| `orderIndex` | `SequenceNumber` | Ordering within the parent |
| `contentBody` | `NarrativeContent` | The actual text content (stored in Document Store) |
| `wordCount` | `WordCount` | Derived from contentBody |
| `storyTimeSpan` | `StoryTimeSpan` | The in-universe time range this content covers |
| `primaryCharacterIds` | `CharacterId[]` | Characters who feature prominently |
| `settingLocationId` | `LocationId` | Primary location of the scene or chapter |
| `workflowInstanceId` | `WorkflowInstanceId` | Active workflow instance if in review |
| `canonStatus` | `CanonStatus` | Whether this narrative content is confirmed Canon |

**Value Objects:** `NarrativeTitle`, `NarrativeType`, `NarrativeStatus`, `SequenceNumber`, `WordCount`, `StoryTimeSpan`

**Child Entities:** `NarrativeVersion` (managed by Versioning System); `ContentAnnotation` (inline comments from reviewers)

**Entity References:** `parentNarrativeId` → NarrativeUnit; `settingLocationId` → Location; `workflowInstanceId` → WorkflowInstance

**Domain Events:** `NarrativeCreated`, `NarrativeUpdated`, `NarrativeSubmittedForReview`, `NarrativeApproved`, `NarrativePublished`, `NarrativeArchived`, `KnowledgeExtractionRequested`

**Business Invariants:**
- A PUBLISHED NarrativeUnit is immutable. Changes require a new revision workflow.
- A NarrativeUnit cannot be its own parent.
- Narrative hierarchy must be internally consistent: a BEAT can only exist inside a SCENE; a SCENE inside a CHAPTER; a CHAPTER inside a VOLUME, etc.
- `contentBody` is stored in the Document Store, not the Entity Store. The entity record carries a reference, not the content itself.

---

### 2.10 Item

**Purpose:**
Any significant object within a Story Universe — artifact, weapon, document, vehicle, technology, or relic — that has story relevance beyond being mere scenery.

**Owner Domain:** Item Domain
**Aggregate Root:** `Item`
**Entity Identifier:** `ItemId`

---

**State Model:** DRAFT → ACTIVE → CANON → DESTROYED / LOST / ARCHIVED

| State | Description |
|---|---|
| `ACTIVE` | Item exists in the story world |
| `DESTROYED` | Item no longer exists in the story world (story event, not archive) |
| `LOST` | Item's location and status unknown within the story world |
| `ARCHIVED` | Removed from active use; data preserved |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `itemId` | `ItemId` | Immutable |
| `universeId` | `UniverseId` | Immutable |
| `name` | `ItemName` | Non-empty; max 300 chars |
| `itemCategory` | `ItemCategory` | WEAPON / ARTIFACT / DOCUMENT / TOOL / VEHICLE / TECHNOLOGY / RELIC / CREATURE / OTHER |
| `canonStatus` | `CanonStatus` | Standard canon states |

**Optional Attributes:** `description`, `origin`, `creator` (CharacterId who made it), `currentOwner` (CharacterId), `currentLocation` (LocationId), `powers` (ItemPower[]), `destroyedAt` (StoryTimePoint), `loreText`

**Value Objects:** `ItemName`, `ItemCategory`, `ItemPower`

**Child Entities:** `ItemHistory` (events involving this item), `OwnershipChainEntry` (each ownership transfer)

**Domain Events:** `ItemCreated`, `ItemOwnershipTransferred`, `ItemDestroyed`, `ItemLost`, `ItemRecovered`, `ItemCanonConfirmed`

**Business Invariants:**
- A DESTROYED Item cannot change ownership or be discovered at a location — unless a story retcon is explicitly performed.
- Ownership history is append-only. Previous owners are never removed from the record.

---

## Part III — Platform Operation Entities

---

### 2.11 Workflow

**Purpose:**
A structured production state machine that governs how story content moves from creation through review stages to final approval. Workflows ensure that all content in a Studio environment passes through defined quality gates.

**Owner Domain:** Workflow Domain
**Aggregate Root:** `WorkflowTemplate` (definition) and `WorkflowInstance` (execution)

The Workflow domain has two aggregate roots:
- `WorkflowTemplate` — the reusable definition
- `WorkflowInstance` — a specific execution of a template for a piece of content

---

**WorkflowTemplate Entity Identifier:** `WorkflowTemplateId`

**State Model (WorkflowTemplate):** DRAFT → ACTIVE → DEPRECATED

**Required Attributes (WorkflowTemplate):**

| Attribute | Type | Constraint |
|---|---|---|
| `templateId` | `WorkflowTemplateId` | Immutable |
| `organizationId` | `OrganizationId` | Immutable |
| `name` | `TemplateName` | Non-empty; unique within Organization |
| `contentTypes` | `ContentType[]` | Which content types this template applies to |
| `status` | `TemplateStatus` | DRAFT / ACTIVE / DEPRECATED |
| `createdBy` | `UserId` | Immutable |

**Child Entities of WorkflowTemplate:** `WorkflowStage` (named stage with role assignment and transition rules), `StageTransitionRule`

---

**WorkflowInstance Entity Identifier:** `WorkflowInstanceId`

**State Model (WorkflowInstance):** ACTIVE → [stage transitions] → COMPLETED / CANCELLED

**Required Attributes (WorkflowInstance):**

| Attribute | Type | Constraint |
|---|---|---|
| `instanceId` | `WorkflowInstanceId` | Immutable |
| `templateId` | `WorkflowTemplateId` | Immutable; the template this instance follows |
| `contentId` | `EntityId` | The content item this workflow governs |
| `contentType` | `ContentType` | Type of the content item |
| `currentStage` | `StageName` | Current active stage |
| `universeId` | `UniverseId` | Immutable |

**Child Entities of WorkflowInstance:** `StageDecisionRecord` (append-only log of every stage transition decision), `WorkflowComment` (feedback attached to a decision)

**Domain Events:** `WorkflowInstanceCreated`, `WorkflowStageAdvanced`, `WorkflowStageReturned`, `WorkflowCompleted`, `WorkflowCancelled`, `WorkflowDeadlineBreached`

**Business Invariants:**
- A WorkflowInstance follows the stage sequence defined by its template. Stages cannot be skipped unless the template explicitly defines bypass conditions.
- `StageDecisionRecord` entries are immutable after creation — the decision history of a workflow cannot be altered.
- A DEPRECATED WorkflowTemplate continues to serve any active WorkflowInstances created from it. New instances cannot use a DEPRECATED template.

---

### 2.12 Version

**Purpose:**
An immutable historical record of the complete state of any entity or content item at a specific point in time. The Version entity is the foundation of the platform's complete audit history for story knowledge.

**Owner Domain:** Versioning Domain
**Aggregate Root:** `Version`
**Entity Identifier:** `VersionId`

**State Model:** CURRENT → SUPERSEDED (no terminal archive — versions are permanent)

| State | Description |
|---|---|
| `CURRENT` | The most recent version of the entity |
| `SUPERSEDED` | Replaced by a newer version; immutable historical record |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `versionId` | `VersionId` | Immutable; system-generated |
| `entityId` | `EntityId` | Reference to the entity this version records; immutable |
| `entityType` | `EntityType` | Type of the entity; immutable |
| `versionNumber` | `VersionNumber` | Sequential integer within the entity's version chain; immutable |
| `previousVersionId` | `VersionId` | Reference to prior version; null for first version; immutable |
| `entitySnapshot` | `EntitySnapshot` | Complete serialized state of the entity at this version |
| `operationType` | `OperationType` | CREATE / UPDATE / STATUS_CHANGE / ARCHIVE |
| `authorId` | `UserId` | Who caused this version; immutable |
| `authorType` | `AuthorType` | HUMAN / AI_AGENT |
| `createdAt` | `Timestamp` | When this version was created; immutable |
| `canonStatusAtVersion` | `CanonStatus` | Canon status of the entity at this version |

**Business Invariants:**
- A Version record is never modified after creation. It is created once and becomes permanently immutable.
- Version records are never deleted through any operational path.
- The `versionNumber` sequence for an entity is gapless — every integer from 1 to N is present.
- The `entitySnapshot` contains the complete entity state, not a diff. This ensures any version can be restored without replaying a change chain.

**Storage Mapping:** Version Store (append-only, isolated).

**AI Rules:** AI agents cannot create or read Version records directly. Version history is surfaced to creators via the Versioning Domain interface.

---

### 2.13 Organization

**Purpose:**
The enterprise organizational unit that owns Story Universes, manages users, and operates as a business entity on the StoryOS platform.

**Owner Domain:** Organization Domain
**Aggregate Root:** `Organization`
**Entity Identifier:** `OrganizationId`

---

**State Model:** TRIAL → ACTIVE → SUSPENDED → TERMINATED

| State | Description |
|---|---|
| `TRIAL` | Organization in trial period; feature access may be limited |
| `ACTIVE` | Fully operational organization |
| `SUSPENDED` | Temporarily disabled (non-payment or policy violation) |
| `TERMINATED` | Permanently closed; data preserved per retention policy |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `organizationId` | `OrganizationId` | Immutable |
| `name` | `OrganizationName` | Non-empty; unique across platform |
| `tier` | `OrganizationTier` | PERSONAL / TEAM / STUDIO / ENTERPRISE |
| `status` | `OrganizationStatus` | TRIAL / ACTIVE / SUSPENDED / TERMINATED |
| `primaryAdminId` | `UserId` | The designated primary administrator |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:** `billingContactId`, `dataResidencyRegion`, `customDomain`, `logoMediaId`, `description`

**Value Objects:** `OrganizationName`, `OrganizationTier`, `OrganizationStatus`, `DataResidencyRegion`

**Child Entities:** `OrganizationMembership` (user-to-organization role assignments), `OrganizationSettings` (feature flags, policies, defaults)

**Business Invariants:**
- A TERMINATED Organization's data is retained per the data retention policy. It cannot be reactivated.
- A SUSPENDED Organization's users cannot log in or access content.
- Exactly one `OrganizationMembership` per user per Organization.
- An Organization must always have at least one user in the Organization Admin role.

---

### 2.14 UserAccount

**Purpose:**
The identity record for a human user of the StoryOS platform. Manages authentication context, role assignments across organizations, and personal preferences.

**Owner Domain:** Identity Domain
**Aggregate Root:** `UserAccount`
**Entity Identifier:** `UserId`

---

**State Model:** INVITED → ACTIVE → SUSPENDED → DELETED

| State | Description |
|---|---|
| `INVITED` | Account created but email not yet verified |
| `ACTIVE` | Fully operational account |
| `SUSPENDED` | Account disabled; cannot authenticate |
| `DELETED` | Account deleted (personal data erasure request); stub record preserved for audit referential integrity |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `userId` | `UserId` | Immutable |
| `emailAddress` | `EmailAddress` | Unique across platform; validated format |
| `status` | `AccountStatus` | INVITED / ACTIVE / SUSPENDED / DELETED |
| `createdAt` | `Timestamp` | Immutable |

**Optional Attributes:** `displayName`, `avatarMediaId`, `preferredLocale`, `mfaEnabled`, `lastActiveAt`

**Value Objects:** `EmailAddress` (validated format, lowercase normalized), `DisplayName` (max 100 chars), `AccountStatus`

**Child Entities:** `Session` (active authentication sessions), `MFAConfiguration`, `NotificationPreference`, `UserConsent` (record of accepted terms and data consents)

**Entity References:** Role assignments are managed by the Authorization Domain's `RoleAssignment` entity, not stored within UserAccount.

**Business Invariants:**
- Email address uniqueness is enforced across all accounts including DELETED accounts (to prevent re-registration attacks).
- A DELETED account's `emailAddress` is anonymized but a stub record remains for audit trail referential integrity.
- Sessions are invalidated when account status changes to SUSPENDED or DELETED.
- UserAccount does not store passwords — credential management is handled by the Identity Domain's secure credential subsystem.

**Security Rules:**
- Highest sensitivity entity on the platform (Level 3–4 data).
- MFA is enforced for Organization Admin and Super Admin accounts.
- Session tokens expire after the configured idle timeout.

**AI Rules:** AI agents never access UserAccount entities. User identity is resolved at the Application Layer; AI agents receive only a scoped actor context, not raw user data.

---

### 2.15 AIAgent

**Purpose:**
The identity and configuration record for an AI agent operating within StoryOS. Represents a specific agent type assigned to a specific Story Universe, with defined scope and operational parameters.

**Owner Domain:** AI Agent Domain
**Aggregate Root:** `AIAgent`
**Entity Identifier:** `AIAgentId`

---

**State Model:** INITIALIZING → ACTIVE → IDLE → SUSPENDED → DECOMMISSIONED

| State | Description |
|---|---|
| `INITIALIZING` | Agent being configured; Memory Graph loading |
| `ACTIVE` | Agent operational and processing tasks |
| `IDLE` | Agent initialized and ready but not currently processing |
| `SUSPENDED` | Agent temporarily disabled (error state or admin action) |
| `DECOMMISSIONED` | Agent permanently retired; Memory Graph archived |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `agentId` | `AIAgentId` | Immutable |
| `agentType` | `AgentType` | CONTINUITY / CHARACTER / WORLD / TIMELINE / RELATIONSHIP / EXTRACTION / SEARCH / REVIEW |
| `universeId` | `UniverseId` | Assigned Story Universe; immutable |
| `status` | `AgentStatus` | State machine states above |
| `memoryGraphId` | `MemoryGraphId` | Reference to this agent's Memory Graph; immutable after creation |
| `deployedAt` | `Timestamp` | When this agent was activated; immutable |

**Optional Attributes:** `scopeDefinition` (restricted knowledge subset if not full-universe access), `configurationParameters`, `suspensionReason`, `decommissionedAt`

**Value Objects:** `AgentType`, `AgentStatus`, `ScopeDefinition`

**Child Entities:** `AgentTask` (active tasks being processed), `AgentCapabilityRecord` (what this agent type is permitted to do)

**Business Invariants:**
- An AIAgent cannot access data outside its assigned `universeId`. This is enforced at the AI Layer boundary.
- An AIAgent in DECOMMISSIONED state cannot be reactivated. A new agent must be created and initialized.
- An AIAgent's `agentType` cannot be changed after creation. Different agent types serve different functions.
- Multiple agents of the same type may be assigned to the same Universe concurrently (for parallel processing), but they share the same MemoryGraph.

**AI Rules:** All AIAgent operations are governed by the principles in `coding_principles.md` Part VIII. Every task is audited. Every output is a proposal, not a Canon write.

---

### 2.16 MemoryGraph

**Purpose:**
The persistent, agent-scoped representation of story knowledge maintained by AI agents across sessions. The MemoryGraph is the AI's durable understanding of a Story Universe — synchronized from Canon and isolated per Universe.

**Owner Domain:** AI Memory Domain
**Aggregate Root:** `MemoryGraph`
**Entity Identifier:** `MemoryGraphId`

---

**State Model:** INITIALIZING → SYNCHRONIZED → STALE → CONFLICT_DETECTED → ARCHIVED

| State | Description |
|---|---|
| `INITIALIZING` | Memory Graph being built from Canon for the first time |
| `SYNCHRONIZED` | Memory Graph is current with Canon |
| `STALE` | Canon has changed; Memory Graph awaiting synchronization |
| `CONFLICT_DETECTED` | Memory Graph contains data that contradicts current Canon |
| `ARCHIVED` | Agent decommissioned; Memory Graph preserved read-only |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `memoryGraphId` | `MemoryGraphId` | Immutable |
| `agentId` | `AIAgentId` | Owning agent; immutable |
| `universeId` | `UniverseId` | Scoped universe; immutable |
| `agentType` | `AgentType` | Immutable; copied from agent |
| `status` | `MemoryGraphStatus` | State machine states above |
| `lastSyncedAt` | `Timestamp` | When last synchronized with Canon |
| `canonVersionAtSync` | `VersionReference` | Which Canon state this memory reflects |

**Child Entities:** `MemoryRecord` (individual persisted facts in the graph), `MemoryConflict` (detected divergence from Canon)

**Business Invariants:**
- A MemoryGraph is never shared between different agents or different Universes. One MemoryGraph per (agent, universe) combination.
- Memory synchronization flows in one direction only: Canon → MemoryGraph. Memory never writes back to Canon.
- A `CONFLICT_DETECTED` MemoryGraph continues to serve the agent but the conflicts are surfaced to the creator for resolution.
- MemoryGraph data is not directly accessible by human users through normal query paths — it is accessed only via the AI agent and the memory inspection report interface.

**Storage Mapping:** Graph Store (isolated partition, separate from Knowledge Graph production data).

---

### 2.17 Plugin

**Purpose:**
The identity, manifest, and installation configuration of an approved third-party extension to the StoryOS platform.

**Owner Domain:** Plugin Domain
**Aggregate Root:** `Plugin`
**Entity Identifier:** `PluginId`

---

**State Model:** REGISTERED → APPROVED → INSTALLED (per-org) → DISABLED (per-org) → DEPRECATED

| State | Description |
|---|---|
| `REGISTERED` | Plugin submitted to platform registry; awaiting review |
| `APPROVED` | Cleared for installation by platform administrators |
| `INSTALLED` | Installed in an Organization (per-org state) |
| `DISABLED` | Installed but deactivated by Organization Admin |
| `DEPRECATED` | No longer supported; existing installations may continue |

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `pluginId` | `PluginId` | Immutable |
| `name` | `PluginName` | Non-empty; unique across platform |
| `version` | `SemanticVersion` | Follows semantic versioning |
| `developerId` | `UserId` | Account of the plugin developer; immutable |
| `status` | `PluginStatus` | Platform-level status |
| `declaredScopes` | `PluginScope[]` | All data access scopes this plugin declares |

**Optional Attributes:** `description`, `documentationUrl`, `supportUrl`, `iconMediaId`, `isFirstParty`

**Child Entities:** `PluginInstallation` (per-organization installation record with approved scope), `PluginVersion` (version history)

**Business Invariants:**
- A Plugin's `declaredScopes` cannot be expanded after installation without going through a re-approval workflow.
- A DEPRECATED Plugin continues to serve existing installations but cannot be newly installed.
- A Plugin can only access data within the `PluginScope` approved at installation time. The Plugin Gateway enforces this structurally.
- First-party plugins (`isFirstParty = true`) are developed by the StoryOS team and undergo the same review process.

---

### 2.18 AuditRecord

**Purpose:**
An immutable, cryptographically chained record of every significant system operation. The AuditRecord is the foundation of platform accountability, compliance, and forensic capability.

**Owner Domain:** Audit Domain
**Aggregate Root:** `AuditRecord`
**Entity Identifier:** `AuditId`

---

**State Model:** CREATED (terminal — AuditRecords have no lifecycle transitions)

**Required Attributes:**

| Attribute | Type | Constraint |
|---|---|---|
| `auditId` | `AuditId` | Immutable; system-generated |
| `previousRecordHash` | `RecordHash` | Hash of the preceding AuditRecord (cryptographic chain) |
| `recordHash` | `RecordHash` | Hash of this record's content (self-integrity) |
| `actorId` | `ActorId` | Identity of the user or agent who performed the operation |
| `actorType` | `ActorType` | HUMAN / AI_AGENT / SYSTEM / PLUGIN |
| `operationType` | `AuditOperationType` | CREATE / UPDATE / DELETE / ARCHIVE / LOGIN / LOGOUT / AUTHORIZE / DENY / EXPORT / IMPORT / AI_REASON / AI_PROPOSE |
| `entityId` | `EntityId` | The entity affected; nullable for system-level events |
| `entityType` | `EntityType` | Type of the affected entity |
| `timestamp` | `Timestamp` | Immutable; system-set at record creation |
| `universeId` | `UniverseId` | Scoped universe; nullable for platform-level operations |
| `organizationId` | `OrganizationId` | Scoped organization |

**Optional Attributes:**

| Attribute | Type | Description |
|---|---|---|
| `beforeState` | `StateSnapshot` | Complete entity state before the operation (for UPDATE/DELETE) |
| `afterState` | `StateSnapshot` | Complete entity state after the operation (for CREATE/UPDATE) |
| `operationDetails` | `OperationDetails` | Additional context specific to the operation type |
| `sessionId` | `SessionId` | Active session during which this operation occurred |
| `ipAddressHash` | `HashedIP` | Hashed (not plain) IP address of the requesting actor |

**Business Invariants:**
- An AuditRecord is never modified after creation. This is an absolute invariant with no exceptions.
- An AuditRecord is never deleted through any operational or administrative path.
- The cryptographic chain is verified continuously. A broken chain is a critical security alert.
- `beforeState` and `afterState` are always included for UPDATE and DELETE operations. Missing state snapshots are an audit integrity defect.
- AI reasoning logs are stored as AuditRecords with `operationType = AI_REASON` and reference the specific agent task.

**Storage Mapping:** Audit Store exclusively. No other store. No cross-store operations for audit data.

**Access Rules:** Write: any system operation (via Audit System only, never directly). Read: Super Admin via Audit System query interface; compliance exports via Compliance Domain.

---

## Part IV — Entity Relationship Overview

### 4.1 Aggregate Dependency Map

The following shows which aggregates depend on (reference) which others:

```
Organization ◄── StoryUniverse ◄── Character
                      │           ◄── Location
                      │           ◄── Faction
                      │           ◄── Event ◄── Timeline
                      │           ◄── Relationship (links any two entities)
                      │           ◄── KnowledgeFact (about any entity)
                      │           ◄── NarrativeUnit
                      │           ◄── Item
                      │
                      ├── WorkflowTemplate ◄── WorkflowInstance
                      ├── AIAgent ◄── MemoryGraph
                      └── Plugin (via PluginInstallation)

UserAccount ◄── OrganizationMembership (cross-reference, owned by Authorization Domain)
UserAccount ◄── RoleAssignment (owned by Authorization Domain)

AuditRecord ← All entities (write-only, via Audit System)
Version ← All entities (write-only, via Versioning System)
```

---

### 4.2 Cross-Cutting Entity Properties

Every entity in StoryOS carries the following properties regardless of its domain:

| Property | Description | Enforced By |
|---|---|---|
| `universeId` | The owning Story Universe (for story entities) | Domain Module |
| `createdBy` | The actor who created this entity | Application Layer |
| `createdAt` | System-set creation timestamp | Application Layer |
| `currentVersionId` | Reference to the current Version record | Versioning System |
| `canonStatus` | Current Canon classification (for story entities) | Canon Management Domain |
| `metadataSet` | Attached metadata values | Metadata Domain |

---

### 4.3 Entity Count Summary

| Category | Aggregate Roots | Value Objects | Child Entities |
|---|---|---|---|
| Core Story Entities | 8 (Universe, Character, Location, Faction, Event, Timeline, Relationship, KnowledgeFact, Narrative, Item) | ~60 | ~40 |
| Platform Entities | 8 (Workflow Template, Workflow Instance, Version, Organization, UserAccount, AIAgent, MemoryGraph, Plugin, AuditRecord) | ~25 | ~20 |
| **Total** | **18 Aggregate Roots** | **~85 Value Objects** | **~60 Child Entities** |

---

## Part V — Global Entity Rules

### 5.1 The Immutability Table

| What | Rule |
|---|---|
| `entityId` (any entity) | Never changes after creation |
| `universeId` (on story entities) | Never changes after creation |
| `createdBy` | Never changes after creation |
| `createdAt` | Never changes after creation |
| AuditRecord (entire record) | Never modified |
| Version record (entire record) | Never modified |
| Cryptographic chain hashes | Never modified |
| CANON fact statement | Changed only via Canon Change Request + creator confirmation |

### 5.2 The Deletion Table

| What | Rule |
|---|---|
| Story entities (Character, Location, etc.) | Never deleted — ARCHIVED only |
| Version records | Never deleted — permanent |
| Audit records | Never deleted — permanent |
| UserAccount (GDPR request) | Email anonymized; stub record preserved for audit integrity |
| Organization | Never deleted — TERMINATED only |
| Session | Expired after TTL; no permanent record needed |
| Temporary data | Deleted after TTL — by design |

### 5.3 The Canon Authority Table

| Entity | Can be Canon? | Who Confirms? | AI Can Write? |
|---|---|---|---|
| Character | Yes | Creator | No |
| Location | Yes | Creator | No |
| Faction | Yes | Creator | No |
| Event | Yes | Creator | No |
| Relationship | Yes | Creator | No |
| KnowledgeFact | Yes | Creator | No (PROPOSED only) |
| NarrativeUnit | Yes | Creator | No |
| Item | Yes | Creator | No |
| Timeline | No (container) | N/A | No |
| WorkflowInstance | No (operational) | N/A | No |
| Version | No (audit) | N/A | No |
| AuditRecord | No (system) | N/A | No |
| Organization | No (platform) | N/A | No |
| UserAccount | No (platform) | N/A | No |
| AIAgent | No (platform) | N/A | No |
| MemoryGraph | No (derived) | N/A | Read/write within scope |
| Plugin | No (platform) | N/A | No |

---

> *"An entity is not a table. A value object is not a column. An aggregate is not a schema. These are business concepts, and they will outlive every database technology the project ever uses."*

---

**Document End**
**Previous:** `docs/architecture/data_architecture.md` — Task 1.1 Approved
**Next:** `docs/architecture/metadata_architecture.md` — Task 1.3
