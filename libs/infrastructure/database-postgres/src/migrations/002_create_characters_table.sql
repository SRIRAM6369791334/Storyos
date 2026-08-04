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
