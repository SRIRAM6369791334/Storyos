# Knowledge Graph Architecture Document

> **Document Status:** Draft v1.0
> **Classification:** Internal — Architecture Restricted
> **Last Updated:** 2026-07-29
> **Owner:** Chief Software Architect
> **Phase:** 1 — Core Architecture
> **Task:** 1.5 — Knowledge Graph Architecture
> **Depends On:** `entity_architecture.md`, `metadata_architecture.md`, `relationship_architecture.md`
> **Governed By:** `docs/governance/coding_principles.md`
> **Next:** `docs/architecture/storage_architecture.md` — Task 1.6

---

## Preface

Every preceding architecture document in Phase 1 has built toward this one.

Data Architecture defined classification. Entity Architecture defined objects. Metadata Architecture defined extension. Relationship Architecture defined connections. The Knowledge Graph Architecture defines what emerges when all four are unified into a single, traversable, AI-queryable intelligence layer.

The Knowledge Graph is not a database. It is not a cache. It is the **semantic representation of everything that is true — or proposed to be true — within a Story Universe**. It is the layer at which scattered records become coherent knowledge. It is the reasoning substrate for every AI agent on the platform.

> **Central architectural truth:** The Knowledge Graph does not store new data. It **organizes existing data** — entities, metadata, relationships, events, and facts — into a graph structure optimized for semantic queries, AI reasoning, and deep narrative intelligence.

---

## Part I — Knowledge Graph Principles

### 1.1 Philosophy

StoryOS adopts a **knowledge-first, graph-native** intelligence architecture.

Most software systems store records and retrieve them by key. StoryOS stores knowledge and navigates it by meaning. The difference is architectural. A record system answers "what is stored at key X?" A knowledge graph answers "what is connected to X, what does that imply, and how confident are we?"

The Knowledge Graph exists at the intersection of four concerns:

```
STORY TRUTH (Canon)          AI REASONING (Inference)
        ↘                              ↙
          ──── KNOWLEDGE GRAPH ────
        ↗                              ↖
NARRATIVE STRUCTURE (Narrative)  WORLD CONSISTENCY (Validation)
```

Each concern makes demands on the graph:
- **Story Truth** demands that Canon facts are accurate, protected, and authoritative.
- **AI Reasoning** demands that inference paths are clear, labeled by confidence, and separated from Canon.
- **Narrative Structure** demands that the graph reflects story time, causal chains, and narrative arcs.
- **World Consistency** demands that contradictions are detectable and surfaced — never silently accepted.

The Knowledge Graph architecture satisfies all four simultaneously by maintaining strict separation between layers within the graph itself.

---

### 1.2 Knowledge Graph Goals

| Goal | Description |
|---|---|
| **KGG-01 Unified Intelligence** | Every entity, relationship, event, and fact from all domains feeds into one coherent graph |
| **KGG-02 Semantic Queryability** | The graph answers meaning-based questions, not just key-based lookups |
| **KGG-03 Canon Sovereignty** | Canon nodes and edges carry absolute authority; proposed and inferred data is always labeled |
| **KGG-04 AI Substrate** | The graph is the primary reasoning environment for all AI agents on the platform |
| **KGG-05 Universe Isolation** | Each Story Universe has a logically and physically isolated graph partition |
| **KGG-06 Temporal Awareness** | The graph represents story time, not just real-world modification time |
| **KGG-07 Provenance Transparency** | Every node and edge carries provenance — how it came to exist and on what authority |
| **KGG-08 Evolutionary** | The graph evolves as the story evolves; history is preserved, not overwritten |
| **KGG-09 Hallucination Resistance** | AI agents cannot introduce unverified data into Canon layers |
| **KGG-10 Performance at Scale** | Common traversal patterns operate efficiently even for very large universes |

---

### 1.3 Knowledge Graph Rules

**Rule KG-001 — The Knowledge Graph Is Derived, Not Primary**
The Knowledge Graph does not own the authoritative copy of entity or relationship data. It derives its content from the Entity Domain, Relationship Domain, and Knowledge Domain. Source domains are always authoritative. If the graph and a source domain disagree, the source domain is correct.

**Rule KG-002 — Canon Is Structurally Separate**
Canon nodes and Canon edges exist in a physically isolated partition of the graph. Proposed, inferred, and speculative content cannot contaminate the Canon partition.

**Rule KG-003 — AI Cannot Write to the Canon Graph**
AI agents write exclusively to the Inference Graph and the AI Memory Graph. Promotion from Inference to Canon requires a human creator confirmation event.

**Rule KG-004 — Every Node Has Provenance**
Every node in the Knowledge Graph carries: its source domain, source entity ID, the event that created it, and the actor responsible. A node without provenance is an architectural defect.

**Rule KG-005 — Every Edge Has Provenance and Confidence**
Every edge carries: its source relationship ID (or inference origin), its Canon status, its confidence score (1.0 for Canon, 0.0–1.0 for inferred), and a timestamp.

**Rule KG-006 — Graph Events Are Immutable**
The event log that drives graph changes (node created, edge created, status changed) is append-only and immutable. Graph state is derived from this event log.

**Rule KG-007 — Universe Boundary Is a Graph Partition Boundary**
A traversal that would cross a Universe boundary is rejected at the traversal engine, not filtered at query time. Structural enforcement, not policy enforcement.

**Rule KG-008 — The Graph Reflects Story Time**
Nodes and edges carry story timestamps alongside real-world timestamps. Traversal queries may specify a story time point and receive the graph state as it was at that story moment.

**Rule KG-009 — Contradiction Is Surfaced, Never Silently Resolved**
When the graph contains contradictory facts (two nodes that logically cannot both be true), both are preserved and a `GraphContradiction` record is created. The system notifies the creator. It does not silently choose one or merge them.

**Rule KG-010 — Graph Snapshots Are Point-In-Time Truths**
A graph snapshot is a complete, immutable capture of the graph state at a specific moment. Snapshots are the foundation for graph version history, branch universes, and AI Memory initialization.

---

### 1.4 Knowledge Graph Lifecycle

```
INITIALIZATION:
  Story Universe created
      ↓
  Empty KnowledgeGraph partition created (isolated)
      ↓
  Graph Schema applied (node types, edge types, index definitions)
      ↓
  INITIALIZING

GROWTH:
  Entities created in source domains
      ↓
  Domain events → Graph Sync Service
      ↓
  KnowledgeNodes created / updated
      ↓
  Relationships created in Relationship Domain
      ↓
  Domain events → Graph Sync Service
      ↓
  KnowledgeEdges created / updated
      ↓
  ACTIVE

EVOLUTION:
  Canon confirmations → Canon partition promoted
  AI inference runs → Inference layer populated
  Contradictions detected → GraphContradiction records created
  Story events → Temporal graph updated

VERSIONING:
  GraphSnapshot created on demand / milestone
      ↓
  Branch universe → fork from snapshot
      ↓
  Merge strategy applied if branches reconcile

ARCHIVAL:
  Universe archived
      ↓
  Graph partition frozen (read-only)
      ↓
  ARCHIVED
```

---

### 1.5 Knowledge Graph Ownership

| Domain | Responsibility |
|---|---|
| **Knowledge Graph Domain** | Owns the graph structure, sync service, traversal engine, and contradiction detection |
| **Entity Domain** | Source of all entity nodes (Character, Location, Faction, etc.) |
| **Relationship Domain** | Source of all graph edges |
| **Knowledge Domain** | Source of KnowledgeFact nodes |
| **AI Domain** | Writes to Inference and Memory Graph partitions only |
| **Timeline Domain** | Source of temporal structure (events, story time ordering) |
| **Versioning Domain** | Manages graph snapshots and branch graph state |

---

### 1.6 Knowledge Graph Security

**KGS-001 — Graph Access Inherits Entity Access**
A user cannot traverse to a graph node representing an entity they cannot access. The traversal engine enforces entity-level access control at every hop.

**KGS-002 — Canon Graph Is Read-Only for All External Systems**
No domain or service writes directly to the Canon partition. Updates flow through the Graph Sync Service, which validates all Canon-level writes against the source domain's confirmed Canon state.

**KGS-003 — AI Memory Graph Is Isolated**
The AI Memory Graph for each agent is an isolated partition. One agent's Memory Graph cannot be read by another agent or by human users through normal interfaces.

**KGS-004 — Secret Nodes Require Elevated Access**
Nodes representing secret entities (entities marked `isSecret = true`) are accessible only to users with `SECRET_ACCESS` role within the Universe.

**KGS-005 — Graph Exports Are Authorized**
Exporting any portion of the Knowledge Graph — for AI training, integration, or analysis — requires Organization Admin authorization and is fully audited.

---

### 1.7 Knowledge Graph Validation

**KGV-001 — Node Must Reference Valid Source Entity**
A KnowledgeNode is only valid if its source entity exists and is ACTIVE or CANON in its source domain. Nodes for ARCHIVED entities are preserved as historical nodes.

