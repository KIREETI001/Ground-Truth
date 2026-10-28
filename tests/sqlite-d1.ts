import { DatabaseSync } from 'node:sqlite';

// A real SQLite database with the small D1 API surface used by the application.
// batch() executes each prepared statement inside one rollback-capable transaction.
export class SQLiteD1 {
  readonly sqlite: DatabaseSync;
  readonly db: D1Database;

  constructor() {
    this.sqlite = new DatabaseSync(':memory:');
    this.sqlite.exec('PRAGMA foreign_keys = ON');
    this.sqlite.exec(TEST_SCHEMA);
    this.db = this as unknown as D1Database;
  }

  prepare(sql: string) {
    return new SQLiteStatement(this.sqlite, sql, []);
  }

  async batch<T = unknown>(statements: SQLiteStatement[]): Promise<D1Result<T>[]> {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => statement.execute<T>());
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      this.sqlite.exec('ROLLBACK');
      throw error;
    }
  }

  async exec(sql: string): Promise<D1ExecResult> {
    this.sqlite.exec(sql);
    return { count: 1, duration: 0 };
  }

  close() { this.sqlite.close(); }
}

class SQLiteStatement {
  private database: DatabaseSync;
  private sql: string;
  private values: unknown[];
  constructor(database: DatabaseSync, sql: string, values: unknown[]) {
    this.database = database; this.sql = sql; this.values = values;
  }
  bind(...values: unknown[]) { return new SQLiteStatement(this.database, this.sql, values); }
  execute<T>(): D1Result<T> {
    const statement = this.database.prepare(this.sql);
    const rows = statement.all(...this.values as (null | string | number | bigint | Uint8Array)[]) as T[];
    const meta = this.database.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get()!;
    return {
      success: true, results: rows,
      meta: { changes: Number(meta.changes), last_row_id: Number(meta.last_row_id), duration: 0,
        size_after: 0, rows_read: rows.length, rows_written: Number(meta.changes), changed_db: Number(meta.changes) > 0 },
    };
  }
  async all<T>() { return this.execute<T>(); }
  async run<T>() { return this.execute<T>(); }
  async first<T>(columnName?: string): Promise<T | null> {
    const row = this.execute<Record<string, unknown>>().results[0];
    return row ? (columnName ? row[columnName] : row) as T : null;
  }
  async raw<T>() { return this.execute<Record<string, unknown>>().results.map(row => Object.values(row)) as T[]; }
}

// These tables mirror db/schema.ts. The migration is separately applied and
// checked through Wrangler during integration; no schema is created in production code.
const TEST_SCHEMA = `
CREATE TABLE practice_profiles (
 user_id TEXT PRIMARY KEY, notice_version TEXT, notice_acknowledged_at TEXT,
 research_opt_in INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE pilot_memberships (
 user_id TEXT PRIMARY KEY,pilot_id TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('student','staff')),
 enrolled_at TEXT NOT NULL,expires_at TEXT NOT NULL
);
CREATE TABLE enrollment_attempts (
 user_id TEXT NOT NULL,pilot_id TEXT NOT NULL,window_started_at INTEGER NOT NULL,attempts INTEGER NOT NULL,
 PRIMARY KEY(user_id,pilot_id)
);
CREATE TABLE learner_records (
 user_id TEXT PRIMARY KEY NOT NULL,state_json TEXT NOT NULL,revision TEXT NOT NULL,
 notice_version TEXT NOT NULL,notice_acknowledged_at TEXT NOT NULL,updated_at TEXT NOT NULL,expires_at TEXT NOT NULL
);
CREATE TABLE pulse_votes (
 user_id TEXT NOT NULL,poll_day TEXT NOT NULL,poll_id TEXT NOT NULL,choice_id TEXT NOT NULL,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,expires_at TEXT NOT NULL,PRIMARY KEY(user_id,poll_day)
);
CREATE TABLE sessions (
 id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('active','deleting')),
 phase TEXT NOT NULL,revision INTEGER NOT NULL,document_json TEXT NOT NULL,request_id TEXT NOT NULL,
 created_at TEXT NOT NULL,expires_at TEXT NOT NULL,UNIQUE(owner_id,request_id)
);
CREATE TABLE coach_usage (
 session_id TEXT PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
 provider_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE coach_locks (user_id TEXT PRIMARY KEY,token TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE TABLE lab_runs (
 id TEXT PRIMARY KEY,session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
 case_id TEXT NOT NULL,owner_id TEXT NOT NULL,phase TEXT NOT NULL,fixture_id TEXT NOT NULL,
 source_digest TEXT NOT NULL,source_json TEXT NOT NULL,plan_digest TEXT NOT NULL,prediction_id TEXT NOT NULL,plan_json TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('running','finalizing','complete','infra_error')),
 completed_steps INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,
 UNIQUE(session_id,case_id)
);
CREATE TABLE lab_registrations (
 id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES lab_runs(id) ON DELETE CASCADE,
 event_id TEXT NOT NULL,attendee_ref TEXT NOT NULL,intent_id TEXT NOT NULL,
 idempotency_key TEXT,payload_hash TEXT NOT NULL,created_by_step TEXT NOT NULL,registered_at TEXT NOT NULL,
 UNIQUE(run_id,idempotency_key)
);
CREATE TABLE lab_receipts (
 id TEXT PRIMARY KEY,run_id TEXT NOT NULL REFERENCES lab_runs(id) ON DELETE CASCADE,
 step_id TEXT NOT NULL,step_index INTEGER NOT NULL,intent_id TEXT NOT NULL,
 decision TEXT NOT NULL,registration_id TEXT REFERENCES lab_registrations(id) ON DELETE CASCADE,
 handler_status INTEGER,delivered_status INTEGER NOT NULL,delivery_policy TEXT NOT NULL,
 committed_row_count_after INTEGER NOT NULL,committed_at TEXT NOT NULL,UNIQUE(run_id,step_id)
);
CREATE TABLE lab_evidence (
 run_id TEXT PRIMARY KEY REFERENCES lab_runs(id) ON DELETE CASCADE,
 evidence_json TEXT NOT NULL,evidence_hash TEXT NOT NULL,finalized_at TEXT NOT NULL
);`;

export function createTestDb() { return new SQLiteD1(); }
