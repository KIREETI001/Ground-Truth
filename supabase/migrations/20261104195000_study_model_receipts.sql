CREATE TABLE groundtruth.study_model_receipts (
 rowid bigint GENERATED ALWAYS AS IDENTITY,
 id text PRIMARY KEY,
 owner_id text NOT NULL,
 pilot_id text NOT NULL,
 project_id text REFERENCES groundtruth.study_projects(id) ON DELETE CASCADE,
 task text NOT NULL,
 provider text NOT NULL CHECK(provider IN ('meta','local')),
 model text NOT NULL,
 status text NOT NULL CHECK(status IN ('success','failed','rate-limited','blocked','quota-limited')),
 latency_ms bigint NOT NULL CHECK(latency_ms>=0),
 input_tokens bigint,
 output_tokens bigint,
 cached_input_tokens bigint,
 created_at text NOT NULL,
 expires_at text NOT NULL
);
CREATE INDEX study_model_receipts_owner ON groundtruth.study_model_receipts(owner_id,pilot_id,created_at);
CREATE INDEX study_model_receipts_project ON groundtruth.study_model_receipts(project_id,created_at);
ALTER TABLE groundtruth.study_model_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY backend_access ON groundtruth.study_model_receipts FOR ALL TO groundtruth_app USING (true) WITH CHECK (true);
GRANT SELECT,INSERT,UPDATE,DELETE ON groundtruth.study_model_receipts TO groundtruth_app;
GRANT USAGE,SELECT ON SEQUENCE groundtruth.study_model_receipts_rowid_seq TO groundtruth_app;
REVOKE ALL ON groundtruth.study_model_receipts FROM anon,authenticated;
