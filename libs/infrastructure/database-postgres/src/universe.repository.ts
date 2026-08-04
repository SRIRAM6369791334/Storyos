import {
  type AudienceClassification,
  type GenreClassification,
  type MaturityRating,
  type MediumType,
  StoryUniverse,
  type UniverseId,
  type UniverseRepository,
  type UniverseStatus,
  UniverseSynopsis,
  UniverseTitle,
  createOrganizationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-universe";
import type { PostgresClient } from "../index.js";

export class PostgresUniverseRepository implements UniverseRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS universes (
          id VARCHAR(255) PRIMARY KEY,
          organization_id VARCHAR(255) NOT NULL,
          title VARCHAR(200) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          synopsis TEXT,
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          primary_medium VARCHAR(50),
          target_audience VARCHAR(50),
          maturity_rating VARCHAR(50),
          genres JSONB DEFAULT '[]'::jsonb,
          linked_universe_ids JSONB DEFAULT '[]'::jsonb,
          archived_at TIMESTAMPTZ,
          archived_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_universes_org ON universes(organization_id);
    `;
    const pool = this.postgresClient.getPool();
    await pool.query(query);
  }

  public async save(universe: StoryUniverse): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const query = `
      INSERT INTO universes (
        id, organization_id, title, status, synopsis, created_by, created_at,
        primary_medium, target_audience, maturity_rating, genres, linked_universe_ids,
        archived_at, archived_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        status = EXCLUDED.status,
        synopsis = EXCLUDED.synopsis,
        primary_medium = EXCLUDED.primary_medium,
        target_audience = EXCLUDED.target_audience,
        maturity_rating = EXCLUDED.maturity_rating,
        genres = EXCLUDED.genres,
        linked_universe_ids = EXCLUDED.linked_universe_ids,
        archived_at = EXCLUDED.archived_at,
        archived_by = EXCLUDED.archived_by;
    `;

    const values = [
      universe.universeId,
      universe.organizationId,
      universe.title.toString(),
      universe.status,
      universe.synopsis ? universe.synopsis.toString() : null,
      universe.createdBy,
      universe.createdAt,
      universe.primaryMedium || null,
      universe.targetAudience || null,
      universe.maturityRating || null,
      JSON.stringify(universe.genre),
      JSON.stringify(universe.linkedUniverseIds),
      universe.archivedAt || null,
      universe.archivedBy || null,
    ];

    await pool.query(query, values);
  }

  public async findById(universeId: UniverseId): Promise<StoryUniverse | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query("SELECT * FROM universes WHERE id = $1", [universeId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const genres: GenreClassification[] =
      typeof row.genres === "string" ? JSON.parse(row.genres) : row.genres || [];
    const linkedIds: string[] =
      typeof row.linked_universe_ids === "string"
        ? JSON.parse(row.linked_universe_ids)
        : row.linked_universe_ids || [];

    return StoryUniverse.create({
      universeId: createUniverseId(row.id),
      organizationId: createOrganizationId(row.organization_id),
      title: UniverseTitle.create(row.title),
      createdBy: createUserId(row.created_by),
      status: row.status as UniverseStatus,
      synopsis: row.synopsis ? UniverseSynopsis.create(row.synopsis) : undefined,
      genre: genres,
      primaryMedium: row.primary_medium ? (row.primary_medium as MediumType) : undefined,
      targetAudience: row.target_audience
        ? (row.target_audience as AudienceClassification)
        : undefined,
      maturityRating: row.maturity_rating ? (row.maturity_rating as MaturityRating) : undefined,
      linkedUniverseIds: linkedIds.map((id) => createUniverseId(id)),
    });
  }

  public async delete(universeId: UniverseId): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    await pool.query("DELETE FROM universes WHERE id = $1", [universeId]);
  }
}
