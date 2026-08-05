import {
  type CanonStatus,
  Chapter,
  type ChapterId,
  type ChapterRepository,
  ChapterTitle,
  type DraftStatus,
  Scene,
  type SceneId,
  type SceneRepository,
  SceneTitle,
  type UniverseId,
  Work,
  type WorkId,
  type WorkRepository,
  WorkTitle,
  type WorkType,
  createChapterId,
  createCharacterId,
  createLocationId,
  createSceneId,
  createUniverseId,
  createUserId,
  createWorkId,
} from "@storyos/domain-narrative";
import type { PostgresClient } from "../index.js";

// ─── SQL Migration helpers ───────────────────────────────────────────────────

const CREATE_WORKS_TABLE = `
  CREATE TABLE IF NOT EXISTS works (
    id             VARCHAR(255) PRIMARY KEY,
    universe_id    VARCHAR(255) NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    title          VARCHAR(400) NOT NULL,
    work_type      VARCHAR(50)  NOT NULL DEFAULT 'OTHER',
    draft_status   VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    canon_status   VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    created_by     VARCHAR(255) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_works_universe ON works(universe_id);
`;

const CREATE_CHAPTERS_TABLE = `
  CREATE TABLE IF NOT EXISTS chapters (
    id              VARCHAR(255) PRIMARY KEY,
    work_id         VARCHAR(255) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    title           VARCHAR(400) NOT NULL,
    sequence_number INTEGER      NOT NULL DEFAULT 1,
    draft_status    VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    created_by      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_chapters_work ON chapters(work_id);
`;

const CREATE_SCENES_TABLE = `
  CREATE TABLE IF NOT EXISTS scenes (
    id              VARCHAR(255) PRIMARY KEY,
    chapter_id      VARCHAR(255) NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    title           VARCHAR(400) NOT NULL,
    sequence_number INTEGER      NOT NULL DEFAULT 1,
    draft_status    VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    location_id     VARCHAR(255),
    created_by      VARCHAR(255) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_scenes_chapter ON scenes(chapter_id);
`;

// Many-to-many: scenes ↔ characters (participants).
// location_id on scenes is a soft reference (no FK — Location is in the same PG
// instance but owned by a different domain; cross-domain FK enforced at app layer).
const CREATE_SCENE_PARTICIPANTS_TABLE = `
  CREATE TABLE IF NOT EXISTS scene_participants (
    scene_id     VARCHAR(255) NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
    character_id VARCHAR(255) NOT NULL,
    PRIMARY KEY (scene_id, character_id)
  );
  CREATE INDEX IF NOT EXISTS idx_scene_participants_scene ON scene_participants(scene_id);
`;

// ─── PostgresWorkRepository ──────────────────────────────────────────────────

export class PostgresWorkRepository implements WorkRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const pool = this.postgresClient.getPool();
    await pool.query(CREATE_WORKS_TABLE);
  }

  public async save(work: Work): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const query = `
      INSERT INTO works (id, universe_id, title, work_type, draft_status, canon_status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        title        = EXCLUDED.title,
        work_type    = EXCLUDED.work_type,
        draft_status = EXCLUDED.draft_status,
        canon_status = EXCLUDED.canon_status;
    `;
    await pool.query(query, [
      work.workId,
      work.universeId,
      work.title.toString(),
      work.workType,
      work.draftStatus,
      work.canonStatus,
      work.createdBy,
      work.createdAt,
    ]);
  }

  public async findById(workId: WorkId): Promise<Work | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query("SELECT * FROM works WHERE id = $1", [workId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  public async findByUniverseId(universeId: UniverseId): Promise<Work[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query(
      "SELECT * FROM works WHERE universe_id = $1 ORDER BY created_at ASC",
      [universeId],
    );
    return result.rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: Record<string, unknown>): Work {
    return Work.create({
      workId: createWorkId(String(row.id)),
      universeId: createUniverseId(String(row.universe_id)),
      title: WorkTitle.create(String(row.title)),
      workType: row.work_type as WorkType,
      draftStatus: row.draft_status as DraftStatus,
      canonStatus: row.canon_status as CanonStatus,
      createdBy: createUserId(String(row.created_by)),
      createdAt: new Date(String(row.created_at)),
    });
  }
}

// ─── PostgresChapterRepository ───────────────────────────────────────────────

export class PostgresChapterRepository implements ChapterRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const pool = this.postgresClient.getPool();
    await pool.query(CREATE_CHAPTERS_TABLE);
  }

  public async save(chapter: Chapter): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const query = `
      INSERT INTO chapters (id, work_id, title, sequence_number, draft_status, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title           = EXCLUDED.title,
        sequence_number = EXCLUDED.sequence_number,
        draft_status    = EXCLUDED.draft_status;
    `;
    await pool.query(query, [
      chapter.chapterId,
      chapter.workId,
      chapter.title.toString(),
      chapter.sequenceNumber,
      chapter.draftStatus,
      chapter.createdBy,
      chapter.createdAt,
    ]);
  }

  public async findById(chapterId: ChapterId): Promise<Chapter | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query("SELECT * FROM chapters WHERE id = $1", [chapterId]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  public async findByWorkId(workId: WorkId): Promise<Chapter[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query(
      "SELECT * FROM chapters WHERE work_id = $1 ORDER BY sequence_number ASC, created_at ASC",
      [workId],
    );
    return result.rows.map((r) => this.mapRow(r));
  }

  private mapRow(row: Record<string, unknown>): Chapter {
    return Chapter.create({
      chapterId: createChapterId(String(row.id)),
      workId: createWorkId(String(row.work_id)),
      title: ChapterTitle.create(String(row.title)),
      sequenceNumber: Number(row.sequence_number),
      draftStatus: row.draft_status as DraftStatus,
      createdBy: createUserId(String(row.created_by)),
      createdAt: new Date(String(row.created_at)),
    });
  }
}

