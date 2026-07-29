# Relationship Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.4 — Relationship Architecture
> **Depends On:** `docs/architecture/entity_architecture.md`, `docs/architecture/metadata_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/knowledge_graph_architecture.md` — Task 1.5

---

## Preface

Entities and metadata define what exists in a Story Universe. Relationships define what that world *means*.

A character list with no connections is a cast roster. A world map with no political boundaries is a geography exercise. An event log with no causal links is a chronicle. Only when entities are connected through typed, directed, versioned, and governed relationships does a Story Universe become a living knowledge graph — where questions like *"Who does this character trust?"*, *"What events changed this kingdom's fate?"*, and *"How does this artifact connect the two antagonists?"* can be answered precisely.

This document defines the complete architecture of the Relationship Layer in StoryOS: how relationships are modeled, how they behave, how they are traversed, and how they bridge entities to the Knowledge Graph.

> **Central architectural truth:** A relationship is not a database foreign key. It is a first-class domain object with its own identity, type, attributes, history, Canon status, and lifecycle.

---

## Part I — Relationship Principles

### 1.1 Relationship Philosophy

StoryOS adopts a **graph-first relationship model**. Every meaningful connection between any two entities in a Story Universe is explicitly modeled as a typed, directed Relationship — not inferred from shared attributes, not implied by co-occurrence, and not embedded as a field inside either entity.

This decision produces five architectural consequences:

1. **Relationships are queryable.** Every connection can be found, filtered, traversed, and analyzed independently of the entities it connects.

2. **Relationships have history.** A relationship that begins as rivalry and evolves into alliance retains every stage of that evolution.

3. **Relationships carry their own knowledge.** A relationship between two characters knows *when* it started, *what event* caused it, *how strong* it is, and whether it is secret within the story world.

4. **Relationships are Canon-governed.** A relationship in Canon is a story truth — it has the same authority as any other Canon fact.

5. **Relationships power the Knowledge Graph.** The Knowledge Graph does not have relationships as a side effect of storing entities. The Relationship Domain is the primary source of all graph edges in the Knowledge Graph.

---

### 1.2 Relationship Goals

| Goal | Description |
|---|---|
| **RG-01 First-Class Citizenship** | Relationships are domain objects, not database join records |
| **RG-02 Type Safety** | Every relationship has a declared type from a governed taxonomy |
| **RG-03 Full History** | Every state of every relationship is permanently preserved |
| **RG-04 Canon Governance** | Relationships are subject to the same Canon authority model as entities |
| **RG-05 Graph Integration** | Every relationship produces a Knowledge Graph edge automatically |
| **RG-06 Direction Clarity** | Every relationship has explicit, unambiguous directionality |
| **RG-07 AI Safety** | AI agents propose relationships; they never directly create Canon relationships |
| **RG-08 Universe Isolation** | Relationships are strictly scoped to their Story Universe |
| **RG-09 Performance** | Common graph traversal patterns are designed for efficient execution |
| **RG-10 Extensibility** | Relationships support metadata extension via the Metadata Architecture |

---

### 1.3 Relationship Rules

**Rule REL-001 — Every Relationship is Explicitly Declared**
Relationships between entities are never inferred from shared attributes or proximity. They must be explicitly declared by a creator, confirmed through a workflow, or proposed by an AI agent and creator-confirmed.

**Rule REL-002 — Relationships Are Typed**
Every relationship has a `RelationshipType` from the defined taxonomy. An untyped relationship is not a valid domain object.

**Rule REL-003 — Relationships Have Direction**
Every relationship has a source entity and a target entity. Direction is not optional. Even symmetric relationships (where A knows B and B knows A) are modeled as two directed edges or as a single edge with explicit `MUTUAL` directionality.

**Rule REL-004 — Relationships Are Universe-Scoped**
A relationship cannot connect entities from different Story Universes. Cross-universe connections are modeled at the Organization level as `UniverseLink` objects, not as Relationships.

**Rule REL-005 — AI Never Directly Creates Canon Relationships**
AI agents submit `RelationshipProposal` objects. These enter the KnowledgeProposal workflow. Only after creator confirmation does a proposed relationship become a Canon Relationship.

**Rule REL-006 — Relationships Are Not Entity Fields**
Character A's friendship with Character B is not stored as a field on Character A, nor as a field on Character B. It is stored as a Relationship entity owned by the Relationship Domain.

**Rule REL-007 — All Relationships Are Versioned**
Every state change on a relationship — attribute update, status transition, Canon confirmation — creates an immutable version record.

**Rule REL-008 — Ending a Relationship Preserves Its History**
When a relationship ends within the story world (an alliance breaks, a friendship is betrayed), the relationship is marked ENDED, not deleted or archived. The complete history of the relationship remains as a story fact.

**Rule REL-009 — Relationship Metadata Is Separate from Relationship Properties**
Core properties of a relationship (type, direction, strength, status) are relationship attributes. Extended, universe-specific annotation belongs in the Metadata Layer via RelationshipMetadata.

**Rule REL-010 — Circular Relationships Require Explicit Validation**
Self-referential relationships (Entity A relates to Entity A) are forbidden. Cyclical relationship chains (A → B → C → A) are permitted but flagged and validated for logical consistency.

---

### 1.4 Relationship Lifecycle

```
PROPOSED (AI or creator draft)
    │
    ├─ AI Proposed → KnowledgeProposal → Creator Review → DRAFT
    │
    └─ Creator Draft → DRAFT
           │
    PENDING_CANON_REVIEW
           │
        CANON ──────────────────────────────────────────► ENDED
           │                                                 │
        ACTIVE                                          (story event)
           │                                                 │
      DISPUTED ◄──── Contradiction detected                  │
           │                                                 │
       resolved                                              │
           │                                                 │
        CANON                                           ARCHIVED
                                                    (administrative)
```

| State | Description |
|---|---|
| `PROPOSED` | AI-generated relationship candidate; not yet creator-reviewed |
| `DRAFT` | Creator-initiated but not yet Canon-confirmed |
| `PENDING_CANON_REVIEW` | Submitted for Canon confirmation |
| `CANON` | Creator-confirmed as story truth; authoritative |
| `ACTIVE` | In use but not yet Canon-confirmed (used during active writing) |
| `ENDED` | Relationship terminated within the story world; permanent historical record |
| `DISPUTED` | Conflicting claims exist; creator must resolve |
| `ARCHIVED` | Administratively removed from active use; data preserved |

**Lifecycle invariants:**
- `CANON → PROPOSED` is not permitted. A Canon relationship cannot be un-confirmed without a Canon Change Request.
- `ENDED` is a story state, not an administrative state. A relationship moves to `ENDED` because something happened in the story world. `ARCHIVED` is the administrative equivalent.
- `PROPOSED` relationships are never visible to other AI agents as authoritative input for reasoning.

---

### 1.5 Relationship Ownership

| Role | Ownership Scope |
|---|---|
| **Relationship Domain** | Owns all Relationship entity data, RelationshipType taxonomy, and lifecycle management |
| **Canon Management Domain** | Governs Canon status transitions for all relationships |
| **Knowledge Graph Domain** | Receives relationship events and maintains corresponding graph edges |
| **Creator (Writer/Editor)** | Initiates, reviews, and confirms relationships within their authorized Universe |
| **AI Agents** | Propose relationships only; no direct write access to Canon relationships |

---

### 1.6 Relationship Security

**RS-001 — Access Follows Entity Access**
If a user cannot read Entity A or Entity B, they cannot see any relationship between them, regardless of the relationship's visibility status.

**RS-002 — Secret Relationships Are Role-Restricted**
A Relationship marked `isSecret = true` within the story world is only visible to users with `SECRET_ACCESS` permission for that Universe, and to AI agents with Relationship scope. Regular readers cannot see secret relationships even if they have general universe access.

**RS-003 — Relationship Creation Requires Writer Role**
Creating a new relationship requires Writer role or higher within the Universe. Readers cannot create relationships.

**RS-004 — Canon Confirmation Requires Editor or Admin**
Only users with Editor or Organization Admin role can confirm a relationship as Canon.

