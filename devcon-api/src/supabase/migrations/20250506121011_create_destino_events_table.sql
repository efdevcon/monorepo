CREATE TABLE destino_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_modified_at TEXT NOT NULL
);

-- Create an index for faster lookups by event_id
CREATE INDEX idx_destino_events_event_id ON destino_events(event_id);
