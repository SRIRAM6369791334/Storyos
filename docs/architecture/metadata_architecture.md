# Metadata Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.3 — Metadata Architecture
> **Depends On:** `docs/architecture/entity_architecture.md` — Task 1.2 Approved
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/relationship_architecture.md` — Task 1.4

---

## Preface

The Entity Architecture defined what objects exist in StoryOS and what they fundamentally are. Entity attributes — the fields every instance of that entity type must or may have — were designed to be stable and universal.

But StoryOS must serve a world-building community spanning fantasy kingdoms, science fiction civilizations, horror mythologies, manga universes, tabletop game settings, and everything between. No fixed entity schema can accommodate the full spectrum of what creators need to attach to their entities.

This document defines how StoryOS supports that diversity — through a principled, governed, versioned, searchable, and secure **Metadata Architecture**.

> **The central rule of this document:**
> Metadata extends entities. It never replaces them. Core entity identity and Canon attributes are defined by the Entity Architecture. Metadata fills the space beyond that boundary.

---

## Part I — Metadata Principles

### 1.1 Metadata Philosophy

Metadata in StoryOS is structured extensibility. It is the answer to the question: *"After we define the universal structure of an entity, how does each Story Universe customize what additional information it tracks?"*

A Character always has a name, a status, and a Canon classification — these are entity attributes. But does a Character have a Blood Type? A Hogwarts House? A Combat Power Level? A Player Character class? These are universe-specific, creator-specific, genre-specific concerns. They must not pollute the core entity schema, because adding them there would mean every system that processes Character entities everywhere must handle them.

Instead, they live in the Metadata Layer — structured, typed, validated, versioned, searchable, and governed — but **separate** from the entity core.

This philosophy produces a platform with two layers of data per entity:

```
ENTITY LAYER          ← Universal. Defined by Entity Architecture. Stable.
    ↓
METADATA LAYER        ← Extensible. Defined per Schema. Flexible.
```

Both layers are equally important. Both are versioned. Both are audited. But only the Entity Layer carries Canon authority over story truth. Metadata is always supporting context.

---

### 1.2 Metadata Design Goals

| Goal | Description |
|---|---|
| **MG-01 Extensibility** | Any entity type can be extended with any number of typed metadata fields without modifying the entity schema |
| **MG-02 Universe Isolation** | Metadata schemas defined for one Story Universe are invisible and inaccessible to all other Universes |
| **MG-03 Typed Safety** | Every metadata value has a declared type. Untyped, freeform metadata blobs are not permitted |
| **MG-04 Governance** | Metadata schemas are owned, versioned, and require authorization to create or modify |
| **MG-05 Searchability** | All metadata values are searchable within their scope |
| **MG-06 AI Awareness** | AI agents can read metadata and, with explicit permission, contribute metadata values |
| **MG-07 Plugin Extension** | Plugins may define new metadata fields within their approved scope |
| **MG-08 Canon Separation** | Metadata never affects Canon status. A metadata value cannot make an entity Canon or non-Canon |
| **MG-09 Inheritance** | Metadata schemas can inherit from parent schemas, enabling reuse without duplication |
| **MG-10 Performance** | Metadata retrieval must not degrade core entity query performance |

---

### 1.3 Metadata Rules

**Rule META-001 — Metadata Augments; It Does Not Replace**
Metadata never replaces an entity attribute. If an attribute is universal enough to belong on every instance of an entity type, it belongs in the Entity Architecture, not the Metadata Layer.

**Rule META-002 — Metadata Never Grants Canon Authority**
A metadata value cannot be used to declare an entity Canon. Canon status is exclusively managed by the Canon Management Domain through the defined Canon confirmation workflow.

**Rule META-003 — Metadata Belongs to the Entity It Annotates**
Metadata values exist in the scope of the entity they annotate. Deleting or archiving an entity does not delete its metadata history — metadata follows the entity's version and audit lifecycle.

**Rule META-004 — Metadata Schemas Are Owned, Not Shared**
A MetadataSchema belongs to exactly one scope (Organization or Story Universe). Schemas are not shared between Universes or between Organizations. If two Universes need similar schemas, they each define their own.

**Rule META-005 — Schema Modifications Are Non-Breaking by Default**
Adding a new optional field to a MetadataSchema is always safe. Removing or making required a previously optional field is a breaking change that requires a migration plan and explicit administrator action.

**Rule META-006 — All Metadata Is Typed**
Every metadata field is declared with a specific MetadataType. Generic string blobs that could contain anything are not valid metadata fields. If the type cannot be defined, the metadata is not ready to be modeled.

**Rule META-007 — System Metadata Is Immutable to Users**
System-generated metadata (creation timestamps, AI labels, extraction confidence scores) cannot be modified by users or plugins. These are set by the system and remain as recorded.

**Rule META-008 — Plugins May Only Access Declared Metadata Scopes**
A plugin may only read or write metadata fields that are within the plugin's approved scope. A plugin cannot access metadata defined by another plugin or by the system outside its declared scope.

**Rule META-009 — Metadata Has No Cross-Universe Visibility**
A metadata schema or value defined within Universe A is completely invisible in Universe B — even if both Universes belong to the same Organization.

**Rule META-010 — AI Metadata Is Always Labeled**
Any metadata value created or modified by an AI agent carries a permanent AI-origin label. AI-created metadata cannot appear to users as human-authored data.

---

### 1.4 Metadata Lifecycle

```
SCHEMA DEFINITION LIFECYCLE:

  MetadataNamespace defined (by Organization or Universe)
      ↓
  MetadataSchema created (with initial field definitions)
      ↓
  MetadataSchema DRAFT ──► ACTIVE ──► DEPRECATED ──► ARCHIVED
                              │
                          Field added (non-breaking; safe)
                              │
                          Field modified (may be breaking; requires review)
                              │
                          Field removed (always breaking; requires migration)

VALUE LIFECYCLE:

  Entity created
      ↓
  Metadata fields defined by active schema
      ↓
  MetadataValue created (by user, AI agent, or plugin)
      ↓ [every value change creates a new MetadataValueVersion]
  MetadataValue CURRENT ──► SUPERSEDED (on any update)
      ↓
  Entity archived
      ↓
  MetadataValues preserved read-only with entity version history