**RS-005 — All Relationship Writes Are Audited**
Every relationship creation, modification, status transition, and Canon confirmation is recorded in the Audit System with full attribution.

---

### 1.7 Relationship Validation Principles

**VP-REL-001 — Both Endpoints Must Exist**
A relationship cannot be created if either the source or target entity does not exist, or is in ARCHIVED state.

**VP-REL-002 — Type Must Match Entity Types**
The `RelationshipType` declared must be valid for the source and target entity types. A `FATHER_OF` relationship is only valid between Character entities, not between a Character and a Location.

**VP-REL-003 — Cardinality Constraints Are Enforced**
If a RelationshipType has declared cardinality (e.g., a Character may have at most one `PRIMARY_HOME` Location), creating a second relationship of that type for the same source entity is rejected.

**VP-REL-004 — Self-Reference Is Rejected**
Any attempt to create a relationship where source and target are the same entity is rejected, regardless of type.

**VP-REL-005 — Duplicate Detection**
Creating an identical relationship (same source, target, type, and direction) that is already ACTIVE or CANON is rejected unless the existing relationship is first transitioned to ENDED.

**VP-REL-006 — Universe Boundary Is Enforced**
A relationship where source and target entity belong to different Story Universes is rejected at the domain boundary. This is never a query-filter check — it is a structural enforcement.

---

## Part II — Relationship Model

### 2.1 Relationship (Aggregate Root)

**Purpose:** The complete record of a typed, directed connection between two entities within a Story Universe.

**Identifier:** `RelationshipId` — platform-generated, opaque, globally unique, immutable

**Required Properties:**

| Property | Type | Constraint |
|---|---|---|
| `relationshipId` | `RelationshipId` | Immutable |
| `universeId` | `UniverseId` | Immutable; both entities must belong to this Universe |
| `sourceEntityId` | `EntityId` | Immutable after Canon confirmation |
| `sourceEntityType` | `EntityType` | Immutable |
| `targetEntityId` | `EntityId` | Immutable after Canon confirmation |
| `targetEntityType` | `EntityType` | Immutable |
| `relationshipType` | `RelationshipTypeId` | The declared typed category of this relationship |
| `direction` | `RelationshipDirection` | DIRECTED / MUTUAL |
| `canonStatus` | `CanonStatus` | DRAFT / PENDING / CANON / NON_CANON / SPECULATIVE |
| `lifecycleStatus` | `RelationshipLifecycleStatus` | PROPOSED / DRAFT / ACTIVE / CANON / ENDED / DISPUTED / ARCHIVED |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Optional Properties:**

| Property | Type | Description |
|---|---|---|
| `strength` | `RelationshipStrength` | 1 (weak) to 5 (defining) |
| `sentiment` | `RelationshipSentiment` | POSITIVE / NEUTRAL / NEGATIVE / COMPLEX |
| `isSecret` | `Boolean` | Whether this relationship is hidden within the story world |
| `isPubliclyKnown` | `Boolean` | Whether this relationship is common knowledge within the story world |
| `startEventId` | `EventId` | The Event that initiated this relationship |
| `endEventId` | `EventId` | The Event that ended this relationship |
| `startStoryTime` | `StoryTimePoint` | In-universe time the relationship began |
| `endStoryTime` | `StoryTimePoint` | In-universe time the relationship ended |
| `secretRevealEventId` | `EventId` | Event at which the secret is revealed within the story |
| `narrativeNote` | `NarrativeNote` | Creator's note on this relationship (not AI-visible unless confirmed) |
| `proposedByAgentId` | `AIAgentId` | If AI-proposed, which agent proposed this |
| `proposalConfidence` | `ConfidenceScore` | AI confidence at proposal time; informational only |

**Child Entities:**
- `RelationshipHistoryEntry` — append-only log of every state change
- `RelationshipPropertyValue` — typed key-value properties specific to this relationship instance
- `RelationshipEvidenceRecord` — the story content establishing this relationship

---

### 2.2 RelationshipType

**Purpose:** The typed classification of a relationship — a governed vocabulary entry that defines what category of connection is being expressed.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `typeId` | `RelationshipTypeId` | Immutable |
| `typeName` | `TypeName` | Human-readable label: `ALLY`, `FATHER_OF`, `RULES`, `CAUSED` |
| `category` | `RelationshipCategory` | The high-level category this type belongs to |
| `allowedSourceTypes` | `EntityType[]` | Entity types valid as source for this type |
| `allowedTargetTypes` | `EntityType[]` | Entity types valid as target for this type |
| `defaultDirection` | `RelationshipDirection` | DIRECTED or MUTUAL |
| `hasNaturalInverse` | `Boolean` | Whether this type has a defined inverse type |
| `inverseTypeId` | `RelationshipTypeId?` | The inverse type (e.g., `FATHER_OF` → `CHILD_OF`) |
| `isTransitive` | `Boolean` | Whether A→B→C implies A→C for this type |
| `isSymmetric` | `Boolean` | Whether A→B implies B→A (synonym: MUTUAL direction) |
| `cardinality` | `CardinalityRule` | Cardinality constraints on source and target |
| `scope` | `TypeScope` | PLATFORM / ORGANIZATION / UNIVERSE |
| `isActive` | `Boolean` | Whether new relationships of this type may be created |
| `taxonomyPath` | `String` | Hierarchical position: `INTERPERSONAL.FAMILY.PARENT_CHILD` |

---

### 2.3 RelationshipDefinition

**Purpose:** The specification for a relationship type that is customized at the Universe level. Creators may define custom relationship types beyond the platform taxonomy for their specific story world.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `definitionId` | `DefinitionId` | Immutable |
| `universeId` | `UniverseId` | Scoped to this Universe |
| `basedOnTypeId` | `RelationshipTypeId?` | Optional platform type this extends |
| `customName` | `CustomTypeName` | Universe-specific label: `SWORN_BLOOD_BROTHER`, `DRAGON_BONDED` |
| `description` | `TypeDescription` | What this relationship means in this Universe |
| `allowedSourceTypes` | `EntityType[]` | Permitted source entity types |
| `allowedTargetTypes` | `EntityType[]` | Permitted target entity types |
| `properties` | `RelationshipPropertyDefinition[]` | Custom typed properties for this relationship type |
| `hasInverse` | `Boolean` | Whether this custom type has a defined inverse |
| `inverseDefinitionId` | `DefinitionId?` | Reference to the inverse custom definition |

---

### 2.4 RelationshipDirection

**Purpose:** A value object defining the direction of information flow and semantic interpretation for a relationship.

| Value | Description | Example |
|---|---|---|
| `DIRECTED` | A → B. Meaning flows from source to target. Reverse is not implied. | `Character CONTROLS Location` |
| `MUTUAL` | A ↔ B. Both entities equally participate. | `Character ALLIED_WITH Character` |
| `ASYMMETRIC_MUTUAL` | A knows about B; B knows about A; but the relationship is different from each perspective | `Character MENTORS Character` (mentor perspective ≠ student perspective) |

**Direction rules:**
- A `DIRECTED` relationship cannot be assumed to hold in reverse. `A RULES B` does not imply `B RULES A`.
- A `MUTUAL` relationship with `isSymmetric = true` may be stored as a single directed edge with direction `MUTUAL`. The Knowledge Graph treats it as bidirectional.
- An `ASYMMETRIC_MUTUAL` relationship is stored as two directed edges — one for each perspective.

---

### 2.5 RelationshipCardinality

**Purpose:** A constraint declaration on how many relationships of a specific type may exist for a given source or target entity.

| Cardinality Pattern | Description | Example |
|---|---|---|
| `ONE_TO_ONE` | One source may relate to at most one target of this type, and vice versa | `Character HAS_CANONICAL_HOME Location` |
| `ONE_TO_MANY` | One source may relate to many targets; each target has at most one source | `Faction LEADS Character` (one leader per faction) |
| `MANY_TO_ONE` | Many sources may relate to one target | `Character BORN_IN Location` |
| `MANY_TO_MANY` | Many sources may relate to many targets | `Character KNOWS Character` |
| `ZERO_OR_ONE` | Optional but not repeatable | `Character HAS_ARCHENEMY Character` |

