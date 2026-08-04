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