```

---

### 1.5 Metadata Ownership

| Metadata Category | Defined By | Modified By | Scope |
|---|---|---|---|
| **Platform System Metadata** | Platform (StoryOS) | Platform only | All entities across all Organizations |
| **Organization Metadata** | Organization Admin | Organization Admin | All Universes within the Organization |
| **Universe Metadata** | Universe Owner / Organization Admin | Universe Owner / Admin | One Story Universe |
| **AI Metadata** | AI agents | AI agents (within scope) | Per entity, labeled AI-origin |
| **Plugin Metadata** | Plugin developer (declared in manifest) | Plugin (within approved scope) | Per entity, labeled plugin-origin |

No metadata category may modify a field belonging to a higher category. Plugin metadata cannot overwrite Universe metadata. Universe metadata cannot overwrite Organization metadata. Organization metadata cannot overwrite Platform System metadata.

---

### 1.6 Metadata Classification

Metadata is classified by its origin and purpose:

| Class Symbol | Class Name | Origin | AI Access | Plugin Access |
|---|---|---|---|---|
| `[SYS]` | System Metadata | Platform-generated | Read | None |
| `[ORG]` | Organization Metadata | Organization Admin | Read | Declared scope |
| `[UNI]` | Universe Metadata | Universe Owner | Read | Declared scope |
| `[AI]` | AI Metadata | AI Agents | Read/Write (own scope) | None |
| `[PLG]` | Plugin Metadata | Plugins | Read (own scope) | Read/Write (own scope) |
| `[USR]` | User-Defined Metadata | Writers/Editors | Read | Declared scope |

---

### 1.7 Metadata Validation Principles

**VP-001 — Type Validation is Mandatory**
Every metadata value is validated against its declared MetadataType before acceptance. A value that fails type validation is rejected with a descriptive error.

**VP-002 — Required Fields Are Enforced at the Schema Level**
If a MetadataSchema declares a field as required, any entity of the applicable type within the schema's scope that lacks that field value is flagged as incomplete.

**VP-003 — Constraint Validation Is Composable**
Constraints on a metadata field are composable: a field may have a minimum length, a maximum length, an allowed values list, and a regex pattern — all enforced simultaneously.

**VP-004 — Cross-Field Validation Is Supported**
A MetadataSchema may define cross-field validation rules: if Field A has value X, then Field B must be present. This enables conditional required logic.

**VP-005 — Validation Errors Are Descriptive and Specific**
A metadata validation error identifies the specific field, the violated constraint, the rejected value (where safe), and the human-readable explanation.

**VP-006 — AI-Created Metadata Is Validated Like Human-Created Metadata**
The same validation rules apply to metadata created by AI agents. AI origin does not exempt a value from type or constraint validation.

---

### 1.8 Metadata Security Principles

**SP-001 — Metadata Inherits Entity Access Control**
If a user cannot read an entity, they cannot read that entity's metadata. Metadata access is never granted independently of entity access.

**SP-002 — Metadata May Have Additional Restrictions**
A metadata field may be marked with an elevated visibility restriction (PRIVATE, RESTRICTED, CONFIDENTIAL) that further limits which roles can see it, within the entity's authorized audience.

**SP-003 — Sensitive Metadata Is Encrypted at Rest**
Metadata fields classified as CONFIDENTIAL are encrypted at rest with Organization-scoped keys. This applies to fields containing personal information, business-sensitive data, or legal content.

**SP-004 — All Metadata Writes Are Audited**
Every metadata value creation, modification, and deletion is recorded in the Audit System with full actor attribution, timestamp, previous value, and new value.

**SP-005 — Metadata Export Requires Authorization**
Exporting metadata — including through plugins, API access, or bulk export — is subject to the same authorization rules as entity export. AI metadata is never exported without explicit creator consent.

---

## Part II — Metadata Model

### 2.1 Core Metadata Objects

The Metadata Architecture is built from eleven primary objects. Together, they define the complete system for creating, governing, applying, and querying metadata across the platform.

---

#### 2.1.1 MetadataNamespace

**Purpose:** The root container that groups related MetadataSchemas. A namespace establishes a named scope and prevents field name collisions between schemas from different sources.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `namespaceId` | `NamespaceId` | Immutable identifier |
| `name` | `NamespaceName` | Unique within the organization; e.g., `storyos.system`, `org.acme`, `universe.lotr` |
| `ownerType` | `OwnerType` | PLATFORM / ORGANIZATION / UNIVERSE / PLUGIN |
| `ownerId` | `OwnerId` | The owning organization, universe, or plugin |
| `classification` | `MetadataClass` | SYS / ORG / UNI / AI / PLG / USR |
| `description` | `Description` | Human-readable purpose of this namespace |

**Rules:**
- Platform namespaces (`storyos.*`) are defined by the platform and cannot be created by users or plugins.
- Organization namespaces are created by Organization Admins and apply across all their Universes.
- Universe namespaces are scoped to a single Story Universe.
- Plugin namespaces are created by approved plugins and isolated to that plugin's scope.

---

#### 2.1.2 MetadataSchema

**Purpose:** A named, versioned definition of a set of metadata fields that can be applied to a specific entity type within a namespace. A schema is the contract between the metadata definition and every entity instance it applies to.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `schemaId` | `SchemaId` | Immutable identifier |
| `namespaceId` | `NamespaceId` | Owning namespace |
| `name` | `SchemaName` | Unique within namespace; e.g., `character_extended`, `location_climate` |
| `version` | `SchemaVersion` | Semantic version of this schema |
| `appliesTo` | `EntityType[]` | Which entity types this schema can annotate |
| `scope` | `SchemaScope` | ORGANIZATION / UNIVERSE (id provided) / GLOBAL |
| `status` | `SchemaStatus` | DRAFT / ACTIVE / DEPRECATED / ARCHIVED |
| `parentSchemaId` | `SchemaId?` | Optional parent for schema inheritance |
| `isSystem` | `Boolean` | Whether this schema is platform-defined |
| `isRequired` | `Boolean` | Whether all entities of `appliesTo` types must have this schema applied |
| `createdBy` | `UserId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |

**Schema States:**

| State | Description |
|---|---|
| `DRAFT` | Schema under construction; not yet applied to entities |
| `ACTIVE` | Schema is live; entity instances may carry values for its fields |
| `DEPRECATED` | Schema no longer recommended; existing values preserved; new applications discouraged |
| `ARCHIVED` | Schema permanently retired; all values frozen; schema cannot be applied to new entities |

---

#### 2.1.3 MetadataDefinition