**Cardinality enforcement:**
- Cardinality is enforced at relationship creation time.
- Cardinality violations produce a descriptive error identifying the conflicting existing relationship.
- Cardinality rules are defined on the `RelationshipType`, not on individual relationship instances.

---

### 2.6 RelationshipProperty

**Purpose:** A typed, named attribute that carries additional meaning specific to a relationship instance beyond the core relationship attributes.

**Distinction from Metadata:**
- **RelationshipProperty:** Part of the relationship's core semantic meaning. Defined per `RelationshipType`. Required or optional per type definition. Examples: `sworn_date`, `alliance_strength`, `debt_amount`.
- **RelationshipMetadata:** Universe-specific extension. Applied via the Metadata Schema system. Not part of the relationship type definition. Examples: custom universe-specific tags, AI annotations, plugin-contributed fields.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `propertyDefinitionId` | `DefinitionId` | Reference to the RelationshipPropertyDefinition |
| `value` | `TypedValue` | The actual value; type-checked against the definition |
| `setBy` | `ActorId` | Who set this value |
| `setAt` | `Timestamp` | When this value was set |
| `isAIGenerated` | `Boolean` | Whether an AI agent produced this value |

---

### 2.7 RelationshipConstraint

**Purpose:** A validation rule that governs when a relationship of a given type may exist.

| Constraint Type | Description | Example |
|---|---|---|
| `REQUIRES_EVENT` | Relationship requires a linked `startEventId` from the Event domain | `KILLED_BY` must reference the Event of death |
| `REQUIRES_STORY_TIME` | Relationship must have `startStoryTime` set | `MARRIED_TO` must have a wedding time |
| `EXCLUDES_TYPE` | If A has relationship X with B, A cannot also have relationship Y with B | A Character cannot simultaneously be `ALLY` and `ENEMY` of the same Character |
| `REQUIRES_FACTION_MEMBERSHIP` | Source must be a member of the Faction that is the target | `LEADS` a Faction requires `MEMBER_OF` that Faction |
| `MAX_ACTIVE_PER_SOURCE` | Limits how many active relationships of this type a single source may have | `HAS_ARCHENEMY`: max 1 per character |
| `MIN_ENTITY_STATUS` | Both entities must be in a minimum lifecycle status | Cannot create `MARRIED_TO` with an ARCHIVED character |
| `TIMELINE_CONSISTENCY` | Start and end story times must be consistent with referenced events | `startStoryTime` must precede `endStoryTime` |
| `CANON_DEPENDENCY` | Relationship may only be Canon if both source and target are Canon | A Canon relationship requires Canon entities |

---

### 2.8 RelationshipVersion

**Purpose:** An immutable record of a relationship's complete state at a point in time. Every change to a relationship creates a new RelationshipVersion.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `versionId` | `RelationshipVersionId` | Immutable |
| `relationshipId` | `RelationshipId` | The relationship being versioned |
| `versionNumber` | `Integer` | Sequential; gapless |
| `previousVersionId` | `RelationshipVersionId?` | Null for v1 |
| `snapshot` | `RelationshipSnapshot` | Complete state at this version |
| `changeType` | `ChangeType` | CREATED / ATTRIBUTE_CHANGED / STATUS_CHANGED / CANON_CONFIRMED / ENDED / ARCHIVED |
| `changedBy` | `ActorId` | Immutable |
| `changedAt` | `Timestamp` | Immutable |

---

### 2.9 RelationshipHistory

**Purpose:** The ordered, append-only log of every state change for a relationship. Provides the narrative arc of a relationship's evolution through story time.

**History entry types:**
- `RELATIONSHIP_CREATED` — relationship first established
- `STRENGTH_CHANGED` — sentiment or strength updated
- `STATUS_CHANGED` — lifecycle or Canon status transition
- `PROPERTY_UPDATED` — a relationship property value changed
- `SECRET_REVEALED` — `isSecret` transitioned to false (secret revealed in story)
- `RELATIONSHIP_ENDED` — relationship terminated in story world
- `CANON_CONFIRMED` — relationship confirmed as story truth

Each history entry carries: `entryType`, `changedBy`, `storyTimePoint`, `realWorldTimestamp`, `previousState`, `newState`.

---

### 2.10 RelationshipEvidence

**Purpose:** The story content that establishes or confirms a relationship. Evidence links a relationship to the specific narrative content that provides its provenance.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `evidenceId` | `EvidenceId` | Immutable |
| `relationshipId` | `RelationshipId` | The relationship being evidenced |
| `evidenceType` | `EvidenceType` | NARRATIVE_EXCERPT / EVENT_REFERENCE / CREATOR_ASSERTION / AI_INFERENCE |
| `contentReference` | `ContentReference` | Reference to the Narrative Unit that provides evidence |
| `excerptText` | `ExcerptText?` | Relevant text from the content (for NARRATIVE_EXCERPT type) |
| `eventReference` | `EventId?` | Reference to an Event that demonstrates this relationship |
| `confidence` | `ConfidenceScore` | Certainty of this evidence (1.0 = explicit statement; 0.5 = implied) |
| `addedBy` | `ActorId` | Who provided this evidence |
| `addedAt` | `Timestamp` | Immutable |

---

### 2.11 RelationshipReference

**Purpose:** A lightweight reference to a relationship from another domain context — used when a domain entity needs to acknowledge a relationship exists without owning the relationship data.

A `RelationshipReference` carries only the `RelationshipId` and `RelationshipType`. It contains no relationship data. The Relationship Domain is always the authoritative source.

**Usage rule:** An entity that co-participates in a relationship stores a `RelationshipReference`. It does not store the relationship's attributes, history, or status. This maintains the principle that Relationship Domain owns all relationship data.

---

### 2.12 RelationshipMetadata

**Purpose:** Universe-specific or plugin-contributed annotation on a relationship instance. Follows the same Metadata Architecture defined in Task 1.3, scoped to `appliesTo: [RELATIONSHIP]`.

**Behavior:**
- All MetadataSchema, MetadataDefinition, and MetadataValue rules from the Metadata Architecture apply exactly.
- Metadata does not replace RelationshipProperty — it extends it.
- AI-generated relationship metadata carries `isAIGenerated = true` following the same AI metadata rules.
- Relationship metadata is indexed alongside entity metadata for unified search.

---

## Part III — Relationship Categories

### 3.1 Interpersonal Relationships (Character ↔ Character)

The richest relationship category — modeling the complete social fabric of characters within a Story Universe.

