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
