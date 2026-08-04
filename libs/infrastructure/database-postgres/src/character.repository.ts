import {
  type CanonStatus,
  Character,
  type CharacterId,
  CharacterName,
  type CharacterRepository,
  type CharacterStatus,
  type UniverseId,
  createCharacterId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-character";
import type { PostgresClient } from "../index.js";

export class PostgresCharacterRepository implements CharacterRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS characters (
          id VARCHAR(255) PRIMARY KEY,
          universe_id VARCHAR(255) NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
          primary_name VARCHAR(300) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          canon_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          archived_at TIMESTAMPTZ,
          archived_by VARCHAR(255)
      );
      CREATE INDEX IF NOT EXISTS idx_characters_universe ON characters(universe_id);
    `;
    const pool = this.postgresClient.getPool();
    await pool.query(query);
  }

  public async save(character: Character): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const query = `
      INSERT INTO characters (
        id, universe_id, primary_name, status, canon_status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        primary_name = EXCLUDED.primary_name,
        status = EXCLUDED.status,
        canon_status = EXCLUDED.canon_status;
    `;

    const values = [
      character.characterId,
      character.universeId,
      character.primaryName.toString(),
      character.status,
      character.canonStatus,
      character.createdBy,
      character.createdAt,
    ];

    await pool.query(query, values);
  }

  public async findById(characterId: CharacterId): Promise<Character | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query("SELECT * FROM characters WHERE id = $1", [characterId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return Character.create({
      characterId: createCharacterId(row.id),
      universeId: createUniverseId(row.universe_id),
      primaryName: CharacterName.create(row.primary_name),
      status: row.status as CharacterStatus,
      canonStatus: row.canon_status as CanonStatus,
      createdBy: createUserId(row.created_by),
    });
  }

  public async findByUniverseId(universeId: UniverseId): Promise<Character[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query(
      "SELECT * FROM characters WHERE universe_id = $1 ORDER BY created_at ASC",
      [universeId],
    );
    return result.rows.map((row) =>
      Character.create({
        characterId: createCharacterId(row.id),
        universeId: createUniverseId(row.universe_id),
        primaryName: CharacterName.create(row.primary_name),
        status: row.status as CharacterStatus,
        canonStatus: row.canon_status as CanonStatus,
        createdBy: createUserId(row.created_by),
      }),
    );
  }

  public async delete(characterId: CharacterId): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    await pool.query("DELETE FROM characters WHERE id = $1", [characterId]);
  }
}