| Type Name | Direction | Cardinality | Inverse | Description |
|---|---|---|---|---|
| `ALLY` | MUTUAL | MANY_TO_MANY | self (symmetric) | Active alliance or cooperation |
| `ENEMY` | MUTUAL | MANY_TO_MANY | self (symmetric) | Active enmity or opposition |
| `RIVAL` | MUTUAL | MANY_TO_MANY | self (symmetric) | Competitive opposition (not necessarily hostile) |
| `FRIEND` | MUTUAL | MANY_TO_MANY | self (symmetric) | Close personal friendship |
| `ACQUAINTANCE` | MUTUAL | MANY_TO_MANY | self | Known to each other but not close |
| `STRANGER` | MUTUAL | MANY_TO_MANY | self | Have not met within the story world |
| `MENTOR` | DIRECTED | MANY_TO_MANY | `STUDENT_OF` | A guides B's development |
| `STUDENT_OF` | DIRECTED | MANY_TO_MANY | `MENTOR` | B is guided by A |
| `FATHER_OF` | DIRECTED | ONE_TO_MANY | `CHILD_OF` | Biological or legal parental |
| `MOTHER_OF` | DIRECTED | ONE_TO_MANY | `CHILD_OF` | Biological or legal parental |
| `CHILD_OF` | DIRECTED | MANY_TO_ONE | `FATHER_OF` / `MOTHER_OF` | Biological or legal filial |
| `SIBLING_OF` | MUTUAL | MANY_TO_MANY | self | Shared parent |
| `SPOUSE_OF` | MUTUAL | ONE_TO_ONE | self | Married or equivalent bond |
| `ROMANTIC_PARTNER` | MUTUAL | ONE_TO_ONE | self | Non-marital romantic partnership |
| `FORMER_PARTNER` | MUTUAL | MANY_TO_MANY | self | Ended romantic relationship |
| `EMPLOYER_OF` | DIRECTED | ONE_TO_MANY | `EMPLOYED_BY` | Formal employment |
| `EMPLOYED_BY` | DIRECTED | MANY_TO_ONE | `EMPLOYER_OF` | Employed by organization or person |
| `COMMANDS` | DIRECTED | ONE_TO_MANY | `COMMANDED_BY` | Military or formal command authority |
| `COMMANDED_BY` | DIRECTED | MANY_TO_ONE | `COMMANDS` | Under command authority |
| `TRUSTS` | DIRECTED | MANY_TO_MANY | `TRUSTED_BY` | One-directional trust (A trusts B; B may not trust A) |
| `DISTRUSTS` | DIRECTED | MANY_TO_MANY | `DISTRUSTED_BY` | Active distrust |
| `FEARS` | DIRECTED | MANY_TO_MANY | `FEARED_BY` | Active fear |
| `RESPECTS` | DIRECTED | MANY_TO_MANY | `RESPECTED_BY` | Acknowledgment of excellence |
| `DESPISES` | DIRECTED | MANY_TO_MANY | `DESPISED_BY` | Deep contempt |
| `PROTECTS` | DIRECTED | MANY_TO_MANY | `PROTECTED_BY` | Active protective relationship |
| `BETRAYED` | DIRECTED | MANY_TO_MANY | `BETRAYED_BY` | Historical betrayal event (story fact) |
| `KILLED` | DIRECTED | MANY_TO_MANY | `KILLED_BY` | Source killed target (requires Event) |
| `CREATED` | DIRECTED | MANY_TO_MANY | `CREATED_BY` | Source created target (e.g., constructed, brought to life) |
| `GUARDIAN_OF` | DIRECTED | MANY_TO_MANY | `HAS_GUARDIAN` | Legal or sworn guardianship |
| `SWORN_TO` | DIRECTED | MANY_TO_MANY | `HAS_SWORN_VASSAL` | Oath of fealty or service |

---

### 3.2 Location Relationships (Location ↔ Location / Character ↔ Location / Faction ↔ Location)

| Type Name | Source → Target | Direction | Description |
|---|---|---|---|
| `CONTAINS` | Location → Location | DIRECTED | Spatial containment (country contains city) |
| `CONTAINED_BY` | Location → Location | DIRECTED | Inverse of CONTAINS |
| `ADJACENT_TO` | Location → Location | MUTUAL | Shares a border or proximity |
| `ACCESSIBLE_FROM` | Location → Location | DIRECTED | A can be reached from B (asymmetric access) |
| `BORN_IN` | Character → Location | DIRECTED | Place of birth |
| `DIED_IN` | Character → Location | DIRECTED | Place of death (requires Event) |
| `RESIDES_IN` | Character → Location | DIRECTED | Current or primary residence |
| `RESIDED_IN` | Character → Location | DIRECTED | Historical residence (past) |
| `ORIGINATED_FROM` | Faction → Location | DIRECTED | Faction's founding location |
| `CONTROLS` | Faction → Location | DIRECTED | Political or military control |
| `CONTROLLED_BY` | Location → Faction | DIRECTED | Inverse: controlled by |
| `CONTESTED_BY` | Location ↔ Faction | MUTUAL | Multiple factions claim this location |
| `SACRED_TO` | Location → Faction/Character | DIRECTED | Location of religious or cultural significance |
| `NAMED_AFTER` | Location → Character | DIRECTED | Location bears a character's name or legacy |

---

### 3.3 Faction Relationships (Faction ↔ Faction / Character ↔ Faction)

| Type Name | Source → Target | Direction | Description |
|---|---|---|---|
| `ALLIED_WITH` | Faction ↔ Faction | MUTUAL | Active alliance |
| `AT_WAR_WITH` | Faction ↔ Faction | MUTUAL | Active military conflict |
| `TRIBUTARY_OF` | Faction → Faction | DIRECTED | Faction pays tribute to another |
| `PARENT_OF` | Faction → Faction | DIRECTED | Organizational parent (empire contains kingdom) |
| `SUBSIDIARY_OF` | Faction → Faction | DIRECTED | Organizational subsidiary |
| `MEMBER_OF` | Character → Faction | DIRECTED | Active membership |
| `FORMER_MEMBER_OF` | Character → Faction | DIRECTED | Past membership |
| `LEADS` | Character → Faction | DIRECTED | Leadership role |
| `FOUNDED` | Character → Faction | DIRECTED | Historical founding (immutable story fact) |
| `EXILED_FROM` | Character → Faction | DIRECTED | Formally expelled |
| `ENEMY_OF` | Character/Faction ↔ Faction | MUTUAL | Active enmity against a Faction |
| `INFILTRATES` | Character → Faction | DIRECTED | Secret membership with hostile intent |
| `NEGOTIATES_WITH` | Faction ↔ Faction | MUTUAL | Active diplomatic engagement |

---

### 3.4 Organization Relationships (Character ↔ Organization / Faction ↔ Organization)

| Type Name | Source → Target | Description |
|---|---|---|
| `MEMBER_OF_ORG` | Character → Organization | Platform-level organizational membership |
| `ADMINISTERS` | Character → Organization | Administrative authority |
| `OPERATES_WITHIN` | Faction → Organization | Faction uses the platform via this Organization |

*Note: Organization-level relationships are platform structural relationships, not story-world relationships. They are governed by the Organization Domain, not the Relationship Domain.*

---

### 3.5 Narrative Relationships (NarrativeUnit ↔ NarrativeUnit / Entity ↔ NarrativeUnit)

| Type Name | Source → Target | Description |
|---|---|---|
| `PART_OF` | NarrativeUnit → NarrativeUnit | Hierarchical narrative containment (scene → chapter) |
| `PRECEDES` | NarrativeUnit → NarrativeUnit | Narrative ordering (chapter A precedes chapter B) |
| `FEATURES` | NarrativeUnit → Character | This content features this character |
| `SET_IN` | NarrativeUnit → Location | This content is set in this location |
| `REFERENCES` | NarrativeUnit → Entity | This content references this entity without featuring it |
| `ESTABLISHES` | NarrativeUnit → KnowledgeFact | This content is the source for this knowledge fact |
| `FORESHADOWS` | NarrativeUnit → Event | Earlier content hints at a later event |
| `RESOLVES` | NarrativeUnit → Event/Conflict | This content resolves a previously established conflict or event |

---

### 3.6 Timeline Relationships (Event ↔ Event / Event ↔ Entity)

| Type Name | Source → Target | Direction | Description |
|---|---|---|---|
| `CAUSED` | Event → Event | DIRECTED | Causal relationship between events |
| `PRECEDED` | Event → Event | DIRECTED | Chronological precedence |
| `ENABLED` | Event → Event | DIRECTED | A made B possible (softer than CAUSED) |
| `PREVENTED` | Event → Event | DIRECTED | A made B impossible |
| `PARTICIPATED_IN` | Character → Event | DIRECTED | Character involved in event |
| `INSTIGATED` | Character → Event | DIRECTED | Character caused or initiated event |
| `WITNESSED` | Character → Event | DIRECTED | Character observed but did not act |
| `AFFECTED_BY` | Entity → Event | DIRECTED | Entity's state changed as a result of event |
| `OCCURRED_DURING` | Event → Event | DIRECTED | One event happened within the timeframe of another |

---

### 3.7 Knowledge Relationships (Entity ↔ KnowledgeFact)

