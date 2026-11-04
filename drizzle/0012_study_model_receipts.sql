CREATE TABLE study_model_receipts (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 pilot_id TEXT NOT NULL,
 project_id TEXT REFERENCES study_projects(id) ON DELETE CASCADE,
 task TEXT NOT NULL,
 provider TEXT NOT NULL CHECK(provider IN ('meta','local')),
 model TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('success','failed','rate-limited','blocked','quota-limited')),
 latency_ms INTEGER NOT NULL CHECK(latency_ms>=0),
 input_tokens INTEGER,
 output_tokens INTEGER,
 cached_input_tokens INTEGER,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL
);
CREATE INDEX study_model_receipts_owner ON study_model_receipts(owner_id,pilot_id,created_at);
CREATE INDEX study_model_receipts_project ON study_model_receipts(project_id,created_at);
