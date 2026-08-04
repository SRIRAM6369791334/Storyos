import {
  type CanonStatus,
  Location,
  type LocationId,
  LocationName,
  type LocationRepository,
  type LocationType,
  type UniverseId,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-world-building";
import type { PostgresClient } from "../index.js";

export class PostgresLocationRepository implements LocationRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS locations (
          id VARCHAR(255) PRIMARY KEY,
          universe_id VARCHAR(255) NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
          parent_location_id VARCHAR(255) REFERENCES locations(id) ON DELETE CASCADE,
          name VARCHAR(300) NOT NULL,
          location_type VARCHAR(50) NOT NULL DEFAULT 'OTHER',
          canon_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
          created_by VARCHAR(255) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_locations_universe ON locations(universe_id);
      CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_location_id);
    `;
    const pool = this.postgresClient.getPool();
    await pool.query(query);
  }

  public async save(location: Location): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const query = `
      INSERT INTO locations (
        id, universe_id, parent_location_id, name, location_type, canon_status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        parent_location_id = EXCLUDED.parent_location_id,
        name = EXCLUDED.name,
        location_type = EXCLUDED.location_type,
        canon_status = EXCLUDED.canon_status;
    `;

    const values = [
      location.locationId,
      location.universeId,
      location.parentLocationId || null,
      location.name.toString(),
      location.locationType,
      location.canonStatus,
      location.createdBy,
      location.createdAt,
    ];

    await pool.query(query, values);
  }

  public async findById(locationId: LocationId): Promise<Location | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query("SELECT * FROM locations WHERE id = $1", [locationId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return Location.create({
      locationId: createLocationId(row.id),
      universeId: createUniverseId(row.universe_id),
      parentLocationId: row.parent_location_id
        ? createLocationId(row.parent_location_id)
        : undefined,
      name: LocationName.create(row.name),
      locationType: row.location_type as LocationType,
      canonStatus: row.canon_status as CanonStatus,
      createdBy: createUserId(row.created_by),
    });
  }

  public async findByUniverseId(universeId: UniverseId): Promise<Location[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query(
      "SELECT * FROM locations WHERE universe_id = $1 ORDER BY created_at ASC",
      [universeId],
    );

    return result.rows.map((row) =>
      Location.create({
        locationId: createLocationId(row.id),
        universeId: createUniverseId(row.universe_id),
        parentLocationId: row.parent_location_id
          ? createLocationId(row.parent_location_id)
          : undefined,
        name: LocationName.create(row.name),
        locationType: row.location_type as LocationType,
        canonStatus: row.canon_status as CanonStatus,
        createdBy: createUserId(row.created_by),
      }),
    );
  }

  public async findByParentId(parentId: LocationId): Promise<Location[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    const result = await pool.query(
      "SELECT * FROM locations WHERE parent_location_id = $1 ORDER BY created_at ASC",
      [parentId],
    );

    return result.rows.map((row) =>
      Location.create({
        locationId: createLocationId(row.id),
        universeId: createUniverseId(row.universe_id),
        parentLocationId: row.parent_location_id
          ? createLocationId(row.parent_location_id)
          : undefined,
        name: LocationName.create(row.name),
        locationType: row.location_type as LocationType,
        canonStatus: row.canon_status as CanonStatus,
        createdBy: createUserId(row.created_by),
      }),
    );
  }

  public async delete(locationId: LocationId): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    await pool.query("DELETE FROM locations WHERE id = $1", [locationId]);
  }
}