// ─── PostgresSceneRepository ─────────────────────────────────────────────────

export class PostgresSceneRepository implements SceneRepository {
  private postgresClient: PostgresClient;

  constructor(postgresClient: PostgresClient) {
    this.postgresClient = postgresClient;
  }

  public async ensureTableExists(): Promise<void> {
    const pool = this.postgresClient.getPool();
    await pool.query(CREATE_SCENES_TABLE);
    await pool.query(CREATE_SCENE_PARTICIPANTS_TABLE);
  }

  public async save(scene: Scene): Promise<void> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();

    // Upsert scene row
    const sceneQuery = `
      INSERT INTO scenes (id, chapter_id, title, sequence_number, draft_status, location_id, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        title           = EXCLUDED.title,
        sequence_number = EXCLUDED.sequence_number,
        draft_status    = EXCLUDED.draft_status,
        location_id     = EXCLUDED.location_id;
    `;
    await pool.query(sceneQuery, [
      scene.sceneId,
      scene.chapterId,
      scene.title.toString(),
      scene.sequenceNumber,
      scene.draftStatus,
      scene.locationId ?? null,
      scene.createdBy,
      scene.createdAt,
    ]);

    // Sync scene_participants: delete existing then re-insert
    await pool.query("DELETE FROM scene_participants WHERE scene_id = $1", [scene.sceneId]);
    if (scene.characterIds.length > 0) {
      const placeholders = scene.characterIds.map((_, i) => `($1, $${i + 2})`).join(", ");
      const values: unknown[] = [scene.sceneId, ...scene.characterIds];
      await pool.query(
        `INSERT INTO scene_participants (scene_id, character_id) VALUES ${placeholders}`,
        values,
      );
    }
  }

  public async findById(sceneId: SceneId): Promise<Scene | null> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query("SELECT * FROM scenes WHERE id = $1", [sceneId]);
    if (result.rows.length === 0) return null;
    const participantResult = await pool.query(
      "SELECT character_id FROM scene_participants WHERE scene_id = $1",
      [sceneId],
    );
    return this.mapRow(result.rows[0], participantResult.rows);
  }

  public async findByChapterId(chapterId: ChapterId): Promise<Scene[]> {
    await this.ensureTableExists();
    const pool = this.postgresClient.getPool();
    const result = await pool.query(
      "SELECT * FROM scenes WHERE chapter_id = $1 ORDER BY sequence_number ASC, created_at ASC",
      [chapterId],
    );
    if (result.rows.length === 0) return [];

    const sceneIds = result.rows.map((r) => String(r.id));
    const participantResult = await pool.query(
      "SELECT scene_id, character_id FROM scene_participants WHERE scene_id = ANY($1)",
      [sceneIds],
    );

    const participantsByScene: Record<string, string[]> = {};
    for (const pr of participantResult.rows) {
      const sid = String(pr.scene_id);
      if (!participantsByScene[sid]) participantsByScene[sid] = [];
      participantsByScene[sid].push(String(pr.character_id));
    }

    return result.rows.map((r) =>
      this.mapRow(
        r,
        (participantsByScene[String(r.id)] ?? []).map((c) => ({ character_id: c })),
      ),
    );
  }

  private mapRow(
    row: Record<string, unknown>,
    participantRows: Array<Record<string, unknown>>,
  ): Scene {
    return Scene.create({
      sceneId: createSceneId(String(row.id)),
      chapterId: createChapterId(String(row.chapter_id)),
      title: SceneTitle.create(String(row.title)),
      sequenceNumber: Number(row.sequence_number),
      draftStatus: row.draft_status as DraftStatus,
      locationId: row.location_id ? createLocationId(String(row.location_id)) : undefined,
      characterIds: participantRows.map((p) => createCharacterId(String(p.character_id))),
      createdBy: createUserId(String(row.created_by)),
      createdAt: new Date(String(row.created_at)),
    });
  }
}