**KGV-002 — Edge Must Reference Valid Source Relationship**
A KnowledgeEdge is only valid if its source relationship exists in the Relationship Domain. Edges are not created from inferred data without being labeled as INFERRED.

**KGV-003 — Canon Partition Integrity Is Continuously Verified**
A background process continuously verifies that every node and edge in the Canon partition has a corresponding Canon-status entity or relationship in its source domain. Discrepancies create `GraphIntegrityViolation` alerts.

**KGV-004 — Temporal Consistency Is Enforced**
Edges with `startStoryTime` and `endStoryTime` are validated for temporal coherence. An edge cannot end before it starts. Edges where `endStoryTime` precedes the `startStoryTime` of either endpoint node's existence are flagged.

**KGV-005 — Graph Schema Is Applied on Ingestion**
Incoming node and edge data is validated against the GraphSchema before being committed to any partition. Schema validation failures produce `GraphIngestionError` events, not silent failures.

---

## Part II — Graph Model

### 2.1 KnowledgeGraph

**Purpose:** The root container representing the complete graph for one Story Universe. Every other graph object belongs to exactly one KnowledgeGraph.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `graphId` | `GraphId` | Immutable; system-generated |
| `universeId` | `UniverseId` | Owning Story Universe; immutable |
| `status` | `GraphStatus` | INITIALIZING / ACTIVE / STALE / ARCHIVED |
| `schemaVersion` | `SchemaVersion` | Version of the GraphSchema applied |
| `nodeCount` | `Integer` | Derived; current total node count |
| `edgeCount` | `Integer` | Derived; current total edge count |
| `canonNodeCount` | `Integer` | Derived; Canon-partition node count |
| `canonEdgeCount` | `Integer` | Derived; Canon-partition edge count |
| `lastSyncedAt` | `Timestamp` | When graph last received a sync update |
| `lastSnapshotId` | `GraphSnapshotId?` | Most recent snapshot |
| `createdAt` | `Timestamp` | Immutable |

**Graph Status:**

| Status | Description |
|---|---|
| `INITIALIZING` | Graph being constructed; not yet queryable |
| `ACTIVE` | Graph fully operational |
| `STALE` | Source domain updates pending; graph may lag by defined SLA |
| `ARCHIVED` | Universe archived; graph frozen read-only |

---

### 2.2 KnowledgeNode

**Purpose:** A single vertex in the Knowledge Graph representing one entity, event, fact, or concept from the Story Universe.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `nodeId` | `NodeId` | Immutable; graph-internal identifier |
| `graphId` | `GraphId` | Owning graph |
| `sourceEntityId` | `EntityId` | The entity this node represents |
| `sourceEntityType` | `EntityType` | Type of the source entity |
| `nodetype` | `NodeType` | Classification within the graph |
| `canonStatus` | `CanonStatus` | Mirrors source entity's Canon status |
| `partition` | `GraphPartition` | CANON / ACTIVE / INFERRED / PROPOSED / HISTORICAL |
| `label` | `NodeLabel` | Human-readable primary label for display |
| `properties` | `NodePropertySet` | Key-value pairs derived from entity attributes |
| `metadataRef` | `MetadataRef` | Reference to entity's metadata values |
| `storyTimeCreated` | `StoryTimePoint?` | In-universe time this entity came into being |
| `storyTimeEnded` | `StoryTimePoint?` | In-universe time this entity ceased to be |
| `confidenceScore` | `ConfidenceScore` | 1.0 for Canon; < 1.0 for inferred |
| `version` | `NodeVersion` | Current version counter |
| `createdAt` | `Timestamp` | Real-world time this node entered the graph |
| `lastModifiedAt` | `Timestamp` | Real-world time of last graph update |

**Node Partitions:**

| Partition | Contents | Writable By |
|---|---|---|
| `CANON` | Creator-confirmed, authoritative nodes | Graph Sync Service (from Canon entities only) |
| `ACTIVE` | Active but not yet Canon-confirmed nodes | Graph Sync Service (from ACTIVE entities) |
| `INFERRED` | AI-derived nodes (from extraction or reasoning) | AI Domain only |
| `PROPOSED` | AI-proposed new entity candidates | AI Domain only |
| `HISTORICAL` | Nodes for ENDED or ARCHIVED entities (read-only) | Graph Sync Service (on archive event) |

---

### 2.3 KnowledgeEdge

**Purpose:** A directed or undirected connection between two KnowledgeNodes representing a typed, governed relationship between entities.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `edgeId` | `EdgeId` | Immutable; graph-internal identifier |
| `graphId` | `GraphId` | Owning graph |
| `sourceRelationshipId` | `RelationshipId?` | The Relationship Domain record that sourced this edge (null for inferred) |
| `fromNodeId` | `NodeId` | Source node |
| `toNodeId` | `NodeId` | Target node |
| `edgeType` | `EdgeType` | The relationship type label (mirrors RelationshipType) |
| `direction` | `EdgeDirection` | DIRECTED / MUTUAL |
| `partition` | `GraphPartition` | CANON / ACTIVE / INFERRED / PROPOSED / HISTORICAL |
| `weight` | `EdgeWeight` | Numeric weight 0.0–1.0; used for traversal scoring |
| `canonStatus` | `CanonStatus` | Mirrors source relationship's Canon status |
| `confidenceScore` | `ConfidenceScore` | 1.0 for Canon; < 1.0 for inferred |
| `isActive` | `Boolean` | False for ENDED or HISTORICAL edges |
| `startStoryTime` | `StoryTimePoint?` | In-universe time the relationship began |
| `endStoryTime` | `StoryTimePoint?` | In-universe time the relationship ended |
| `properties` | `EdgePropertySet` | Relationship properties mirrored from source |
| `provenance` | `EdgeProvenance` | Source type, actor, and timestamp |
| `createdAt` | `Timestamp` | Immutable |
| `lastModifiedAt` | `Timestamp` | Real-world time of last update |

---

### 2.4 GraphSubgraph

**Purpose:** A named, bounded portion of the full Knowledge Graph extracted for a specific query, analysis, or AI reasoning context. Subgraphs are ephemeral views — they reference nodes and edges from the main graph without duplicating data.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `subgraphId` | `SubgraphId` | Unique identifier for this subgraph instance |
| `graphId` | `GraphId` | Parent graph |
| `name` | `SubgraphName?` | Optional label for persistent subgraphs |
| `purpose` | `SubgraphPurpose` | QUERY_RESULT / AI_CONTEXT / ANALYSIS / EXPORT / BRANCH |
| `nodeIds` | `NodeId[]` | Included nodes (references, not copies) |
| `edgeIds` | `EdgeId[]` | Included edges (references, not copies) |
| `partitionFilter` | `GraphPartition[]` | Which partitions are included |
| `canonOnly` | `Boolean` | Whether only Canon nodes/edges are included |
| `createdAt` | `Timestamp` | Immutable |
| `expiresAt` | `Timestamp?` | For ephemeral subgraphs; null for persistent |
| `requestedBy` | `ActorId` | Who requested this subgraph |

---

### 2.5 GraphView

**Purpose:** A persistent, named lens over the Knowledge Graph that applies predefined filters. A GraphView defines what subset of the full graph is visible under a given context — without altering the graph itself.

**Examples of GraphViews:**
- `CharacterRelationshipView` — only Character nodes and interpersonal edges
- `CanonOnlyView` — only nodes and edges in the CANON partition
- `TimelineView` — only Event nodes and causal edges
- `FactionPoliticsView` — Faction nodes and political relationship edges
- `AIReasoningView` — full graph including INFERRED and PROPOSED (for AI context)

**Properties:**

| Property | Type | Description |
|---|---|---|
| `viewId` | `ViewId` | Immutable |
| `graphId` | `GraphId` | Parent graph |
| `name` | `ViewName` | Unique within the graph |
| `nodeTypeFilter` | `NodeType[]?` | Restrict to specific node types |
| `edgeTypeFilter` | `EdgeType[]?` | Restrict to specific edge types |
| `partitionFilter` | `GraphPartition[]` | Restrict to specific partitions |
| `minConfidence` | `ConfidenceScore?` | Exclude edges below this confidence |
| `storyTimeRange` | `StoryTimeRange?` | Only include nodes/edges within a story time window |
| `isSystem` | `Boolean` | Platform-defined view (cannot be modified) |

---

### 2.6 GraphProjection

**Purpose:** A computed, lightweight representation of the Knowledge Graph focused on a specific analytical question. Projections are computed on demand, cached for performance, and invalidated when the underlying graph changes.

**Types of Projections:**