**Purpose:** A single field definition within a MetadataSchema. This is the atomic unit of the metadata system — the description of one piece of information that can be attached to an entity.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `definitionId` | `DefinitionId` | Immutable identifier |
| `schemaId` | `SchemaId` | Owning schema |
| `fieldKey` | `FieldKey` | Machine-readable identifier; unique within schema; snake_case |
| `displayName` | `DisplayName` | Human-readable field label |
| `description` | `FieldDescription` | Explanation of what this field captures |
| `metadataType` | `MetadataType` | Declared value type (see Part III) |
| `isRequired` | `Boolean` | Whether every applicable entity must have this value |
| `isReadOnly` | `Boolean` | Whether the value can only be set by the system |
| `isHidden` | `Boolean` | Whether this field is visible to regular users |
| `isAIEditable` | `Boolean` | Whether AI agents may set this field's value |
| `isPluginEditable` | `Boolean` | Whether plugins may set this field's value |
| `defaultValue` | `MetadataValue?` | Value used when entity is created without this field |
| `constraints` | `MetadataConstraint[]` | Validation rules applied to values |
| `visibility` | `VisibilityLevel` | PUBLIC / ORGANIZATION / RESTRICTED / CONFIDENTIAL |
| `orderIndex` | `Integer` | Display order within the schema |
| `groupName` | `GroupName?` | Optional UI grouping label |
| `deprecatedAt` | `Timestamp?` | When this field was marked deprecated |

**FieldKey naming rules:**
- Snake case only: `blood_type`, `power_level`, `hogwarts_house`
- Namespace-prefixed when from non-universe sources: `org.acme.approval_tier`, `plugin.magic_system.affinity`
- Cannot start with `system_` (reserved for platform fields)
- Cannot contain double underscores (reserved for system use)

---

#### 2.1.4 MetadataValue

**Purpose:** The actual value of a metadata field for a specific entity instance. This is the runtime data — what a specific Character's `blood_type` is, or what a specific Location's `climate_zone` is.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `valueId` | `ValueId` | Immutable; assigned at creation |
| `entityId` | `EntityId` | The entity this value annotates |
| `entityType` | `EntityType` | Type of the annotated entity |
| `definitionId` | `DefinitionId` | The MetadataDefinition this value satisfies |
| `schemaId` | `SchemaId` | Denormalized for query efficiency |
| `value` | `TypedValue` | The actual value; type-checked against the definition's MetadataType |
| `valueStatus` | `ValueStatus` | CURRENT / SUPERSEDED |
| `authorId` | `ActorId` | Who set this value |
| `authorType` | `AuthorType` | HUMAN / AI_AGENT / PLUGIN / SYSTEM |
| `createdAt` | `Timestamp` | Immutable |
| `isAIGenerated` | `Boolean` | Whether this value was produced by an AI agent |
| `aiConfidence` | `ConfidenceScore?` | Present only if `isAIGenerated = true` |
| `isConfirmedByHuman` | `Boolean` | Whether an AI-generated value has been creator-reviewed |

---

#### 2.1.5 MetadataTemplate

**Purpose:** A pre-configured set of MetadataSchemas bundled together for rapid application to a new Story Universe or entity type. Templates represent common configurations so creators don't need to define schemas from scratch.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `templateId` | `TemplateId` | Immutable |
| `name` | `TemplateName` | e.g., `High Fantasy Universe`, `Science Fiction Character`, `RPG World` |
| `description` | `Description` | What this template provides |
| `includedSchemas` | `SchemaId[]` | The schemas bundled into this template |
| `targetEntityTypes` | `EntityType[]` | Which entity types this template primarily targets |
| `genre` | `GenreClassification[]` | Genre context for which this template is recommended |
| `isSystemTemplate` | `Boolean` | Platform-provided vs. Organization-defined |
| `applicationsCount` | `Integer` | Derived; how many Universes use this template |

---

#### 2.1.6 MetadataConstraint

**Purpose:** A single validation rule applied to a MetadataDefinition field. Constraints are composable — multiple constraints may apply to a single field simultaneously.

**Constraint Types:**

| Constraint Type | Applies To | Parameters | Description |
|---|---|---|---|
| `MIN_LENGTH` | String, Rich Text | `minLength: Integer` | Minimum character count |
| `MAX_LENGTH` | String, Rich Text | `maxLength: Integer` | Maximum character count |
| `MIN_VALUE` | Number | `minValue: Number` | Minimum numeric value |
| `MAX_VALUE` | Number | `maxValue: Number` | Maximum numeric value |
| `ALLOWED_VALUES` | String, Enum | `allowedValues: String[]` | Value must be from the list |
| `REGEX_PATTERN` | String | `pattern: String` | Value must match regex |
| `DATE_RANGE` | Date, DateTime | `minDate, maxDate` | Date must be within range |
| `REFERENCE_TYPE` | Reference | `allowedEntityTypes: EntityType[]` | Referenced entity must be of specified type |
| `REQUIRED_IF` | Any | `conditionField, conditionValue` | Field required if another field has specified value |
| `EXCLUSIVE_WITH` | Any | `mutuallyExclusiveFields: FieldKey[]` | Only one of the listed fields may have a value |
| `LIST_MIN_COUNT` | List | `minCount: Integer` | List must have at least N items |
| `LIST_MAX_COUNT` | List | `maxCount: Integer` | List may have at most N items |
| `UNIQUE_IN_UNIVERSE` | String, Number | — | Value must be unique across all entities of this type in the Universe |
| `AI_REVIEW_REQUIRED` | Any | — | AI-generated values for this field always require human confirmation before display |

---

#### 2.1.7 MetadataType

The declared type system for metadata values. Defined in full in Part III.

---

#### 2.1.8 MetadataVersion

**Purpose:** An immutable historical record of a metadata value at a specific point in time. Every change to a MetadataValue creates a new MetadataVersion.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `metadataVersionId` | `MetadataVersionId` | Immutable |
| `valueId` | `ValueId` | The value being versioned |
| `versionNumber` | `Integer` | Sequential within the value's version chain |
| `previousValue` | `TypedValue` | The value before this change |
| `newValue` | `TypedValue` | The value after this change |
| `changedBy` | `ActorId` | Who made the change |
| `changeReason` | `ChangeReason?` | Optional documented reason |
| `changedAt` | `Timestamp` | Immutable |

---

#### 2.1.9 MetadataInheritance

**Purpose:** The definition of how a MetadataSchema inherits fields from a parent schema. Inheritance allows common field sets to be defined once and reused across multiple schemas.

**Inheritance Properties:**

| Property | Type | Description |
|---|---|---|
| `childSchemaId` | `SchemaId` | The inheriting schema |
| `parentSchemaId` | `SchemaId` | The schema being inherited from |
| `inheritanceMode` | `InheritanceMode` | FULL / SELECTIVE / OVERRIDE |
| `selectedFields` | `FieldKey[]?` | For SELECTIVE mode: which parent fields to inherit |
| `overriddenFields` | `FieldDefinition[]?` | For OVERRIDE mode: local redefinitions of parent fields |

**Inheritance Modes:**

| Mode | Description |
|---|---|
| `FULL` | All parent fields are inherited exactly as defined |
| `SELECTIVE` | Only the explicitly listed parent fields are inherited |
| `OVERRIDE` | All parent fields are inherited, but specified fields are redefined locally |

