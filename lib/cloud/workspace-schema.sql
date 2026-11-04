-- Incorporated into the initial Supabase migration; shown separately for review.
CREATE TABLE cloud_workspaces (
 project_id TEXT PRIMARY KEY REFERENCES study_projects(id) ON DELETE CASCADE,
 owner_id TEXT NOT NULL,
 pilot_id TEXT NOT NULL,
 commit_sha TEXT NOT NULL,
 state_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL
);