| Projection Type | Description | Output |
|---|---|---|
| `DegreeProjection` | Compute in-degree and out-degree for every node | NodeId → {inDegree, outDegree} map |
| `CentralityProjection` | Compute betweenness, closeness, or eigenvector centrality | NodeId → centralityScore map |
| `ClusterProjection` | Identify strongly connected clusters | ClusterId → NodeId[] map |
| `TemporalProjection` | Project graph state at a specific story time point | Filtered KnowledgeGraph |
| `InfluenceProjection` | Compute influence scores (adapted PageRank) | NodeId → influenceScore map |
| `SemanticProjection` | Embed nodes in a vector space for similarity queries | NodeId → float[] embedding map |
| `AncestryProjection` | Compute full ancestry tree for Character nodes | NodeId → ancestorNodeId[] |

**Properties:**

| Property | Type | Description |
|---|---|---|
| `projectionId` | `ProjectionId` | Immutable |
| `graphId` | `GraphId` | Parent graph |
| `projectionType` | `ProjectionType` | Type from taxonomy above |
| `parameters` | `ProjectionParameters` | Type-specific configuration |
| `status` | `ProjectionStatus` | COMPUTING / READY / STALE / FAILED |
| `computedAt` | `Timestamp` | When computation completed |
| `invalidatedAt` | `Timestamp?` | When marked stale |
| `resultReference` | `StorageRef` | Where projection results are stored |

---

### 2.7 GraphIndex

**Purpose:** A structural optimization applied to the Knowledge Graph to accelerate specific query patterns. Indexes are declared and managed by the Knowledge Graph Domain; they are not exposed to callers.

**Index Types:**

| Index Type | Indexes On | Accelerates |
|---|---|---|
| `NodeTypeIndex` | nodeType | All queries filtering by node type |
| `EdgeTypeIndex` | edgeType | All queries filtering by edge type |
| `PartitionIndex` | partition | Partition-scoped queries |
| `CanonStatusIndex` | canonStatus | Canon-only queries |
| `StoryTimeIndex` | storyTimeCreated, storyTimeEnded | Temporal range queries |
| `ConfidenceIndex` | confidenceScore | Minimum confidence filtering |
| `LabelIndex` | label (full-text) | Name-based node lookup |
| `PropertyIndex` | specific property keys | Property-value queries |
| `SemanticIndex` | embedding vectors | Semantic similarity queries |

---

### 2.8 GraphSnapshot

**Purpose:** An immutable, complete capture of the Knowledge Graph state at a specific point in real time and story time. Snapshots are the foundation for graph history, branch universes, and AI Memory initialization.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `snapshotId` | `GraphSnapshotId` | Immutable |
| `graphId` | `GraphId` | The graph this is a snapshot of |
| `label` | `SnapshotLabel?` | Human-readable label (e.g., "End of Act 1") |
| `nodeCount` | `Integer` | Node count at snapshot time |
| `edgeCount` | `Integer` | Edge count at snapshot time |
| `canonNodeCount` | `Integer` | Canon node count at snapshot time |
| `storyTimePoint` | `StoryTimePoint?` | Optional story time this snapshot represents |
| `triggeredBy` | `SnapshotTrigger` | MANUAL / MILESTONE / BRANCH / SCHEDULED / ARCHIVE |
| `requestedBy` | `ActorId` | Immutable |
| `createdAt` | `Timestamp` | Immutable |
| `storageRef` | `StorageRef` | Where snapshot data is stored |
| `integrityHash` | `Hash` | Cryptographic hash of snapshot contents |

---

### 2.9 GraphVersion

**Purpose:** The version control system for the Knowledge Graph. Every structural change to the graph (node creation, edge deletion, partition promotion) is recorded as a versioned event.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `versionId` | `GraphVersionId` | Immutable |
| `graphId` | `GraphId` | Parent graph |
| `sequenceNumber` | `Long` | Monotonically increasing; gapless |
| `previousVersionId` | `GraphVersionId?` | Null for first version |
| `eventType` | `GraphEventType` | NODE_CREATED / EDGE_CREATED / NODE_UPDATED / EDGE_UPDATED / NODE_ARCHIVED / EDGE_ARCHIVED / PARTITION_PROMOTED / CONTRADICTION_DETECTED |
| `affectedNodeIds` | `NodeId[]` | Nodes affected by this event |
| `affectedEdgeIds` | `EdgeId[]` | Edges affected by this event |
| `sourceEvent` | `DomainEventRef` | The source domain event that triggered this graph event |
| `timestamp` | `Timestamp` | Immutable |

---

### 2.10 GraphMetadata

**Purpose:** Metadata attached to graph objects (nodes and edges) following the same Metadata Architecture as entity metadata. GraphMetadata enables AI annotations, provenance notes, and universe-specific graph extensions.

**Follows:** All rules from `metadata_architecture.md` apply. `appliesTo: [GRAPH_NODE, GRAPH_EDGE]` variants of MetadataSchemas enable structured annotation of graph objects.

**Node-specific metadata types:**
- `MT-AI-VEC` — semantic embedding vector for this node (powers SemanticProjection and semantic search)
- `MT-AI-SCORE` — influence score, narrative weight score
- `MT-AI-TAG` — AI-assigned thematic tags
- `MT-SYS-HEALTH` — graph health score for this node (connectivity, completeness, consistency)

---

### 2.11 GraphStatistics

**Purpose:** Derived, periodically recomputed aggregate metrics about the Knowledge Graph that support creator dashboards, AI health monitoring, and system performance tuning.

**Statistics maintained:**

| Statistic | Description | Refresh Frequency |
|---|---|---|
| `totalNodeCount` | All nodes across all partitions | On every sync event |
| `canonNodeCount` | Canon partition nodes only | On every Canon confirmation |
| `totalEdgeCount` | All edges across all partitions | On every sync event |
| `orphanNodeCount` | Nodes with zero edges | Daily |
| `averageDegree` | Average number of edges per node | Daily |
| `mostConnectedNodes` | Top 20 nodes by edge count | Daily |
| `contradictionCount` | Active unresolved contradictions | Real-time |
| `inferenceEdgeCount` | Edges in INFERRED partition | On every AI inference batch |
| `pendingProposalCount` | PROPOSED nodes/edges awaiting review | Real-time |
| `graphHealthScore` | Composite score: consistency + completeness + connectivity | Daily |
| `largestClusterSize` | Node count in the largest connected cluster | Weekly |
| `isolatedComponentCount` | Number of disconnected graph components | Daily |

---

### 2.12 GraphSchema

**Purpose:** The declared vocabulary of node types and edge types that may exist in a given Knowledge Graph. The schema governs what can be added to the graph and how it is validated on ingestion.

**Properties:**

| Property | Type | Description |
|---|---|---|
| `schemaId` | `SchemaId` | Immutable |
| `graphId` | `GraphId` | The graph this schema governs |
| `version` | `SemanticVersion` | Schema version |
| `nodeTypeDefinitions` | `NodeTypeDefinition[]` | Declared node types |
| `edgeTypeDefinitions` | `EdgeTypeDefinition[]` | Declared edge types with allowed from/to types |
| `customExtensions` | `SchemaExtension[]` | Universe-specific node/edge type additions |
| `validFrom` | `Timestamp` | When this schema version became active |

---

## Part III — Node Architecture

### 3.1 Entity Nodes

Entity nodes are the primary population of the Knowledge Graph — one node per entity instance.

**Character Node:**
```
NodeType: CHARACTER
Label: character.primaryName
Properties: {
  characterId,
  canonStatus,
  narrativeRole,
  diegeticStatus,
  primaryFactionId (if any),
  arcStage (current arc position)
}
StoryTimeCreated: character.birthStoryTime (if known)
StoryTimeEnded: character.deathStoryTime (if known, diegeticStatus = DEAD)
Partition: mirrors character.canonStatus
```

**Location Node:**
```
NodeType: LOCATION
Label: location.name
Properties: { locationId, locationType, canonStatus, parentLocationId }
StoryTimeCreated: location.foundedAt (if known)
StoryTimeEnded: location.destroyedAt (if applicable)
```

**Faction Node:**
```
NodeType: FACTION
Label: faction.name
Properties: { factionId, factionType, canonStatus, parentFactionId, isSecret }
StoryTimeCreated: faction.foundedAt
StoryTimeEnded: faction.dissolvedAt (if applicable)
```

**Item Node:**
```
NodeType: ITEM
Label: item.name
Properties: { itemId, itemCategory, canonStatus, currentOwnerId }
StoryTimeEnded: item.destroyedAt (if applicable)
```

---

### 3.2 Event Nodes

Event nodes represent occurrences within the story universe. They are temporal anchors that other nodes connect to.

```
NodeType: EVENT
Label: event.title
Properties: {
  eventId,
  canonStatus,
  significance,
  storyTimePoint,
  duration,
  locationId (if set)
}
StoryTimeCreated: event.storyTimePoint (the event occurs at this time)
Partition: mirrors event.canonStatus (ERASED events go to HISTORICAL partition)
```

