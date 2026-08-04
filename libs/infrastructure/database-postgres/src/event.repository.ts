import {
  type CharacterId,
  Event,
  type EventId,
  type EventRepository,
  type EventStatus,
  type LocationId,
  type UniverseId,
  createCharacterId,
  createEventId,
  createLocationId,
  createUniverseId,
  createUserId,
} from "@storyos/domain-timeline";
import type { PostgresClient } from "./postgres-client.js";

export class PostgresEventRepository implements EventRepository {
  private client: PostgresClient;

  constructor(client: PostgresClient) {
    this.client = client;
  }

  public async save(event: Event): Promise<void> {
    const pool = this.client.getPool();
    const pgClient = await pool.connect();

    try {
      await pgClient.query("BEGIN");

      // 1. Upsert into events table
      const upsertEventSql = `
        INSERT INTO events (id, universe_id, title, description, location_id, status, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          universe_id = EXCLUDED.universe_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          location_id = EXCLUDED.location_id,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          created_at = EXCLUDED.created_at;
      `;

      await pgClient.query(upsertEventSql, [
        event.eventId,
        event.universeId,
        event.title,
        event.description,
        event.locationId || null,
        event.status,
        event.createdBy,
        event.createdAt.toISOString(),
      ]);

      // 2. Delete existing participants for this event
      await pgClient.query("DELETE FROM event_participants WHERE event_id = $1", [event.eventId]);

      // 3. Insert new participants
      if (event.participants.length > 0) {
        const insertParticipantSql = `
          INSERT INTO event_participants (event_id, character_id, role)
          VALUES ($1, $2, $3);
        `;

        for (const p of event.participants) {
          await pgClient.query(insertParticipantSql, [
            event.eventId,
            p.characterId,
            p.role || null,
          ]);
        }
      }

      await pgClient.query("COMMIT");
    } catch (err) {
      await pgClient.query("ROLLBACK");
      throw err;
    } finally {
      pgClient.release();
    }
  }

  public async findById(eventId: EventId): Promise<Event | null> {
    const pool = this.client.getPool();

    const eventResult = await pool.query("SELECT * FROM events WHERE id = $1", [eventId]);
    if (eventResult.rows.length === 0) {
      return null;
    }

    const row = eventResult.rows[0];
    const participantsResult = await pool.query(
      "SELECT character_id, role FROM event_participants WHERE event_id = $1",
      [eventId],
    );

    const participants = participantsResult.rows.map((pRow) => ({
      characterId: createCharacterId(pRow.character_id),
      role: pRow.role || undefined,
    }));

    return Event.create({
      eventId: createEventId(row.id),
      universeId: createUniverseId(row.universe_id),
      title: row.title,
      description: row.description,
      locationId: row.location_id ? createLocationId(row.location_id) : undefined,
      status: row.status as EventStatus,
      participants,
      createdBy: createUserId(row.created_by),
    });
  }

  public async findByUniverseId(universeId: UniverseId): Promise<Event[]> {
    const pool = this.client.getPool();

    const eventsResult = await pool.query(
      "SELECT * FROM events WHERE universe_id = $1 ORDER BY created_at ASC",
      [universeId],
    );

    const events: Event[] = [];
    for (const row of eventsResult.rows) {
      const participantsResult = await pool.query(
        "SELECT character_id, role FROM event_participants WHERE event_id = $1",
        [row.id],
      );

      const participants = participantsResult.rows.map((pRow) => ({
        characterId: createCharacterId(pRow.character_id),
        role: pRow.role || undefined,
      }));

      events.push(
        Event.create({
          eventId: createEventId(row.id),
          universeId: createUniverseId(row.universe_id),
          title: row.title,
          description: row.description,
          locationId: row.location_id ? createLocationId(row.location_id) : undefined,
          status: row.status as EventStatus,
          participants,
          createdBy: createUserId(row.created_by),
        }),
      );
    }

    return events;
  }

  public async findByCharacterId(characterId: CharacterId): Promise<Event[]> {
    const pool = this.client.getPool();

    const sql = `
      SELECT e.*
      FROM events e
      INNER JOIN event_participants ep ON e.id = ep.event_id
      WHERE ep.character_id = $1
      ORDER BY e.created_at ASC;
    `;

    const eventsResult = await pool.query(sql, [characterId]);

    const events: Event[] = [];
    for (const row of eventsResult.rows) {
      const participantsResult = await pool.query(
        "SELECT character_id, role FROM event_participants WHERE event_id = $1",
        [row.id],
      );

      const participants = participantsResult.rows.map((pRow) => ({
        characterId: createCharacterId(pRow.character_id),
        role: pRow.role || undefined,
      }));

      events.push(
        Event.create({
          eventId: createEventId(row.id),
          universeId: createUniverseId(row.universe_id),
          title: row.title,
          description: row.description,
          locationId: row.location_id ? createLocationId(row.location_id) : undefined,
          status: row.status as EventStatus,
          participants,
          createdBy: createUserId(row.created_by),
        }),
      );
    }

    return events;
  }

  public async delete(eventId: EventId): Promise<void> {
    const pool = this.client.getPool();
    await pool.query("DELETE FROM events WHERE id = $1", [eventId]);
  }
}
