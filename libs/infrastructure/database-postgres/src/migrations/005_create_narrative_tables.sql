-- 005_create_narrative_tables.sql
-- Creates the core narrative hierarchy: works -> chapters -> scenes -> scene_participants

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

-- Many-to-many: scenes <-> characters (participants)
CREATE TABLE IF NOT EXISTS scene_participants (
  scene_id     VARCHAR(255) NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  character_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (scene_id, character_id)
);
CREATE INDEX IF NOT EXISTS idx_scene_participants_scene ON scene_participants(scene_id);