| Type Name | Source → Target | Description |
|---|---|---|
| `SUBSTANTIATED_BY` | KnowledgeFact → NarrativeUnit | The narrative content that proves this fact |
| `CONTRADICTS` | KnowledgeFact → KnowledgeFact | Two facts are in logical conflict |
| `SUPERSEDES` | KnowledgeFact → KnowledgeFact | Newer fact replaces older fact |
| `IMPLIES` | KnowledgeFact → KnowledgeFact | AI-inferred logical consequence (not Canon unless confirmed) |
| `ABOUT` | KnowledgeFact → Entity | The entity this fact describes |
| `CONFIRMED_BY` | KnowledgeFact → UserId | The creator who confirmed this fact as Canon |

---

### 3.8 Ownership Relationships (Character ↔ Item / Faction ↔ Item)

| Type Name | Source → Target | Description |
|---|---|---|
| `OWNS` | Character/Faction → Item | Current ownership |
| `OWNED_BY` | Item → Character/Faction | Inverse: owned by |
| `FORMERLY_OWNED` | Character/Faction → Item | Past ownership |
| `SEEKS` | Character/Faction → Item | Actively trying to acquire |
| `CREATED_ITEM` | Character → Item | Character made or crafted the item |
| `DESTROYED_ITEM` | Character/Event → Item | Character or event destroyed the item |
| `GUARDS` | Character/Faction → Item | Responsible for protecting this item |
| `WIELDED_BY` | Item → Character | Current wielder (for weapons, tools) |

---

### 3.9 Hierarchical Relationships

Hierarchical relationships establish parent-child or superior-subordinate structures. They differ from general relationships in that they must form trees (or forests) — cycles are structurally invalid.

| Type Name | Description |
|---|---|
| `PARENT_OF` | Generic hierarchical parent |
| `CHILD_OF` | Generic hierarchical child |
| `DIVISION_OF` | Organizational subdivision |
| `CONTAINS` | Spatial containment (also in Location Relationships) |

**Hierarchy rules:**
- Hierarchical relationships form directed acyclic graphs (DAGs), not cycles.
- The system automatically validates that no hierarchical relationship creates a cycle.
- Maximum hierarchy depth is configurable per Universe (default: 20 levels).
- A root-level entity in a hierarchy has no parent — this is a valid state.

---

### 3.10 Temporal Relationships

Temporal relationships encode how one entity or event relates to another across story time.

| Type Name | Description |
|---|---|
| `EXISTED_BEFORE` | Entity or event A predates B |
| `EXISTED_AFTER` | Entity or event A postdates B |
| `CONTEMPORARY_WITH` | A and B existed at the same story time |
| `SUCCEEDED` | A replaced or followed B in a role or position |
| `PRECEDED_BY` | Inverse of SUCCEEDED |
| `EVOLVED_FROM` | A is a transformation of B (the character after a major arc change) |

---

### 3.11 Dependency Relationships

Dependency relationships model structural or functional dependencies between entities.

| Type Name | Description |
|---|---|
| `REQUIRES` | A cannot function without B |
| `ENABLES` | A makes B possible |
| `BLOCKS` | A prevents B |
| `INFLUENCES` | A's state affects B's state |
| `DERIVED_FROM` | B was created or derives from A |

---

### 3.12 Plugin Relationships

Plugins may define custom relationship types within their declared namespace scope. Plugin-defined relationship types:

- Must be declared in the PluginManifest's `declaredRelationshipTypes` section
- Follow the same RelationshipType schema as platform types
- Are scoped to Organizations where the plugin is installed
- Are prefixed with the plugin's namespace: `plugin.magic_system.DRAGON_BONDED`
- Cannot override or modify platform-defined relationship types
- Are archived when the plugin is uninstalled (existing relationships of that type are preserved)

---

### 3.13 AI Relationships

AI agents interact with relationships through three specific patterns:

**Pattern 1 — AI Proposes New Relationship:**
```
AI Agent analyzes story content
    ↓
Inference Engine identifies likely relationship
    ↓
RelationshipProposal created (type: PROPOSED)
    ↓
KnowledgeProposal submitted for creator review
    ↓
Creator confirms → DRAFT → Canon workflow
```

**Pattern 2 — AI Detects Relationship Contradiction:**
```
AI Consistency Agent traverses Knowledge Graph
    ↓
Detects two relationships that logically conflict
    ↓
ConsistencyViolation created with both relationship IDs
    ↓
Creator notified; neither relationship modified
    ↓
Creator resolves: accepts one, rejects other, or marks as intentional
```

**Pattern 3 — AI Scores Relationship Influence:**
```
AI Agent computes influence scores for relationships
    ↓
Influence score stored as MT-AI-SCORE metadata on relationship
    ↓
Score used for graph traversal weighting and search ranking
    ↓
Score labeled AI-generated; visible to creators for insight
```

---

## Part IV — Relationship Behavior

### 4.1 Creation Behavior

When a relationship is created, the following sequence occurs:

```
1. Source and target entity existence validated
2. Source and target entity types validated against RelationshipType rules
3. Cardinality constraint checked — no violation of max active relationships
4. Duplicate detection — no identical active/Canon relationship exists
5. Universe boundary validated — both entities in same Universe
6. Relationship record created (status: DRAFT or PROPOSED)
7. RelationshipVersion v1 created (immutable)
8. RelationshipHistoryEntry appended: RELATIONSHIP_CREATED
9. Domain event emitted: RelationshipCreated
10. Knowledge Graph edge candidate submitted
11. Audit record written
```

---

### 4.2 Deletion Behavior

Relationships are never deleted. The lifecycle provides two distinct ways a relationship can cease to be current:

**Story-world ending (ENDED):**
Something happens within the story that terminates the relationship. This is a story fact.
```
Creator initiates end action
    ↓
endEventId or endStoryTime provided
    ↓
Relationship status → ENDED
    ↓
RelationshipHistoryEntry: RELATIONSHIP_ENDED
    ↓
Knowledge Graph edge updated (marked inactive)
    ↓
Domain event: RelationshipEnded
    ↓
Audit record written
```

**Administrative archival (ARCHIVED):**
The relationship was created in error or is no longer relevant in the administrative sense.
```
Organization Admin initiates archive
    ↓
Reason required
    ↓
Relationship status → ARCHIVED
    ↓
RelationshipHistoryEntry: RELATIONSHIP_ARCHIVED
    ↓
Knowledge Graph edge removed
    ↓
Audit record written
```

**Difference:** ENDED is a story truth. ARCHIVED is an administrative decision. Both preserve all historical data.

---

### 4.3 Inverse Relationships

When a RelationshipType declares `hasNaturalInverse = true` with an `inverseTypeId`:

- Creating a `FATHER_OF` relationship automatically creates a corresponding `CHILD_OF` relationship.
- The inverse is created atomically in the same transaction.
- Ending the primary relationship automatically ends the inverse.
- The inverse is labeled `isAutoGenerated = true` and `isInverseOf: [primaryRelationshipId]`.

**Inverse management rules:**
- Auto-generated inverses cannot be independently modified — changes to the primary propagate.
- If the creator explicitly creates the inverse before the system does, the system detects the existing relationship and links it rather than creating a duplicate.
- Custom RelationshipDefinitions may declare inverses; the same auto-generation behavior applies.

---

### 4.4 Symmetric Relationships

A symmetric relationship (e.g., `SIBLING_OF`) holds in both directions by definition. Two modeling options:

**Option A — Single Mutual Edge:**
Store one relationship with `direction = MUTUAL`. The Knowledge Graph represents it as a bidirectional edge.

**Option B — Two Directed Edges (mirrored):**
Store two directed relationships, each auto-generating the other as its inverse.

StoryOS uses **Option A** for natively symmetric types (`isSymmetric = true` on the RelationshipType). Option B is used for `ASYMMETRIC_MUTUAL` types where each direction carries different semantic weight.

---

### 4.5 Transitive Relationships

A transitive relationship (e.g., `ANCESTOR_OF`) means: if A is ancestor of B, and B is ancestor of C, then A is ancestor of C.