**Special event node behaviors:**
- Event nodes that are `ERASED` move to the HISTORICAL partition but retain all their edges — the retcon is itself a graph fact.
- Event nodes are the primary anchors for temporal traversal.
- Causal edges between event nodes (`CAUSED`, `ENABLED`, `PREVENTED`) are the backbone of the causal subgraph.

---

### 3.3 Narrative Nodes

Narrative nodes represent story content units. They serve as the provenance anchor for knowledge extraction.

```
NodeType: NARRATIVE
Label: narrativeUnit.title (or type + orderIndex if untitled)
Properties: {
  narrativeId,
  narrativeType,
  canonStatus,
  wordCount,
  storyTimeSpan
}
```

**Narrative node edges:**
- `CONTAINS` → child NarrativeUnit nodes
- `FEATURES` → Character nodes appearing in this content
- `SET_IN` → Location node
- `ESTABLISHES` → KnowledgeFact nodes extracted from this content
- `PRECEDES` → next NarrativeUnit node in sequence

---

### 3.4 Timeline Nodes

```
NodeType: TIMELINE
Label: timeline.name
Properties: { timelineId, timelineType, isMasterTimeline, isConsistent }
```

Timeline nodes are primarily structural — they organize Event nodes rather than carrying story knowledge themselves. Every Event node has an edge `BELONGS_TO` its Timeline node.

**Branch timeline edges:**
- `BRANCHES_FROM` → parent Timeline node
- `BRANCH_POINT` → the Event node at which branching occurs

---

### 3.5 AI Nodes

AI nodes represent entities proposed or detected by AI agents that have not yet been creator-confirmed. They exist exclusively in the INFERRED or PROPOSED partition.

```
NodeType: AI_ENTITY_PROPOSAL
Label: "[AI Proposed] " + suggestedName
Properties: {
  proposalId,
  proposingAgentId,
  proposedEntityType,
  confidence,
  sourceNarrativeId,
  reviewStatus: PENDING / ACCEPTED / REJECTED
}
Partition: PROPOSED
ConfidenceScore: AI inference confidence
```

**AI node rules:**
- AI nodes cannot have edges to CANON partition nodes labeled as CANON edges.
- AI nodes connect to other INFERRED/PROPOSED nodes and ACTIVE nodes via INFERRED or PROPOSED edges.
- When a creator accepts an AI proposal, the AI node is replaced by a true entity node.
- When a creator rejects a proposal, the AI node moves to HISTORICAL partition.

---

### 3.6 KnowledgeFact Nodes

```
NodeType: KNOWLEDGE_FACT
Label: factStatement (truncated for display)
Properties: {
  factId,
  factType,
  canonStatus,
  confidence,
  inferenceAgentId (if AI-generated),
  subjectEntityId
}
Partition: mirrors fact.canonStatus
```

KnowledgeFact nodes are the atomic truth units of the Canon partition. Every CANON KnowledgeFact is a first-class node. Facts in PROPOSED state live in the PROPOSED partition.

---

### 3.7 Workflow Nodes

Workflow nodes represent active content production states. They are operational nodes, not story knowledge — they live in a dedicated `OPERATIONAL` partition that is excluded from AI reasoning.

```
NodeType: WORKFLOW_INSTANCE
Label: "Workflow: " + contentTitle
Properties: { instanceId, currentStage, contentId, contentType }
Partition: OPERATIONAL (not CANON, not INFERRED)
```

Workflow nodes connect content (Narrative nodes) to their production state, enabling dashboards and workflow-driven graph queries.

---

### 3.8 Metadata Nodes

For high-value metadata values (AI semantic vectors, influence scores), dedicated metadata nodes supplement graph edges:

```
NodeType: METADATA_ANNOTATION
Properties: { definitionId, value, isAIGenerated, confidence }
```

Metadata annotation nodes attach to their host entity nodes via `ANNOTATES` edges. This enables metadata to participate in graph traversal without requiring the traversal engine to load full metadata value sets.

---

### 3.9 Plugin Nodes

Plugins may introduce custom node types within their declared namespace:

```
NodeType: PLUGIN_[NAMESPACE]_[TYPE]
Label: plugin-defined
Properties: plugin-defined fields
Partition: ACTIVE (plugins cannot write to CANON partition)
```

Plugin node rules:
- Plugin nodes connect only to nodes the plugin has declared read access to.
- Plugin nodes are labeled with their namespace prefix to prevent type collisions.
- Plugin node types are declared in the PluginManifest's `declaredNodeTypes` section.
- When a plugin is uninstalled, its nodes move to HISTORICAL partition.

---

## Part IV — Edge Architecture

### 4.1 Directed Edges

A directed edge (A → B) carries meaning that flows from source to target. The inverse is not implied.

```
EdgeType: FATHER_OF
From: CharacterNode (A)
To: CharacterNode (B)
Direction: DIRECTED
Meaning: A is father of B. B being child of A is a separate edge (CHILD_OF).
```

**Directed edge properties:**
- `weight` — strength of the directional connection (derived from relationship strength)
- `confidenceScore` — 1.0 for Canon; < 1.0 for inferred
- `fromNodeId`, `toNodeId` — always set; never null for directed edges
- Traversal can follow directed edges OUTBOUND (A → B), INBOUND (B → A), or BOTH depending on query

---

### 4.2 Undirected (Mutual) Edges

A mutual edge (A ↔ B) is stored as a single edge with `direction = MUTUAL`. The traversal engine treats it as traversable in both directions.

```
EdgeType: ALLIED_WITH
From: FactionNode (A)
To: FactionNode (B)
Direction: MUTUAL
Meaning: A and B are allied. Traversal from A reaches B and from B reaches A.
```

---

### 4.3 Weighted Edges

All edges carry a `weight` value (0.0–1.0) that influences traversal scoring and projection computations.

**Weight sources:**
- Relationship `strength` property (1–5, normalized to 0.2–1.0)
- Canon status (Canon = full weight; Active = 0.8; Inferred = confidence score)
- Relationship evidence count (more evidence = higher weight)
- Recency (recent edges weighted higher in temporal projections)

**Weight usage:**
- Shortest path algorithms use weight as traversal cost
- Influence projections use weight for propagation
- Search ranking uses weight for relevance scoring
- AI reasoning uses weight to prioritize high-confidence connections

---

### 4.4 Temporal Edges

Temporal edges carry explicit story time context, enabling graph queries scoped to a specific story moment.

```
EdgeType: CONTROLS (Faction → Location)
startStoryTime: Year 340 of the Third Age
endStoryTime: Year 351 of the Third Age
```

**Temporal traversal:** A query specifying `storyTime = Year 345` will find this edge active. A query specifying `storyTime = Year 360` will find this edge inactive (it has ended).

Temporal edges that have ended are marked `isActive = false` but remain in the graph as HISTORICAL edges — traversable when explicitly querying historical graph states.

---

### 4.5 Semantic Edges

Semantic edges are not derived from explicit relationships — they are computed by the AI domain based on semantic similarity between nodes.

```
EdgeType: SEMANTICALLY_SIMILAR
From: CharacterNode (A)
To: CharacterNode (B)
Partition: INFERRED
Weight: cosine similarity score (0.0–1.0)
ConfidenceScore: AI confidence in similarity assertion
```

Semantic edges enable:
- "Find characters similar to this one"
- "What themes connect these two events?"
- "Which factions have similar motivations?"

Semantic edges are never promoted to Canon. They are always in the INFERRED partition.

---

### 4.6 AI Inferred Edges

AI inferred edges represent connections the AI has identified from story content but that have not been creator-confirmed.

```
EdgeType: [RelationshipType]
From: [NodeId]
To: [NodeId]
Partition: INFERRED
ConfidenceScore: 0.0–1.0
SourceNarrativeId: [NarrativeId of evidence]
ProposingAgentId: [AIAgentId]
ReviewStatus: PENDING / ACCEPTED / REJECTED
```

**Inferred edge lifecycle:**
```
AI extracts relationship from narrative
    ↓
INFERRED edge created in graph
    ↓
RelationshipProposal sent to creator
    ↓ ACCEPTED → source relationship created in Relationship Domain
                → Graph Sync promotes edge to ACTIVE or CANON partition
    ↓ REJECTED → edge moves to HISTORICAL partition
    ↓ DEFERRED → edge remains INFERRED; re-surfaces in next review cycle
```

---

### 4.7 Canon Edges

Canon edges are the authoritative connections in the graph. They are derived exclusively from Relationship Domain records in CANON status.

**Canon edge invariants:**
- `partition = CANON`
- `confidenceScore = 1.0`
- `canonStatus = CANON`
- `sourceRelationshipId` is always set and references a valid CANON relationship
- Cannot be written directly by any domain except Graph Sync Service on Canon confirmation event

---

### 4.8 Historical Edges

Historical edges represent connections that were once active within the story world but have since ended.