**Inheritance Rules:**
- Circular inheritance is not permitted.
- A child schema may not relax a parent schema constraint (e.g., make a required field optional) without explicit administrator approval.
- A child schema may add constraints to an inherited field (e.g., narrow the allowed values list).
- Maximum inheritance depth is 3 levels (to maintain readability and debuggability).

---

#### 2.1.10 MetadataReference

**Purpose:** A metadata value of type `Reference` — a pointer from one entity's metadata to another entity within the same Story Universe. References allow metadata to create typed, validated cross-entity connections that are distinct from the Relationship Domain's formal relationships.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `referenceId` | `ReferenceId` | Immutable |
| `sourceEntityId` | `EntityId` | Entity carrying this reference in its metadata |
| `sourceDefinitionId` | `DefinitionId` | The metadata field containing the reference |
| `targetEntityId` | `EntityId` | The referenced entity |
| `targetEntityType` | `EntityType` | Type of the referenced entity |
| `createdAt` | `Timestamp` | Immutable |

**Rules:**
- A MetadataReference must point to an entity within the same Story Universe.
- When the target entity is archived, the reference is flagged as broken and surfaced in data health reports.
- MetadataReferences are distinct from Relationships — they are informal links in metadata context, not formal typed relationships managed by the Relationship Domain. If a connection is story-structurally significant, it belongs in the Relationship Domain.

---

#### 2.1.11 MetadataApplicationRecord

**Purpose:** Records which MetadataSchemas have been applied to which entity types within a Story Universe. This enables the system to know which schemas are active for which entities without querying all definitions.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `applicationId` | `ApplicationId` | Immutable |
| `schemaId` | `SchemaId` | The applied schema |
| `universeId` | `UniverseId` | The Universe where this application is active |
| `entityType` | `EntityType` | Which entity type in this Universe is annotated by this schema |
| `isInherited` | `Boolean` | Whether this application comes from an Organization-level schema |
| `appliedBy` | `UserId` | Who activated this schema for this entity type |
| `appliedAt` | `Timestamp` | Immutable |
| `status` | `ApplicationStatus` | ACTIVE / SUSPENDED / REMOVED |

---

## Part III — Metadata Types

### 3.1 Primitive Types

| Type ID | Type Name | Description | Example Values |
|---|---|---|---|
| `MT-STR` | String | Plain text up to defined max length | `"Amber"`, `"House Targaryen"` |
| `MT-NUM` | Number | Numeric value; integer or decimal as defined | `42`, `3.14`, `-100` |
| `MT-BOOL` | Boolean | True or false | `true`, `false` |
| `MT-DATE` | Date | Calendar date without time | `2045-03-15` |
| `MT-DTTM` | DateTime | Full timestamp with timezone | `2045-03-15T14:30:00Z` |
| `MT-URL` | URL | A validated web address | `https://example.com/lore` |
| `MT-EMAIL` | Email | A validated email address | `author@studio.com` |
| `MT-PHONE` | Phone | A phone number (E.164 format) | `+15551234567` |
| `MT-COLOR` | Color | A hexadecimal color value | `#C0392B` |
| `MT-GEO` | Geo | Latitude/longitude coordinate pair | `{lat: 51.5, lon: -0.1}` |

---

### 3.2 Structured Types

| Type ID | Type Name | Description | Constraints Available |
|---|---|---|---|
| `MT-ENUM` | Enum | Value from a predefined list of options | ALLOWED_VALUES required |
| `MT-LIST` | List | An ordered array of values of a uniform sub-type | LIST_MIN_COUNT, LIST_MAX_COUNT |
| `MT-DICT` | Dictionary | A key-value map with defined key schema | Key schema must be declared |
| `MT-REF` | Reference | A typed pointer to another entity (see MetadataReference) | REFERENCE_TYPE required |
| `MT-MEDIA` | Media | A reference to a MediaAsset | REFERENCE_TYPE = MEDIA |
| `MT-TAG` | Tag | A label from the Tag vocabulary | Multiple allowed per field |
| `MT-RTF` | Rich Text | Formatted text with markup (bold, italics, links) | MAX_LENGTH applies to plain text equivalent |

---

### 3.3 Computed Types

Computed metadata is not stored as a user-editable value — it is derived by the system from other entity data or metadata.

| Type ID | Type Name | Source | Refresh Trigger |
|---|---|---|---|
| `MT-COMP-INT` | Computed Integer | Formula over entity fields or other metadata | Source field change event |
| `MT-COMP-STR` | Computed String | Template rendering over entity data | Source field change event |
| `MT-COMP-BOOL` | Computed Boolean | Logical expression over entity fields | Source field change event |
| `MT-COMP-AGG` | Computed Aggregate | Aggregation (count, sum, avg) over related entities | Related entity change event |

**Computed metadata rules:**
- Computed metadata fields are always `isReadOnly = true`.
- Computed metadata fields are always `isAIEditable = false` and `isPluginEditable = false`.
- If the computation formula fails, the field value becomes a `COMPUTATION_ERROR` state, never corrupted.
- Computation formulas are defined in a restricted expression language, not arbitrary code.

---

### 3.4 AI Metadata Types

AI metadata is created by AI agents to annotate entities with structured intelligence derived from story knowledge.

| Type ID | Type Name | Created By | Example |
|---|---|---|---|
| `MT-AI-STR` | AI String Annotation | AI agents | `"This character's dialogue style is formal and archaic"` |
| `MT-AI-SCORE` | AI Score | AI agents | Consistency score `0.87`, complexity score `0.42` |
| `MT-AI-TAG` | AI Tag | AI agents | `"emotional_anchor"`, `"unreliable_narrator"`, `"foil_to_protagonist"` |
| `MT-AI-REL` | AI Relationship Suggestion | AI agents | Proposed unregistered connection between entities |
| `MT-AI-SUMMARY` | AI Summary | AI agents | Generated character or world element summary |
| `MT-AI-FLAG` | AI Consistency Flag | Consistency Agent | `"POSSIBLE_TIMELINE_VIOLATION"`, `"APPEARANCE_CONTRADICTION"` |
| `MT-AI-VEC` | AI Semantic Vector | AI agents | Embedding vector for semantic search; not human-readable |

**AI Metadata rules:**
- All AI metadata values carry `isAIGenerated = true`. This flag cannot be removed.
- AI metadata type `MT-AI-VEC` (semantic vectors) is never displayed to users — it is consumed internally by the Search and Inference systems.
- AI metadata values marked with constraint `AI_REVIEW_REQUIRED` are displayed with a pending indicator until a human reviewer confirms them.
- AI metadata does not affect Canon. An AI consistency flag is informational, not authoritative.

---

### 3.5 System Metadata Types