**Transitivity behavior:**
- The transitive closure is **not** automatically stored as explicit relationships — this would produce exponential record growth.
- Instead, transitivity is computed at query time during graph traversal.
- The Knowledge Graph's traversal engine supports depth-unbounded traversal for transitive relationship types.
- AI agents use transitive traversal for inheritance chain queries.
- Creators may optionally request that specific transitive connections be explicitly materialized as relationships.

---

### 4.6 Conflict Detection

The Consistency Domain monitors for relationship conflicts:

| Conflict Type | Description | Example |
|---|---|---|
| `MUTUAL_EXCLUSION` | Two active relationships of mutually exclusive types | Character is simultaneously ALLY and ENEMY of the same character |
| `CARDINALITY_VIOLATION` | More relationships than the type's cardinality allows | Character has two `HAS_ARCHENEMY` relationships |
| `TEMPORAL_IMPOSSIBILITY` | Relationship's story time conflicts with entity status | `MARRIED_TO` starts after a character's confirmed death |
| `LOGICAL_CONTRADICTION` | Two relationships imply contradictory states | A character `CONTROLS` a Location and is simultaneously `IMPRISONED_IN` the same Location |
| `CAUSAL_PARADOX` | Timeline relationship creates a causal loop | Event A `CAUSED` Event B which `CAUSED` Event A |

**Conflict handling:**
- Detected conflicts produce `ConsistencyViolation` records.
- Creators are notified and must resolve — not the system.
- The system does not auto-resolve conflicts. Resolving a conflict is a story decision.
- Conflicting relationships remain active until the creator resolves — the conflict state is flagged, not blocked.

---

### 4.7 Self-Reference Rules

Self-referential relationships (same entity as both source and target) are forbidden for all standard relationship types. The domain boundary rejects them.

**Exception:** Certain computed narrative structures may produce apparent self-reference (a character who is their own ancestor via time travel). These are modeled as relationships between distinct entity versions (the character at time T1 and the character at time T2 are different `CharacterTimePoint` representations within a branched Timeline), not as self-references.

---

### 4.8 Cycle Handling

Cyclical relationship chains (A → B → C → A via the same relationship type) are permitted for non-hierarchical types but flagged:

- **Non-hierarchical types:** Cycles are permitted and flagged as `CYCLE_DETECTED` in graph health. Creators decide if this is intentional (e.g., a circular alliance structure) or an error.
- **Hierarchical types** (`CONTAINS`, `PARENT_OF`, `CHILD_OF`): Cycles are structurally forbidden and rejected at creation time.
- **Causal types** (`CAUSED`, `ENABLED`): Cycles are rejected because they produce temporal paradoxes. The Timeline Domain's paradox detection handles this.

---

## Part V — Relationship Versioning

### 5.1 Relationship Version History

Every change to a relationship produces an immutable RelationshipVersion. The version chain captures the complete evolution of any relationship:

```
v1: CREATED — DRAFT — strength=3, sentiment=NEUTRAL
v2: ATTRIBUTE_CHANGED — strength=4, sentiment=POSITIVE (alliance deepened)
v3: CANON_CONFIRMED — status transitions to CANON
v4: ATTRIBUTE_CHANGED — sentiment=NEGATIVE (betrayal event referenced)
v5: STATUS_CHANGED — ENDED — endEventId=[EventId of betrayal]
```

Each version is immutable. The complete evolution of the alliance-to-betrayal arc is permanently preserved.

---

### 5.2 Relationship Snapshots

Relationship snapshots are included in Story Universe snapshots:

- All ACTIVE and CANON relationships at the snapshot time
- All relationship property values at the snapshot time
- All relationship metadata values at the snapshot time
- Relationship lifecycle state at the snapshot time

Snapshots enable:
- Restoring the relationship graph to a specific story state
- Comparing relationship graphs at two different story time points
- Exporting the complete relational fabric of a Universe

---

### 5.3 Relationship Type Evolution

Relationship types (the taxonomy) evolve over time. Managing this evolution:

**Non-breaking type changes:**
- Adding a new RelationshipType (new relationships can use it; existing relationships unaffected)
- Adding a new optional RelationshipProperty to an existing type
- Adding a new allowed source or target entity type

**Breaking type changes:**
- Removing a RelationshipType (existing relationships of that type must be migrated)
- Making an optional property required (existing relationships missing the value must be updated)
- Changing cardinality to be more restrictive

Breaking changes follow the same migration pattern as Metadata Schema evolution: impact analysis → migration plan → administrator approval → execution.

---

### 5.4 Compatibility

When a relationship is read from the Version Store, the `RelationshipType` definition active at the time of that version may differ from the current definition. The compatibility resolution:

| Scenario | Resolution |
|---|---|
| Type unchanged | Version reads normally |
| Type added properties since version | New properties are absent in historical version — this is expected |
| Type removed properties since version | Historical version may carry values for removed properties — preserved as legacy |
| Type renamed | Version carries the type ID, not the name; the rename is tracked in the type's own version history |
| Type deprecated | Historical relationships retain their type; new relationships cannot use the type |

---

## Part VI — Graph Traversal

### 6.1 Traversal Overview

The Relationship Domain provides the graph traversal engine that powers Knowledge Graph queries, AI reasoning, and creator-facing relationship exploration. Traversal operates over the graph of entities (nodes) and relationships (edges).

---

### 6.2 Path Traversal

**Definition:** Find all entities reachable from a source entity following a specified sequence of relationship types.

**Example:** Starting from Character A, follow `MEMBER_OF` → Faction, then follow `ALLIED_WITH` → other Factions, then follow `LEADS` → Characters of allied factions.

**Parameters:**
- `startEntityId` — where traversal begins
- `traversalPattern` — the sequence of RelationshipTypes to follow
- `maxDepth` — maximum steps to traverse (default: configurable; max: 10)
- `direction` — OUTBOUND / INBOUND / BOTH
- `filters` — constraints on intermediate or final nodes (e.g., status = CANON only)
- `includeRelationshipDetails` — whether to return full relationship attributes or just entity IDs

---

### 6.3 Depth-First Traversal

**Purpose:** Explore a relationship graph by following paths as deep as possible before backtracking. Useful for finding the deepest connections, longest influence chains, and complete ancestry trees.

**Configuration:**
- `startEntityId`
- `relationshipTypes[]` — which types to traverse
- `maxDepth` — prevents infinite traversal
- `visitedEntities` tracking to prevent infinite loops in non-hierarchical graphs

**Use cases:** Full lineage tracing; complete command chain discovery; deep influence analysis.

---

### 6.4 Breadth-First Traversal

**Purpose:** Explore a relationship graph level by level — all direct connections first, then all second-degree connections, and so on. Useful for finding the shortest path, nearest neighbors, and influence radius.

**Configuration:**
- `startEntityId`
- `relationshipTypes[]`
- `maxDepth`

**Use cases:** "Who does this character directly know?" → "Who do they know indirectly?" → Network mapping.

---

### 6.5 Shortest Path

**Purpose:** Find the minimum number of relationship hops between two specified entities.

**Parameters:**
- `sourceEntityId`
- `targetEntityId`
- `allowedRelationshipTypes[]` — constrain which relationship types may be traversed
- `maxDepth` — upper bound on path length (if path exceeds this, return "no path found")

**Example:** Find the shortest relationship path between a minor character and the main villain. This reveals how deeply embedded a character is in the story's relationship network.

**Use cases:** Six-degrees-of-separation analysis; connection discovery; influence chain identification.

---

### 6.6 Neighborhood Query

**Purpose:** Return all entities within N relationship hops of a specified entity, along with the relationships connecting them.

**Parameters:**
- `centerEntityId`
- `depth` — how many hops to explore (1 = direct connections; 2 = connections of connections)
- `relationshipTypes[]` — which types to include
- `entityTypeFilter[]` — which entity types to include in results
- `canonOnly` — whether to restrict to Canon relationships only

**Output:** A subgraph containing all reachable entities and their connecting relationships, up to the specified depth.

---

### 6.7 Connected Components

**Purpose:** Identify all isolated clusters in the relationship graph — groups of entities connected to each other but disconnected from the rest.