```
isActive: false
endStoryTime: [when the relationship ended in the story]
partition: HISTORICAL
```

Historical edges are traversable only when queries explicitly include HISTORICAL partition. They represent story facts — "this relationship used to exist" — not current story truth.

---

### 4.9 Computed Edges

Computed edges are derived by the graph engine from the declared structure of other edges — they are never stored as explicit records.

**Examples:**
- **Transitive ancestry edges:** If A is FATHER_OF B and B is FATHER_OF C, a computed `ANCESTOR_OF` edge from A to C is returned by transitive traversal without being stored.
- **Implied location containment:** If Location X CONTAINS Location Y, and Character A RESIDES_IN Location Y, a computed `RESIDES_IN_REGION` edge from A to X is traversal-computed.
- **Faction membership transitivity:** A character member of a guild that is a subsidiary of an empire has an implied connection to the empire — computed at traversal, not stored.

---

### 4.10 Plugin Edges

Plugins may introduce custom edge types following the same rules as plugin nodes:

```
EdgeType: PLUGIN_[NAMESPACE]_[TYPE]
Partition: ACTIVE (never CANON)
Declared in: PluginManifest.declaredEdgeTypes
```

Plugin edges connect nodes within the plugin's declared access scope. They cannot connect nodes the plugin cannot read.

---

## Part V — Graph Behavior

### 5.1 Node Creation Flow

```
Source domain entity created (CHARACTER, LOCATION, EVENT, etc.)
    ↓
DomainEvent: [EntityType]Created emitted
    ↓
Graph Sync Service receives event
    ↓
Validates: entity exists and is readable
    ↓
Determines partition: entity.canonStatus → graph partition mapping
    ↓
Extracts node properties from entity attributes
    ↓
Validates against GraphSchema
    ↓
KnowledgeNode created
    ↓
GraphVersion event recorded
    ↓
GraphStatistics updated (nodeCount++)
    ↓
DomainEvent: GraphNodeCreated emitted (consumed by Search, AI domains)
```

---

### 5.2 Edge Creation Flow

```
Relationship created in Relationship Domain
    ↓
DomainEvent: RelationshipCreated emitted
    ↓
Graph Sync Service receives event
    ↓
Validates: both source and target nodes exist in graph
    ↓
Validates: edge type allowed between these node types (per GraphSchema)
    ↓
Determines partition: relationship.canonStatus → graph partition mapping
    ↓
Computes weight from relationship properties
    ↓
KnowledgeEdge created
    ↓
GraphVersion event recorded
    ↓
GraphStatistics updated (edgeCount++)
    ↓
DomainEvent: GraphEdgeCreated emitted
    ↓
Contradiction Detection Service evaluates new edge for conflicts
```

---

### 5.3 Node and Edge Archival

When a source entity is archived:
```
Source domain: entity → ARCHIVED
    ↓
DomainEvent: [EntityType]Archived emitted
    ↓
Graph Sync Service: node partition → HISTORICAL
    ↓
All ACTIVE / CANON edges involving this node → HISTORICAL
    ↓
GraphVersion event recorded
    ↓
AI agents notified: Memory Graph may need sync
```

---

### 5.4 Graph Traversal

The traversal engine executes graph queries over the KnowledgeGraph. Every traversal is bounded and partition-aware.

**Traversal parameters (universal):**
```
startNodeId: required
direction: OUTBOUND | INBOUND | BOTH
edgeTypeFilter: EdgeType[] (empty = all types)
nodeTypeFilter: NodeType[] (empty = all types)
partitionFilter: GraphPartition[] (default: CANON + ACTIVE)
minConfidence: ConfidenceScore (default: 0.0)
maxDepth: Integer (default: 5; hard cap: 20)
storyTimePoint: StoryTimePoint? (null = current; set for historical)
limit: Integer (max results; default: 100)
includeHistorical: Boolean (default: false)
```

---

### 5.5 Graph Expansion

Expansion is the act of retrieving the immediate neighborhood of a set of nodes and expanding the working subgraph:

```
START: subgraph = {nodeA}
EXPAND depth=1: add all nodes directly connected to nodeA
EXPAND depth=2: add all nodes directly connected to new additions
...until maxDepth reached or expansion produces no new nodes
```

Expansion is the primitive operation underlying BFS, neighborhood queries, and connected component detection.

---

### 5.6 Graph Projection

Projection computes a derived representation of the graph for a specific analytical purpose. Projections are computed asynchronously, stored in the Object Store, and invalidated when the underlying graph changes significantly.

**Projection invalidation triggers:**
- Node count changes > configurable threshold (e.g., 5%)
- Canon partition changes (any new Canon node or edge)
- Manual invalidation by Organization Admin

---

### 5.7 Subgraph Extraction

A subgraph is extracted by specifying:
- A root node or set of seed nodes
- Traversal parameters (depth, edge types, partition filter)
- Optional: a predefined GraphView to apply

The extracted subgraph is a self-contained view — all referenced node and edge IDs are valid, all internal edges are included, and all cross-subgraph edges (edges where one endpoint is outside the subgraph) are represented as `BoundaryEdge` references.

---

### 5.8 Graph Merge

When two branch universes are merged, their graphs must be reconciled:

**Merge strategy:**
1. Identify all nodes and edges present in Branch A but not Branch B, and vice versa.
2. Identify all nodes and edges present in both but with different states.
3. Produce a `MergeConflictReport` for all divergent items.
4. Creator reviews and resolves conflicts (accepts A's version, B's version, or manual merge).
5. Resolved items are committed to the merged graph.
6. A GraphSnapshot is created at the merge point.

---

### 5.9 Contradiction Detection

The Contradiction Detection Service runs continuously as a background process:

**Detection patterns:**

| Contradiction Type | Detection Method |
|---|---|
| Mutual exclusion | Two edges of mutually exclusive types between same nodes |
| Temporal impossibility | Edge startStoryTime after referenced node's endStoryTime |
| Causal paradox | Cycle in the causal edge subgraph |
| Cardinality violation | More edges of a type than cardinality allows |
| Canon-Inferred divergence | INFERRED node/edge contradicts a CANON node/edge |
| Logical inconsistency | AI-detected logical conflict between KnowledgeFact nodes |

**Detection output:** `GraphContradiction` record created; creator notification issued; both contradicting items remain in graph (no automatic resolution).

---

### 5.10 Graph Consistency

The Graph Consistency Service validates on a schedule:

- Every CANON node has a corresponding CANON entity in its source domain
- Every CANON edge has a corresponding CANON relationship in the Relationship Domain
- No orphaned edges (edges where one or both endpoint nodes do not exist)
- No nodes in CANON partition with `confidenceScore < 1.0`
- No circular causal chains in the Event causal subgraph
- GraphSchema version matches graph's declared schema version

Consistency failures produce `GraphIntegrityViolation` alerts — not automatic fixes.

---

### 5.11 Graph Synchronization

The Graph Sync Service maintains the graph's currency with source domains:

**Sync triggers:**
- Domain event received (real-time, highest priority)
- Scheduled full reconciliation (daily, catches any missed events)
- Manual admin-triggered resync

**Sync lag SLA:** Canon-status changes must be reflected in the graph within 5 minutes. Non-Canon changes within 30 minutes. Inference updates are batched and may lag up to 6 hours.

---

## Part VI — AI Intelligence

### 6.1 Memory Graph

The Memory Graph is a per-agent, per-universe private copy of graph knowledge maintained by an AI agent. It is initialized from the Canon + Active graph at agent deployment and kept synchronized as Canon evolves.

```
Memory Graph Architecture:
  CANON MIRROR (synchronized from main graph Canon partition)
      ↓
  ACTIVE MIRROR (synchronized from main graph Active partition)
      ↓
  AGENT INFERENCE LAYER (agent's own inference, not shared)
      ↓
  AGENT WORKING CONTEXT (current task context; ephemeral)
```

**Memory Graph rules:**
- Canon Mirror is read-only within the Memory Graph. Synchronized from source, never written directly.
- Agent Inference Layer contains the agent's running inferences. Visible to the agent only.
- Memory Graph is isolated per (agentType, universeId) pair.
- When Canon changes, Memory Graph receives a diff update — not a full rebuild (unless consistency failure).

---

### 6.2 Reasoning Graph

The Reasoning Graph is an ephemeral, task-scoped subgraph that an AI agent assembles when processing a specific task.

```
Task: "Check if Character A's actions in Chapter 12 are consistent with their established motivation"
    ↓
Reasoning Graph assembled:
  - Character A node + all attributes
  - Character A's Motivation child entities (from Memory Graph)
  - All Character A's CANON relationships (neighbors)
  - All events involving Character A (temporal subgraph)
  - Chapter 12 narrative node + extracted facts
    ↓
Agent reasons over this bounded subgraph
    ↓
Output: ConsistencyReport or InconsistencyProposal
    ↓
Reasoning Graph discarded (task complete)
```

