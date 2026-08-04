CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    universe_id VARCHAR(255) NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    location_id VARCHAR(255) REFERENCES locations(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CANON',
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_universe ON events(universe_id);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);

CREATE TABLE IF NOT EXISTS event_participants (
    event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    character_id VARCHAR(255) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    role VARCHAR(100),
    PRIMARY KEY (event_id, character_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_character ON event_participants(character_id);