**Use cases:**
- Identify characters who have no relationships to the main story network (isolation detection)
- Find disconnected world regions
- Discover story elements that may be orphaned or under-connected

**Output:** A list of components, each containing the entities and their intra-component relationships. Components are ranked by size.

---

### 6.8 Influence Graph

**Purpose:** Compute a weighted influence score for each entity, representing how central and connected it is in the relationship network.

**Algorithm:** Adapted PageRank over the directed relationship graph, weighted by:
- Relationship strength (`strength` property, 1–5)
- Relationship Canon status (Canon relationships weighted higher)
- Relationship type significance (certain types carry higher influence weight)
- Number of incoming vs. outgoing relationships of each type

**Output:** Per-entity `InfluenceScore` stored as `MT-AI-SCORE` metadata, updated on each significant relationship change.

**Use cases:** Identify story pivots (characters whose relationships connect otherwise disconnected groups), find underexplored story threads, surface the most narratively important entities.

---

### 6.9 Relationship Scoring

Individual relationships are scored on multiple dimensions:

| Score | Description | Basis |
|---|---|---|
| `NarrativeWeight` | How significant this relationship is to the story | Strength, canon status, evidence count |
| `RecencyScore` | How recently this relationship was active or changed | Story time and real-world modification time |
| `ConflictScore` | Whether this relationship is in a contradiction state | Consistency violation status |
| `AISuggestedScore` | AI's computed relevance of this relationship to current story context | AI Inference Domain computation |
| `ComplexityScore` | How many history entries and property changes this relationship has | Version count, history entry count |

Scores are stored as MT-AI-SCORE metadata values and used for traversal weighting, search ranking, and creator dashboards.

---

## Part VII — Security

### 7.1 Relationship Permissions

| Action | Minimum Role | Condition |
|---|---|---|
| View non-secret relationships | Reader | Entity read access required |
| View secret relationships | Writer + SECRET_ACCESS grant | Secret access must be explicitly granted |
| Create relationship | Writer | Both entities must be readable |
| Modify relationship attributes | Writer | Own-created or Editor for any |
| Confirm relationship as Canon | Editor / Organization Admin | — |
| End relationship (story event) | Writer | — |
| Archive relationship (admin) | Organization Admin | — |
| Define custom RelationshipType | Organization Admin / Universe Owner | — |
| View AI-proposed relationships | Writer | — |
| Review AI proposals | Editor / Organization Admin | — |

---

### 7.2 Universe Isolation

Relationship isolation follows the same structural pattern as entity isolation:

- Relationship queries are partitioned by `universeId` at the storage level.
- A query cannot return relationships from a Universe the authenticated user does not have access to, regardless of query construction.
- Cross-universe relationship creation is structurally rejected — not filtered.
- AI agents' relationship reasoning is scoped to their assigned Universe; they cannot traverse relationships outside their scope.

---

### 7.3 Secret Relationship Handling

Secret relationships require special treatment throughout the system:

**Storage:** Secret relationships are stored in the same partition as regular relationships, with `isSecret = true`. Access control is enforced at query time.

**AI Memory:** AI agents with full Universe scope can see secret relationships in their Memory Graph, labeled as story-secret. This is intentional — the AI must understand the complete story, including secrets, to provide meaningful consistency checking.

**Display:** Secret relationships are rendered with a visual indicator in creator tools. They are never displayed in Reader-facing content.

**Revelation:** When `secretRevealEventId` is marked as Canon, the relationship's `isSecret` remains `true` as a historical record (the relationship was secret), but a `SecretRevealed` event is emitted and the Knowledge Graph edge is updated.

---

### 7.4 Audit

All relationship operations are recorded:

| Operation | Audit Record Fields |
|---|---|
| Relationship created | Actor, type, source, target, timestamp, lifecycle state |
| Relationship attribute updated | Actor, field, before/after values, timestamp |
| Relationship status changed | Actor, before/after status, reason, timestamp |
| Canon confirmed | Actor, confirmation event, timestamp |
| Relationship ended | Actor, end event reference, end story time, timestamp |
| Relationship archived | Actor, reason, timestamp |
| AI proposal submitted | Agent ID, type, source, target, confidence, timestamp |
| AI proposal accepted/rejected | Creator ID, decision, timestamp |

---

### 7.5 Encryption

All relationship data is encrypted at rest and in transit:

- Standard relationships: AES-256 at storage layer
- Secret relationships: additionally encrypted with a Universe-scoped key
- AI relationship proposals: encrypted; not shared beyond authorized reviewers
- Graph traversal results: transmitted over TLS 1.3 minimum

---

## Part VIII — Integration

### 8.1 Integration with Entity Architecture

Relationships are the connective tissue between entities. Integration points:

- Every Entity Architecture aggregate root can participate as a source or target.
- When an entity is ARCHIVED, all its relationships are evaluated for cascade impact: dependent relationships are flagged and creators are notified to review.
- Entity lifecycle changes emit events consumed by the Relationship Domain (e.g., `CharacterStatusChanged → DEAD` triggers `RelationshipDeathConsequenceCheck`).
- Entity version history includes relationship count at each version (from RelationshipVersion records).

---

### 8.2 Integration with Metadata Architecture

Relationships support the full Metadata Architecture:

- MetadataSchemas with `appliesTo: [RELATIONSHIP]` apply metadata to relationship instances.
- Relationship metadata includes AI annotations, plugin-contributed fields, and universe-specific extensions.
- Relationship metadata is indexed for search alongside relationship core attributes.
- Metadata versioning applies to relationship metadata values identically to entity metadata.

---

### 8.3 Integration with Knowledge Graph

The Knowledge Graph is the primary consumer of relationship data:

**Relationship → Knowledge Graph Edge mapping:**
```
Relationship (Relationship Domain)
    ↓ RelationshipCreated event
Knowledge Graph Domain
    ↓ Creates KnowledgeEdge
KnowledgeEdge { sourceNodeId, targetNodeId, edgeType, canonStatus, properties }
```

- Every Canon relationship produces a Canon Knowledge Graph edge.
- Proposed relationships produce edges labeled `PROPOSED_EDGE` in the Knowledge Graph.
- Ended relationships produce edges with `active = false` — preserved as historical edges.
- The Knowledge Graph's traversal engine operates over the edge set maintained by the Relationship Domain.
- Relationship scoring (Part VI.9) feeds directly into Knowledge Graph edge weights.

---

### 8.4 Integration with AI Memory

AI agents interact with the relationship layer through their Memory Graph:

- Memory Graph nodes for entities include their relationship neighborhood (direct connections within scope).
- AI Relationship Agent maintains a traversal context for the assigned Universe.
- When AI agents detect relationship contradictions, they emit ConsistencyViolation records — they do not modify relationships.
- Memory synchronization includes relationship state updates when Canon relationships change.
- AI-proposed relationships are stored as `PROPOSED` relationships, never promoted to Canon without creator action.

---

### 8.5 Integration with Workflow

Relationships participate in workflow logic:

- Workflow stage transitions may require that entities have certain relationships before advancing (e.g., a character cannot complete the "Hero's Journey" workflow stage without having at least one `MENTOR` relationship).
- Workflow events can trigger relationship-related notifications (e.g., completing a chapter that introduces a new character triggers a "Consider adding relationships" prompt).
- Relationship approval workflows (for high-stakes Canon relationships) can be configured as WorkflowTemplates.

---

### 8.6 Integration with Storage

Relationship data maps to the Storage Layer as follows:

| Data | Store | Reasoning |
|---|---|---|
| Relationship core attributes | Entity Store | Structured, queryable, versioned entity data |
| Relationship graph edges | Graph Store | Optimized for traversal and neighborhood queries |
| RelationshipVersion records | Version Store | Append-only historical records |
| RelationshipHistory entries | Entity Store (append-only partition) | Ordered history; not full versioning |
| Relationship audit records | Audit Store | Immutable; isolated |
| Relationship metadata values | Entity Store | Co-located with entity metadata |

---