**Reasoning Graph invariants:**
- Maximum size: configurable node count (default: 2,000 nodes)
- Always bounded — a reasoning graph that exceeds its limit signals the task is too broad and must be decomposed
- Ephemeral — never persisted after task completion
- Agent cannot modify the Canon Mirror while reasoning

---

### 6.3 Inference Graph

The Inference Graph is the accumulation of all inferences an AI agent has produced over its operational lifetime within a Universe. It lives in the INFERRED partition of the main Knowledge Graph.

**Inference types:**

| Inference Type | Description | Example |
|---|---|---|
| `ENTITY_INFERENCE` | New entity proposed from story content | "This passage implies a character named Saran exists" |
| `RELATIONSHIP_INFERENCE` | New relationship proposed from content | "Chapter 5 implies Character A knows Character B" |
| `FACT_INFERENCE` | New knowledge fact extracted from content | "Sword was forged in Year 210 (from scene description)" |
| `CONTRADICTION_INFERENCE` | Logical inconsistency detected | "Character said X in Ch3 but scene implies not-X in Ch8" |
| `PATTERN_INFERENCE` | Structural pattern detected | "This character's arc mirrors the classic betrayal pattern" |

**Inference Graph rules:**
- Inference confidence degrades over time if not reviewed (confidence score decays toward 0.5 after 30 days without creator engagement)
- High-confidence inferences (> 0.9) surface in creator review queues automatically
- Inferences rejected by creators are preserved in HISTORICAL partition

---

### 6.4 Context Graph

The Context Graph is the specific subgraph an AI agent assembles as context for a generation or analysis task. It differs from the Reasoning Graph in that it is built for outbound use (providing context for a generation) rather than inbound analysis.

```
Task: "Generate a dialogue between Character A and Character B consistent with their relationship"
    ↓
Context Graph assembled:
  - Character A's VoiceProfile (from Memory Graph)
  - Character B's VoiceProfile
  - Active relationship between A and B (type, strength, history)
  - Last 3 scenes featuring both characters
  - Current story time context
  - Any active conflict or secret between them
    ↓
Context provided to generation subsystem
    ↓
Output generated
    ↓
Context Graph discarded
```

---

### 6.5 Similarity Graph

The Similarity Graph is a computed projection (SemanticProjection) that organizes all nodes by their semantic similarity. It enables queries like "find characters similar to X" or "find events with comparable significance to Y."

**Construction:**
- Every entity node has a semantic embedding vector (`MT-AI-VEC` metadata)
- Embeddings computed by the AI Embedding Service on entity creation and update
- Similarity edges computed using cosine distance over embedding vectors
- Only edges above a configured similarity threshold are materialized

**Uses:**
- Creative inspiration: "What other characters share traits with my protagonist?"
- Consistency checking: "Does this new character's profile overlap significantly with an existing one?"
- Thematic analysis: "What nodes cluster around the theme of betrayal?"

---

### 6.6 Semantic Graph

The Semantic Graph is the full Knowledge Graph as experienced by the AI reasoning layer — enriched with semantic vectors, thematic tags, and AI annotations. It is the Canon + Active + Inference graph together with all AI metadata overlaid.

The Semantic Graph is never a separate data store — it is a GraphView plus MetadataAnnotation nodes, applied as a query lens over the main graph.

---

### 6.7 Confidence Propagation

When AI agents infer new facts, confidence propagates through the inference chain:

```
CANON edge (confidence = 1.0)
    ↓ [1-hop inference from Canon]
INFERRED edge (confidence = 0.9)
    ↓ [2-hop inference from inferred]
INFERRED edge (confidence = 0.8)
    ↓ [3-hop inference]
INFERRED edge (confidence = 0.7)
```

**Propagation rules:**
- Each hop of inference reduces confidence by a configured decay factor (default: 0.1)
- Canon → Inferred transitions floor at 0.9 regardless of chain length
- Below 0.5 confidence: inference is marked `LOW_CONFIDENCE` and excluded from AI reasoning input
- Below 0.3 confidence: inference is archived

Confidence scores are informational — they never determine Canon status. A 0.99 confidence inference is still INFERRED until creator confirmation.

---

### 6.8 Hallucination Prevention

StoryOS's Knowledge Graph architecture prevents AI hallucination through structural enforcement, not prompt engineering:

**Prevention layers:**

| Layer | Mechanism |
|---|---|
| **Partition isolation** | AI agents cannot write to CANON partition regardless of what they generate |
| **Provenance labeling** | Every AI-generated node/edge carries `isAIGenerated = true` permanently |
| **Confidence scoring** | All inferences are scored; low-confidence items excluded from reasoning inputs |
| **Proposal workflow** | AI-inferred data enters a human review queue before any promotion |
| **Canon Mirror read-only** | AI agents read from Canon Mirror but cannot modify it |
| **Inference circuit breaker** | If an agent produces > configurable threshold inferences per time unit, it is throttled and flagged |
| **Cross-universe isolation** | AI cannot traverse outside its assigned Universe |

**Hallucination detection:**
- A contradiction between INFERRED node and CANON node triggers a `HallucinationAlert`
- The INFERRED node is quarantined (excluded from reasoning) pending review
- The alert surfaces in creator and system admin dashboards

---

### 6.9 AI Proposal Flow

```
AI Agent detects potential entity / relationship / fact
    ↓
Confidence computed (> configurable threshold to proceed)
    ↓
GraphProposal created {
  nodeOrEdgeSpec,
  evidenceNarrativeRef,
  confidence,
  agentId
}
    ↓
INFERRED node/edge created in main graph
    ↓
KnowledgeProposal submitted to Knowledge Domain
    ↓
Creator review queue updated
    ↓ Creator ACCEPTS:
    → Entity/Relationship created in source domain
    → Graph Sync promotes node/edge to ACTIVE partition
    → INFERRED node/edge replaced / upgraded
    ↓ Creator REJECTS:
    → INFERRED node/edge → HISTORICAL partition
    → Rejection recorded (agent learns pattern for future)
    ↓ Creator DEFERS:
    → INFERRED node/edge stays; re-surfaces in next cycle
```

---

## Part VII — Versioning

### 7.1 Graph Snapshots

A GraphSnapshot is the definitive mechanism for graph versioning. Every significant story milestone should trigger a snapshot.

**Snapshot triggers:**
| Trigger | Frequency | Initiated By |
|---|---|---|
| Manual | On demand | Creator / Admin |
| Milestone | Per defined story milestone | Workflow completion |
| Branch | Before creating a branch universe | System (automatic) |
| Archive | Before archiving a Universe | System (automatic) |
| Scheduled | Weekly | System |

**Snapshot contents:**
- Complete node set with all properties (all partitions)
- Complete edge set with all properties (all partitions)
- GraphStatistics at snapshot time
- GraphSchema version
- AI Memory Graph state (per agent) — separately captured

---

### 7.2 Graph History

Graph history is the sequence of GraphVersion events — the append-only log of every change to the graph. The graph at any point in time can be reconstructed by replaying the event log from the nearest snapshot.

**History queries:**
- "What did the graph look like at story time point X?"
- "When was the relationship between A and B first added to the graph?"
- "Which AI agent proposed the most inferences in the last 30 days?"
- "What changed between Graph Snapshot 12 and Snapshot 13?"

---

### 7.3 Branch Graphs

A branch graph is a fork of the main Knowledge Graph, created when a branch Story Universe is created.

```
Main Universe Graph (snapshot taken)
    ↓
Branch Universe created from snapshot
    ↓
Branch Graph = copy of snapshot state
    ↓
Branch Graph and Main Graph evolve independently
    ↓ [Optional merge path]
GraphMergeRequest created
    ↓
MergeConflictReport generated
    ↓
Creator resolves conflicts
    ↓
Merged Graph committed
```

**Branch graph isolation:** A branch graph is a fully independent graph partition. Traversals in the main graph cannot cross into branch graph nodes, and vice versa.

---

### 7.4 Graph Evolution

As the Story Universe evolves over months and years, the graph schema itself may need to evolve:

**Schema evolution rules:**
- Adding new node types: always non-breaking
- Adding new edge types: always non-breaking
- Adding optional node properties: always non-breaking
- Removing a node type: breaking — requires migration (all nodes of that type must be migrated or archived)
- Removing an edge type: breaking — requires migration
- Renaming a type: non-breaking if old name is aliased; breaking if old name removed

Schema version is tracked in the `GraphSchema` object. Every node carries the schema version active at creation — enabling historical node interpretation under the schema of its era.

---

### 7.5 Compatibility

| Scenario | Compatibility | Resolution |
|---|---|---|
| Node type unchanged | Full | No action |
| Node type added | Backward compatible | Old readers skip unknown types |
| Node type removed | Breaking | Migration required |
| Edge type added | Backward compatible | Old traversals skip unknown types |
| Property added to node | Backward compatible | Absent on historical nodes |
| Property removed from node | Breaking | Historical nodes retain value as legacy |