System metadata is created and maintained exclusively by the platform. Users, AI agents, and plugins cannot write these fields.

| Type ID | Type Name | Set By | Description |
|---|---|---|---|
| `MT-SYS-CREATED` | System Creation Timestamp | Platform | Authoritative creation time (mirrored from entity) |
| `MT-SYS-MODIFIED` | System Modification Timestamp | Platform | Last modification time; updated on any change |
| `MT-SYS-VERSION` | System Version Count | Platform | Number of versions in this entity's version chain |
| `MT-SYS-HEALTH` | Entity Health Score | Platform | Composite completeness and consistency score |
| `MT-SYS-CANON-DATE` | Canon Confirmation Date | Platform | When this entity was confirmed as Canon |
| `MT-SYS-WORD-COUNT` | Word Count | Platform | For Narrative entities; derived from content |
| `MT-SYS-REL-COUNT` | Relationship Count | Platform | Number of registered Relationships involving this entity |
| `MT-SYS-EXTRACT-COUNT` | Extraction Count | Platform | Number of times this entity has been referenced in content extraction |

---

### 3.6 Custom Metadata

Beyond the standard type catalog, Organizations and Universes may define custom metadata field types using the MetadataConstraint system applied to primitive types. For example:

- A **Power Level Range** field: `MT-NUM` with `MIN_VALUE: 1`, `MAX_VALUE: 9000`
- A **MBTI Type** field: `MT-ENUM` with `ALLOWED_VALUES: ["INTJ", "ENFP", ...]`
- A **Blood Type** field: `MT-ENUM` with `ALLOWED_VALUES: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]`
- A **Story Arc Stage** field: `MT-ENUM` with custom values per Universe narrative structure

Custom types are not new MetadataType identifiers — they are existing primitive or structured types with specific constraint configurations saved as reusable field definitions.

---

## Part IV — Metadata Behavior

### 4.1 Inheritance Behavior

When a MetadataSchema inherits from a parent schema, the following rules govern the combined result:

**Field Resolution Order (for a given entity instance):**
```
Platform System Schema fields (MT-SYS-*)
    ↓ (always present, always lowest priority override)
Organization Schema fields
    ↓
Universe Schema fields
    ↓
Plugin Schema fields (within their scope)
    ↓
User-defined Schema fields
    ↓ (highest specificity; displayed last, most contextual)
AI-generated metadata (MT-AI-*)
```