### 8.7 Integration with Versioning

The Versioning Domain manages relationship version records:

- Every relationship change produces a `RelationshipVersion` record in the Version Store.
- Universe Snapshots include the complete relationship state (all versions' current pointers).
- Restoring a Universe to a snapshot restores the relationship graph to that state.
- Branch universes start with a copy of the relationship graph at branch time.
- Relationship version diffs are available for comparing two relationship states.

---

### 8.8 Integration with Audit

All relationship operations produce Audit Records as defined in the Audit Domain. Integration ensures:

- The Audit Store receives relationship events before any response is returned to the caller (not eventually consistent — synchronous for audit).
- AI relationship proposals are separately tracked in AI audit records.
- Relationship Canon confirmations produce high-priority audit records for compliance reporting.

---

### 8.9 Integration with Search

Relationships are integrated into the Search Domain:

- **Relationship search:** Find relationships by type, source/target entity type, Canon status, strength, or metadata values.
- **Entity search with relationship filters:** "Find all Characters who are `MEMBER_OF` a specific Faction and have `ENEMY` relationships."
- **Graph neighborhood in search results:** Entity search results can optionally include immediate relationship neighborhood.
- **AI semantic relationship search:** "Find characters with complex, evolving relationships" — uses AI scoring and MT-AI-VEC embeddings.
- Relationship indices are updated on every RelationshipCreated, RelationshipUpdated, and RelationshipEnded event.

---

## Part IX — Best Practices

### 9.1 Naming Conventions

| Concept | Convention | Good | Bad |
|---|---|---|---|
| Platform type names | SCREAMING_SNAKE_CASE | `FATHER_OF`, `ALLIED_WITH` | `fatherOf`, `allied with` |
| Custom Universe type names | SCREAMING_SNAKE_CASE | `DRAGON_BONDED`, `OATH_SWORN_TO` | `Dragon Bonded`, `oathSwornTo` |
| Plugin type names | Namespace-prefixed | `plugin.magic_system.DRAGON_BONDED` | `DRAGON_BONDED` (collision risk) |
| RelationshipProperty keys | snake_case | `alliance_strength`, `sworn_date` | `AllianceStrength`, `sworn date` |
| Custom type descriptions | Active voice | `"Character A commands Character B"` | `"Commanding relationship"` |
| Inverse type pair naming | Logical mirror | `FATHER_OF` / `CHILD_OF` | `FATHER_OF` / `IS_A_CHILD` |

---

### 9.2 Performance Guidelines

| Concern | Guideline |
|---|---|
| Relationship count per entity | Target < 1,000 direct relationships per entity; > 5,000 is a graph design smell |
| Traversal max depth | Default max depth of 5 for most traversal queries; 10 for ancestry/lineage |
| Transitive closure queries | Never compute full transitive closure at runtime for large graphs; use bounded depth |
| Secret relationship access | Index secret relationships separately to avoid full scan when revealing secrets |
| Graph edge count | Prune ended relationships from hot traversal paths; preserve in cold graph storage |
| Inverse relationship materialization | Auto-generate inverses for high-cardinality symmetric types; compute for low-volume |
| Relationship index selectivity | Index by (universeId, sourceEntityType, relationshipType) as the primary query pattern |
| AI traversal | AI agents should cache traversal results in their Memory Graph, not re-traverse on every inference |

---

### 9.3 Validation Checklist

Before any relationship-related feature is considered complete:

- [ ] RelationshipType is declared in the taxonomy (or custom definition approved)
- [ ] AllowedSourceTypes and AllowedTargetTypes are defined
- [ ] Direction is explicitly declared (DIRECTED / MUTUAL / ASYMMETRIC_MUTUAL)
- [ ] Cardinality constraints are defined
- [ ] Inverse relationship is declared if applicable
- [ ] Transitivity flag is set correctly
- [ ] Symmetry flag is set correctly
- [ ] Relevant RelationshipConstraints are declared
- [ ] Lifecycle states are complete
- [ ] Domain events are defined and consumed by Knowledge Graph
- [ ] AI proposal path is defined (not direct Canon write)
- [ ] Secret relationship visibility rules are defined
- [ ] Version chain is functional (test: create → update → check v1 and v2 both exist)
- [ ] Audit record is produced for every operation
- [ ] No cross-universe relationships are possible
- [ ] Self-reference rejection is tested

---

### 9.4 Common Mistakes

**❌ Mistake 1 — Treating relationships like database foreign keys**
A relationship between Character A and Location B is not a `home_location_id` field on Character A. It is a full Relationship entity with its own identity, history, Canon status, and properties.

**❌ Mistake 2 — Forgetting inverse relationships**
If `FATHER_OF` is created and `CHILD_OF` is not auto-generated, queries from the child's perspective find nothing. Every significant relationship type needs its inverse declared.

**❌ Mistake 3 — Embedding relationship data in entity fields**
A character entity should not carry a `friends_list`, `enemies_list`, or `faction_memberships` field. These are Relationships owned by the Relationship Domain.

**❌ Mistake 4 — Allowing AI to write Canon relationships directly**
AI agents produce RelationshipProposals. Only creators confirm proposals into Canon. This rule has no exceptions.

**❌ Mistake 5 — Missing relationship lifecycle management**
A relationship that a creator "deletes" without an ENDED story event loses provenance. All relationship terminations must be either ENDED (story event) or ARCHIVED (admin action), with the reason preserved.

**❌ Mistake 6 — Forgetting secret relationship access control**
Secret relationships visible to all users defeat the story's internal logic. Secret relationship access must be role-gated at the query level and enforced structurally.

**❌ Mistake 7 — Treating transitive relationships as explicit relationships**
If `A is ANCESTOR_OF B` and `B is ANCESTOR_OF C`, the system should not automatically create `A is ANCESTOR_OF C` as an explicit relationship. Compute transitivity at traversal time — not as data.

**❌ Mistake 8 — Not versioning relationship property changes**
If the strength of an alliance changes from 3 to 5 because of a story event, both states should be preserved as versions. A flat property update that overwrites history loses story meaning.

---

### 9.5 Architecture Rules

**ARCH-REL-001 — Relationships Are Domain Objects**
A Relationship is a first-class domain object with its own aggregate root, not a join record in a relational database or a field embedded in an entity.

**ARCH-REL-002 — The Relationship Domain Is the Authority for All Graph Edges**
The Knowledge Graph does not independently derive edges. All edges in the Knowledge Graph are sourced from Relationship Domain objects. The Relationship Domain is the single source of truth for inter-entity connections.

**ARCH-REL-003 — Canon Requires Human Confirmation**
This rule from the Architectural Constitution (P-CAN-001) applies to relationships with full force. No AI agent, automated process, or import job may produce a Canon relationship without an explicit creator confirmation action.

**ARCH-REL-004 — Relationship History Is Permanent**
A relationship's history entries are append-only and permanent. Understanding how a relationship evolved over story time is as valuable as knowing its current state.

**ARCH-REL-005 — Cross-Universe Relationships Do Not Exist**
At the Relationship Domain boundary, a relationship that would span two Story Universes is rejected before any storage operation occurs. This is not a filter — it is a hard domain rule.

**ARCH-REL-006 — Relationship Traversal Is Bounded**
All graph traversal queries are bounded by a maximum depth to prevent unbounded computation. Default maximum depth is configurable per Universe, with a platform-level hard cap.

**ARCH-REL-007 — Secret Relationships Are Structurally Access-Controlled**
Secret relationship visibility is enforced at the query layer through role-based partitioning, not through application-layer filtering. A query that returns secret relationships to an unauthorized user is an architectural defect, not an application bug.

---

> *"A story without relationships is a collection of facts. A story with relationships is a world. The Relationship Architecture is how StoryOS transforms a list of entities into a living, traversable, Canon-governed knowledge graph of an entire fictional universe."*

---

**Document End**
**Previous:** `docs/architecture/metadata_architecture.md` — Task 1.3 Approved
**Next:** `docs/architecture/knowledge_graph_architecture.md` — Task 1.5