---

## Part VIII — Security

### 8.1 Universe Isolation

Graph partition isolation is structural:

- Each Story Universe's graph exists in a physically isolated partition with a unique `graphId`.
- A traversal that attempts to follow an edge to a node in a different Universe's partition is rejected at the traversal engine before any data is accessed.
- AI agents are scoped to a single Universe graph at deployment time. Cross-universe traversal is architecturally impossible for a scoped agent.
- GraphView filters cannot be constructed to bypass Universe isolation.

---

### 8.2 Node Permissions

Node access is governed by three stacked permission layers:

| Layer | Rule |
|---|---|
| **1. Universe access** | User must have access to the Universe that contains this graph |
| **2. Entity access** | User must have read access to the entity this node represents |
| **3. Partition access** | OPERATIONAL partition requires elevated access; AI_INTERNAL partition requires AI scope |

Any layer rejection denies access to the node. Layers are evaluated in order.

---

### 8.3 Edge Permissions

Edge access requires access to both the source node and the target node. If a user cannot access the target node, the edge is not returned, even if they can access the source.

Secret edges (`isSecret = true` mirrored from the source relationship) require `SECRET_ACCESS` role.

---

### 8.4 Secret Nodes and Edges

Secret entities and relationships produce secret graph elements:

- Secret nodes: visible only to users with `SECRET_ACCESS` + entity read access
- Secret edges: visible only to users with `SECRET_ACCESS`
- AI agents with Universe scope see all secret elements (necessary for consistency checking) — labeled `[STORY-SECRET]` in AI context
- Secret elements never appear in exported graph data, search results, or plugin outputs without explicit authorization

---

### 8.5 Encryption

| Data | Encryption |
|---|---|
| All graph nodes at rest | AES-256 at storage layer |
| Secret nodes at rest | Organization-scoped encryption key |
| AI semantic vectors | Encrypted at rest; never transmitted in plaintext |
| Graph snapshots | Encrypted at rest; integrity hash verified on restore |
| Graph traversal results in transit | TLS 1.3 minimum |
| AI Memory Graph | Encrypted at rest; agent-scoped key |

---

### 8.6 Audit

All graph operations are audited:

| Operation | Audit Record |
|---|---|
| Node created | Actor, nodeId, nodeType, partition, sourceEntityId, timestamp |
| Edge created | Actor, edgeId, edgeType, partition, fromNodeId, toNodeId, timestamp |
| Node partition changed | Actor, nodeId, fromPartition, toPartition, trigger, timestamp |
| Contradiction detected | System, nodeId/edgeId pair, contradictionType, timestamp |
| AI inference created | AgentId, proposalId, nodeOrEdge, confidence, timestamp |
| Graph snapshot created | Actor, snapshotId, nodeCount, edgeCount, trigger, timestamp |
| Graph export | Actor, scope, destination, timestamp |

---

### 8.7 Compliance

**Retention:** Graph data follows the Universe's data retention policy. HISTORICAL and ARCHIVED partition data is retained for the full retention period (minimum 7 years for enterprise tier).

**Export control:** Graph export is an authorized action. Exported graph data includes data classification markers. AI-generated data is clearly marked as AI-origin in exports.

**GDPR / Data Subject Requests:** User identity nodes (UserAccount) do not exist in the story Knowledge Graph — they exist only in the Platform Graph (separate partition). Story graph data contains no personal user data.

---

### 8.8 AI Access

| AI Agent Type | CANON partition | ACTIVE partition | INFERRED partition | PROPOSED partition | AI Memory |
|---|---|---|---|---|---|
| Continuity Agent | Read | Read | Read | Read | Read/Write (own) |
| Character Agent | Read | Read | Read | Read | Read/Write (own) |
| World Agent | Read | Read | Read | Read | Read/Write (own) |
| Timeline Agent | Read | Read | Read | Read | Read/Write (own) |
| Extraction Agent | Read | Read | Write | Write | Read/Write (own) |
| Search Agent | Read | Read | Read | None | Read (own) |

No AI agent has write access to the CANON partition under any circumstance.

---

### 8.9 Plugin Access

| Plugin Capability | CANON partition | ACTIVE partition | INFERRED partition | Own Plugin Nodes |
|---|---|---|---|---|
| Read-only plugin | Read (declared types only) | Read (declared types only) | None | Read |
| Read-write plugin | Read (declared types only) | Read (declared types only) | None | Read/Write |
| Analysis plugin | Read | Read | Read (own inferences) | Read/Write |

Plugins cannot write to CANON, INFERRED (except their own inference nodes), or PROPOSED partitions.

---

## Part IX — Integration

### 9.1 Integration with Entity Architecture

Every entity in the Entity Architecture produces a KnowledgeNode:

```
EntityCreated event → Graph Sync → KnowledgeNode created
EntityUpdated event → Graph Sync → KnowledgeNode updated
EntityStatusChanged event → Graph Sync → KnowledgeNode partition evaluated
EntityArchived event → Graph Sync → KnowledgeNode → HISTORICAL partition
EntityCanonConfirmed event → Graph Sync → KnowledgeNode → CANON partition
```

The graph reflects entity state with a defined SLA lag. It is always derived — the Entity Domain is always authoritative.

---

### 9.2 Integration with Metadata Architecture

Metadata enriches graph nodes:

- Metadata values for an entity are accessible via `metadataRef` on the KnowledgeNode.
- AI semantic vectors (`MT-AI-VEC`) are indexed by the SemanticProjection engine.
- Influence scores (`MT-AI-SCORE`) feed edge weight computations.
- Metadata annotations are traversal-accessible via MetadataAnnotation nodes.
- The full Metadata Architecture rules (versioning, security, access control) apply to metadata accessed through graph context.

---

### 9.3 Integration with Relationship Architecture

Every Relationship in the Relationship Domain produces a KnowledgeEdge:

```
RelationshipCreated → Graph Sync → KnowledgeEdge created
RelationshipUpdated → Graph Sync → KnowledgeEdge updated
RelationshipEnded → Graph Sync → KnowledgeEdge → HISTORICAL (isActive=false)
RelationshipArchived → Graph Sync → KnowledgeEdge → HISTORICAL
RelationshipCanonConfirmed → Graph Sync → KnowledgeEdge → CANON partition
```

The Relationship Domain is the single authority for all graph edges. The graph does not create edges independently of the Relationship Domain except for computed edges and AI inference edges.

---

### 9.4 Integration with Storage Architecture

Knowledge Graph data maps to storage:

| Data | Store | Reason |
|---|---|---|
| Node and edge properties | Graph Store | Native graph storage optimized for traversal |
| Graph Snapshots | Object Store | Large binary; content-addressed; immutable |
| GraphVersion events | Version Store (append-only) | Immutable event log |
| Graph audit records | Audit Store | Isolated; immutable |
| Semantic vectors | Vector Store | Specialized ANN index |
| GraphStatistics | Cache + Entity Store | Frequently read; periodically recomputed |
| AI Memory Graph | Graph Store (isolated partition) | Same engine; separate partition |

---

### 9.5 Integration with Versioning Architecture

- Every structural graph change produces a `GraphVersion` event consumed by the Versioning Domain.
- GraphSnapshots are managed alongside entity version snapshots in the Versioning Domain.
- Universe Snapshot (from Versioning Domain) includes a `GraphSnapshotId` reference.
- Graph history reconstruction uses the same event-sourcing pattern as entity version history.

---

### 9.6 Integration with Search Architecture

The Search Domain indexes Knowledge Graph content:

- Node labels and properties are indexed for full-text and exact-match search.
- Semantic vectors power vector similarity search.
- Graph neighborhood (N-hop neighbors) enriches search result context.
- Graph traversal results are searchable: "Find all entities connected to X within 3 hops that have property Y."
- Search results link to graph nodes, enabling creators to navigate from search results into the graph.

---

### 9.7 Integration with Workflow

Workflow state is represented as OPERATIONAL partition nodes:

- Active workflow instances appear as WorkflowInstance nodes.
- Content under review has a `WORKFLOW_IN_PROGRESS` edge to its WorkflowInstance node.
- Workflow completion events trigger graph updates (narrative node Canon status upgrade, etc.).
- Workflow stage gates may query the graph: "Can this content advance? Are all required entities and relationships established?"

---

### 9.8 Integration with AI Memory

AI Memory Graph integration:

- Agent deployed → Memory Graph initialized from Canon + Active graph snapshot.
- Ongoing: Canon changes propagate to Memory Graph via diff events.
- AI inference produced → Inference Graph updated → main graph INFERRED partition updated.
- Agent decommissioned → Memory Graph archived (read-only GraphSnapshot).
- Memory Graph health monitored: STALE / CONFLICT_DETECTED states surface to system admin.