**Inheritance conflict resolution:**
- If a child schema and parent schema define the same `fieldKey`, the child schema's definition takes precedence.
- A child schema may narrow constraints (e.g., reduce max length, restrict allowed values).
- A child schema may NOT widen constraints (e.g., increase max length beyond parent's limit, add new allowed values to a restricted enum) without administrator approval.

---

### 4.2 Default Value Behavior

| Scenario | Default Value Source | Priority |
|---|---|---|
| Field has declared `defaultValue` in MetadataDefinition | MetadataDefinition | Applied at entity creation |
| Field is in parent schema with default | Parent MetadataDefinition | Applied at entity creation unless child overrides |
| Field is required with no default | No default — creation fails without value | N/A |
| Field is optional with no default | Value is absent (null) | No default applied |
| Field is computed | Value is derived on demand | N/A |

---

### 4.3 Visibility Rules

| Visibility Level | Who Can See | Who Can Set |
|---|---|---|
| `PUBLIC` | Any user with entity read access | Any user with entity write access |
| `ORGANIZATION` | Organization members only (guests cannot see) | Organization members with write access |
| `RESTRICTED` | Users with explicitly granted restricted access | Organization Admin / Universe Owner only |
| `CONFIDENTIAL` | Organization Admin only | Organization Admin only |
| `SYSTEM` | No users (internal only) | Platform only |
| `AI_INTERNAL` | No users (AI Layer only) | AI agents only |

---

### 4.4 Read-Only Rules

A metadata field may be read-only for specific actor types:

| `isReadOnly` | `isAIEditable` | `isPluginEditable` | Result |
|---|---|---|---|
| `true` | N/A | N/A | Field is read-only for ALL actors; only system can set |
| `false` | `false` | `false` | Only human users can write this field |
| `false` | `true` | `false` | Humans and AI agents can write; plugins cannot |
| `false` | `false` | `true` | Humans and plugins can write; AI agents cannot |
| `false` | `true` | `true` | Humans, AI, and plugins can all write |

---

### 4.5 Override Behavior

When an entity inherits a metadata schema from a parent scope (Organization → Universe), a Universe-level override can replace the value for that field without removing the parent schema definition. The precedence is:

```
Universe-level value > Organization-level value > Schema default value > Absent (null)
```

Override rules:
- An override does not delete the parent value — it shadows it. The parent value remains accessible through version history.
- If the override is removed, the parent value becomes visible again.
- An override must pass the same validation constraints as the original field.

---

### 4.6 Required Field Enforcement

A metadata field marked `isRequired = true` creates an **entity completeness obligation**:

- At entity creation: if a required metadata schema is applied to the entity type, the required fields must be provided or the entity remains in DRAFT state until populated.
- The system generates a `MetadataIncomplete` alert for entities missing required metadata fields.
- Required fields cannot be skipped during bulk import — the import system must provide values or the import candidate is flagged.

---

### 4.7 AI Metadata Confirmation Behavior

For metadata fields with constraint `AI_REVIEW_REQUIRED = true`:

```
AI Agent creates MetadataValue
    ↓ [isAIGenerated = true, isConfirmedByHuman = false]
Value is displayed to creator with AI-origin indicator and PENDING status
    ↓
Creator reviews value
    ↓ ACCEPTED: isConfirmedByHuman = true; displayed normally
    ↓ REJECTED: value archived; creator may set alternative value
    ↓ DEFERRED: remains in PENDING status; re-surfaces in next review cycle
```

For fields without `AI_REVIEW_REQUIRED`, AI-generated metadata is displayed immediately with the AI-origin indicator, without requiring explicit confirmation.

---

### 4.8 Plugin Metadata Behavior

Plugins may define their own MetadataSchemas within their approved namespace. Plugin metadata behavior:

- A plugin may only read metadata within its declared scope in its PluginManifest.
- A plugin may only write metadata fields within its own namespace prefix.
- A plugin cannot modify metadata defined by another plugin, by the Organization, or by the system.
- When a plugin is disabled or deprecated, its metadata values are preserved but flagged as `PLUGIN_INACTIVE`. The values remain readable but cannot be updated.
- When a plugin is uninstalled, its metadata schema is ARCHIVED and its values are preserved in the version history.

---

## Part V — Metadata Versioning

### 5.1 Version History

Every metadata value change creates an immutable MetadataVersion record. The complete change history of every metadata field for every entity is permanently preserved, following the same rules as entity versioning.

**Versioning applies to:**
- MetadataValue changes (any field update creates a new version)
- MetadataSchema changes (field additions, removals, constraint changes)
- MetadataDefinition changes (constraint updates, visibility changes)

---

### 5.2 Schema Evolution

Schema evolution is the process of changing a MetadataSchema while preserving the validity of existing entity data.

**Non-Breaking Changes (safe; do not require migration):**

| Change | Impact | Handling |
|---|---|---|
| Add optional field | No existing values affected | Field is absent on existing entities until set |
| Add new ALLOWED_VALUES option | No existing values affected | New option becomes available immediately |
| Increase MAX_LENGTH | No existing values affected | Existing values still valid under looser constraint |
| Add a description or displayName change | No existing values affected | Cosmetic only |

**Breaking Changes (require migration plan):**

| Change | Impact | Handling |
|---|---|---|
| Remove a field | Existing values become orphaned | Migration required: archive or migrate values before removal |
| Make optional field required | Existing entities without the value become incomplete | Migration required: provide default or bulk-set values |
| Reduce MAX_LENGTH | Existing values may violate new constraint | Validation warning applied; no automatic truncation |
| Change MetadataType of a field | Existing values may be incompatible | Migration required: define conversion logic |
| Remove an ALLOWED_VALUES option | Existing values using removed option become invalid | Migration required: remap or archive affected values |

**Migration Process:**
1. Schema change proposed as DRAFT version
2. Impact analysis performed: how many entities carry values for the affected field
3. Migration plan approved by Organization Admin
4. Migration executed (bulk value transformation or archival)
5. Schema version activated

---

### 5.3 Metadata Snapshots

A Metadata Snapshot captures the complete metadata state of a Story Universe at a specific point in time — all schema definitions, all field values for all entities. Metadata snapshots are included in Universe Snapshots.

**Snapshot contents:**
- All active MetadataSchemas and their field definitions at snapshot time
- All MetadataValues for all entities at snapshot time
- Schema version reference for each value

**Snapshot uses:**
- Restore metadata to a previous state
- Compare two metadata states (diff)
- Audit what metadata an entity had at a specific point in time

---

### 5.4 Metadata Compatibility Levels

When comparing two schema versions, compatibility is classified:

| Level | Description | Safe to Deploy? |
|---|---|---|
| `FULLY_COMPATIBLE` | No changes affecting existing data | Yes |
| `BACKWARD_COMPATIBLE` | Existing data valid under new schema; old readers can still read | Yes, with testing |
| `FORWARD_COMPATIBLE` | New data valid under old schema; old readers may not understand new fields | With care |
| `BREAKING` | Existing data may be invalid under new schema | No — requires migration |

---

## Part VI — Metadata Search

### 6.1 Metadata Indexing

All metadata values are indexed for search within their scope. The indexing strategy follows the metadata type:

| Metadata Type | Index Type | Searchable By |
|---|---|---|
| String | Full-text index + exact match | Keywords, prefix, phrase |
| Number | Range index | Equality, greater than, less than, range |
| Boolean | Exact match | Equality |
| Enum | Exact match | Equality, multi-value (OR) |
| Date / DateTime | Range index | Equality, before, after, between |
| Tag | Inverted index | Tag exact match, multi-tag (AND/OR) |
| Reference | Exact match (by EntityId) | Equality (find all entities referencing a given target) |
| Rich Text | Full-text index | Keywords, phrase |
| AI Vector (`MT-AI-VEC`) | Vector similarity index | Semantic similarity (cosine distance) |
| List | Per-element indexed | Element equality, element contains |
| Computed | Same as underlying type | Same as underlying type |

---

### 6.2 Metadata Filtering

Search queries may filter entities by metadata values using the following operators:

| Operator | Types | Example |
|---|---|---|
| `equals` | All | `blood_type = "A+"` |
| `not_equals` | All | `status != "INACTIVE"` |
| `contains` | String, Rich Text, List, Tag | `description contains "dragon"` |
| `starts_with` | String | `name starts_with "Ar"` |
| `greater_than` | Number, Date | `power_level > 9000` |
| `less_than` | Number, Date | `created_at < 2020-01-01` |
| `between` | Number, Date | `age between 20 and 40` |
| `in_list` | Enum, Tag | `genre in ["Fantasy", "Horror"]` |
| `is_empty` | All | `catch_phrase is_empty` |
| `is_not_empty` | All | `motivation is_not_empty` |
| `has_ai_flag` | AI Metadata | `consistency_flag has_ai_flag "TIMELINE_VIOLATION"` |
| `semantic_similar_to` | AI Vector | `semantic_similar_to "characters who betray their mentors"` |

---

### 6.3 Metadata Sorting and Grouping

Search results may be sorted and grouped by metadata values:

**Sorting:**
- Ascending / Descending by any indexed metadata field
- Multi-field sort (primary sort by `power_level`, secondary sort by `name`)
- Null values always sort last (whether ascending or descending)

**Grouping:**
- Group results by any Enum or Tag metadata field
- Group counts are provided with each group
- Nested grouping (group by genre, then sub-group by status)

---

### 6.4 Metadata Faceting

Faceted search provides aggregate summaries of metadata values across search results — enabling users to understand the distribution of metadata across entities before filtering.

**Facet types:**
- **Enum facet:** Count of entities per enum option within results
- **Tag facet:** Count of entities per tag within results
- **Range facet:** Distribution histogram for number/date fields
- **Boolean facet:** Count of true vs. false values within results
- **AI flag facet:** Count of entities with each AI consistency flag type

---

### 6.5 AI Semantic Search Over Metadata

AI semantic search enables natural language queries over metadata content:

**Query:** *"Find characters who are morally ambiguous and have complex motivations"*

The Search Domain translates this into a vector similarity search over `MT-AI-VEC` semantic vectors attached to character psychology and motivation metadata, combined with structured filters for `isAIGenerated` values carrying relevant tags.

**Rules for AI semantic metadata search:**
- Results from AI semantic search are always labeled as AI-assisted
- Semantic vectors (`MT-AI-VEC`) are never exposed in API responses — they power the search silently
- Semantic search is bounded to the requesting user's authorized Story Universe scope
- AI semantic search results always include a provenance note indicating which metadata fields contributed to the match

---

## Part VII — Metadata Security

### 7.1 Organization and Universe Isolation

Metadata isolation is structural, not policy-based:

- A MetadataSchema defined in Universe A cannot be queried from Universe B's context.
- MetadataValues for entities in Universe A are stored in a partition isolated to Universe A.
- A user authenticated to Universe A cannot construct a query that retrieves Universe B's metadata, regardless of their role in Universe B.

---

### 7.2 Role-Based Metadata Permissions

Beyond entity-level access control, metadata has its own permission overlay:

| Action | Required Minimum Role |
|---|---|
| View PUBLIC metadata | Reader (any role with entity read access) |
| View ORGANIZATION metadata | Organization member |
| View RESTRICTED metadata | Explicitly granted access or Organization Admin |
| View CONFIDENTIAL metadata | Organization Admin only |
| Create metadata field values | Writer |
| Modify metadata field values | Writer (own values) / Editor (any values) |
| Create MetadataSchema | Organization Admin / Universe Owner |
| Modify MetadataSchema (non-breaking) | Organization Admin / Universe Owner |
| Modify MetadataSchema (breaking) | Organization Admin only |
| Delete MetadataValue (rare) | Organization Admin only |
| Archive MetadataSchema | Organization Admin only |

---

### 7.3 Encryption

| Data | Encryption Approach |
|---|---|
| All metadata values at rest | AES-256 encryption at storage layer |
| CONFIDENTIAL metadata values | Organization-scoped encryption keys (separate from general storage key) |
| AI semantic vectors | Encrypted at rest; never transmitted in plain |
| Metadata in transit | TLS 1.3 minimum for all transport |
| Metadata in exports | Export files are encrypted; key delivered separately |

---

### 7.4 Metadata Audit

Every metadata operation is recorded in the Audit System:

| Operation | Audit Record Contents |
|---|---|
| MetadataValue created | Actor, field, value, timestamp, entity |
| MetadataValue modified | Actor, field, previous value, new value, timestamp, entity |
| MetadataValue deleted | Actor, field, last value, timestamp, entity |
| MetadataSchema created | Actor, schema definition, timestamp |
| MetadataSchema field added | Actor, field definition, timestamp |
| MetadataSchema field modified | Actor, before/after field definition, timestamp |
| MetadataSchema deprecated | Actor, reason, timestamp |
| AI metadata value created | Agent ID, field, value, confidence, timestamp, entity |
| Plugin metadata value created | Plugin ID, field, value, timestamp, entity |

---

### 7.5 Compliance and Export Control

**Data Subject Requests:** Personal metadata values (e.g., user-provided biographical information attached to their own account-related metadata) are included in data subject access requests and deletion requests, processed by the Compliance Domain.

**Creator IP Protection:** Story metadata (character descriptions, world notes, custom schema definitions) is the exclusive intellectual property of the creating Organization. It is never used for platform training, analytics, or sharing without explicit consent recorded in the ConsentRecord entity.

**Export control:** Metadata is included in Universe exports. The Export Domain applies the same scope and authorization rules to metadata export as to entity data export.

---

## Part VIII — Metadata Integration

### 8.1 Integration with Entity Architecture

Every entity defined in the Entity Architecture has a metadata attachment point. The integration is:

```
Entity (core attributes from Entity Architecture)
    ↓
MetadataApplicationRecord (which schemas apply to this entity type in this Universe)
    ↓
MetadataDefinition (what fields are defined)
    ↓
MetadataValue (actual values for this specific entity instance)
```

When an entity is fetched, its metadata is fetched alongside it in a unified response. The entity response distinguishes clearly between core entity attributes and metadata values, preserving the architectural separation.

---

### 8.2 Integration with Relationship Architecture

Relationships (as defined in the upcoming Relationship Architecture task) may also carry metadata. A Relationship between Character A and Character B may have metadata fields like `relationship_intensity`, `formalization_date`, or `observed_by` (a list of Character references who know about this relationship).

The same MetadataSchema and MetadataValue model applies to Relationships. A RelationshipMetadataSchema specifies `appliesTo: [RELATIONSHIP]` and may further filter by RelationshipType.

---

### 8.3 Integration with Knowledge Graph

The Knowledge Graph treats metadata as a dimension of knowledge:

- KnowledgeFacts may reference metadata fields as evidence (`"Character A's power_level metadata is 9001 — this was established in Chapter 12"`)
- AI-generated metadata tags (`MT-AI-TAG`) are indexed as graph node labels, enabling relationship traversal by tag
- Semantic vectors (`MT-AI-VEC`) enable the Knowledge Graph's AI query layer to perform similarity-based navigation
- Metadata completeness (required fields populated) contributes to the Universe's Knowledge Graph health score

---

### 8.4 Integration with AI Memory

AI agents load entity metadata into their Memory Graph alongside core entity attributes:

- CANON metadata values are loaded with full authority
- AI-generated metadata values are loaded with their AI-origin label
- Metadata with visibility `AI_INTERNAL` is loaded exclusively into the Memory Graph; it is never shown to human users
- When Canon changes, the Memory Graph synchronization includes metadata value updates

AI agents contribute to metadata through:
1. Creating `MT-AI-*` values on entities during their analysis
2. Proposing metadata field values via the `KnowledgeProposal` mechanism
3. Flagging metadata inconsistencies via `ConsistencyViolation` records

---

### 8.5 Integration with Workflow

Metadata fields may be used as workflow trigger conditions:

- **Stage gate conditions:** A WorkflowStage may require that specific metadata fields be populated before the content can advance to the next stage
- **Dynamic routing:** Workflow routing rules may branch based on metadata values (e.g., a character with `narrative_role = ANTAGONIST` goes through an additional continuity review stage)
- **Automatic metadata update on stage transition:** A workflow may be configured to set metadata values automatically when a stage completes (e.g., setting `review_status = APPROVED` on the narrative's metadata)

---

### 8.6 Integration with Plugin System

Plugins integrate with metadata through a governed extension model:

1. **Schema declaration:** Plugin declares its MetadataSchemas in its PluginManifest
2. **Scope approval:** Organization Admin reviews and approves the declared schemas at installation
3. **Runtime access:** Plugin reads/writes only to its approved namespace
4. **Monitoring:** All plugin metadata operations are logged with plugin attribution
5. **Deactivation:** Plugin deactivation marks its schema as suspended; values preserved

---

### 8.7 Integration with Search

The Search Domain indexes all metadata values according to the indexing strategy in Part VI. Integration points:

- Entity search results include metadata-based filtering and faceting
- Metadata field values appear in entity search result cards (for PUBLIC visibility fields)
- AI semantic vectors (`MT-AI-VEC`) power the semantic search layer
- Saved searches may include metadata filters

---

### 8.8 Integration with Versioning

Metadata versioning is integrated with entity versioning:

- Entity version snapshots include all metadata values at that version point
- Restoring an entity to a previous version restores its metadata to the state at that version
- Metadata version history is viewable independently of entity version history (useful for auditing "when did we decide this character's power level was 9001?")
- MetadataSchema version history is separately maintained and linked to entity version records (enabling interpretation of historical values under the schema active at that time)

---

### 8.9 Integration with Audit

Every metadata operation produces an AuditRecord as defined in Part VII. Key integration points:

- AI metadata creation is logged with `operationType = AI_METADATA_CREATE` and `actorType = AI_AGENT`
- Plugin metadata creation is logged with `operationType = PLUGIN_METADATA_CREATE` and `actorType = PLUGIN`
- Schema changes are logged separately from value changes
- The Audit System is the source of truth for "who set this metadata value and when"

---

## Part IX — Best Practices

### 9.1 Metadata Naming Conventions

| Convention | Rule | Good | Bad |
|---|---|---|---|
| Field keys | Snake case | `blood_type`, `power_level` | `BloodType`, `POWER LEVEL` |
| Namespace names | Dot-separated, lowercase | `universe.narnia`, `org.weta` | `Universe_Narnia`, `org/weta` |
| Schema names | Snake case, descriptive | `character_psychology`, `location_climate` | `schema1`, `charStuff` |
| Display names | Title case, clear | `Power Level`, `Blood Type` | `PL`, `BT`, `MBTI Code` |
| Enum values | Title Case or SCREAMING_SNAKE | `Gryffindor`, `FIRE_AFFINITY` | `gryffindor`, `fire affinity` |
| Group names | Title Case | `Physical`, `Magical Properties` | `physical`, `group1` |

---

### 9.2 Performance Guidelines

| Concern | Guideline |
|---|---|
| Field count per schema | Target < 50 fields per schema; > 100 fields is a design smell suggesting schema splitting |
| Schema count per entity | Target < 10 schemas per entity type; more indicates schema proliferation |
| List field item count | Target < 100 items per list value; larger lists should become related entities |
| Rich text field size | Target < 10,000 chars for metadata rich text; larger content belongs in Document Store |
| Index selectivity | Avoid indexing fields with < 5 distinct values across a Universe (low selectivity; usefulness is minimal) |
| Computed metadata refresh | Computations should complete in < 100ms; complex aggregations should be precomputed and cached |
| AI vector indexing | Semantic vectors should not be regenerated more than once per entity update (batch regeneration preferred) |

---

### 9.3 Validation Checklist

Before any MetadataSchema is marked ACTIVE, verify:

- [ ] Every field has a declared MetadataType
- [ ] Every field has a clear, human-readable displayName
- [ ] Every field has a description explaining what it captures and why
- [ ] Every required field has a justification — why must this be present?
- [ ] Enum fields have a complete, non-overlapping set of allowed values
- [ ] Reference fields have a declared REFERENCE_TYPE constraint
- [ ] List fields have MIN_COUNT and MAX_COUNT constraints
- [ ] No field key collides with platform reserved keys (`system_*`, `storyos_*`)
- [ ] Visibility level has been set intentionally for every field
- [ ] `isAIEditable` and `isPluginEditable` have been set deliberately, not defaulted
- [ ] The schema applies to the correct `EntityType[]`
- [ ] A human-readable schema description is provided
- [ ] Breaking vs. non-breaking impact has been assessed if this modifies an existing schema

---

### 9.4 Common Mistakes

**❌ Mistake 1 — Using metadata to store core entity identity**
If the field is required to identify or uniquely represent the entity, it belongs in the Entity Architecture, not in metadata. A Character's `primaryName` is an entity attribute. A Character's `nicknames_in_fandom` might be metadata.

**❌ Mistake 2 — Creating a metadata field per attribute variant**
Instead of creating `height_cm`, `height_ft`, `height_in` as three separate metadata fields, create one `height` field with unit specification in the definition or value.

**❌ Mistake 3 — Treating AI metadata as Canon-equivalent**
An AI-generated `power_level` value is not a Canon attribute. It is an AI annotation. Creators must never be misled into thinking AI metadata fields represent confirmed story truth.

**❌ Mistake 4 — Letting plugins read outside their namespace**
Plugins approved for `plugin.magic_system.*` scope cannot read `universe.myworld.psychology.*` fields. This must be enforced structurally, not just policy-enforced.

**❌ Mistake 5 — Making too many fields required**
Every required metadata field is a friction point for entity creation. Over-required schemas cause creators to abandon structured data in favor of freeform notes. Reserve `isRequired = true` for fields that truly gate meaningful system behavior.

**❌ Mistake 6 — Forgetting metadata schema version on stored values**
Without recording which schema version was active when a value was set, historical values may be misinterpreted if the schema changes. Every MetadataValue must carry its `schemaVersion` at creation time.

**❌ Mistake 7 — Storing large content in metadata**
Metadata is for structured annotation. Long-form content (essays, chapter text, world lore documents) belongs in the Document Store accessed through the Narrative Domain.

**❌ Mistake 8 — Skipping metadata inheritance planning**
If multiple schemas across an Organization share similar field patterns (e.g., all schemas that extend Characters share a `narrative_significance` field), those common fields should be in a parent schema with inheritance — not duplicated across each child schema.

---

### 9.5 Architecture Rules

**ARCH-META-001 — Metadata Cannot Affect Canon**
No metadata value, regardless of type, visibility, or author, may change the Canon status of any entity. Canon is governed exclusively by the Canon Management Domain.

**ARCH-META-002 — Metadata Schemas Are Versioned Like Entities**
A MetadataSchema is not a static configuration. Every change to a schema creates a new version. The schema version active at the time a MetadataValue was created is permanently recorded with that value.

**ARCH-META-003 — Metadata Is Never the Source of Truth for Story Logic**
AI consistency checks, Knowledge Graph facts, and relationship validations use entity attributes and Canon KnowledgeFacts as their source of truth. Metadata is enrichment context — it informs but does not decide.

**ARCH-META-004 — Plugin Metadata Namespaces Are Isolated**
The platform enforces namespace isolation at the storage partition level. It is not possible for a plugin to accidentally access another plugin's metadata namespace, regardless of query construction.

**ARCH-META-005 — System Metadata Cannot Be Deleted**
`[SYS]` class metadata values are immutable and permanent. They can only be superseded by newer system-set values. There is no delete path.

**ARCH-META-006 — Metadata Completeness Is a Quality Signal, Not a Blocker**
Missing optional metadata fields produce completeness warnings and lower entity health scores. They do not block entity usage, workflow progression, or AI access. Only missing required fields block entity Canon confirmation.

---

> *"Metadata is how a platform grows without rewriting itself. Every field defined here is a commitment to creators that StoryOS can speak their genre's language — whether that language includes power levels, blood types, Hogwarts houses, or campaign statistics — without ever compromising the integrity of its core story knowledge model."*

---

**Document End**
**Previous:** `docs/architecture/entity_architecture.md` — Task 1.2 Approved
**Next:** `docs/architecture/relationship_architecture.md` — Task 1.4