---

### 9.9 Integration with Audit

All graph operations produce Audit Records before operation completes. The Audit System is the permanent ledger — the graph event log is a derived structure optimized for graph queries; the Audit System is the compliance record.

---

### 9.10 Integration with Plugin System

Plugin integration with the graph:

- Plugin declares `declaredNodeTypes` and `declaredEdgeTypes` in PluginManifest.
- Plugin reads graph data scoped to its declared access.
- Plugin writes to its own namespace nodes/edges in the ACTIVE partition.
- Plugin graph operations are audited under plugin actor attribution.
- Plugin's graph scope is revoked on uninstallation; plugin nodes archived.

---

## Part X — Best Practices

### 10.1 Naming Conventions

| Concept | Convention | Good | Bad |
|---|---|---|---|
| Node types | SCREAMING_SNAKE_CASE | `CHARACTER`, `KNOWLEDGE_FACT` | `character`, `KnowledgeFact` |
| Edge types | SCREAMING_SNAKE_CASE | `FATHER_OF`, `ALLIED_WITH` | `fatherOf`, `allied-with` |
| Plugin node types | Namespace-prefixed | `PLUGIN_MAGIC_SYSTEM_AFFINITY_NODE` | `AFFINITY_NODE` |
| GraphView names | PascalCase + View suffix | `CharacterRelationshipView` | `charRels`, `view1` |
| GraphProjection names | PascalCase + Projection suffix | `InfluenceProjection` | `influence_proj` |
| Snapshot labels | Human-readable, specific | `"End of Act 1 — War Begins"` | `snap_42`, `snapshot` |
| Node labels | Entity's primary display name | Character's `primaryName` | Entity's internal ID |

---

### 10.2 Performance Guidelines

| Concern | Guideline |
|---|---|
| Traversal depth | Default max = 5; increase only for explicit ancestry/lineage queries |
| Subgraph size | Keep subgraphs < 5,000 nodes for interactive queries; > 10,000 is a batch query |
| Projection refresh | Stale projections recomputed after hours or days; not real-time |
| Semantic vector index | Rebuild weekly unless > 20% node set changed |
| Contradiction detection | Run as streaming check on new edges; avoid full-graph scans on every event |
| Graph snapshot size | Monitor; prune HISTORICAL partition data older than retention period |
| AI inference batch | Batch inference writes; avoid per-fact individual writes under high inference load |
| Fan-out traversal | Nodes with > 1,000 edges should use index-accelerated neighborhood queries |
| Canon partition queries | Prefer Canon-only queries for user-facing features; include INFERRED only for AI contexts |

---

### 10.3 Caching

| Cache Target | Cache Strategy | Invalidation |
|---|---|---|
| Node properties (hot nodes) | LRU cache; TTL = 5 minutes | Node update event |
| GraphStatistics | In-memory; recomputed on significant changes | After sync batch |
| GraphView filter results | Query result cache; TTL = 1 minute | Any relevant graph change |
| Projection results | Object store; recomputed on invalidation trigger | Threshold-based or manual |
| Traversal results (user-facing) | Short TTL cache; TTL = 30 seconds | Any graph change |
| AI Memory Graph (hot portions) | Agent-local in-memory; persisted async | Canon change event |
| Semantic similarity results | Medium TTL; TTL = 10 minutes | Semantic vector update |

---

### 10.4 Graph Partitioning

The Knowledge Graph is partitioned at multiple levels:

| Partition Level | What Is Partitioned | Boundary |
|---|---|---|
| **Universe partition** | Entire graph per Story Universe | Hard structural boundary |
| **Canonical partition** | Canon vs. non-Canon within Universe | Logical partition; physical separation in storage |
| **Temporal partition** | Historical vs. current elements | `isActive` flag + partition label |
| **AI partition** | Memory Graph per agent | Physical isolation; separate agent graph |
| **Operational partition** | Workflow nodes | Excluded from story knowledge queries |
| **Plugin partition** | Plugin-namespace nodes/edges | Namespace-based logical partition |

---

### 10.5 Validation Checklist

Before any Knowledge Graph feature is considered complete:

- [ ] All entity types have corresponding node type definitions in GraphSchema
- [ ] All relationship types have corresponding edge type definitions in GraphSchema
- [ ] Canon partition is write-protected (only Graph Sync Service writes)
- [ ] Contradiction detection is active and tested
- [ ] Universe isolation is tested (cross-universe query attempt correctly rejected)
- [ ] Graph Sync SLA defined and monitored
- [ ] AI agent write scope is limited to INFERRED / PROPOSED / Memory partitions
- [ ] Graph Snapshot creation tested (integrity hash verified on restore)
- [ ] GraphVersion event log is append-only (no delete path exists)
- [ ] Secret node access control is tested (unauthorized user cannot access)
- [ ] Traversal max depth enforcement is active
- [ ] Confidence score propagation tested across inference chain
- [ ] Hallucination prevention: INFERRED vs. CANON node contradiction triggers alert
- [ ] Graph export authorization tested
- [ ] All graph operations produce Audit Records

---

### 10.6 Common Mistakes

**❌ Mistake 1 — Treating the Knowledge Graph as a database**
The Knowledge Graph is a semantic intelligence layer derived from source domains. It is not a storage system. If data can only be found in the graph and not in a source domain, it doesn't truly exist in the system.

**❌ Mistake 2 — Making nodes equal to database rows**
A KnowledgeNode is a semantic representation of an entity, not a row. Nodes carry meaning, provenance, and graph context — not all entity data. Entity attribute data lives in the Entity Store.

**❌ Mistake 3 — Mixing AI Memory with the Canon Graph**
The Canon partition is authoritative story truth. The AI Memory Graph is an agent's working representation. These must never be merged. AI agents that "remember" something does not make it Canon.

**❌ Mistake 4 — Allowing AI to create Canon edges directly**
No AI agent creates Canon edges. The path is: AI infers → INFERRED edge → Creator reviews → Relationship Domain creates Relationship → Graph Sync creates Canon edge. Shortcutting this makes the Canon partition untrustworthy.

**❌ Mistake 5 — Missing graph provenance**
A node or edge without provenance is an architectural defect. Every element of the graph must know: where it came from, who established it, when it was created, and with what confidence.

**❌ Mistake 6 — Forgetting graph partitions in traversal**
A traversal that returns INFERRED edges in a "Canon only" query is a bug that will mislead creators. Every traversal must have an explicit partition filter.

**❌ Mistake 7 — Not bounding traversal**
An unbounded traversal on a large Story Universe graph can produce millions of hops. Every traversal must have a maxDepth. Every query must have a limit.

**❌ Mistake 8 — Silently resolving contradictions**
When two Canon facts contradict each other, the correct response is to surface both and notify the creator — not to silently prefer one. The system cannot decide story truth.

---

### 10.7 Architecture Rules

**ARCH-KG-001 — The Knowledge Graph Is Derived**
The Knowledge Graph owns no authoritative data. It is a derived, synchronized projection of source domain data. If source domains and the graph disagree, source domains win.

**ARCH-KG-002 — Canon Partition Is Structurally Immutable to AI**
No code path exists by which an AI agent can write to the CANON partition directly. This is enforced structurally at the Graph Store access layer, not by application logic.

**ARCH-KG-003 — Provenance Is Mandatory**
Every node and edge must carry complete provenance at creation time. A node or edge created without provenance is rejected by the GraphSchema validator.

**ARCH-KG-004 — Contradiction Is a First-Class Concept**
A `GraphContradiction` is a domain object, not a system error. The graph can validly contain contradictions. The creator's job is to resolve them. The system's job is to surface them clearly.

**ARCH-KG-005 — Universe Isolation Is Structural**
Universe graph isolation is enforced at the storage partition level. Application-layer filtering is not a substitute for structural isolation.

**ARCH-KG-006 — Graph Event Log Is Immutable**
The append-only `GraphVersion` event log is never modified, compacted, or deleted within the retention period. It is the authoritative history of all graph changes.

**ARCH-KG-007 — Every Traversal Is Bounded**
No traversal query is executed without explicit `maxDepth` and `limit` parameters. Unbounded traversals are rejected by the traversal engine before execution.

**ARCH-KG-008 — AI Confidence Is Informational**
A confidence score of 0.99 does not make an inference Canon. A confidence score of 0.01 does not make a Canon fact wrong. Confidence is advisory information for creators. It has no mechanical effect on Canon status.

---

> *"The Knowledge Graph is not the sum of StoryOS's data. It is the beginning of StoryOS's intelligence. Every entity, every relationship, every fact, every inference, and every creative decision the platform has ever processed comes together here — organized by meaning, governed by Canon, and built to answer questions that no database ever could."*

---

**Document End**
**Previous:** `docs/architecture/relationship_architecture.md` — Task 1.4 Approved
**Next:** `docs/architecture/storage_architecture.md` — Task 1.6
